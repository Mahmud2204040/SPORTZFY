import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Owner access required." } }, { status: 403 });
  const { id } = await params;
  const turf = await prisma.turf.findUnique({ where: { id } });
  if (!turf || (user.role === "OWNER" && turf.ownerId !== user.id)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Venue draft not found." } }, { status: 404 });
  if (turf.status !== "DRAFT" && turf.status !== "REJECTED") return NextResponse.json({ error: { code: "CONFLICT", message: "This venue is already submitted." } }, { status: 409 });
  if (![turf.name, turf.city, turf.area, turf.address, turf.description, turf.pitchFormats, turf.coverImage].every(value => value.trim().length > 0) || turf.basePricePerHour <= 0) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Complete all venue details, image, format, and base price before submitting." } }, { status: 400 });
  }
  const updated = await prisma.turf.update({ where: { id }, data: { status: "PENDING_REVIEW" } });
  return NextResponse.json({ data: updated, message: "Venue submitted for administrator review." });
}
