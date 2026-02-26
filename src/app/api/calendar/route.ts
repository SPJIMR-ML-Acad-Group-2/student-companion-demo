import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Calendar API — returns timetable + sessions for a week, for either a student or the office.
 * ?role=student — returns the logged-in student's timetable
 * ?role=office — returns all divisions' timetables
 * ?divisionId=N — filter to a specific division (office)
 * ?weekOf=YYYY-MM-DD — center the week on this date (defaults to today)
 */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(session.value);

    const url = new URL(req.url);
    const role = url.searchParams.get("role") || user.role;
    const divisionIdParam = url.searchParams.get("divisionId");
    const weekOfParam = url.searchParams.get("weekOf");

    // Determine the week
    const refDate = weekOfParam ? new Date(weekOfParam) : new Date();
    const dayOfWeek = refDate.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + mondayOffset);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const weekDates: string[] = [];
    for (let d = new Date(monday); d <= saturday; d.setDate(d.getDate() + 1)) {
      weekDates.push(d.toISOString().split("T")[0]);
    }

    let divisionIds: number[] = [];
    let divisionNames: Record<number, string> = {};

    if (role === "student") {
      const student = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { coreDivision: true, specDivision: true },
      });
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      if (student.coreDivisionId) { divisionIds.push(student.coreDivisionId); divisionNames[student.coreDivisionId] = student.coreDivision?.name || ""; }
      if (student.specDivisionId) { divisionIds.push(student.specDivisionId); divisionNames[student.specDivisionId] = student.specDivision?.name || ""; }
    } else {
      // Office — all or filtered
      if (divisionIdParam) {
        const div = await prisma.division.findUnique({ where: { id: parseInt(divisionIdParam) } });
        if (div) { divisionIds = [div.id]; divisionNames[div.id] = div.name; }
      } else {
        const allDivs = await prisma.division.findMany();
        divisionIds = allDivs.map(d => d.id);
        allDivs.forEach(d => { divisionNames[d.id] = d.name; });
      }
    }

    // Get timetable entries for these divisions within the week
    const timetableEntries = await prisma.timetable.findMany({
      where: { divisionId: { in: divisionIds }, date: { in: weekDates } },
      include: { course: true, division: true, faculty: true },
      orderBy: [{ date: "asc" }, { slotNumber: "asc" }],
    });

    // Get sessions for this week
    const sessions = await prisma.session.findMany({
      where: {
        divisionId: { in: divisionIds },
        date: { in: weekDates },
      },
      include: {
        course: true,
        attendance: role === "student" ? { where: { studentId: user.userId } } : { select: { id: true, status: true } },
        _count: { select: { attendance: true } },
      },
    });

    // Build calendar grid: day → slot → entry
    const calendar = weekDates.map((date, i) => {
      const dayNum = (i + 1) % 7; // Mon=1, Tue=2, ..., Sat=6
      const dayEntries = timetableEntries.filter(t => t.date === date);
      const daySessions = sessions.filter(s => s.date === date);

      return {
        date,
        dayOfWeek: dayNum,
        dayName: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
        slots: dayEntries.map(entry => {
          const session = daySessions.find(s => s.courseId === entry.courseId && s.divisionId === entry.divisionId && s.slotNumber === entry.slotNumber);
          return {
            slotNumber: entry.slotNumber,
            startTime: entry.startTime,
            endTime: entry.endTime,
            courseCode: entry.course.code,
            courseName: entry.course.name,
            courseType: entry.course.type,
            divisionName: entry.division.name,
            divisionId: entry.divisionId,
            facultyName: entry.faculty?.name || null,
            hasSession: !!session,
            sessionId: session?.id || null,
            sessionNumber: session?.sessionNumber || null,
            attendance: session?.attendance || [],
            noSwipes: session ? session._count.attendance === 0 : false,
          };
        }),
      };
    });

    return NextResponse.json({
      weekOf: weekDates[0],
      weekEnd: weekDates[weekDates.length - 1],
      weekDates,
      calendar,
      divisions: Object.entries(divisionNames).map(([id, name]) => ({ id: parseInt(id), name })),
    });
  } catch (error) {
    console.error("Calendar error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
