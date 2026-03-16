import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTimetableTermAssignment } from "@/lib/timetableTermValidation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const divisionId = req.nextUrl.searchParams.get("divisionId");
  const groupId = req.nextUrl.searchParams.get("groupId");
  const facultyId = req.nextUrl.searchParams.get("facultyId");
  const weekOf = req.nextUrl.searchParams.get("weekOf");
  const termId = req.nextUrl.searchParams.get("termId");

  const where: Record<string, unknown> = {};
  if (divisionId) where.divisionId = divisionId;
  if (groupId) where.groupId = groupId;
  if (facultyId) where.facultyId = facultyId;
  if (termId) where.termId = termId;

  if (weekOf) {
    const refDate = new Date(weekOf);
    const dayOfWeek = refDate.getDay();
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekDates: string[] = [];
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      weekDates.push(`${y}-${m}-${dd}`);
    }
    where.date = { in: weekDates };
  }

  const drafts = await prisma.draftTimetable.findMany({
    where,
    include: {
      term: true,
      division: { include: { batch: { include: { programme: true } } } },
      group: {
        include: {
          batch: { include: { programme: true } },
          specialisation: true,
        },
      },
      course: true,
      faculty: true,
      room: true,
      slot: true,
    },
    orderBy: [{ date: "asc" }, { slotNumber: "asc" }],
  });
  return NextResponse.json(drafts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    divisionId,
    groupId,
    termId,
    courseId,
    facultyId,
    date,
    slotNumber,
    roomId,
    activityType,
  } = body;

  if (
    !termId ||
    !courseId ||
    !date ||
    !slotNumber ||
    (!divisionId && !groupId)
  ) {
    return NextResponse.json(
      {
        error:
          "termId, courseId, date, slotNumber, and either divisionId or groupId required",
      },
      { status: 400 },
    );
  }

  const slotDef = await prisma.slot.findUnique({
    where: { slotNumber: parseInt(slotNumber) },
  });
  if (!slotDef) {
    return NextResponse.json(
      { error: `Invalid slot number ${slotNumber}. Must be 1-8.` },
      { status: 400 },
    );
  }

  const termValidation = await validateTimetableTermAssignment({
    termId,
    courseId,
    date,
    divisionId,
    groupId,
  });
  if (termValidation.error) {
    return NextResponse.json({ error: termValidation.error }, { status: 400 });
  }

  // Faculty conflict checks
  if (facultyId) {
    const conflictDraft = await prisma.draftTimetable.findFirst({
      where: { facultyId, date, slotNumber: parseInt(slotNumber) },
    });
    if (conflictDraft && conflictDraft.courseId !== courseId) {
      return NextResponse.json(
        { error: "Faculty already has a draft slot at this time." },
        { status: 409 },
      );
    }
    const conflictLive = await prisma.timetable.findFirst({
      where: { facultyId, date, slotNumber: parseInt(slotNumber) },
    });
    if (conflictLive && conflictLive.courseId !== courseId) {
      return NextResponse.json(
        {
          error:
            "Faculty is already scheduled in the live timetable for this slot.",
        },
        { status: 409 },
      );
    }
  }

  try {
    // Upsert using whichever unique key applies
    const upsertWhere = divisionId
      ? {
          divisionId_date_slotNumber: {
            divisionId,
            date,
            slotNumber: parseInt(slotNumber),
          },
        }
      : {
          groupId_date_slotNumber: {
            groupId: groupId!,
            date,
            slotNumber: parseInt(slotNumber),
          },
        };

    const entry = await prisma.draftTimetable.upsert({
      where: upsertWhere,
      update: {
        termId,
        courseId,
        facultyId: facultyId ?? null,
        roomId: roomId ?? null,
        activityType: activityType ?? "session",
        isPublished: false,
      },
      create: {
        divisionId: divisionId ?? null,
        groupId: groupId ?? null,
        termId,
        courseId,
        facultyId: facultyId ?? null,
        roomId: roomId ?? null,
        date,
        slotNumber: parseInt(slotNumber),
        activityType: activityType ?? "session",
      },
      include: {
        term: true,
        division: true,
        group: true,
        course: true,
        faculty: true,
        room: true,
        slot: true,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Slot already occupied for this division/group on this date/slot",
        },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const record = await prisma.draftTimetable.findUnique({ where: { id } });
  if (!record)
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  await prisma.draftTimetable.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
