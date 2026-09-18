import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { calculateDynamicSlotPrice } from "@/lib/pricing";

export async function GET(_request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "OWNER") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Venue owner access required." } },
        { status: 403 }
      );
    }

    const ownerWhere = { id: currentUser.id };

    const owner = await prisma.user.findFirst({
      where: ownerWhere,
      include: {
        turfs: true,
      },
    });

    if (!owner) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Turf owner account not found." } },
        { status: 404 }
      );
    }

    const ownedTurfs = owner.turfs;
    const turfIds = ownedTurfs.map(t => t.id);
    const totals = await prisma.booking.aggregate({
      where: { turfId: { in: turfIds }, status: "CONFIRMED" },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });
    const totalRevenue = totals._sum.totalAmount ?? 0;
    const totalBookingsCount = totals._count._all;

    const upcomingWhere = {
      turfId: { in: turfIds },
      status: "CONFIRMED" as const,
      startTime: { gte: new Date() },
    };
    const upcomingSummary = await prisma.booking.aggregate({
      where: upcomingWhere,
      _count: { _all: true },
      _sum: { totalAmount: true },
    });
    const [bookingCounts, blockCounts] = await Promise.all([
      prisma.booking.groupBy({ by: ["turfId"], where: upcomingWhere, _count: { _all: true } }),
      prisma.blockedInterval.groupBy({ by: ["turfId"], where: { turfId: { in: turfIds }, endTime: { gt: new Date() } }, _count: { _all: true } }),
    ]);

    // Keep the preview bounded; the dashboard totals come from all matching bookings.
    const upcomingBookings = await prisma.booking.findMany({
      where: upcomingWhere,
      include: {
        turf: { select: { name: true, area: true } },
        user: { select: { name: true, phone: true } },
      },
      orderBy: { startTime: "asc" },
      take: 5,
    });

    // Show model suggestions only when this venue has enough recorded inputs.
    const recentCutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const recentCounts = await prisma.booking.groupBy({
      by: ["turfId"],
      where: { turfId: { in: turfIds }, status: "CONFIRMED", createdAt: { gte: recentCutoff } },
      _count: { _all: true },
    });
    const primaryTurf = ownedTurfs.filter(turf => turf.status === "APPROVED").sort((left, right) =>
      (recentCounts.find(item => item.turfId === right.id)?._count._all ?? 0) - (recentCounts.find(item => item.turfId === left.id)?._count._all ?? 0)
    )[0];
    const recentBookingsCount = recentCounts.find(item => item.turfId === primaryTurf?.id)?._count._all ?? 0;
    const enoughHistory = !!primaryTurf && recentBookingsCount >= 8;
    const historicalDensity = Math.min(0.95, recentBookingsCount / (28 * 8));

    // 1. Next Friday 8:00 PM BST (Peak floodlight window)
    const nextFridayPrime = new Date();
    const daysUntilFriday = (5 - nextFridayPrime.getUTCDay() + 7) % 7 || 7;
    nextFridayPrime.setUTCDate(nextFridayPrime.getUTCDate() + daysUntilFriday);
    nextFridayPrime.setUTCHours(14, 0, 0, 0); // 14:00 UTC = 20:00 BST

    const primeQuote = enoughHistory ? calculateDynamicSlotPrice(primaryTurf.basePricePerHour, nextFridayPrime, {
      venueRating: primaryTurf.rating,
      historicalDensity,
    }) : null;

    // 2. Next Monday 4:00 PM BST (Off-peak afternoon saver)
    const nextMondayOffPeak = new Date();
    const daysUntilMonday = (1 - nextMondayOffPeak.getUTCDay() + 7) % 7 || 7;
    nextMondayOffPeak.setUTCDate(nextMondayOffPeak.getUTCDate() + daysUntilMonday);
    nextMondayOffPeak.setUTCHours(10, 0, 0, 0); // 10:00 UTC = 16:00 BST

    const offPeakQuote = enoughHistory ? calculateDynamicSlotPrice(primaryTurf.basePricePerHour, nextMondayOffPeak, {
      venueRating: primaryTurf.rating,
      historicalDensity,
    }) : null;

    const aiPricingInsights = !primaryTurf || !primeQuote || !offPeakQuote ? [] : [
      {
        id: "insight-peak",
        turfId: primaryTurf.id,
        turfName: primaryTurf.name,
        targetWindow: "Friday · 8:00 PM Asia/Dhaka",
        demandTag: "Peak Hours",
        historicalBookings: recentBookingsCount,
        dataBasis: `${recentBookingsCount} confirmed bookings recorded in the last 28 days`,
        currentRate: primaryTurf.basePricePerHour,
        suggestedRate: primeQuote.finalPrice,
        recommendation: `Model quote for this Friday slot: ৳${primeQuote.finalPrice}/hr. Current base rate: ৳${primaryTurf.basePricePerHour}/hr. Review the schedule before changing your base rate.`,
        tag: "Peak Slot Recommendation",
      },
      {
        id: "insight-offpeak",
        turfId: primaryTurf.id,
        turfName: primaryTurf.name,
        targetWindow: "Monday · 4:00 PM Asia/Dhaka",
        demandTag: "Saver Slot",
        historicalBookings: recentBookingsCount,
        dataBasis: `${recentBookingsCount} confirmed bookings recorded in the last 28 days`,
        currentRate: primaryTurf.basePricePerHour,
        suggestedRate: offPeakQuote.finalPrice,
        recommendation: `Model quote for this Monday slot: ৳${offPeakQuote.finalPrice}/hr. Current base rate: ৳${primaryTurf.basePricePerHour}/hr. Review the schedule before changing your base rate.`,
        tag: "Off-Peak Saver Promotion",
      },
    ];

    return NextResponse.json({
      data: {
        owner: {
          id: owner.id,
          name: owner.name,
          email: owner.email,
        },
        stats: {
          totalVenues: ownedTurfs.length,
          totalBookings: totalBookingsCount,
          totalRevenue,
          upcomingBookings: upcomingSummary._count._all,
          upcomingValue: upcomingSummary._sum.totalAmount ?? 0,
          occupancyRate: null,
        },
        ownedTurfs: ownedTurfs.map((t) => ({
          id: t.id,
          name: t.name,
          area: t.area,
          city: t.city,
          basePricePerHour: t.basePricePerHour,
          pitchFormats: t.pitchFormats,
          rating: t.rating,
          reviewCount: t.reviewCount,
          status: t.status,
          coverImage: t.coverImage,
          activeBookingsCount: bookingCounts.find(item => item.turfId === t.id)?._count._all ?? 0,
          blockedIntervalsCount: blockCounts.find(item => item.turfId === t.id)?._count._all ?? 0,
        })),
        upcomingBookings,
        aiPricingInsights,
        dataBasis: "Recorded confirmed bookings",
        paymentMode: "DEMO",
      },
    });
  } catch (error) {
    console.error("Owner stats error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch owner statistics." } },
      { status: 500 }
    );
  }
}
