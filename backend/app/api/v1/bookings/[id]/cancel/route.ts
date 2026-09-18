import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to cancel a booking." } }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 3 || reason.length > 500) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Enter a cancellation reason (3–500 characters)." } }, { status: 400 });
    const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true, userId: true, status: true, startTime: true } });
    if (!booking || booking.userId !== user.id) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking not found." } }, { status: 404 });
    if (booking.status !== "CONFIRMED" || booking.startTime <= new Date()) return NextResponse.json({ error: { code: "CONFLICT", message: "This booking can no longer be cancelled." } }, { status: 409 });
    const result = await prisma.$transaction(async tx => {
      const changed = await tx.booking.updateMany({ where: { id, userId: user.id, status: "CONFIRMED", startTime: { gt: new Date() } }, data: { status: "CANCELLED" } });
      if (changed.count !== 1) throw new Error("CONFLICT");
      await tx.bookingCancellation.create({ data: { bookingId: id, actorId: user.id, reason } });
      return tx.booking.findUniqueOrThrow({ where: { id }, include: { turf: { select: { id: true, name: true, area: true, city: true } }, cancellation: true } });
    });
    return NextResponse.json({ data: { ...result, paymentMode: "DEMO", qrCode: null }, message: "Booking cancelled. No money was charged." });
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") return NextResponse.json({ error: { code: "CONFLICT", message: "This booking can no longer be cancelled." } }, { status: 409 });
    console.error("Booking cancellation error:", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Could not cancel booking." } }, { status: 500 });
  }
}
