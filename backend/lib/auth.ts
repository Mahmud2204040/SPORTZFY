import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";

import {
  SessionUser,
  SESSION_COOKIE_NAME,
  encodeSession,
  decodeSession,
} from "./session-token";

export type { SessionUser };
export { SESSION_COOKIE_NAME, encodeSession, decodeSession };

// Server helper to get current logged-in user from cookies
export async function getCurrentUser(): Promise<SessionUser | null> {
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  async function getUserFromToken(token: string | null) {
    if (!token) return null;
    const decoded = decodeSession(token);
    if (!decoded) return null;

    // Verify in database to ensure account is active and role is fresh
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
      },
    });

    if (!dbUser) return null;

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as SessionUser["role"],
      phone: dbUser.phone,
      avatarUrl: dbUser.avatarUrl,
    };
  }

  // Try bearer token first; if it's stale/invalid, fall back to cookie token.
  return (await getUserFromToken(bearerToken)) || (await getUserFromToken(cookieToken));
}
