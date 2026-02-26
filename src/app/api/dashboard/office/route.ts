import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(session.value);
    if (user.role !== "programme_office") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const programmes = await prisma.programme.findMany({
      include: {
        batches: {
          where: { isActive: true },
          include: {
            terms: { where: { isActive: true } },
            students: true,
            divisions: { where: { type: "core" } },
          },
        },
      },
    });

    const programmeSummaries = await Promise.all(
      programmes.map(async (prog) => {
        const activeBatch = prog.batches[0];
        if (!activeBatch) return { programmeId: prog.id, programmeName: prog.name, programmeCode: prog.code, batch: null, studentCount: 0, divisions: [] };
        const activeTerm = activeBatch.terms[0];
        const divSummaries = await buildDivisionSummaries(activeBatch.divisions, activeTerm?.id, "coreDivisionId");
        return {
          programmeId: prog.id, programmeName: prog.name, programmeCode: prog.code,
          batch: { id: activeBatch.id, name: activeBatch.name, activeTerm: activeTerm?.name || null },
          studentCount: activeBatch.students.length, divisions: divSummaries,
        };
      })
    );

    const specialisations = await prisma.specialisation.findMany({ include: { divisions: true } });
    const specSummaries = await Promise.all(
      specialisations.map(async (spec) => {
        const divSummaries = await buildDivisionSummaries(spec.divisions, null, "specDivisionId");
        return { id: spec.id, name: spec.name, code: spec.code, divisions: divSummaries };
      })
    );

    const recentSessions = await prisma.session.findMany({
      orderBy: { createdAt: "desc" }, take: 15,
      include: {
        course: true,
        division: { include: { batch: { include: { programme: true } }, specialisation: true } },
        _count: { select: { attendance: true } },
      },
    });

    return NextResponse.json({
      programmes: programmeSummaries,
      specialisations: specSummaries,
      recentSessions: recentSessions.map(s => ({
        id: s.id, date: s.date, slot: s.slotNumber,
        course: s.course.code, courseName: s.course.name,
        division: s.division.name, divisionType: s.division.type,
        programme: s.division.batch?.programme?.name || s.division.specialisation?.name || "",
        attendanceCount: s._count.attendance,
      })),
    });
  } catch (error) {
    console.error("Office dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function buildDivisionSummaries(
  divs: Array<{ id: number; name: string; type: string }>,
  activeTermId: number | null | undefined,
  studentDivField: "coreDivisionId" | "specDivisionId"
) {
  return Promise.all(divs.map(async (div) => {
    const students = await prisma.user.findMany({ where: { [studentDivField]: div.id, role: "student" } });
    const sessions = await prisma.session.findMany({ where: { divisionId: div.id }, include: { course: true } });
    const courseFilter: Record<string, unknown> = { timetable: { some: { divisionId: div.id } } };
    if (activeTermId) courseFilter.termId = activeTermId;
    const courses = await prisma.course.findMany({ where: courseFilter });

    const courseStats = await Promise.all(courses.map(async (course) => {
      const courseSessions = sessions.filter(s => s.courseId === course.id);
      const sessionIds = courseSessions.map(s => s.id);
      if (sessionIds.length === 0) return { courseId: course.id, courseCode: course.code, courseName: course.name, courseType: course.type, credits: course.credits, totalSessions: 0, avgAttendance: 0, lowAttendanceStudents: [] };
      const attendance = await prisma.attendance.findMany({ where: { sessionId: { in: sessionIds } }, include: { student: true } });
      let totalPct = 0;
      const low: Array<{ name: string; rollNumber: string | null; percentage: number }> = [];
      for (const st of students) {
        const recs = attendance.filter(a => a.studentId === st.id);
        const p = recs.filter(a => a.status === "P" || a.status === "LT").length;
        const pct = courseSessions.length > 0 ? Math.round((p / courseSessions.length) * 100) : 100;
        totalPct += pct;
        if (pct < 75) low.push({ name: st.name, rollNumber: st.rollNumber, percentage: pct });
      }
      return { courseId: course.id, courseCode: course.code, courseName: course.name, courseType: course.type, credits: course.credits, totalSessions: courseSessions.length, avgAttendance: students.length > 0 ? Math.round(totalPct / students.length) : 0, lowAttendanceStudents: low };
    }));

    return { divisionId: div.id, divisionName: div.name, divisionType: div.type, studentCount: students.length, totalSessions: sessions.length, courses: courseStats };
  }));
}
