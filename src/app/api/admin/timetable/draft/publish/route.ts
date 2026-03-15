import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    weekOf,
    termId,
    visibility = "confirmed",
  } = body as { weekOf: string; termId?: string; visibility?: string };

  if (!weekOf) {
    return NextResponse.json(
      { error: "weekOf required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  // Compute Mon-Sun of the given week
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

  const drafts = await prisma.draftTimetable.findMany({
    where: {
      date: { in: weekDates },
      ...(termId ? { termId } : {}),
    },
    include: { course: true },
  });

  let published = 0;
  let skipped = 0;
  let removed = 0;

  const getKey = (entry: {
    divisionId: string | null;
    groupId: string | null;
    date: string;
    slotNumber: number;
  }) => {
    if (entry.divisionId) {
      return `division:${entry.divisionId}:${entry.date}:${entry.slotNumber}`;
    }
    return `group:${entry.groupId}:${entry.date}:${entry.slotNumber}`;
  };

  const draftKeys = new Set(drafts.map((draft) => getKey(draft)));

  for (const draft of drafts) {
    let sessionNumber: number | null = null;
    if (draft.activityType === "session") {
      const maxEntry = await prisma.timetable.findFirst({
        where: {
          courseId: draft.courseId,
          activityType: "session",
          ...(draft.divisionId
            ? { divisionId: draft.divisionId }
            : { groupId: draft.groupId }),
        },
        orderBy: { sessionNumber: "desc" },
        select: { sessionNumber: true },
      });
      sessionNumber = (maxEntry?.sessionNumber ?? 0) + 1;
    }

    try {
      // Upsert key depends on whether this is a division or group entry
      const upsertWhere = draft.divisionId
        ? {
            divisionId_date_slotNumber: {
              divisionId: draft.divisionId,
              date: draft.date,
              slotNumber: draft.slotNumber,
            },
          }
        : {
            groupId_date_slotNumber: {
              groupId: draft.groupId!,
              date: draft.date,
              slotNumber: draft.slotNumber,
            },
          };

      await prisma.timetable.upsert({
        where: upsertWhere,
        update: {
          termId: draft.termId,
          courseId: draft.courseId,
          facultyId: draft.facultyId,
          roomId: draft.roomId,
          activityType: draft.activityType,
          visibility,
          ...(sessionNumber !== null ? { sessionNumber } : {}),
        },
        create: {
          divisionId: draft.divisionId,
          groupId: draft.groupId,
          termId: draft.termId,
          courseId: draft.courseId,
          facultyId: draft.facultyId,
          roomId: draft.roomId,
          date: draft.date,
          slotNumber: draft.slotNumber,
          activityType: draft.activityType,
          visibility,
          sessionNumber,
        },
      });
      published++;
    } catch {
      skipped++;
    }
  }

  const liveEntries = await prisma.timetable.findMany({
    where: {
      date: { in: weekDates },
      ...(termId ? { termId } : {}),
    },
    select: {
      id: true,
      divisionId: true,
      groupId: true,
      date: true,
      slotNumber: true,
    },
  });

  const idsToDelete = liveEntries
    .filter((entry) => !draftKeys.has(getKey(entry)))
    .map((entry) => entry.id);

  if (idsToDelete.length > 0) {
    const deleteResult = await prisma.timetable.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    removed = deleteResult.count;
  }

  // Mark drafts as published (keep them for reference)
  await prisma.draftTimetable.updateMany({
    where: {
      date: { in: weekDates },
      isPublished: false,
      ...(termId ? { termId } : {}),
    },
    data: { isPublished: true },
  });

  return NextResponse.json({
    published,
    skipped,
    removed,
    weekDates,
    message:
      drafts.length === 0
        ? "No draft entries found. Existing live entries for this scope were synced out."
        : undefined,
  });
}
