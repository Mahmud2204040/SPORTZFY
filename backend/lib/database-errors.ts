export function isTransientDatabaseError(caught: unknown) {
  const error = caught as { message?: string; code?: string } | null;
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "");

  return code === "P1001" || code === "P1017" ||
    message.includes("can't reach database server") ||
    message.includes("engine is not yet connected") ||
    message.includes("connection closed") ||
    message.includes("connection terminated") ||
    message.includes("socket closed") ||
    message.includes("kind: closed");
}
