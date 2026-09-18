import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { demoPaymentAdapter } from "@/lib/payment";

const ALLOWED_PAYMENT_METHODS = ["BKASH", "NAGAD", "ROCKET", "CARD"];

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in to view your bookings.",
          },
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") || 50);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 50;
    const cursor = searchParams.get("cursor");
    const myBookings = await prisma.booking.findMany({
      where: { userId: currentUser.id },
      include: {
        turf: {
          select: {
            id: true,
            name: true,
            coverImage: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const page = myBookings.slice(0, limit);
    const hasMore = myBookings.length > limit;

    return NextResponse.json({
      data: page.map((b) => ({
        id: b.id,
        referenceCode: b.referenceCode,
        turfId: b.turfId,
        startTime: b.startTime,
        endTime: b.endTime,
        totalAmount: b.totalAmount,
        status: b.status,
        paymentMethod: b.paymentMethod,
        qrCode: null,
        paymentMode: "DEMO",
        turf: b.turf,
      })),
      page: { nextCursor: hasMore ? page[page.length - 1].id : null, hasMore },
      message: "Bookings loaded successfully.",
    });
  } catch (error) {
    console.error("Error fetching my bookings:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load bookings." } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let requestedHoldId: string | null = null;
  let requestedKey: string | null = null;
  try {
    const body = await request.json();
    const { holdId, paymentMethod = "BKASH" } = body;
    requestedHoldId = typeof holdId === "string" ? holdId : null;

    if (typeof holdId !== "string" || !holdId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Hold ID is required to confirm booking." } },
        { status: 400 }
      );
    }

    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: { code: "INVALID_PAYMENT", message: "Unsupported payment method selected." } },
        { status: 400 }
      );
    }

    // Require authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in to confirm your booking.",
          },
        },
        { status: 401 }
      );
    }

    const now = new Date();
    const suppliedKey = request.headers.get("Idempotency-Key");
    if (suppliedKey && (suppliedKey.length > 128 || suppliedKey.length < 8)) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid idempotency key." } }, { status: 400 });
    const idempotencyKey = suppliedKey || `hold-${holdId}`;
    requestedKey = idempotencyKey;

    const replay = await prisma.paymentAttempt.findUnique({ where: { idempotencyKey }, include: { booking: { include: { turf: true } } } });
    if (replay?.booking) {
      if (replay.booking.holdId !== holdId) return NextResponse.json({ error: { code: "IDEMPOTENCY_CONFLICT", message: "This key was used for a different hold." } }, { status: 409 });
      if (replay.booking.userId !== currentUser.id && currentUser.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN", message: "This booking belongs to another account." } }, { status: 403 });
      return NextResponse.json({ data: { ...replay.booking, paymentMode: "DEMO", qrCode: null }, message: "Demo booking already confirmed. No money was charged." });
    }

    const existingBooking = await prisma.booking.findUnique({
      where: { holdId },
      include: { turf: { select: { name: true, area: true, city: true, address: true, pitchFormats: true } }, user: { select: { name: true, phone: true, email: true } } },
    });
    if (existingBooking) {
      if (existingBooking.userId !== currentUser.id && currentUser.role !== "ADMIN") {
        return NextResponse.json({ error: { code: "FORBIDDEN", message: "This booking belongs to another account." } }, { status: 403 });
      }
      return NextResponse.json({ data: { ...existingBooking, paymentMode: "DEMO", qrCode: null }, message: "Demo booking already confirmed. No money was charged." });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify hold
      const hold = await tx.hold.findUnique({
        where: { id: holdId },
        include: { turf: true, user: true },
      });

      if (!hold) {
        throw new Error("HOLD_NOT_FOUND");
      }

      // Security: Ensure confirming player is the one who acquired the hold (or admin)
      if (hold.userId !== currentUser.id && currentUser.role !== "ADMIN") {
        throw new Error("UNAUTHORIZED_HOLD_ACCESS");
      }

      if (hold.status !== "ACTIVE" || hold.expiresAt <= now) {
        throw new Error("HOLD_EXPIRED");
      }

      // 2. Generate unique collision-resistant match ticket reference (CSPRNG)
      const timePart = Date.now().toString(36).toUpperCase();
      const randHex = crypto.randomBytes(4).toString("hex").toUpperCase();
      const referenceCode = `SPZ-2026-${timePart}-${randHex}`;
      const generatedTxId = `DEMO-${referenceCode}`;

      // 3. Create confirmed booking
      const booking = await tx.booking.create({
        data: {
          referenceCode,
          turfId: hold.turfId,
          userId: hold.userId,
          holdId: hold.id,
          startTime: hold.startTime,
          endTime: hold.endTime,
          totalAmount: hold.price,
          status: "CONFIRMED",
          paymentMethod,
          transactionId: generatedTxId,
        },
        include: {
          turf: {
            select: {
              name: true,
              area: true,
              city: true,
              address: true,
              pitchFormats: true,
            },
          },
          user: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      // 4. Update hold status
      await tx.hold.update({
        where: { id: hold.id },
        data: { status: "CONSUMED" },
      });

      // 5. Record payment attempt
      const capture = demoPaymentAdapter.capture({ amount: hold.price, method: paymentMethod, idempotencyKey });
      await tx.paymentAttempt.create({
        data: {
          bookingId: booking.id,
          holdId: hold.id,
          provider: capture.provider,
          accountNumber: capture.accountNumber,
          amount: capture.amount,
          status: capture.status,
          idempotencyKey: capture.idempotencyKey,
        },
      });

      return booking;
    });

    return NextResponse.json(
      {
        data: {
          ...result,
          paymentMode: "DEMO",
          qrCode: null,
        },
        message: "Demo booking confirmed. No money was charged.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    if ((error as { code?: string }).code === "P2002" && requestedKey && requestedHoldId) {
      const replay = await prisma.paymentAttempt.findUnique({ where: { idempotencyKey: requestedKey }, include: { booking: true } });
      if (replay?.booking && replay.booking.holdId !== requestedHoldId) return NextResponse.json({ error: { code: "IDEMPOTENCY_CONFLICT", message: "This key was used for a different hold." } }, { status: 409 });
    }
    if ((error as { code?: string }).code === "P2002" && requestedHoldId) {
      const existing = await prisma.booking.findUnique({ where: { holdId: requestedHoldId }, include: { turf: true, user: { select: { name: true } } } });
      const currentUser = await getCurrentUser();
      if (existing && currentUser && (existing.userId === currentUser.id || currentUser.role === "ADMIN")) {
        return NextResponse.json({ data: { ...existing, paymentMode: "DEMO", qrCode: null }, message: "Demo booking already confirmed. No money was charged." });
      }
    }
    if (err.message === "HOLD_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Hold reservation was not found." } },
        { status: 404 }
      );
    }
    if (err.message === "HOLD_EXPIRED") {
      return NextResponse.json(
        {
          error: {
            code: "HOLD_EXPIRED",
            message: "Your 5-minute hold expired before payment. Please select the slot again.",
          },
        },
        { status: 410 }
      );
    }
    if (err.message === "UNAUTHORIZED_HOLD_ACCESS") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Unauthorized. You cannot confirm a booking for a hold belonging to another user.",
          },
        },
        { status: 403 }
      );
    }

    console.error("Booking confirmation error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to confirm booking." } },
      { status: 500 }
    );
  }
}
