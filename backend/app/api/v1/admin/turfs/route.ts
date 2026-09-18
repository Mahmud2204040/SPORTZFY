import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Platform administrator access required." } },
        { status: 403 }
      );
    }
    const turfs = await prisma.turf.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        bookings: { select: { id: true } },
        revisions: { where: { status: "PENDING_REVIEW" }, orderBy: { submittedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: turfs.map(({ revisions, ...turf }) => ({ ...turf, liveStatus: turf.status, status: revisions.length ? "PENDING_REVIEW" : turf.status, pendingRevision: revisions[0] || null })) });
  } catch (error) {
    console.error("Error fetching admin turfs:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch venue list." } },
      { status: 500 }
    );
  }
}
