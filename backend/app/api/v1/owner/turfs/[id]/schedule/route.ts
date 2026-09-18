import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slotFitsSchedule } from "@/lib/schedule";

async function authorizedVenue(id: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) return null;
  return prisma.turf.findFirst({ where: user.role === "ADMIN" ? { id } : { id, ownerId: user.id } });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const turf = await authorizedVenue(id);
  if (!turf) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Venue not found." } }, { status: 404 });
  const rules = await prisma.availabilityRule.findMany({ where: { turfId: id }, orderBy: { dayOfWeek: "asc" } });
  const pending = await prisma.turfRevision.findFirst({ where: { turfId: id, status: "PENDING_REVIEW" }, orderBy: { submittedAt: "desc" } });
  const proposedRules = (pending?.payload as Record<string, unknown> | undefined)?.availabilityRules;
  return NextResponse.json({ data: { turfId: id, rules, proposedRules: Array.isArray(proposedRules) ? proposedRules : null, source: rules.length ? "OWNER_RULES" : "LEGACY_TIMETABLE" } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const turf = await authorizedVenue(id);
    if (!turf) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Venue not found." } }, { status: 404 });
    const body = await request.json();
    const rules = body.rules;
    if (!Array.isArray(rules) || rules.length === 0 || rules.length > 7 || rules.some(rule => !Number.isInteger(rule.dayOfWeek) || rule.dayOfWeek < 0 || rule.dayOfWeek > 6 || !Number.isInteger(rule.openHour) || !Number.isInteger(rule.closeHour) || rule.openHour < 0 || rule.closeHour > 30 || rule.closeHour <= rule.openHour || !Number.isFinite(rule.hourlyRate) || rule.hourlyRate <= 0 || rule.hourlyRate > 100000) || new Set(rules.map(rule => rule.dayOfWeek)).size !== rules.length) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid weekly schedule." } }, { status: 400 });
    }
    const newRules = rules.map(({ dayOfWeek, openHour, closeHour, hourlyRate }) => ({ dayOfWeek, openHour, closeHour, hourlyRate }));
    if (turf.status === "APPROVED") {
      const existing = await prisma.turfRevision.findFirst({ where: { turfId: id, status: "PENDING_REVIEW" } });
      const payload = { ...(existing?.payload as Record<string, unknown> || {}), availabilityRules: newRules };
      const revision = existing
        ? await prisma.turfRevision.update({ where: { id: existing.id }, data: { payload: payload as Prisma.InputJsonValue, submittedAt: new Date() } })
        : await prisma.turfRevision.create({ data: { turfId: id, payload: payload as Prisma.InputJsonValue } });
      return NextResponse.json({ data: { turfId: id, rules: newRules, source: "PENDING_REVIEW", revisionId: revision.id }, message: "Weekly schedule submitted for review. Current hours stay live." });
    }
    const updated = await prisma.$transaction(async tx => {
      const futureBookings = await tx.booking.findMany({ where: { turfId: id, status: "CONFIRMED", startTime: { gt: new Date() } }, select: { startTime: true, endTime: true } });
      if (futureBookings.some(booking => !slotFitsSchedule(booking.startTime, booking.endTime, newRules))) throw new Error("SCHEDULE_CONFLICT");
      await tx.availabilityRule.deleteMany({ where: { turfId: id } });
      if (newRules.length) await tx.availabilityRule.createMany({ data: newRules.map(rule => ({ ...rule, turfId: id })) });
      return tx.availabilityRule.findMany({ where: { turfId: id }, orderBy: { dayOfWeek: "asc" } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ data: { turfId: id, rules: updated, source: updated.length ? "OWNER_RULES" : "LEGACY_TIMETABLE" } });
  } catch (error) {
    if (error instanceof Error && error.message === "SCHEDULE_CONFLICT") return NextResponse.json({ error: { code: "SCHEDULE_CONFLICT", message: "The new hours exclude an existing future booking." } }, { status: 409 });
    if ((error as { code?: string }).code === "P2034") return NextResponse.json({ error: { code: "CONFLICT", message: "Schedule changed at the same time. Refresh and retry." } }, { status: 409 });
    console.error("Schedule update error:", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Could not update schedule." } }, { status: 500 });
  }
}
