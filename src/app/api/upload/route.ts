import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { parseUploadFile, SwipeRecord } from "@/lib/parseUpload";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(session.value);
    if (user.role !== "programme_office") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse uploaded file
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Parse swipe records from file
    let swipes: SwipeRecord[];
    try {
      swipes = await parseUploadFile(file);
    } catch (err) {
      return NextResponse.json({ error: `Parse error: ${err}` }, { status: 400 });
    }

    if (swipes.length === 0) {
      return NextResponse.json({ error: "No valid records found in file" }, { status: 400 });
    }

    // Get unique roll numbers
    const rollNumbers = [...new Set(swipes.map((s) => s.rollNumber))];

    // Lookup students (by rollNumber on Student model)
    const students = await prisma.student.findMany({
      where: { rollNumber: { in: rollNumbers } },
      include: {
        groups: { select: { groupId: true } },
      },
    });
    const studentMap = new Map(students.map((s) => [s.rollNumber!, s]));

    // Collect all division IDs and group IDs from matched students
    const allDivisionIds = new Set<string>();
    const allGroupIds    = new Set<string>();
    for (const student of students) {
      allDivisionIds.add(student.divisionId);
      for (const sg of student.groups) allGroupIds.add(sg.groupId);
    }

    // Get timetable entries for all relevant divisions and groups
    const timetableEntries = await prisma.timetable.findMany({
      where: {
        OR: [
          ...(allDivisionIds.size > 0 ? [{ divisionId: { in: [...allDivisionIds] } }] : []),
          ...(allGroupIds.size    > 0 ? [{ groupId:    { in: [...allGroupIds]    } }] : []),
        ],
      },
      include: { course: true, division: true, group: true, slot: true },
    });

    // Fetch ALL students who belong to the timetable divisions / groups
    // (needed so non-swiping students can be marked absent)
    const ttDivisionIds = [...new Set(timetableEntries.map((t) => t.divisionId).filter(Boolean) as string[])];
    const ttGroupIds    = [...new Set(timetableEntries.map((t) => t.groupId   ).filter(Boolean) as string[])];

    const allTimetableStudents = await prisma.student.findMany({
      where: {
        OR: [
          ...(ttDivisionIds.length > 0 ? [{ divisionId: { in: ttDivisionIds } }] : []),
          ...(ttGroupIds.length    > 0 ? [{
            groups: { some: { groupId: { in: ttGroupIds } } },
          }] : []),
        ],
      },
      include: { groups: { select: { groupId: true } } },
    });

    const results = {
      totalSwipes:         swipes.length,
      studentsMatched:     students.length,
      studentsNotFound:    rollNumbers.length - students.length,
      attendanceMarked:    0,
      absentMarked:        0,
      lateMarked:          0,
      duplicatesSkipped:   0,
      errors:              [] as string[],
    };

    const uniqueDates = [...new Set(swipes.map((s) => s.date))];

    for (const date of uniqueDates) {
      const dateSwipes = swipes.filter((s) => s.date === date);
      const daySlots   = timetableEntries.filter((t) => t.date === date);

      for (const slot of daySlots) {
        const divisionId = slot.divisionId;
        const groupId    = slot.groupId;

        // Determine which students are in this slot's cohort
        let studentsInCohort: typeof allTimetableStudents;
        if (divisionId) {
          studentsInCohort = allTimetableStudents.filter((s) => s.divisionId === divisionId);
        } else if (groupId) {
          studentsInCohort = allTimetableStudents.filter((s) =>
            s.groups.some((sg) => sg.groupId === groupId)
          );
        } else {
          continue;
        }

        if (studentsInCohort.length === 0) continue;

        // Find the timetable record
        const whereKey = divisionId
          ? { divisionId_date_slotNumber: { divisionId, date, slotNumber: slot.slotNumber } }
          : { groupId_date_slotNumber:    { groupId: groupId!, date, slotNumber: slot.slotNumber } };

        const timetableRecord = await prisma.timetable.findUnique({ where: whereKey as Parameters<typeof prisma.timetable.findUnique>[0]["where"] });
        if (!timetableRecord) continue;

        // Mark timetable as conducted
        if (!timetableRecord.isConducted) {
          await prisma.timetable.update({
            where: { id: timetableRecord.id },
            data:  { isConducted: true },
          });
        }

        // Slot timing — punch must fall within [startTime, endTime]
        const slotStartMinutes = timeToMinutes(slot.slot.startTime);
        const slotEndMinutes   = timeToMinutes(slot.slot.endTime);

        const markedStudents = new Set<string>();

        for (const swipe of dateSwipes) {
          const student = studentMap.get(swipe.rollNumber);
          if (!student) continue;

          // Check this student belongs to this cohort
          const inCohort = divisionId
            ? student.divisionId === divisionId
            : student.groups.some((sg) => sg.groupId === groupId);
          if (!inCohort) continue;

          const swipeMinutes = timeToMinutes(swipe.timeStr);
          if (swipeMinutes < slotStartMinutes || swipeMinutes > slotEndMinutes) continue;

          if (markedStudents.has(student.id)) {
            results.duplicatesSkipped++;
            continue;
          }

          try {
            await prisma.attendance.upsert({
              where:  { timetableId_studentId: { timetableId: timetableRecord.id, studentId: student.id } },
              update: { status: "P", swipeTime: swipe.timeStr },
              create: { timetableId: timetableRecord.id, studentId: student.id, status: "P", swipeTime: swipe.timeStr },
            });
            markedStudents.add(student.id);
            results.attendanceMarked++;
          } catch (err) {
            results.errors.push(`Error marking ${swipe.rollNumber}: ${err}`);
          }
        }

        // Mark absent only if at least one student swiped (otherwise slot had no readers)
        if (markedStudents.size > 0) {
          for (const student of studentsInCohort) {
            if (markedStudents.has(student.id)) continue;

            const existing = await prisma.attendance.findUnique({
              where: { timetableId_studentId: { timetableId: timetableRecord.id, studentId: student.id } },
            });

            if (!existing) {
              await prisma.attendance.create({
                data: { timetableId: timetableRecord.id, studentId: student.id, status: "AB", swipeTime: null },
              });
              results.absentMarked++;
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}
