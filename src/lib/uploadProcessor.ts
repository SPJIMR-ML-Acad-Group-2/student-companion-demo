/**
 * Async biometric upload processor.
 *
 * Runs as a background job via Next.js `after()` so the HTTP response is
 * returned to the user immediately. Progress is tracked in UploadJob and
 * polled by the client.
 */

import { prisma } from "@/lib/prisma";
import type { SwipeRecord } from "@/lib/parseUpload";
import { triggerBatchSync } from "@/lib/attendanceSync";

function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

export async function processUploadJob(
  jobId: string,
  swipes: SwipeRecord[],
): Promise<void> {
  // Mark job as processing
  await prisma.uploadJob.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  const results = {
    studentsMatched: 0,
    studentsNotFound: 0,
    attendanceMarked: 0,
    absentMarked: 0,
    lateMarked: 0,
    duplicatesSkipped: 0,
    errors: [] as string[],
  };

  const affectedTimetableIds = new Set<string>();

  try {
    const rollNumbers = [...new Set(swipes.map((s) => s.rollNumber))];

    const students = await prisma.student.findMany({
      where: { rollNumber: { in: rollNumbers } },
      include: { groups: { select: { groupId: true } } },
    });
    const studentMap = new Map(students.map((s) => [s.rollNumber!, s]));

    results.studentsMatched = students.length;
    results.studentsNotFound = rollNumbers.length - students.length;

    const allDivisionIds = new Set<string>();
    const allGroupIds = new Set<string>();
    for (const student of students) {
      allDivisionIds.add(student.divisionId);
      for (const sg of student.groups) allGroupIds.add(sg.groupId);
    }

    const timetableEntries = await prisma.timetable.findMany({
      where: {
        OR: [
          ...(allDivisionIds.size > 0
            ? [{ divisionId: { in: [...allDivisionIds] } }]
            : []),
          ...(allGroupIds.size > 0
            ? [{ groupId: { in: [...allGroupIds] } }]
            : []),
        ],
      },
      include: { course: true, division: true, group: true, slot: true },
    });

    const ttDivisionIds = [
      ...new Set(
        timetableEntries
          .map((t) => t.divisionId)
          .filter(Boolean) as string[],
      ),
    ];
    const ttGroupIds = [
      ...new Set(
        timetableEntries.map((t) => t.groupId).filter(Boolean) as string[],
      ),
    ];

    const allTimetableStudents = await prisma.student.findMany({
      where: {
        OR: [
          ...(ttDivisionIds.length > 0
            ? [{ divisionId: { in: ttDivisionIds } }]
            : []),
          ...(ttGroupIds.length > 0
            ? [{ groups: { some: { groupId: { in: ttGroupIds } } } }]
            : []),
        ],
      },
      include: { groups: { select: { groupId: true } } },
    });

    const uniqueDates = [...new Set(swipes.map((s) => s.date))];

    for (const date of uniqueDates) {
      const dateSwipes = swipes.filter((s) => s.date === date);
      const daySlots = timetableEntries.filter((t) => t.date === date);

      for (const slot of daySlots) {
        const divisionId = slot.divisionId;
        const groupId = slot.groupId;

        let studentsInCohort: typeof allTimetableStudents;
        if (divisionId) {
          studentsInCohort = allTimetableStudents.filter(
            (s) => s.divisionId === divisionId,
          );
        } else if (groupId) {
          studentsInCohort = allTimetableStudents.filter((s) =>
            s.groups.some((sg) => sg.groupId === groupId),
          );
        } else {
          continue;
        }

        if (studentsInCohort.length === 0) continue;

        const whereKey = divisionId
          ? {
              divisionId_date_slotNumber: {
                divisionId,
                date,
                slotNumber: slot.slotNumber,
              },
            }
          : {
              groupId_date_slotNumber: {
                groupId: groupId!,
                date,
                slotNumber: slot.slotNumber,
              },
            };

        const timetableRecord = await prisma.timetable.findUnique({
          where:
            whereKey as Parameters<
              typeof prisma.timetable.findUnique
            >[0]["where"],
        });
        if (!timetableRecord) continue;

        if (!timetableRecord.isConducted) {
          await prisma.timetable.update({
            where: { id: timetableRecord.id },
            data: { isConducted: true },
          });
        }
        affectedTimetableIds.add(timetableRecord.id);

        const slotStartMinutes = timeToMinutes(slot.slot.startTime);
        const slotEndMinutes = timeToMinutes(slot.slot.endTime);
        const markedStudents = new Set<string>();

        for (const swipe of dateSwipes) {
          const student = studentMap.get(swipe.rollNumber);
          if (!student) continue;

          const inCohort = divisionId
            ? student.divisionId === divisionId
            : student.groups.some((sg) => sg.groupId === groupId);
          if (!inCohort) continue;

          const swipeMinutes = timeToMinutes(swipe.timeStr);
          if (
            swipeMinutes < slotStartMinutes ||
            swipeMinutes > slotEndMinutes
          )
            continue;

          if (markedStudents.has(student.id)) {
            results.duplicatesSkipped++;
            continue;
          }

          try {
            await prisma.attendance.upsert({
              where: {
                timetableId_studentId: {
                  timetableId: timetableRecord.id,
                  studentId: student.id,
                },
              },
              update: { status: "P", swipeTime: swipe.timeStr },
              create: {
                timetableId: timetableRecord.id,
                studentId: student.id,
                status: "P",
                swipeTime: swipe.timeStr,
              },
            });
            markedStudents.add(student.id);
            results.attendanceMarked++;
          } catch (err) {
            results.errors.push(`Error marking ${swipe.rollNumber}: ${err}`);
          }
        }

        if (markedStudents.size > 0) {
          for (const student of studentsInCohort) {
            if (markedStudents.has(student.id)) continue;
            const existing = await prisma.attendance.findUnique({
              where: {
                timetableId_studentId: {
                  timetableId: timetableRecord.id,
                  studentId: student.id,
                },
              },
            });
            if (!existing) {
              await prisma.attendance.create({
                data: {
                  timetableId: timetableRecord.id,
                  studentId: student.id,
                  status: "AB",
                  swipeTime: null,
                },
              });
              results.absentMarked++;
            }
          }
        }

        // Update running totals in the job record so the UI can show progress
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: {
            attendanceMarked: results.attendanceMarked,
            absentMarked: results.absentMarked,
            duplicatesSkipped: results.duplicatesSkipped,
          },
        });
      }
    }

    // All DB writes done — fire Google Sheets sync
    if (affectedTimetableIds.size > 0) {
      triggerBatchSync([...affectedTimetableIds]).catch((err) =>
        console.error("[SheetsSync] batch sync failed:", err),
      );
    }

    // Mark job completed
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        studentsMatched: results.studentsMatched,
        studentsNotFound: results.studentsNotFound,
        attendanceMarked: results.attendanceMarked,
        absentMarked: results.absentMarked,
        lateMarked: results.lateMarked,
        duplicatesSkipped: results.duplicatesSkipped,
        errors: JSON.stringify(results.errors),
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(msg);
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errors: JSON.stringify(results.errors),
        completedAt: new Date(),
      },
    });
    console.error("[UploadJob] Job failed:", err);
  }
}
