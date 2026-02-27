import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getPenaltyInfo, PENALTY_THRESHOLDS } from "@/lib/penalties";

export const dynamic = "force-dynamic";

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
        batch: { include: { programme: { include: { Term: { orderBy: { number: "asc" } } } }, activeTerm: true } },
        coreDivision: true, specDivision: { include: { specialisation: true } }, specialisation: true,
      },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Determine which term to show — active by default, or requested
    const allTerms = student.batch?.programme?.Term || [];
    let selectedTerm = student.batch?.activeTerm || allTerms[0];
    if (termIdParam) {
      const requested = allTerms.find((t: any) => t.id === parseInt(termIdParam));
      if (requested) selectedTerm = requested as any;
    }

    const divisionIds: number[] = [];
    if (student.coreDivisionId) divisionIds.push(student.coreDivisionId);
    if (student.specDivisionId) divisionIds.push(student.specDivisionId);

    const timetableEntries = await prisma.timetable.findMany({
      where: {
        divisionId: { in: divisionIds },
        course: {
          courseTerms: {
            some: { termId: selectedTerm?.id }
          }
        },
      },
      include: { course: true },
    });

    const enrolledCourses = await prisma.course.findMany({
      where: {
        courseTerms: {
          some: { termId: selectedTerm?.id }
        },
        OR: [
          { type: "core" },
          { type: "specialisation", specialisationId: student.specialisationId }
        ],
      },
      include: { specialisation: true },
    });

    const courseStats = await Promise.all(
      enrolledCourses.map(async (course) => {
        // Find which of the student's divisions applies to this course
        let activeDivisionId = course.type === "core" ? student.coreDivisionId : student.specDivisionId;

        const timetableSlots = await prisma.timetable.findMany({
          where: { courseId: course.id, divisionId: activeDivisionId ?? undefined, isConducted: true },
          orderBy: { date: "asc" },
        });

        const timetableIds = timetableSlots.map(t => t.id);
        const attendance = timetableIds.length > 0
          ? await prisma.attendance.findMany({
              where: { studentId: student.id, timetableId: { in: timetableIds } },
            })
          : [];

        const attendanceMap = new Map(attendance.map(a => [a.timetableId, a]));

        const present = attendance.filter(a => a.status === "P").length;
        const absent = attendance.filter(a => a.status === "AB").length;
        const late = attendance.filter(a => a.status === "LT").length;
        const pLeave = attendance.filter(a => a.status === "P#").length;
        const totalConducted = timetableSlots.length;
        const percentage = totalConducted > 0 ? Math.round(((present + late) / totalConducted) * 100) : 100;

        const penalty = getPenaltyInfo(course.credits, absent, late);

        const log = timetableSlots.map(t => {
          const record = attendanceMap.get(t.id);
          return {
            sessionId: t.id,
            sessionNumber: t.sessionNumber,
            date: t.date,
            slot: t.slotNumber,
            status: record?.status || "—",
            swipeTime: record?.swipeTime || null,
          };
        });

        return {
          courseId: course.id, courseCode: course.code, courseName: course.name,
          courseType: course.type, credits: course.credits,
          totalPlanned: course.totalSessions, totalConducted,
          present, absent, late, pLeave, percentage,
          penalty: {
            level: penalty.level, label: penalty.label, description: penalty.description,
            thresholds: penalty.thresholds,
            effectiveAbsences: penalty.effectiveAbsences,
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
      terms: allTerms.map(t => ({ id: t.id, number: t.number, name: t.name, isActive: t.id === student.batch?.activeTermId })),
      selectedTermId: selectedTerm?.id || null,
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
