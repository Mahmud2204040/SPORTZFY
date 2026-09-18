import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { calculateDynamicSlotPrice } from "@/lib/pricing";
import { dhakaDate, dhakaDayStart, scheduleForDate } from "@/lib/schedule";
import { templatePricingExplanation } from "@/lib/pricing-explanation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || dhakaDate(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam) || Number.isNaN(dhakaDayStart(dateParam).getTime()) || dhakaDate(dhakaDayStart(dateParam)) !== dateParam) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid date." } }, { status: 400 });
    }

    const turf = await prisma.turf.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!turf) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Turf not found" } },
        { status: 404 }
      );
    }
    if (turf.status !== "APPROVED") {
      const user = await getCurrentUser();
      if (!user || (user.role !== "ADMIN" && user.id !== turf.ownerId)) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "Turf not found" } }, { status: 404 });
      }
    }

    // Define target date bounds deterministically in Bangladesh Standard Time (BST / UTC+6)
    const dayStart = dhakaDayStart(dateParam);
    const dayEnd = new Date(dayStart.getTime() + 30 * 60 * 60 * 1000);
    const rules = await prisma.availabilityRule.findMany({ where: { turfId: turf.id } });
    const schedule = scheduleForDate(dateParam, rules);

    // Fetch existing bookings overlapping with target day range
    const bookings = await prisma.booking.findMany({
      where: {
        turfId: turf.id,
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
    });

    // Fetch active holds overlapping with target day range
    const now = new Date();
    const activeHolds = await prisma.hold.findMany({
      where: {
        turfId: turf.id,
        status: "ACTIVE",
        expiresAt: { gt: now },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
    });

    // Fetch blocked intervals overlapping with target day range
    const blockedIntervals = await prisma.blockedInterval.findMany({
      where: {
        turfId: turf.id,
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
    });

    // Calculate 4-week rolling booking density to feed the ML model
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const recentBookingsCount = await prisma.booking.count({
      where: {
        turfId: turf.id,
        status: "CONFIRMED",
        createdAt: { gte: fourWeeksAgo },
      },
    });
    // Venue capacity across 28 days (~9 evening slots/day = 252 total slots)
    const historicalDensity = Math.min(0.95, Math.max(0.15, Math.round((recentBookingsCount / 252) * 100) / 100));

    // Build standard evening/night timetable: 4 PM (16:00) through 12 AM (24:00)
    // 16:00, 17:00, 18:00, 19:00, 20:00, 21:00, 22:00, 23:00, 24:00 (00:00)
    const slots = [];
    const hours = schedule.hours;

    for (const h of hours) {
      // In BST (UTC+6), UTC hour = h - 6
      const slotStart = new Date(dayStart.getTime() + h * 60 * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

      // Check collisions
      const isBooked = bookings.some(
        (b) => slotStart < b.endTime && slotEnd > b.startTime
      );

      const activeHold = activeHolds.find(
        (hd) => slotStart < hd.endTime && slotEnd > hd.startTime
      );

      const isBlocked = blockedIntervals.some(
        (bi) => slotStart < bi.endTime && slotEnd > bi.startTime
      );

      let status = "AVAILABLE";
      if (slotStart <= now) {
        status = "UNAVAILABLE"; // Cannot book slots in the past
      } else if (isBooked) {
        status = "BOOKED";
      } else if (activeHold) {
        status = "HELD";
      } else if (isBlocked) {
        status = "BLOCKED";
      }

      // Calculate dynamic price using native Random Forest in-process engine with live density
      const hourlyRate = schedule.rateByHour.get(h) ?? turf.basePricePerHour;
      const dynamicQuote = calculateDynamicSlotPrice(hourlyRate, slotStart, {
        venueRating: turf.rating,
        historicalDensity,
      });

      // Format human-readable time label with 24-hour modulo arithmetic
      const startHour24 = h % 24;
      const endHour24 = (h + 1) % 24;
      const startHourNum = startHour24 === 0 ? 12 : startHour24 > 12 ? startHour24 - 12 : startHour24;
      const startPeriod = startHour24 >= 12 ? "PM" : "AM";
      const endHourNum = endHour24 === 0 ? 12 : endHour24 > 12 ? endHour24 - 12 : endHour24;
      const endPeriod = endHour24 >= 12 ? "PM" : "AM";
      const label = `${startHourNum}:00 ${startPeriod} - ${endHourNum}:00 ${endPeriod}`;

      slots.push({
        slotId: `${turf.id}_${slotStart.getTime()}`,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        timeLabel: label,
        isPeakHour: dynamicQuote.isPeak,
        isDiscounted: dynamicQuote.isDiscounted,
        demandScore: dynamicQuote.demandScore,
        multiplier: dynamicQuote.multiplier,
        badgeText: dynamicQuote.badgeText,
        pricingExplanation: templatePricingExplanation.explain({ basePrice: hourlyRate, quotedPrice: dynamicQuote.finalPrice, hourDhaka: h % 24, recentConfirmedBookings: recentBookingsCount, sampleData: recentBookingsCount < 5 }),
        pricingFactors: { hourDhaka: h % 24, recentConfirmedBookings: recentBookingsCount, venueRating: turf.rating },
        modelSource: "LOCAL_RANDOM_FOREST",
        sampleData: recentBookingsCount < 5,
        quoteTime: now.toISOString(),
        quoteExpiresAt: new Date(now.getTime() + 30000).toISOString(),
        price: dynamicQuote.finalPrice,
        basePrice: hourlyRate,
        status, // "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED"
        holdExpiresAt: activeHold ? activeHold.expiresAt.toISOString() : null,
      });
    }

    return NextResponse.json({
      data: {
        turfId: turf.id,
        turfName: turf.name,
        date: dateParam,
        scheduleSource: schedule.fallback ? "LEGACY_TIMETABLE" : "OWNER_RULES",
        slots,
      },
    });
  } catch (error) {
    console.error("Error computing availability:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to compute availability" } },
      { status: 500 }
    );
  }
}
