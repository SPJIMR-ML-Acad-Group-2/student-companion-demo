import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getPenaltyInfo, PENALTY_THRESHOLDS } from "@/lib/penalties";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(session.value);
    if (user.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const termIdParam = url.searchParams.get("termId");

    const student = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        batch: { include: { programme: true, terms: { orderBy: { number: "asc" } } } },
        coreDivision: true, specDivision: { include: { specialisation: true } }, specialisation: true,
      },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Determine which term to show — active by default, or requested
    const allTerms = student.batch?.terms || [];
    let selectedTerm = allTerms.find(t => t.isActive);
    if (termIdParam) {
      const requested = allTerms.find(t => t.id === parseInt(termIdParam));
      if (requested) selectedTerm = requested;
    }

    const divisionIds: number[] = [];
    if (student.coreDivisionId) divisionIds.push(student.coreDivisionId);
    if (student.specDivisionId) divisionIds.push(student.specDivisionId);

    const timetableEntries = await prisma.timetable.findMany({
      where: { divisionId: { in: divisionIds } },
      include: { course: { include: { term: true, specialisation: true } } },
    });

    const uniqueCourses = [...new Map(
      timetableEntries
        .filter(t => !selectedTerm || !t.course.termId || t.course.termId === selectedTerm.id)
        .map(t => [t.courseId, { course: t.course, divisionId: t.divisionId }])
    ).values()];

    const courseStats = await Promise.all(
      uniqueCourses.map(async ({ course, divisionId }) => {
        const sessions = await prisma.session.findMany({
          where: { courseId: course.id, divisionId },
          orderBy: { date: "asc" },
        });
        const sessionIds = sessions.map(s => s.id);
        const attendance = await prisma.attendance.findMany({
          where: { studentId: student.id, sessionId: { in: sessionIds } },
        });

        const attendanceMap = new Map(attendance.map(a => [a.sessionId, a]));

        const present = attendance.filter(a => a.status === "P").length;
        const absent = attendance.filter(a => a.status === "AB").length;
        const late = attendance.filter(a => a.status === "LT").length;
        const totalConducted = sessions.length;
        const percentage = totalConducted > 0 ? Math.round(((present + late) / totalConducted) * 100) : 100;

        const penalty = getPenaltyInfo(course.credits, absent);
        const thresholds = PENALTY_THRESHOLDS[course.credits] || PENALTY_THRESHOLDS[3];

        // Attendance log per session
        const log = sessions.map(s => {
          const record = attendanceMap.get(s.id);
          return {
            sessionId: s.id,
            date: s.date,
            slot: s.slotNumber,
            status: record?.status || "—",
            swipeTime: record?.swipeTime || null,
          };
        });

        return {
          courseId: course.id, courseCode: course.code, courseName: course.name,
          courseType: course.type, credits: course.credits,
          totalPlanned: course.totalSessions, totalConducted,
          present, absent, late, percentage,
          penalty: {
            level: penalty.level, label: penalty.label, description: penalty.description,
            thresholds: { L1: thresholds.L1, L2: thresholds.L2, L3: thresholds.L3 },
            absencesUntilL1: Math.max(0, thresholds.L1 - absent),
          },
          specialisation: course.specialisation?.name || null,
          log,
        };
      })
    );

    return NextResponse.json({
      student: {
        name: student.name, rollNumber: student.rollNumber,
        programme: student.batch?.programme?.name, batch: student.batch?.name,
        coreDivision: student.coreDivision?.name, specialisation: student.specialisation?.name,
        specDivision: student.specDivision?.name, activeTerm: selectedTerm?.name || null,
      },
      courses: courseStats,
      terms: allTerms.map(t => ({ id: t.id, number: t.number, name: t.name, isActive: t.isActive })),
      selectedTermId: selectedTerm?.id || null,
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
