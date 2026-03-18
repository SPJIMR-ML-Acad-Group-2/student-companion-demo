import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAttendanceRecord } from "@/lib/attendanceSync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const timetable = await prisma.timetable.findUnique({
    where: { id: sessionId },
    include: {
      course: true,
      division: {
        include: {
          students: { orderBy: { rollNumber: "asc" }, include: { user: true } },
        },
      },
      group: {
        include: {
          members: {
            orderBy: { student: { rollNumber: "asc" } },
            include: { student: { include: { user: true } } },
          },
        },
      },
      attendance: { include: { student: { include: { user: true } } } },
    },
  });

  if (!timetable) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Collect students from either division or group
  const students: Array<{ id: string; name: string; rollNumber: string | null }> =
    timetable.division
      ? timetable.division.students.map((s) => ({ id: s.id, name: s.user.name, rollNumber: s.rollNumber }))
      : timetable.group
      ? timetable.group.members.map((m) => ({ id: m.student.id, name: m.student.user.name, rollNumber: m.student.rollNumber }))
      : [];

  const attendanceMap = new Map(timetable.attendance.map((a) => [a.studentId, a]));

  const records = students.map((s) => {
    const att = attendanceMap.get(s.id);
    return {
      studentId:    s.id,
      studentName:  s.name,
      rollNumber:   s.rollNumber,
      attendanceId: att?.id    ?? null,
      status:       att?.status ?? "None",
      swipeTime:    att?.swipeTime ?? null,
      remarks:      att?.remarks ?? null,
    };
  });

  return NextResponse.json({ timetable, records });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, studentId, status, remarks } = body;
  if (!sessionId || !studentId || !status) {
    return NextResponse.json({ error: "sessionId, studentId, status required" }, { status: 400 });
  }

  try {
    const att = await prisma.attendance.upsert({
      where: { timetableId_studentId: { timetableId: sessionId, studentId } },
      update: { status, ...(remarks !== undefined ? { remarks } : {}) },
      create: { timetableId: sessionId, studentId, status, remarks: remarks ?? null },
    });

    await prisma.timetable.update({
      where: { id: sessionId },
      data: { isConducted: true },
    });

    // Fire-and-forget Google Sheets sync — never blocks the HTTP response
    syncAttendanceRecord(att.id).catch((err) =>
      console.error("[SheetsSync] single record sync failed:", err),
    );

    return NextResponse.json(att);
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
