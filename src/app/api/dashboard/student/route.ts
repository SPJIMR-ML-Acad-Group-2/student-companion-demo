import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getPenaltyInfo } from "@/lib/penalties";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(session.value);
    if (user.role !== "student")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const termIdParam = url.searchParams.get("termId");

    const student = await prisma.student.findUnique({
      where: { id: user.studentId },
      include: {
        user: true,
        batch: {
          include: {
            programme: true,
            activeTerm: true,
            terms: { orderBy: { number: "asc" } },
          },
        },
        division: true,
        specialisation: true,
        groups: { include: { group: { include: { specialisation: true } } } },
      },
    });
    if (!student)
      return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Determine which term to show
    const allTerms = student.batch?.terms ?? [];
    let selectedTerm = student.batch?.activeTerm ?? allTerms[0];
    if (termIdParam) {
      const requested = allTerms.find((t) => t.id === termIdParam);
      if (requested) selectedTerm = requested;
    }

    const groupIds = student.groups.map((sg) => sg.groupId);

    const enrolledCourses = selectedTerm
      ? await prisma.course.findMany({
          where: {
            courseTerms: { some: { termId: selectedTerm.id } },
            OR: [
              {
                type: "core",
                OR: [
                  {
                    courseDivisions: {
                      some: { divisionId: student.divisionId },
                    },
                  },
                  { courseDivisions: { none: {} } },
                ],
              },
              {
                type: "specialisation",
                OR: [
                  { courseGroups: { some: { groupId: { in: groupIds } } } },
                  {
                    specialisationId: student.specialisationId ?? undefined,
                    courseGroups: { none: {} },
                  },
                ],
              },
              {
                type: { in: ["minor", "elective"] },
                courseGroups: { some: { groupId: { in: groupIds } } },
              },
            ],
          },
          include: { specialisation: true },
        })
      : [];

    const courseStats = await Promise.all(
      enrolledCourses.map(async (course) => {
        // Core courses → student's division; spec courses → student's group(s)
        const timetableWhere =
          course.type === "core"
            ? {
                courseId: course.id,
                divisionId: student.divisionId,
                isConducted: true,
              }
            : {
                courseId: course.id,
                groupId: { in: groupIds },
                isConducted: true,
              };

        const timetableSlots = await prisma.timetable.findMany({
          where: timetableWhere,
          include: { slot: true },
          orderBy: { date: "asc" },
        });

        const timetableIds = timetableSlots.map((t) => t.id);
        const attendance =
          timetableIds.length > 0
            ? await prisma.attendance.findMany({
                where: {
                  studentId: student.id,
                  timetableId: { in: timetableIds },
                },
              })
            : [];

        const attendanceMap = new Map(
          attendance.map((a) => [a.timetableId, a]),
        );

        const present = attendance.filter((a) => a.status === "P").length;
        const absent = attendance.filter((a) => a.status === "AB").length;
        const late = attendance.filter((a) => a.status === "LT").length;
        const pLeave = attendance.filter((a) => a.status === "P#").length;
        const totalConducted = timetableSlots.length;
        const percentage =
          totalConducted > 0
            ? Math.round(((present + late) / totalConducted) * 100)
            : 100;
        const penalty = getPenaltyInfo(course.credits, absent, late);

        const log = timetableSlots.map((t) => {
          const record = attendanceMap.get(t.id);
          return {
            sessionId: t.id,
            sessionNumber: t.sessionNumber,
            date: t.date,
            slot: t.slotNumber,
            startTime: t.slot.startTime,
            endTime: t.slot.endTime,
            status: record?.status ?? "—",
            swipeTime: record?.swipeTime ?? null,
          };
        });

        return {
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          courseType: course.type,
          credits: course.credits,
          totalPlanned: course.totalSessions,
          totalConducted,
          present,
          absent,
          late,
          pLeave,
          percentage,
          penalty: {
            level: penalty.level,
            label: penalty.label,
            description: penalty.description,
            thresholds: penalty.thresholds,
            effectiveAbsences: penalty.effectiveAbsences,
          },
          specialisation: course.specialisation?.name ?? null,
          log,
        };
      }),
    );

    return NextResponse.json({
      student: {
        name: student.user.name,
        rollNumber: student.rollNumber,
        programme: student.batch?.programme?.name,
        batch: student.batch?.name,
        coreDivision: student.division?.name ?? null,
        specialisation: student.specialisation?.name,
        specDivision:
          student.groups.find((sg) => sg.group.type === "specialisation")?.group
            .name ?? null,
        groups: student.groups.map((sg) => sg.group.name),
        activeTerm: selectedTerm?.name ?? null,
      },
      courses: courseStats,
      terms: allTerms.map((t) => ({
        id: t.id,
        number: t.number,
        name: t.name,
        isActive: t.id === student.batch?.activeTermId,
      })),
      selectedTermId: selectedTerm?.id ?? null,
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
