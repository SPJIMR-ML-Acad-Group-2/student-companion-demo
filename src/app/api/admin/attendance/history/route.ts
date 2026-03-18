import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const divisionIdsParam = searchParams.get("divisionIds"); // comma-separated
  const groupIdsParam    = searchParams.get("groupIds");    // comma-separated
  const termId     = searchParams.get("termId");
  const startDate  = searchParams.get("startDate");
  const endDate    = searchParams.get("endDate");
  const courseId   = searchParams.get("courseId");
  const source     = searchParams.get("source"); // "biometric" | "manual" | null
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit      = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "10", 10)));

  const divIds = divisionIdsParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const grpIds = groupIdsParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  if (divIds.length === 0 && grpIds.length === 0) {
    return NextResponse.json(
      { error: "divisionIds or groupIds is required" },
      { status: 400 },
    );
  }

  // Resolve date range from term if provided
  let resolvedStart = startDate;
  let resolvedEnd   = endDate;
  if (termId) {
    const term = await prisma.term.findUnique({ where: { id: termId } });
    if (term?.startDate) resolvedStart = term.startDate;
    if (term?.endDate)   resolvedEnd   = term.endDate;
  }

  // Build timetable-level cohort filter
  let timetableFilter: object = {};
  if (divIds.length > 0 && grpIds.length > 0) {
    timetableFilter = {
      OR: [
        { divisionId: { in: divIds } },
        { groupId: { in: grpIds } },
      ],
    };
  } else if (divIds.length > 0) {
    timetableFilter = { divisionId: { in: divIds } };
  } else {
    timetableFilter = { groupId: { in: grpIds } };
  }

  // Build attendance-level source filter
  const sourceFilter: object =
    source === "biometric"
      ? { swipeTime: { not: null } }
      : source === "manual"
        ? { swipeTime: null }
        : {};

  // Base where clause for Attendance
  const where = {
    ...sourceFilter,
    timetable: {
      isConducted: true,
      ...(resolvedStart || resolvedEnd
        ? {
            date: {
              ...(resolvedStart ? { gte: resolvedStart } : {}),
              ...(resolvedEnd   ? { lte: resolvedEnd   } : {}),
            },
          }
        : {}),
      ...(courseId ? { courseId } : {}),
      ...timetableFilter,
    },
  };

  const [total, records] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      include: {
        timetable: {
          include: {
            course:   true,
            division: true,
            group:    true,
            slot:     true,
          },
        },
        student: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: [
        { timetable: { date: "desc" } },
        { timetable: { slotNumber: "asc" } },
        { student: { rollNumber: "asc" } },
      ],
      skip:  (page - 1) * limit,
      take:  limit,
    }),
  ]);

  const items = records.map((att) => {
    const tt = att.timetable;
    return {
      id:              att.id,
      date:            tt.date,
      slot:            tt.slotNumber,
      startTime:       tt.slot.startTime,
      endTime:         tt.slot.endTime,
      courseCode:      tt.course.code,
      courseName:      tt.course.name,
      divisionOrGroup: tt.division?.name ?? tt.group?.name ?? "",
      rollNumber:      att.student.rollNumber ?? "",
      studentName:     att.student.user.name,
      status:          att.status,
      swipeTime:       att.swipeTime ?? null,
      remarks:         att.remarks ?? null,
      source:          att.swipeTime ? "biometric" : "manual",
      createdAt:       att.createdAt,
    };
  });

  return NextResponse.json({
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
