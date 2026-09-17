import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Platform administrator access required." } },
        { status: 403 }
      );
    }
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid approval status." } },
        { status: 400 }
      );
    }

    const result = await prisma.turf.updateMany({ where: { id, status: "PENDING_REVIEW" }, data: { status } });
    if (result.count === 0) {
      const current = await prisma.turf.findUnique({ where: { id }, select: { status: true } });
      return NextResponse.json({ error: { code: current ? "CONFLICT" : "NOT_FOUND", message: current ? "This submission has already been reviewed. Refresh the queue." : "Venue submission not found." } }, { status: current ? 409 : 404 });
    }
    const updatedTurf = await prisma.turf.findUniqueOrThrow({ where: { id }, include: { owner: { select: { id: true, name: true, email: true } } } });

    return NextResponse.json({
      data: updatedTurf,
      message: `Venue '${updatedTurf.name}' status has been set to ${status}.`,
    });
  } catch (error) {
    console.error("Turf review error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update venue status." } },
      { status: 500 }
    );
  }
}
