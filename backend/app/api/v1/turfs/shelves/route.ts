import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Haversine Great-Circle Distance Formula in Kilometers
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const { searchParams } = new URL(request.url);
    const cityParam = searchParams.get("city");
    const formatParam = searchParams.get("format");
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    const userLat = latParam !== null ? Number(latParam) : null;
    const userLng = lngParam !== null ? Number(lngParam) : null;
    const hasLocation = userLat !== null && userLng !== null && Number.isFinite(userLat) && Number.isFinite(userLng) && Math.abs(userLat) <= 90 && Math.abs(userLng) <= 180;

    // Build base turf query filter
    const whereClause: Prisma.TurfWhereInput = {
      status: "APPROVED",
    };

    if (cityParam && cityParam !== "All") {
      whereClause.city = { equals: cityParam, mode: "insensitive" };
    }

    if (formatParam && formatParam !== "All") {
      whereClause.pitchFormats = { contains: formatParam, mode: "insensitive" };
    }

    // Fetch turfs
    const allTurfs = await prisma.turf.findMany({
      where: whereClause,
      include: {
        images: {
          select: { url: true },
          take: 1,
        },
        _count: {
          select: { bookings: true, reviews: true },
        },
      },
    });

    // Distance appears only when the player supplied location coordinates.
    const enhancedTurfs = allTurfs.map((turf) => {
      const distance =
        hasLocation && turf.latitude != null && turf.longitude != null
          ? haversineDistanceKm(userLat!, userLng!, turf.latitude, turf.longitude)
          : null;

      return {
        id: turf.id,
        name: turf.name,
        slug: turf.slug,
        city: turf.city,
        area: turf.area,
        address: turf.address,
        coverImage: turf.coverImage,
        pitchFormats: turf.pitchFormats,
        basePricePerHour: turf.basePricePerHour,
        currentDynamicPrice: null,
        priceMultiplier: null,
        pricingBadge: null,
        rating: turf.rating,
        reviewCount: turf.reviewCount || turf._count.reviews,
        totalBookings: turf._count.bookings,
        distanceKm: distance,
        distanceLabel: distance === null ? null : `${distance} km away`,
        hasFloodlights: turf.hasFloodlights,
        hasParking: turf.hasParking,
        hasChangingRoom: turf.hasChangingRoom,
        hasWashroom: turf.hasWashroom,
        hasWater: turf.hasWater,
      };
    });

    // 1. Shelf: city discovery, or genuine distance when coordinates exist.
    const nearYouTurfs = [...enhancedTurfs]
      .sort((a, b) => hasLocation ? (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY) : a.name.localeCompare(b.name))
      .slice(0, 8);

    // 2. Lower published base rates. Slot quotes are shown only for selected dates.
    const bestDealsTurfs = [...enhancedTurfs]
      .sort((a, b) => a.basePricePerHour - b.basePricePerHour)
      .slice(0, 8);

    // 3. Shelf: Community Favorites (Rating >= 4.7, Sorted by Rating & Bookings)
    const communityFavoritesTurfs = [...enhancedTurfs]
      .sort((a, b) => b.rating - a.rating || b.totalBookings - a.totalBookings)
      .slice(0, 8);

    // 4. Shelf: Top Picks For You (Verified pitches with full amenities)
    const topPicksTurfs = [...enhancedTurfs]
      .filter((t) => t.hasFloodlights && t.hasParking)
      .sort((a, b) => b.totalBookings - a.totalBookings || b.rating - a.rating)
      .slice(0, 8);

    // 5. Shelf: Squads Needing Players (Open Matchmaking Posts)
    const matchWhere: Prisma.MatchPostWhereInput = {
      status: "OPEN",
      openSpots: { gt: 0 },
      matchTime: { gte: now },
    };

    if (cityParam && cityParam !== "All") {
      matchWhere.turf = { city: { equals: cityParam, mode: "insensitive" } };
    }

    const openMatches = await prisma.matchPost.findMany({
      where: matchWhere,
      include: {
        turf: {
          select: {
            name: true,
            slug: true,
            area: true,
            city: true,
            coverImage: true,
            basePricePerHour: true,
          },
        },
        hostUser: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { matchTime: "asc" },
      take: 6,
    });

    return NextResponse.json({
      success: true,
      meta: {
        referenceCoords: hasLocation ? { lat: userLat, lng: userLng } : null,
        totalVenuesFound: enhancedTurfs.length,
      },
      shelves: [
        {
          id: "near_you",
          title: hasLocation ? "Near You" : `Venues in ${cityParam || "your selection"}`,
          subtitle: hasLocation ? "Venues ordered by distance from your location" : "Approved local venues",
          icon: "MapPin",
          turfs: nearYouTurfs,
        },
        {
          id: "best_deals",
          title: "Lower Base Rates",
          subtitle: "Compare published hourly base rates; choose a slot for its live quote",
          icon: "Tag",
          turfs: bestDealsTurfs,
        },
        {
          id: "community_favorites",
          title: "Community Favorites",
          subtitle: "Top rated pitches by local amateur football squads",
          icon: "Star",
          turfs: communityFavoritesTurfs,
        },
        {
          id: "top_picks",
          title: "Well-equipped Venues",
          subtitle: "Approved venues with floodlights and parking",
          icon: "Sparkles",
          turfs: topPicksTurfs,
        },
      ],
      squadsShelf: {
        id: "squads_needing_players",
        title: "Squads Needing Players",
        subtitle: "Upcoming match sessions missing players — reserve your spot now",
        icon: "Users",
        matches: openMatches.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          sportFormat: m.sportFormat,
          matchTime: m.matchTime.toISOString(),
          area: m.area,
          totalSpots: m.totalSpots,
          openSpots: m.openSpots,
          costPerPlayer: m.costPerPlayer,
          turf: m.turf,
          hostName: m.hostUser?.name || "Match Captain",
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching discovery shelves:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load discovery shelves." } },
      { status: 500 }
    );
  }
}
