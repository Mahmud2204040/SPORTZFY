import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to close this post." } }, { status: 401 });
  const { id } = await params;
  const match = await prisma.matchPost.findUnique({ where: { id }, select: { id: true, hostUserId: true } });
  if (!match) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Match post not found." } }, { status: 404 });
  if (match.hostUserId !== user.id && user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the host can close this post." } }, { status: 403 });
  const closed = await prisma.matchPost.update({ where: { id }, data: { status: "CLOSED" } });
  return NextResponse.json({ data: closed, message: "Match post closed." });
}
