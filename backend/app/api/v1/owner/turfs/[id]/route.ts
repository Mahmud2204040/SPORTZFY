import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { venueImageUrls } from "@/lib/venue-images";

const textFields = ["name", "city", "area", "address", "description", "pitchFormats", "coverImage"] as const;
const booleanFields = ["hasFloodlights", "hasParking", "hasWashroom", "hasChangingRoom", "hasWater"] as const;

function venueChanges(body: Record<string, unknown>): Record<string, string | number | boolean> {
  const changes: Record<string, string | number | boolean> = {};
  for (const key of textFields) {
    if (!(key in body)) continue;
    const value = body[key];
    if (typeof value !== "string" || (key !== "description" && key !== "coverImage" && !value.trim()) || value.length > 2000) throw new Error("INVALID_VENUE_FIELDS");
    changes[key] = value.trim();
  }
  for (const key of booleanFields) {
    if (!(key in body)) continue;
    const value = body[key];
    if (typeof value !== "boolean") throw new Error("INVALID_VENUE_FIELDS");
    changes[key] = value;
  }
  if ("basePricePerHour" in body) {
    const rate = Number(body.basePricePerHour);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 100000) throw new Error("INVALID_VENUE_FIELDS");
    changes.basePricePerHour = rate;
  }
  return changes;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Owner or administrator access required." } }, { status: 403 });
    }
    const { id } = await params;
    const turf = await prisma.turf.findUnique({
      where: currentUser.role === "ADMIN" ? { id } : { id, ownerId: currentUser.id },
      include: {
        images: true,
        availabilityRules: true,
        blockedIntervals: true,
        revisions: { where: { status: "PENDING_REVIEW" }, orderBy: { submittedAt: "desc" }, take: 1 },
      },
    });

    if (!turf) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Venue not found." } },
        { status: 404 }
      );
    }

    const { revisions, ...venue } = turf;
    return NextResponse.json({ data: { ...venue, pendingRevision: revisions[0] || null } });
  } catch (error) {
    console.error("Error fetching turf:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch venue." } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Owner or administrator access required." } },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify ownership
    const existingTurf = await prisma.turf.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true },
    });

    if (!existingTurf) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Venue not found." } },
        { status: 404 }
      );
    }

    if (currentUser.role === "OWNER" && existingTurf.ownerId !== currentUser.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have permission to edit another owner's venue." } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const changes = venueChanges(body);
    const imageUrls = "imageUrls" in body ? venueImageUrls(body.imageUrls) : undefined;
    if (Object.keys(changes).length === 0 && !imageUrls) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "No venue changes supplied." } }, { status: 400 });

    if (currentUser.role === "OWNER" && existingTurf.status === "APPROVED") {
      const existingRevision = await prisma.turfRevision.findFirst({ where: { turfId: id, status: "PENDING_REVIEW" } });
      const payload = { ...(existingRevision?.payload as Record<string, unknown> || {}), ...changes, ...(imageUrls ? { imageUrls } : {}) };
      const revision = existingRevision
        ? await prisma.turfRevision.update({ where: { id: existingRevision.id }, data: { payload: payload as Prisma.InputJsonValue, submittedAt: new Date() } })
        : await prisma.turfRevision.create({ data: { turfId: id, payload: payload as Prisma.InputJsonValue } });
      const live = await prisma.turf.findUniqueOrThrow({ where: { id } });
      return NextResponse.json({ data: { ...live, pendingRevision: revision }, message: "Changes submitted for review. The approved listing remains visible to players." });
    }

    const updated = await prisma.turf.update({ where: { id }, data: { ...changes, ...(imageUrls ? { images: { deleteMany: {}, create: imageUrls.map((url, order) => ({ url, order })) } } : {}) }, include: { images: { orderBy: { order: "asc" } } } });

    return NextResponse.json({
      data: updated,
      message: currentUser.role === "OWNER" ? "Venue draft updated." : "Venue updated successfully.",
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "INVALID_VENUE_FIELDS" || error.message === "INVALID_VENUE_IMAGES")) return NextResponse.json({ error: { code: "BAD_REQUEST", message: error.message === "INVALID_VENUE_IMAGES" ? "Use up to 10 unique HTTP or HTTPS image URLs." : "Invalid venue details." } }, { status: 400 });
    console.error("Error updating turf:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update venue." } },
      { status: 500 }
    );
  }
}
