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
    const rollNumbers = [...new Set(swipes.map(s => s.rollNumber))];

    // Lookup students with their divisions
    const students = await prisma.user.findMany({
      where: { rollNumber: { in: rollNumbers }, role: "student" },
      include: {
        coreDivision: true,
        specDivision: true,
      },
    });
    const studentMap = new Map(students.map(s => [s.rollNumber!, s]));

    // Collect all division IDs (core + spec)
    const allDivisionIds = new Set<number>();
    for (const student of students) {
      if (student.coreDivisionId) allDivisionIds.add(student.coreDivisionId);
      if (student.specDivisionId) allDivisionIds.add(student.specDivisionId);
    }

    // Get timetable entries for all relevant divisions
    const timetableEntries = await prisma.timetable.findMany({
      where: { divisionId: { in: [...allDivisionIds] } },
      include: { course: true, division: true },
    });

    // Results tracking
    const results = {
      totalSwipes: swipes.length,
      studentsMatched: students.length,
      studentsNotFound: rollNumbers.length - students.length,
      sessionsCreated: 0,
      attendanceMarked: 0,
      absentMarked: 0,
      lateMarked: 0,
      duplicatesSkipped: 0,
      errors: [] as string[],
    };

    // Get unique dates
    const uniqueDates = [...new Set(swipes.map(s => s.date))];

    // Process each date
    for (const date of uniqueDates) {
      const dateSwipes = swipes.filter(s => s.date === date);
      // Get timetable slots for this day
      const daySlots = timetableEntries.filter(t => t.date === date);

      for (const slot of daySlots) {
        // Determine which students belong to this slot's division
        const divisionId = slot.divisionId;
        const divisionType = slot.division.type; // "core" | "specialisation"

        // Find students in this division
        const divStudents = students.filter(s => {
          if (divisionType === "core") return s.coreDivisionId === divisionId;
          if (divisionType === "specialisation") return s.specDivisionId === divisionId;
          return false;
        });

        if (divStudents.length === 0) continue;

        // Create/find session
        let sessionRecord = await prisma.session.findUnique({
          where: {
            courseId_divisionId_date_slotNumber: {
              courseId: slot.courseId,
              divisionId: divisionId,
              date: date,
              slotNumber: slot.slotNumber,
            },
          },
        });

        if (!sessionRecord) {
          sessionRecord = await prisma.session.create({
            data: {
              courseId: slot.courseId,
              divisionId: divisionId,
              date: date,
              slotNumber: slot.slotNumber,
            },
          });
          results.sessionsCreated++;
        }

        // Slot timing
        const slotStartMinutes = timeToMinutes(slot.startTime);
        const slotEndMinutes = timeToMinutes(slot.endTime);
        const lateThreshold = slotStartMinutes + 10; // 10 min grace

        // Track marked students for this session (dedup multiple punches)
        const markedStudents = new Set<number>();

        // Match swipes to this slot
        for (const swipe of dateSwipes) {
          const student = studentMap.get(swipe.rollNumber);
          if (!student) continue;

          // Check if student belongs to this division
          const inThisDivision = divisionType === "core"
            ? student.coreDivisionId === divisionId
            : student.specDivisionId === divisionId;
          if (!inThisDivision) continue;

          // Already marked for this session? Skip (handles multiple punches)
          if (markedStudents.has(student.id)) {
            results.duplicatesSkipped++;
            continue;
          }

          const swipeMinutes = timeToMinutes(swipe.timeStr);

          // Check if swipe falls within slot window (5 min early to end)
          if (swipeMinutes >= slotStartMinutes - 5 && swipeMinutes <= slotEndMinutes) {
            // Only mark Present automatically. If they are late (after lateThreshold), do not auto-mark.
            if (swipeMinutes <= lateThreshold) {
              const status = "P";

              try {
                await prisma.attendance.upsert({
                  where: {
                    sessionId_studentId: {
                      sessionId: sessionRecord.id,
                      studentId: student.id,
                    },
                  },
                  update: { status, swipeTime: swipe.timeStr },
                  create: {
                    sessionId: sessionRecord.id,
                    studentId: student.id,
                    status,
                    swipeTime: swipe.timeStr,
                  },
                });

                markedStudents.add(student.id);
                results.attendanceMarked++;
              } catch (err) {
                results.errors.push(`Error marking ${swipe.rollNumber}: ${err}`);
              }
            }
          }
        }

        // Edge case: If no one in the class punched the biometric for this slot, do NOT mark anyone absent.
        // We leave the attendance records empty so it gets flagged on the UI.
        if (markedStudents.size > 0) {
          // Mark absent students (in this division but not swiped)
          for (const student of divStudents) {
            if (markedStudents.has(student.id)) continue;

            const existing = await prisma.attendance.findUnique({
              where: {
                sessionId_studentId: {
                  sessionId: sessionRecord.id,
                  studentId: student.id,
                },
              },
            });

            if (!existing) {
              await prisma.attendance.create({
                data: {
                  sessionId: sessionRecord.id,
                  studentId: student.id,
                  status: "AB",
                  swipeTime: null,
                },
              });
              results.absentMarked++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}
