import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required to view blocked intervals." } },
        { status: 401 }
      );
    }

    if (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Turf owner or administrator access required." } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const turfId = searchParams.get("turfId");

    const where: Prisma.BlockedIntervalWhereInput = {};
    if (currentUser.role === "OWNER") {
      where.turf = { ownerId: currentUser.id };
    }
    if (turfId) {
      where.turfId = turfId;
    }

    const intervals = await prisma.blockedInterval.findMany({
      where,
      include: {
        turf: { select: { name: true, area: true } },
      },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json({ data: intervals });
  } catch (error) {
    console.error("Error fetching blocked intervals:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch blocked intervals." } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Turf owner or administrator access required." } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { turfId, startTime, endTime, reason = "Walk-in reservation" } = body;

    if (typeof turfId !== "string" || typeof startTime !== "string" || typeof endTime !== "string" || typeof reason !== "string" || reason.length > 200) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Missing required slot interval parameters." } },
        { status: 400 }
      );
    }

    // Verify turf ownership
    if (currentUser.role === "OWNER") {
      const turf = await prisma.turf.findUnique({
        where: { id: turfId },
        select: { ownerId: true },
      });
      if (!turf || turf.ownerId !== currentUser.id) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You can only block intervals for your own venues." } },
          { status: 403 }
        );
      }
    }

    const slotStart = new Date(startTime);
    const slotEnd = new Date(endTime);

    if (!Number.isFinite(slotStart.getTime()) || !Number.isFinite(slotEnd.getTime()) || slotStart >= slotEnd || slotEnd <= new Date() || slotEnd.getTime() - slotStart.getTime() > 4 * 3600000) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Choose a future interval of no more than four hours." } }, { status: 400 });
    }

    const blocked = await prisma.$transaction(async tx => {
    const conflictingBooking = await tx.booking.findFirst({
      where: {
        turfId,
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        startTime: { lt: slotEnd },
        endTime: { gt: slotStart },
      },
    });

    if (conflictingBooking) {
      throw new Error("BOOKING_EXISTS");
    }

    // Check if slot currently has an active customer checkout hold
    const conflictingHold = await tx.hold.findFirst({
      where: {
        turfId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
        startTime: { lt: slotEnd },
        endTime: { gt: slotStart },
      },
    });

    if (conflictingHold) {
      throw new Error("HOLD_ACTIVE");
    }

    const conflictingBlock = await tx.blockedInterval.findFirst({ where: { turfId, startTime: { lt: slotEnd }, endTime: { gt: slotStart } } });
    if (conflictingBlock) throw new Error("BLOCK_EXISTS");

    return tx.blockedInterval.create({
      data: {
        turfId,
        startTime: slotStart,
        endTime: slotEnd,
        reason,
      },
    });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json(
      { data: blocked, message: "Slot successfully locked for walk-in / maintenance." },
      { status: 201 }
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["BOOKING_EXISTS", "HOLD_ACTIVE", "BLOCK_EXISTS"].includes(code) || (error as { code?: string }).code === "P2034") return NextResponse.json({ error: { code: "SLOT_CONFLICT", message: "This interval is booked, held, or already blocked. Refresh inventory and choose another slot." } }, { status: 409 });
    console.error("Error creating blocked interval:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to block interval." } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Turf owner or administrator access required." } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "ID is required to unblock slot." } },
        { status: 400 }
      );
    }

    // Verify ownership
    if (currentUser.role === "OWNER") {
      const interval = await prisma.blockedInterval.findUnique({
        where: { id },
        include: { turf: { select: { ownerId: true } } },
      });
      if (!interval || interval.turf.ownerId !== currentUser.id) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You can only unblock intervals for your own venues." } },
          { status: 403 }
        );
      }
    }

    await prisma.blockedInterval.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Slot unblocked successfully. Now bookable online." });
  } catch (error) {
    console.error("Error deleting blocked interval:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to delete blocked interval." } },
      { status: 500 }
    );
  }
}
