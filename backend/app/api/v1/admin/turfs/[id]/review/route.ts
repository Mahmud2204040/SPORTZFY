import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slotFitsSchedule } from "@/lib/schedule";
import { venueImageUrls } from "@/lib/venue-images";
import { Prisma } from "@prisma/client";

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
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid approval status." } },
        { status: 400 }
      );
    }
    if (status === "REJECTED" && reason.length < 3) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "A rejection reason is required." } }, { status: 400 });

    const reviewed = await prisma.$transaction(async tx => {
      const turf = await tx.turf.findUnique({ where: { id } });
      if (!turf) throw new Error("NOT_FOUND");
      const revision = await tx.turfRevision.findFirst({ where: { turfId: id, status: "PENDING_REVIEW" }, orderBy: { submittedAt: "desc" } });
      if (revision && turf.status === "APPROVED") {
        const changed = await tx.turfRevision.updateMany({ where: { id: revision.id, status: "PENDING_REVIEW" }, data: { status, reason: reason || null, reviewedAt: new Date(), reviewedBy: currentUser.id } });
        if (changed.count === 0) throw new Error("CONFLICT");
        if (status === "APPROVED") {
          const { imageUrls, availabilityRules, ...fields } = revision.payload as Record<string, unknown>;
          const gallery = imageUrls === undefined ? null : venueImageUrls(imageUrls);
          const proposedRules = Array.isArray(availabilityRules) ? availabilityRules as { dayOfWeek: number; openHour: number; closeHour: number; hourlyRate: number }[] : null;
          if (proposedRules) {
            const futureBookings = await tx.booking.findMany({ where: { turfId: id, status: "CONFIRMED", startTime: { gt: new Date() } }, select: { startTime: true, endTime: true } });
            if (futureBookings.some(booking => !slotFitsSchedule(booking.startTime, booking.endTime, proposedRules))) throw new Error("SCHEDULE_CONFLICT");
          }
          if (Object.keys(fields).length || gallery) await tx.turf.update({ where: { id }, data: { ...fields as Prisma.TurfUpdateInput, ...(gallery ? { images: { deleteMany: {}, create: gallery.map((url, order) => ({ url, order })) } } : {}) } });
          if (proposedRules) {
            await tx.availabilityRule.deleteMany({ where: { turfId: id } });
            await tx.availabilityRule.createMany({ data: proposedRules.map(rule => ({ ...rule, turfId: id })) });
          }
        }
        await tx.moderationEvent.create({ data: { turfId: id, actorId: currentUser.id, revisionId: revision.id, decision: status, reason: reason || null } });
      } else {
        const changed = await tx.turf.updateMany({ where: { id, status: "PENDING_REVIEW" }, data: { status } });
        if (changed.count === 0) throw new Error("CONFLICT");
        await tx.moderationEvent.create({ data: { turfId: id, actorId: currentUser.id, decision: status, reason: reason || null } });
      }
      return tx.turf.findUniqueOrThrow({ where: { id }, include: { owner: { select: { id: true, name: true, email: true } } } });
    });

    return NextResponse.json({
      data: reviewed,
      message: `Venue '${reviewed.name}' ${status === "APPROVED" ? "approved" : "rejected"}.`,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "CONFLICT" || error.message === "SCHEDULE_CONFLICT")) return NextResponse.json({ error: { code: error.message, message: error.message === "NOT_FOUND" ? "Venue submission not found." : error.message === "SCHEDULE_CONFLICT" ? "The proposed hours conflict with a confirmed future booking." : "This submission has already been reviewed. Refresh the queue." } }, { status: error.message === "NOT_FOUND" ? 404 : 409 });
    console.error("Turf review error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update venue status." } },
      { status: 500 }
    );
  }
}
