import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(session.value);
    if (user.role !== "programme_office")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
          const divSummaries = await buildDivisionSummaries(
            batch.divisions,
            batch.activeTerm?.id,
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
        const groupSummaries = await buildGroupSummaries(spec.groups, null);
        return {
          id: spec.id,
          name: spec.name,
          code: spec.code,
          groups: groupSummaries,
        };
      }),
    );

    const recentSessions = await prisma.timetable.findMany({
      where: { isConducted: true },
      orderBy: [{ date: "desc" }, { slotNumber: "asc" }],
      take: 15,
      include: {
        course: true,
        division: { include: { batch: { include: { programme: true } } } },
        group: {
          include: {
            specialisation: true,
            batch: { include: { programme: true } },
          },
        },
        _count: { select: { attendance: true } },
      },
    });

    return NextResponse.json({
      programmes: programmeSummaries,
      specialisations: specSummaries,
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        date: s.date,
        slot: s.slotNumber,
        course: s.course.code,
        courseName: s.course.name,
        divisionOrGroup: s.division?.name ?? s.group?.name ?? "",
        type: s.division ? "core" : "specialisation",
        programme:
          s.division?.batch?.programme?.name ??
          s.group?.batch?.programme?.name ??
          s.group?.specialisation?.name ??
          "",
        attendanceCount: s._count.attendance,
      })),
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
