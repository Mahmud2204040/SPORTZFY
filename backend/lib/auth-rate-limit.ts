import crypto from "crypto";
import { prisma } from "@/lib/db";

export async function consumeAuthAttempt(request: Request, identity: string, action: "login" | "register"): Promise<boolean> {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = crypto.createHash("sha256").update(`${action}:${forwarded}:${identity.toLowerCase()}`).digest("hex");
  const windowMinutes = action === "login" ? 15 : 60;
  const maximum = action === "login" ? 10 : 5;
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthRateLimit"."windowStart" < CURRENT_TIMESTAMP - (${windowMinutes} * INTERVAL '1 minute') THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "AuthRateLimit"."windowStart" < CURRENT_TIMESTAMP - (${windowMinutes} * INTERVAL '1 minute') THEN CURRENT_TIMESTAMP ELSE "AuthRateLimit"."windowStart" END
    RETURNING "count"
  `;
  return (rows[0]?.count || 0) <= maximum;
}

export async function clearAuthAttempts(request: Request, identity: string): Promise<void> {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = crypto.createHash("sha256").update(`login:${forwarded}:${identity.toLowerCase()}`).digest("hex");
  await prisma.authRateLimit.deleteMany({ where: { key } });
}
