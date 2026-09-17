import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Platform administrator access required." } }, { status: 403 });
    }
    const { id } = await params;
    const turf = await prisma.turf.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        images: { orderBy: { order: "asc" } },
        bookings: { select: { id: true } },
      },
    });
    if (!turf) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Venue submission not found." } }, { status: 404 });
    return NextResponse.json({ data: turf });
  } catch (error) {
    console.error("Admin venue detail error:", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to load venue submission." } }, { status: 500 });
  }
}
