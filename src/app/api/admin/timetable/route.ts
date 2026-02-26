import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const divisionId = req.nextUrl.searchParams.get("divisionId");
  const timetable = await prisma.timetable.findMany({
    where: divisionId ? { divisionId: parseInt(divisionId) } : {},
    include: {
      division: { include: { batch: { include: { programme: true } }, specialisation: true } },
      course: true,
    },
    orderBy: [{ divisionId: "asc" }, { dayOfWeek: "asc" }, { slotNumber: "asc" }],
  });
  return NextResponse.json(timetable);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { divisionId, courseId, dayOfWeek, slotNumber, startTime, endTime } = body;
  if (!divisionId || !courseId || dayOfWeek == null || !slotNumber) {
    return NextResponse.json({ error: "divisionId, courseId, dayOfWeek, slotNumber required" }, { status: 400 });
  }
  try {
    const entry = await prisma.timetable.create({
      data: { divisionId, courseId, dayOfWeek, slotNumber, startTime: startTime || "09:00", endTime: endTime || "10:30" },
      include: { division: true, course: true },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") return NextResponse.json({ error: "Slot already exists for this division/day/slot" }, { status: 409 });
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.timetable.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
