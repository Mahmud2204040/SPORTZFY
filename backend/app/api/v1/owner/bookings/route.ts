import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Venue partner access required." } }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") || 30);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 30;
    const cursor = searchParams.get("cursor");
    const bookings = await prisma.booking.findMany({
      where: user.role === "ADMIN" ? {} : { turf: { ownerId: user.id } },
      include: { turf: { select: { id: true, name: true, area: true, city: true } }, user: { select: { id: true, name: true, phone: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const hasMore = bookings.length > limit;
    const page = bookings.slice(0, limit);
    return NextResponse.json({ data: page, page: { nextCursor: hasMore ? page[page.length - 1].id : null, hasMore } });
  } catch (error) {
    console.error("Owner bookings error:", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to load venue bookings." } }, { status: 500 });
  }
}
