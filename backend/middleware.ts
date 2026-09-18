import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyEdgeSession } from "@/lib/edge-auth";

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = (process.env.CORS_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== "production") allowed.push("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8081");
  if (!origin || !allowed.includes(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Cookie",
    "Access-Control-Max-Age": "86400",
  } as Record<string, string>;
}

function withCors(res: NextResponse, request: NextRequest) {
  const cors = getCorsHeaders(request);
  Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname.startsWith("/admin");
  const isOwnerRoute = pathname.startsWith("/owner");

  // Always answer CORS preflight requests.
  if (request.method === "OPTIONS") {
    const cors = getCorsHeaders(request);
    return withCors(new NextResponse(null, { status: "Access-Control-Allow-Origin" in cors ? 204 : 403 }), request);
  }

  // For any non-admin/non-owner routes (including /api/v1/*), we only attach
  // CORS headers and let the request continue.
  if (!isAdminRoute && !isOwnerRoute) {
    return withCors(NextResponse.next(), request);
  }

  // Protected route definitions
  const sessionCookie = request.cookies.get("sportzfy_session")?.value;

  // If not logged in at all, redirect to login
  if (!sessionCookie) {
    const roleParam = isAdminRoute ? "admin" : "owner";
    const loginUrl = new URL(
      `/login?role=${roleParam}&redirect=${encodeURIComponent(pathname)}`,
      request.url
    );
    return withCors(NextResponse.redirect(loginUrl), request);
  }

  // Cryptographically decode and verify session cookie via Web Crypto
  const user = await verifyEdgeSession(sessionCookie);

  if (!user) {
    // Tampered, expired, or invalid token
    const loginUrl = new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url);
    return withCors(NextResponse.redirect(loginUrl), request);
  }

  // 1. Admin route protection: must have role ADMIN
  if (isAdminRoute && user.role !== "ADMIN") {
    const loginUrl = new URL(
      `/login?role=admin&unauthorized=true&redirect=${encodeURIComponent(pathname)}`,
      request.url
    );
    return withCors(NextResponse.redirect(loginUrl), request);
  }

  // 2. Owner route protection: must have role OWNER or ADMIN
  if (isOwnerRoute && user.role !== "OWNER" && user.role !== "ADMIN") {
    const loginUrl = new URL(
      `/login?role=owner&unauthorized=true&redirect=${encodeURIComponent(pathname)}`,
      request.url
    );
    return withCors(NextResponse.redirect(loginUrl), request);
  }

  return withCors(NextResponse.next(), request);
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/api/v1/:path*"],
};
