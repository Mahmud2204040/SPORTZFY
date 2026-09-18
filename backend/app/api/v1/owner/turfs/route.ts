import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";
import { venueImageUrls } from "@/lib/venue-images";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Turf owner or administrator access required." } },
        { status: 403 }
      );
    }

    const where = currentUser.role === "ADMIN" ? {} : { ownerId: currentUser.id };

    const turfs = await prisma.turf.findMany({
      where,
      include: {
        images: { orderBy: { order: "asc" } },
        bookings: { select: { id: true, totalAmount: true } },
        blockedIntervals: true,
        revisions: { where: { status: "PENDING_REVIEW" }, orderBy: { submittedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: turfs.map(({ revisions, ...turf }) => ({ ...turf, pendingRevision: revisions[0] || null })) });
  } catch (error) {
    console.error("Error fetching owner turfs:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch owner venues." } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only registered turf owners can list new venues." } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      city,
      area,
      address,
      description,
      pitchFormats,
      basePricePerHour,
      coverImage,
      hasFloodlights = true,
      hasParking = true,
      hasWashroom = true,
      hasChangingRoom = true,
      hasWater = true,
      draft = false,
    } = body;
    const imageUrls = "imageUrls" in body ? venueImageUrls(body.imageUrls) : [];

    if (typeof name !== "string" || !name.trim() || name.length > 140 || typeof city !== "string" || typeof area !== "string" || typeof address !== "string" && address != null || typeof description !== "string" && description != null || !Number.isFinite(Number(basePricePerHour)) || Number(basePricePerHour) < 0 || Number(basePricePerHour) > 100000 || (!draft && (!city.trim() || !area.trim() || Number(basePricePerHour) <= 0))) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Missing required venue information." } },
        { status: 400 }
      );
    }

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomBytes(4).toString("hex")}`;

    const newTurf = await prisma.turf.create({
      data: {
        ownerId: currentUser.id,
        name: name.trim(),
        slug,
        city,
        area,
        address: address || "",
        description: description || "",
        pitchFormats: pitchFormats || "",
        basePricePerHour: Number(basePricePerHour),
        coverImage: coverImage || "",
        hasFloodlights: Boolean(hasFloodlights),
        hasParking: Boolean(hasParking),
        hasWashroom: Boolean(hasWashroom),
        hasChangingRoom: Boolean(hasChangingRoom),
        hasWater: Boolean(hasWater),
        status: draft ? "DRAFT" : "PENDING_REVIEW",
        images: { create: imageUrls.map((url, order) => ({ url, order })) },
      },
      include: { images: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(
      { data: newTurf, message: draft ? "Venue draft saved." : "Venue submitted for administrator review." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_VENUE_IMAGES") return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Use up to 10 unique HTTP or HTTPS image URLs." } }, { status: 400 });
    console.error("Error creating turf listing:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to create venue listing." } },
      { status: 500 }
    );
  }
}
