import { PrismaClient } from "@prisma/client";
import { isTransientDatabaseError } from "@/lib/database-errors";

const safeReadOperations = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]);

function makePrismaClient() {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  let reconnectPromise: Promise<void> | null = null;

  // Client extension for resilient auto-reconnection on Neon serverless idle socket disconnects
  return baseClient.$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        try {
          return await query(args);
        } catch (caught: unknown) {
          const error = caught as { message?: string };
          const errorMessage = String(error?.message || "");

          // A dropped response can hide a committed write. Never replay a mutation.
          if (isTransientDatabaseError(caught) && safeReadOperations.has(operation)) {
            console.warn(
              `[Prisma Resilience] Auto-reconnecting after transient socket drop in ${model || "raw"}.${operation}:`,
              errorMessage.slice(0, 100)
            );

            // Do not disconnect here: another request may be using the same
            // process-wide client. Share one connect attempt across concurrent
            // read failures, then let Prisma retry the read on its fresh pool.
            reconnectPromise ??= baseClient.$connect().finally(() => {
              reconnectPromise = null;
            });
            await reconnectPromise.catch(() => {});

            // Transparently retry query once.
            return await query(args);
          }

          throw error;
        }
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof makePrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? makePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
