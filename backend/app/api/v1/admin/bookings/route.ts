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
    const status = searchParams.get("status");
    if (status && !["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(status)) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid booking status." } }, { status: 400 });
    const rows = await prisma.booking.findMany({
      where: status ? { status } : {},
      select: { id: true, referenceCode: true, status: true, startTime: true, endTime: true, totalAmount: true, createdAt: true, user: { select: { id: true, name: true } }, turf: { select: { id: true, name: true, city: true, area: true } }, cancellation: { select: { reason: true, createdAt: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const items = rows.slice(0, limit);
    return NextResponse.json({ data: items, page: { nextCursor: rows.length > limit ? items[items.length - 1].id : null } });
  } catch (error) {
    console.error("Admin bookings error:", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to load bookings." } }, { status: 500 });
  }
}
