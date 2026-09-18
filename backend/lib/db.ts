import { PrismaClient } from "@prisma/client";

const safeReadOperations = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]);

function makePrismaClient() {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Client extension for resilient auto-reconnection on Neon serverless idle socket disconnects
  return baseClient.$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        try {
          return await query(args);
        } catch (caught: unknown) {
          const error = caught as { message?: string; code?: string };
          const errorMessage = String(error?.message || "");
          const errorCode = String(error?.code || "");
          const lower = errorMessage.toLowerCase();

          // Neon / Postgres connections can be dropped when idle.
          // Prisma error shapes vary, so we match a few common substrings.
          const isTransientConnectionError =
            lower.includes("kind: closed") ||
            lower.includes("error { kind: closed") ||
            lower.includes("connection closed") ||
            lower.includes("connection terminated") ||
            lower.includes("socket closed") ||
            lower.includes("can't reach database server") ||
            lower.includes("closed") ||
            errorCode === "P1001" ||
            errorCode === "P1017";

          // A dropped response can hide a committed write. Never replay a mutation.
          if (isTransientConnectionError && safeReadOperations.has(operation)) {
            console.warn(
              `[Prisma Resilience] Auto-reconnecting after transient socket drop in ${model || "raw"}.${operation}:`,
              errorMessage.slice(0, 100)
            );

            // Re-establish connection cleanly
            // Reconnect cleanly. If disconnect fails, still try connect.
            await baseClient.$disconnect().catch(() => {});
            await baseClient.$connect().catch(() => {});

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
