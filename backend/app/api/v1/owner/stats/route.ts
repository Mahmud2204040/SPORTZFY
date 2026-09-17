import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { calculateDynamicSlotPrice } from "@/lib/pricing";

export async function GET(_request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Venue Owner or Administrator access required." } },
        { status: 403 }
      );
    }

    const ownerWhere = currentUser.role === "ADMIN" ? { role: "OWNER" } : { id: currentUser.id };

    // Fetch the authenticated owner's recorded venues and bookings.
    const owner = await prisma.user.findFirst({
      where: ownerWhere,
      include: {
        turfs: {
          include: {
            bookings: {
              where: { status: "CONFIRMED" },
            },
            blockedIntervals: true,
          },
        },
      },
    });

    if (!owner) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Turf owner account not found." } },
        { status: 404 }
      );
    }

    const ownedTurfs = owner.turfs;
    const allBookings = ownedTurfs.flatMap((t) => t.bookings);

    // Calculate metrics
    const totalRevenue = allBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalBookingsCount = allBookings.length;

    const upcomingWhere = {
      turfId: { in: ownedTurfs.map((t) => t.id) },
      status: "CONFIRMED" as const,
      startTime: { gte: new Date() },
    };
    const upcomingSummary = await prisma.booking.aggregate({
      where: upcomingWhere,
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

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
    const primaryTurf = ownedTurfs[0];
    const recentCutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const recentBookings = primaryTurf?.bookings.filter((booking) => booking.createdAt >= recentCutoff) || [];
    const enoughHistory = !!primaryTurf && recentBookings.length >= 8;
    const historicalDensity = Math.min(0.95, recentBookings.length / (28 * 8));

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
        historicalBookings: recentBookings.length,
        dataBasis: `${recentBookings.length} confirmed bookings recorded in the last 28 days`,
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
        historicalBookings: recentBookings.length,
        dataBasis: `${recentBookings.length} confirmed bookings recorded in the last 28 days`,
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
          activeBookingsCount: t.bookings.length,
          blockedIntervalsCount: t.blockedIntervals.length,
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
