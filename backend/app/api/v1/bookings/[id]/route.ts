import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to view this booking." } }, { status: 401 });
  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { OR: [{ id }, { referenceCode: id }] },
    include: { turf: { include: { images: { orderBy: { order: "asc" } } } }, cancellation: { select: { reason: true, createdAt: true, actorId: true } } },
  });
  if (!booking || (user.role !== "ADMIN" && booking.userId !== user.id && !(user.role === "OWNER" && (await prisma.turf.findFirst({ where: { id: booking.turfId, ownerId: user.id }, select: { id: true } }))))) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking not found." } }, { status: 404 });
  }
  return NextResponse.json({ data: { ...booking, paymentMode: "DEMO", qrCode: null } });
}
