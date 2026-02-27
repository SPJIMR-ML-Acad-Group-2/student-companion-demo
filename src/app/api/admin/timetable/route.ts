import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FIXED_SLOTS } from "@/lib/slots";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const divisionId = req.nextUrl.searchParams.get("divisionId");
  const weekOf = req.nextUrl.searchParams.get("weekOf"); // YYYY-MM-DD

  let whereClause: any = {};
  if (divisionId) whereClause.divisionId = parseInt(divisionId);

  if (weekOf) {
    const refDate = new Date(weekOf);
    const dayOfWeek = refDate.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + mondayOffset);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const weekDates: string[] = [];
    for (let d = new Date(monday); d <= saturday; d.setDate(d.getDate() + 1)) {
      weekDates.push(d.toISOString().split("T")[0]);
    }
    whereClause.date = { in: weekDates };
  }

  const timetable = await prisma.timetable.findMany({
    where: whereClause,
    include: {
      division: { include: { batch: { include: { programme: true } }, specialisation: true } },
      course: true,
      faculty: true,
    },
    orderBy: [{ divisionId: "asc" }, { date: "asc" }, { slotNumber: "asc" }],
  });
  return NextResponse.json(timetable);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { divisionId, courseId, facultyId, date, slotNumber } = body;
  if (!divisionId || !courseId || !date || !slotNumber) {
    return NextResponse.json({ error: "divisionId, courseId, date, slotNumber required" }, { status: 400 });
  }

  // Validate slot number is 1-8
  const slotDef = FIXED_SLOTS.find(s => s.slot === slotNumber);
  if (!slotDef) return NextResponse.json({ error: `Invalid slot number ${slotNumber}. Must be 1-8.` }, { status: 400 });

  try {
    if (facultyId) {
      const existingFacultySlot = await prisma.timetable.findFirst({
        where: {
          facultyId: parseInt(facultyId),
          date,
          slotNumber: parseInt(slotNumber)
        }
      });
      if (existingFacultySlot && existingFacultySlot.courseId !== parseInt(courseId)) {
        return NextResponse.json({ error: "Faculty is already scheduled to teach a different course in this slot." }, { status: 409 });
      }
    }

    // Determine the next session number
    const maxSession = await prisma.timetable.aggregate({
      where: { divisionId: parseInt(divisionId), courseId: parseInt(courseId) },
      _max: { slotNumber: true }, // Fake max
    });
    // const nextSessionNumber = (maxSession._max.sessionNumber || 0) + 1;

    const entry = await prisma.timetable.create({
      data: {
        divisionId: parseInt(divisionId), courseId: parseInt(courseId),
        date, slotNumber: parseInt(slotNumber),
        startTime: slotDef.startTime, endTime: slotDef.endTime,
        facultyId: facultyId ? parseInt(facultyId) : null,
      },
      include: { division: true, course: true, faculty: true },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") return NextResponse.json({ error: "Slot already occupied for this division on this date/slot" }, { status: 409 });
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const record = await prisma.timetable.findUnique({ where: { id: parseInt(id) } });
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  await prisma.timetable.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
