import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, { status: 401 });
  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: user.role === "ADMIN" ? { OR: [{ id }, { referenceCode: id }] } : { userId: user.id, OR: [{ id }, { referenceCode: id }] },
    include: { turf: { include: { images: { orderBy: { order: "asc" } } } } },
  });
  if (!booking) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking not found." } }, { status: 404 });
  return NextResponse.json({ data: { ...booking, paymentMode: "DEMO" } });
}
