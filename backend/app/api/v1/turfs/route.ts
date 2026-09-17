import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const area = searchParams.get("area");
    const format = searchParams.get("format");
    const query = searchParams.get("q");
    const search = searchParams.get("search");
    const minPrice = Number(searchParams.get("minPrice"));
    const maxPrice = Number(searchParams.get("maxPrice"));

    const where: Record<string, unknown> = {
      status: "APPROVED",
    };

    if (city && city !== "All") {
      where.city = city;
    }

    if (area && area !== "All") {
      where.area = area;
    }

    if (format && format !== "All") {
      where.pitchFormats = {
        contains: format,
        mode: "insensitive",
      };
    }

    if (query || search) {
      const text = query || search || "";
      where.OR = [
        { name: { contains: text, mode: "insensitive" } },
        { area: { contains: text, mode: "insensitive" } },
        { address: { contains: text, mode: "insensitive" } },
        { city: { contains: text, mode: "insensitive" } },
      ];
    }

    if (Number.isFinite(minPrice) && minPrice > 0) where.basePricePerHour = { ...(where.basePricePerHour as object || {}), gte: minPrice };
    if (Number.isFinite(maxPrice) && maxPrice > 0) where.basePricePerHour = { ...(where.basePricePerHour as object || {}), lte: maxPrice };

    const turfs = await prisma.turf.findMany({
      where,
      include: {
        images: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { rating: "desc" },
    });

    return NextResponse.json({
      data: turfs,
      count: turfs.length,
      page: { nextCursor: null, hasMore: false },
    });
  } catch (error) {
    console.error("Error fetching turfs:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch turfs" } },
      { status: 500 }
    );
  }
}
