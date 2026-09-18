import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Administrator access required." } }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const limit = Math.min(30, Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10) || 20));
    const cursor = searchParams.get("cursor");
    const role = searchParams.get("role");
    if (role && !["CUSTOMER", "OWNER", "ADMIN"].includes(role)) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid role filter." } }, { status: 400 });
    const rows = await prisma.user.findMany({
      where: role ? { role } : {},
      select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { bookings: true, turfs: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const items = rows.slice(0, limit);
    return NextResponse.json({ data: items, page: { nextCursor: rows.length > limit ? items[items.length - 1].id : null } });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to load users." } }, { status: 500 });
  }
}
