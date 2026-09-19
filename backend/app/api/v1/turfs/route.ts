import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isTransientDatabaseError } from "@/lib/database-errors";
import { calculateDynamicSlotPrice } from "@/lib/pricing";
import { dhakaDate, dhakaDayStart, scheduleForDate } from "@/lib/schedule";

const amenityFields = ["hasFloodlights", "hasParking", "hasWashroom", "hasChangingRoom", "hasWater"] as const;

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const city = params.get("city");
    const area = params.get("area");
    const format = params.get("format");
    const search = params.get("q") || params.get("search");
    const date = params.get("date") || (params.get("availableOnly") === "true" ? dhakaDate(new Date()) : null);
    const cursor = params.get("cursor");
    const requestedLimit = Number(params.get("limit") || 30);
    const limit = Math.max(1, Math.min(30, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 30));
    const minPrice = params.has("minPrice") ? Number(params.get("minPrice")) : null;
    const maxPrice = params.has("maxPrice") ? Number(params.get("maxPrice")) : null;
    const startHour = params.has("startHour") ? Number(params.get("startHour")) : null;
    const endHour = params.has("endHour") ? Number(params.get("endHour")) : null;
    const availableOnly = params.get("availableOnly") === "true";
    const minRating = params.has("minRating") ? Number(params.get("minRating")) : null;
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(dhakaDayStart(date).getTime()) || dhakaDate(dhakaDayStart(date)) !== date)) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid date." } }, { status: 400 });
    }
    if ([minPrice, maxPrice, startHour, endHour, minRating].some(value => value !== null && (!Number.isFinite(value) || value < 0))) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid filter value." } }, { status: 400 });
    }
    if ((startHour !== null && startHour > 29) || (endHour !== null && endHour > 30) || (startHour !== null && endHour !== null && endHour <= startHour) || (minPrice !== null && maxPrice !== null && maxPrice < minPrice)) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid time or price range." } }, { status: 400 });
    }
    const where: Prisma.TurfWhereInput = { status: "APPROVED" };
    if (city && city !== "All") where.city = { equals: city, mode: "insensitive" };
    if (area && area !== "All") where.area = { equals: area, mode: "insensitive" };
    if (format && format !== "All") where.pitchFormats = { contains: format, mode: "insensitive" };
    if (minRating !== null) where.rating = { gte: minRating };
    if (search) where.OR = ["name", "area", "address", "city"].map(field => ({ [field]: { contains: search, mode: "insensitive" } }));
    const amenities = (params.get("amenities") || "").split(",").filter(Boolean);
    if (amenities.some(item => !amenityFields.includes(item as typeof amenityFields[number]))) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid amenity." } }, { status: 400 });
    }
    for (const item of amenities) Object.assign(where, { [item]: true });
    if (!date && (minPrice !== null || maxPrice !== null)) where.basePricePerHour = { ...(minPrice !== null ? { gte: minPrice } : {}), ...(maxPrice !== null ? { lte: maxPrice } : {}) };

    const now = new Date();
    const filtered: Record<string, unknown>[] = [];
    let scanCursor = cursor;
    let hasMore = false;
    let scanned = 0;
    do {
    const page = await prisma.turf.findMany({
      where,
      include: { images: { orderBy: { order: "asc" } }, availabilityRules: true },
      orderBy: [{ rating: "desc" }, { id: "desc" }],
      ...(scanCursor ? { cursor: { id: scanCursor }, skip: 1 } : {}),
      take: limit + 1,
    });
    hasMore = page.length > limit;
    const batch = page.slice(0, limit);
    if (batch.length === 0) { hasMore = false; break; }
    const turfs = await Promise.all(batch.map(async turf => {
      const { availabilityRules, ...publicTurf } = turf;
      if (!date) return publicTurf;
      const dayStart = dhakaDayStart(date);
      const schedule = scheduleForDate(date, availabilityRules);
      const dayEnd = new Date(dayStart.getTime() + 30 * 60 * 60 * 1000);
      const [bookings, holds, blocks, recentBookingsCount] = await Promise.all([
        prisma.booking.findMany({ where: { turfId: turf.id, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] }, startTime: { lt: dayEnd }, endTime: { gt: dayStart } }, select: { startTime: true, endTime: true } }),
        prisma.hold.findMany({ where: { turfId: turf.id, status: "ACTIVE", expiresAt: { gt: now }, startTime: { lt: dayEnd }, endTime: { gt: dayStart } }, select: { startTime: true, endTime: true } }),
        prisma.blockedInterval.findMany({ where: { turfId: turf.id, startTime: { lt: dayEnd }, endTime: { gt: dayStart } }, select: { startTime: true, endTime: true } }),
        prisma.booking.count({ where: { turfId: turf.id, status: "CONFIRMED", createdAt: { gte: new Date(now.getTime() - 28 * 86400000) } } }),
      ]);
      const density = Math.min(0.95, Math.max(0.15, Math.round((recentBookingsCount / 252) * 100) / 100));
      let availableCount = 0;
      let lowestAvailablePrice: number | null = null;
      let priceMatch = false;
      const overlapping = (items: { startTime: Date; endTime: Date }[], start: Date, end: Date) => items.some(item => start < item.endTime && end > item.startTime);
      for (const hour of schedule.hours) {
        if (startHour !== null && hour < startHour) continue;
        if (endHour !== null && hour + 1 > endHour) continue;
        const start = new Date(dayStart.getTime() + hour * 3600000);
        const end = new Date(start.getTime() + 3600000);
        if (start <= now || overlapping(bookings, start, end) || overlapping(holds, start, end) || overlapping(blocks, start, end)) continue;
        const quote = calculateDynamicSlotPrice(schedule.rateByHour.get(hour) ?? turf.basePricePerHour, start, { venueRating: turf.rating, historicalDensity: density });
        availableCount++;
        lowestAvailablePrice = Math.min(lowestAvailablePrice ?? quote.finalPrice, quote.finalPrice);
        if ((minPrice === null || quote.finalPrice >= minPrice) && (maxPrice === null || quote.finalPrice <= maxPrice)) priceMatch = true;
      }
      return { ...publicTurf, selectedDateAvailability: { date, availableCount, lowestAvailablePrice, priceMatch, scheduleSource: schedule.fallback ? "LEGACY_TIMETABLE" : "OWNER_RULES" } };
    }));
    for (let index = 0; index < turfs.length; index++) {
      const turf = turfs[index];
      scanned++;
      scanCursor = batch[index].id;
      const summary = "selectedDateAvailability" in turf ? turf.selectedDateAvailability : null;
      const matches = !date || !!summary && (!availableOnly || summary.availableCount > 0) && ((minPrice === null && maxPrice === null) || summary.priceMatch);
      if (matches) filtered.push(turf);
      if (filtered.length === limit) break;
    }
    if (scanCursor === batch.at(-1)?.id && !hasMore) break;
    } while (filtered.length < limit && scanned < 300);
    const nextCursor = hasMore || filtered.length === limit ? scanCursor : null;
    return NextResponse.json({ data: filtered, count: filtered.length, page: { nextCursor, hasMore: !!nextCursor } });
  } catch (error) {
    console.error("Error fetching turfs:", error);
    if (isTransientDatabaseError(error)) {
      return NextResponse.json(
        { error: { code: "SERVICE_UNAVAILABLE", message: "Venue search is temporarily unavailable. Please retry." } },
        { status: 503, headers: { "Retry-After": "2" } }
      );
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch turfs" } }, { status: 500 });
  }
}
