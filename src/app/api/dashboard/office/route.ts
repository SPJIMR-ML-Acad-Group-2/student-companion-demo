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
          include: {
            activeTerm: true,
            students: true,
            divisions: { where: { type: "core" } },
          },
        },
      },
    });

    const programmeSummaries = await Promise.all(
      programmes.flatMap(prog => 
        prog.batches.map(async (batch) => {
          const divSummaries = await buildDivisionSummaries(batch.divisions, batch.activeTerm?.id, "coreDivisionId");
          return {
            programmeId: prog.id, programmeName: prog.name, programmeCode: prog.code,
            batch: { id: batch.id, name: batch.name, activeTerm: batch.activeTerm?.name || null },
            studentCount: batch.students.length, divisions: divSummaries,
          };
        })
      )
    );

    const specialisations = await prisma.specialisation.findMany({ include: { divisions: true } });
    const specSummaries = await Promise.all(
      specialisations.map(async (spec) => {
        const divsWithBatch = spec.divisions.map(d => ({ ...d, batchId: d.batchId }));
        const divSummaries = await buildDivisionSummaries(divsWithBatch, null, "specDivisionId");
        return { id: spec.id, name: spec.name, code: spec.code, divisions: divSummaries };
      })
    );

    const recentSessions = await prisma.timetable.findMany({
      where: { isConducted: true },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 15,
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
  divs: Array<{ id: number; name: string; type: string; batchId?: number | null }>,
  activeTermId: number | null | undefined,
  studentDivField: "coreDivisionId" | "specDivisionId"
) {
  return Promise.all(divs.map(async (div) => {
    const students = await prisma.user.findMany({ where: { [studentDivField]: div.id, role: "student" } });
    const timetableSlots = await prisma.timetable.findMany({ where: { divisionId: div.id, isConducted: true }, include: { course: true } });
    const courseFilter: any = { timetable: { some: { divisionId: div.id } } };
    if (activeTermId) {
      courseFilter.courseTerms = { some: { termId: activeTermId } };
    }
    const courses = await prisma.course.findMany({ where: courseFilter });
    const courseStats = await Promise.all(courses.map(async (course) => {
      const courseSlots = timetableSlots.filter(t => t.courseId === course.id);
      const timetableIds = courseSlots.map(t => t.id);
      if (timetableIds.length === 0) return { courseId: course.id, courseCode: course.code, courseName: course.name, courseType: course.type, credits: course.credits, totalSessions: 0, avgAttendance: 0, lowAttendanceStudents: [] };
      const attendance = await prisma.attendance.findMany({ where: { timetableId: { in: timetableIds } }, include: { student: true } });
      let totalPct = 0;
      const low: Array<{ name: string; rollNumber: string | null; percentage: number }> = [];
      for (const st of students) {
        const recs = attendance.filter(a => a.studentId === st.id);
        const p = recs.filter(a => a.status === "P" || a.status === "LT").length;
        const pct = courseSlots.length > 0 ? Math.round((p / courseSlots.length) * 100) : 100;
        totalPct += pct;
        if (pct < 75) low.push({ name: st.name, rollNumber: st.rollNumber, percentage: pct });
      }
      return { courseId: course.id, courseCode: course.code, courseName: course.name, courseType: course.type, credits: course.credits, totalSessions: courseSlots.length, avgAttendance: students.length > 0 ? Math.round(totalPct / students.length) : 0, lowAttendanceStudents: low };
    }));

    const batchesInvolved = Array.from(new Set(students.map(s => s.batchId).filter(Boolean))) as number[];
    const studentCountByBatch = students.reduce((acc, s) => {
      if (s.batchId) {
        acc[s.batchId] = (acc[s.batchId] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    return { 
      divisionId: div.id, 
      divisionName: div.name, 
      divisionType: div.type, 
      batchId: div.batchId ?? null, 
      batchesInvolved,
      studentCount: students.length,
      studentCountByBatch,
      totalSessions: timetableSlots.length, 
      courses: courseStats 
    };
  }));
}
