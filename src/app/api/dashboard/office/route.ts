import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(session.value);
    if (user.role !== "programme_office")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const termId = req.nextUrl.searchParams.get("termId") || null;

    const programmes = await prisma.programme.findMany({
      include: {
        batches: {
          include: {
            activeTerm: true,
            divisions: true,
            _count: { select: { students: true } },
          },
        },
      },
    });

    const programmeSummaries = await Promise.all(
      programmes.flatMap((prog) =>
        prog.batches.map(async (batch) => {
          const effectiveTermId = termId ?? batch.activeTerm?.id;
          const divSummaries = await buildDivisionSummaries(
            batch.divisions,
            effectiveTermId,
          );
          return {
            programmeId: prog.id,
            programmeName: prog.name,
            programmeCode: prog.code,
            batch: {
              id: batch.id,
              name: batch.name,
              activeTerm: batch.activeTerm?.name ?? null,
            },
            studentCount: batch._count.students,
            divisions: divSummaries,
          };
        }),
      ),
    );

    const specialisations = await prisma.specialisation.findMany({
      include: {
        groups: {
          include: {
            batch: true,
            allowedBatches: { include: { batch: true } },
          },
        },
      },
    });
    const specSummaries = await Promise.all(
      specialisations.map(async (spec) => {
        const groupSummaries = await buildGroupSummaries(spec.groups, termId);
        return {
          id: spec.id,
          name: spec.name,
          code: spec.code,
          groups: groupSummaries,
        };
      }),
    );

    // Build student-count lookup maps for trend computation
    const divStudentMap = new Map<string, number>();
    for (const prog of programmeSummaries) {
      for (const div of prog.divisions) divStudentMap.set(div.divisionId, div.studentCount);
    }
    const groupStudentMap = new Map<string, number>();
    for (const spec of specSummaries) {
      for (const grp of spec.groups) groupStudentMap.set(grp.groupId, grp.studentCount);
    }

    // Attendance trend: conducted sessions grouped by date, filtered by term date range if termId given
    let trendStartDate: string | undefined;
    let trendEndDate: string | undefined;
    if (termId) {
      const term = await prisma.term.findUnique({
        where: { id: termId },
        select: { startDate: true, endDate: true },
      });
      trendStartDate = term?.startDate ?? undefined;
      trendEndDate = term?.endDate ?? undefined;
    }
    // Count only present-ish statuses (P = present, LT = late) so the trend
    // reflects real attendance and not merely "a row exists for that student".
    const trendSessions = await prisma.timetable.findMany({
      where: {
        isConducted: true,
        ...(trendStartDate ? { date: { gte: trendStartDate } } : {}),
        ...(trendEndDate ? { date: { lte: trendEndDate } } : {}),
      },
      select: {
        date: true,
        divisionId: true,
        groupId: true,
        _count: { select: { attendance: true } },                // total enrolled (denominator)
        attendance: { where: { status: { in: ["P", "LT"] } }, select: { id: true } }, // present (numerator)
      },
      orderBy: { date: "asc" },
    });
    const trendMap = new Map<string, { total: number; expected: number }>();
    for (const s of trendSessions) {
      const d = s.date as unknown;
      const dateStr = (d instanceof Date ? d : new Date(String(d))).toISOString().slice(0, 10);
      const expected = s.divisionId ? (divStudentMap.get(s.divisionId) ?? 0)
        : s.groupId ? (groupStudentMap.get(s.groupId) ?? 0) : 0;
      if (expected === 0) continue;
      const existing = trendMap.get(dateStr) ?? { total: 0, expected: 0 };
      trendMap.set(dateStr, { total: existing.total + s.attendance.length, expected: existing.expected + expected });
    }
    const attendanceTrend = Array.from(trendMap.entries())
      .map(([date, { total, expected }]) => ({ date, avgPct: Math.round((total / expected) * 100) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      programmes: programmeSummaries,
      specialisations: specSummaries,
      attendanceTrend,
    });
  } catch (error) {
    console.error("Office dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function buildDivisionSummaries(
  divs: Array<{ id: string; name: string; batchId: string }>,
  activeTermId: string | null | undefined,
) {
  return Promise.all(
    divs.map(async (div) => {
      const students = await prisma.student.findMany({
        where: { divisionId: div.id },
      });
      const timetableSlots = await prisma.timetable.findMany({
        where: { divisionId: div.id, isConducted: true },
        include: { course: true },
      });

      const courseFilter: Record<string, unknown> = {
        timetable: { some: { divisionId: div.id } },
      };
      if (activeTermId)
        courseFilter.courseTerms = { some: { termId: activeTermId } };
      const courses = await prisma.course.findMany({ where: courseFilter });

      const courseStats = await Promise.all(
        courses.map(async (course) => {
          const courseSlots = timetableSlots.filter(
            (t) => t.courseId === course.id,
          );
          const timetableIds = courseSlots.map((t) => t.id);
          if (timetableIds.length === 0) {
            return {
              courseId: course.id,
              courseCode: course.code,
              courseName: course.name,
              courseType: course.type,
              credits: course.credits,
              totalSessions: 0,
              avgAttendance: 0,
              lowAttendanceStudents: [],
            };
          }
          const attendance = await prisma.attendance.findMany({
            where: { timetableId: { in: timetableIds } },
            include: { student: { include: { user: true } } },
          });
          let totalPct = 0;
          const low: Array<{
            name: string;
            rollNumber: string | null;
            percentage: number;
          }> = [];
          for (const st of students) {
            const recs = attendance.filter((a) => a.studentId === st.id);
            const p = recs.filter(
              (a) => a.status === "P" || a.status === "LT",
            ).length;
            const pct =
              courseSlots.length > 0
                ? Math.round((p / courseSlots.length) * 100)
                : 100;
            totalPct += pct;
            if (pct < 75) {
              const att = attendance.find((a) => a.studentId === st.id);
              low.push({
                name: att?.student.user.name ?? "",
                rollNumber: st.rollNumber,
                percentage: pct,
              });
            }
          }
          return {
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            courseType: course.type,
            credits: course.credits,
            totalSessions: courseSlots.length,
            avgAttendance:
              students.length > 0 ? Math.round(totalPct / students.length) : 0,
            lowAttendanceStudents: low,
          };
        }),
      );

      return {
        divisionId: div.id,
        divisionName: div.name,
        type: "core",
        batchId: div.batchId,
        studentCount: students.length,
        totalSessions: timetableSlots.length,
        courses: courseStats,
      };
    }),
  );
}

async function buildGroupSummaries(
  groups: Array<{
    id: string;
    name: string;
    batchId: string;
    type: string;
    allowedBatches?: Array<{ batchId: string }>;
  }>,
  activeTermId: string | null | undefined,
) {
  return Promise.all(
    groups.map(async (grp) => {
      const memberLinks = await prisma.studentGroup.findMany({
        where: { groupId: grp.id },
      });
      const studentIds = memberLinks.map((m) => m.studentId);
      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
      });
      const timetableSlots = await prisma.timetable.findMany({
        where: { groupId: grp.id, isConducted: true },
        include: { course: true },
      });

      const courseFilter: Record<string, unknown> = {
        timetable: { some: { groupId: grp.id } },
      };
      if (activeTermId)
        courseFilter.courseTerms = { some: { termId: activeTermId } };
      const courses = await prisma.course.findMany({ where: courseFilter });

      const courseStats = await Promise.all(
        courses.map(async (course) => {
          const courseSlots = timetableSlots.filter(
            (t) => t.courseId === course.id,
          );
          const timetableIds = courseSlots.map((t) => t.id);
          if (timetableIds.length === 0)
            return {
              courseId: course.id,
              courseCode: course.code,
              courseName: course.name,
              totalSessions: 0,
              avgAttendance: 0,
              lowAttendanceStudents: [],
            };
          const attendance = await prisma.attendance.findMany({
            where: { timetableId: { in: timetableIds } },
            include: { student: { include: { user: true } } },
          });
          let totalPct = 0;
          const low: Array<{
            name: string;
            rollNumber: string | null;
            percentage: number;
          }> = [];
          for (const st of students) {
            const recs = attendance.filter((a) => a.studentId === st.id);
            const p = recs.filter(
              (a) => a.status === "P" || a.status === "LT",
            ).length;
            const pct =
              courseSlots.length > 0
                ? Math.round((p / courseSlots.length) * 100)
                : 100;
            totalPct += pct;
            if (pct < 75) {
              const att = attendance.find((a) => a.studentId === st.id);
              low.push({
                name: att?.student.user.name ?? "",
                rollNumber: st.rollNumber,
                percentage: pct,
              });
            }
          }
          return {
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            totalSessions: courseSlots.length,
            avgAttendance:
              students.length > 0 ? Math.round(totalPct / students.length) : 0,
            lowAttendanceStudents: low,
          };
        }),
      );

      return {
        groupId: grp.id,
        groupName: grp.name,
        type: grp.type,
        batchId: grp.batchId,
        allowedBatchIds:
          grp.allowedBatches && grp.allowedBatches.length > 0
            ? grp.allowedBatches.map((link) => link.batchId)
            : [grp.batchId],
        studentCount: students.length,
        totalSessions: timetableSlots.length,
        courses: courseStats,
      };
    }),
  );
}
