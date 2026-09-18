import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slotFitsSchedule } from "@/lib/schedule";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Owner access required." } }, { status: 403 });
    const body = await request.json();
    const { turfId, startTime, endTime, customerName } = body;
    if (typeof turfId !== "string" || typeof startTime !== "string" || typeof endTime !== "string" || typeof customerName !== "string" || !customerName.trim() || customerName.length > 80) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Venue, interval, and customer name are required." } }, { status: 400 });
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start <= new Date() || end <= start || end.getTime() - start.getTime() > 4 * 3600000) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Choose a future interval of no more than four hours." } }, { status: 400 });
    const created = await prisma.$transaction(async tx => {
      const turf = await tx.turf.findFirst({ where: user.role === "ADMIN" ? { id: turfId } : { id: turfId, ownerId: user.id } });
      if (!turf) throw new Error("NOT_FOUND");
      const rules = await tx.availabilityRule.findMany({ where: { turfId } });
      if (!slotFitsSchedule(start, end, rules)) throw new Error("OUTSIDE_SCHEDULE");
      const [booking, hold, block] = await Promise.all([
        tx.booking.findFirst({ where: { turfId, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] }, startTime: { lt: end }, endTime: { gt: start } }, select: { id: true } }),
        tx.hold.findFirst({ where: { turfId, status: "ACTIVE", expiresAt: { gt: new Date() }, startTime: { lt: end }, endTime: { gt: start } }, select: { id: true } }),
        tx.blockedInterval.findFirst({ where: { turfId, startTime: { lt: end }, endTime: { gt: start } }, select: { id: true } }),
      ]);
      if (booking || hold || block) throw new Error("SLOT_CONFLICT");
      return tx.blockedInterval.create({ data: { turfId, startTime: start, endTime: end, reason: `Walk-in booking: ${customerName.trim()}` } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ data: { ...created, type: "WALK_IN", paymentMode: "NONE" }, message: "Walk-in inventory recorded. No online payment was collected." }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: { code, message: "Venue not found." } }, { status: 404 });
    if (code === "OUTSIDE_SCHEDULE") return NextResponse.json({ error: { code, message: "Choose a slot within venue hours." } }, { status: 400 });
    if (code === "SLOT_CONFLICT" || (error as { code?: string }).code === "P2034") return NextResponse.json({ error: { code: "SLOT_CONFLICT", message: "This slot is booked, held, or blocked. Refresh inventory." } }, { status: 409 });
    console.error("Walk-in booking error:", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Could not record walk-in inventory." } }, { status: 500 });
  }
}
