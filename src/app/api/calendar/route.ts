import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Calendar API — returns timetable + sessions for a week.
 * ?role=student — the logged-in student's timetable (core division + all groups)
 * ?role=office  — all divisions and groups (or filtered by divisionId/groupId)
 * ?weekOf=YYYY-MM-DD — center the week on this date (defaults to today)
 * ?divisionId=X / ?groupId=X — office filter
 */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(session.value);

    const url = new URL(req.url);
    const role = url.searchParams.get("role") || user.role;
    const divisionIdParam = url.searchParams.get("divisionId");
    const groupIdParam = url.searchParams.get("groupId");
    const weekOfParam = url.searchParams.get("weekOf");

    // Compute Mon-Sun week dates
    const refDate = weekOfParam ? new Date(weekOfParam) : new Date();
    const dayOfWeek = refDate.getDay();
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekDates: string[] = [];
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
      weekDates.push(d.toISOString().split("T")[0]);
    }

    // Visibility filter
    const visibilityFilter =
      role === "student"
        ? { visibility: { in: ["confirmed", "tentative"] } }
        : {};

    type TimetableWhere = {
      date: { in: string[] };
      visibility?: { in: string[] };
      OR?: Array<{ divisionId?: string; groupId?: { in: string[] } }>;
      divisionId?: string;
      groupId?: string;
    };

    let whereClause: TimetableWhere = {
      date: { in: weekDates },
      ...visibilityFilter,
    };

    if (role === "student") {
      const divisionId: string = user.divisionId;
      const groupIds: string[] = user.groupIds ?? [];
      whereClause = {
        ...whereClause,
        OR: [
          { divisionId },
          ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
        ],
      };
    } else {
      // Office — filter by divisionId or groupId if provided, else all
      if (divisionIdParam) {
        whereClause = { ...whereClause, divisionId: divisionIdParam };
      } else if (groupIdParam) {
        whereClause = { ...whereClause, groupId: groupIdParam };
      }
    }

    const entries = await prisma.timetable.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: whereClause as any,
      include: {
        course: true,
        division: true,
        group: true,
        faculty: true,
        room: true,
        slot: true,
        attendance:
          role === "student"
            ? { where: { studentId: user.studentId } }
            : { select: { id: true, status: true } },
        _count: { select: { attendance: true } },
      },
      orderBy: [{ date: "asc" }, { slotNumber: "asc" }],
    });

    const calendar = weekDates.map((date, i) => {
      const dayEntries = entries.filter((t) => t.date === date);
      return {
        date,
        dayOfWeek: (i + 1) % 7,
        dayName: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
        slots: dayEntries.map((entry) => ({
          slotNumber: entry.slotNumber,
          startTime: entry.slot.startTime,
          endTime: entry.slot.endTime,
          courseCode: entry.course.code,
          courseName: entry.course.name,
          courseType: entry.course.type,
          divisionName: entry.division?.name ?? entry.group?.name ?? "",
          divisionId: entry.divisionId,
          groupId: entry.groupId,
          facultyName: entry.faculty?.name ?? null,
          hasSession: entry.isConducted,
          sessionId: entry.id,
          sessionNumber: entry.sessionNumber ?? null,
          attendance: entry.attendance ?? [],
          noSwipes: entry.isConducted ? entry._count.attendance === 0 : false,
          roomName: entry.room?.name ?? null,
          visibility: entry.visibility,
          activityType: entry.activityType,
        })),
      };
    });

    return NextResponse.json({
      weekOf: weekDates[0],
      weekEnd: weekDates[weekDates.length - 1],
      weekDates,
      calendar,
    });
  } catch (error) {
    console.error("Calendar error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
