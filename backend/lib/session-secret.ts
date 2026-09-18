const DEV_SESSION_SECRET = "sportzfy_dev_fallback_secret_chattogram_2026";

export function getSessionSecret(): string {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set to at least 32 characters in production.");
  return DEV_SESSION_SECRET;
}
