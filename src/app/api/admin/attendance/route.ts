import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const timetable = await (prisma.timetable.findUnique as any)({
    where: { id: parseInt(sessionId) },
    include: {
      course: true,
      division: {
        include: {
          coreStudents: { orderBy: { rollNumber: "asc" } },
          specStudents: { orderBy: { rollNumber: "asc" } },
        },
      },
      attendance: { include: { student: true } },
    },
  }) as any;

  if (!timetable) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const students: any[] = timetable.division.type === "core"
    ? timetable.division.coreStudents
    : timetable.division.specStudents;

  const attendanceMap = new Map<number, any>(timetable.attendance.map((a: any) => [a.studentId, a]));

  const records = students.map((s: any) => {
    const att = attendanceMap.get(s.id);
    return {
      studentId:    s.id,
      studentName:  s.name, // Fixed: This needs to map to studentName so the UI can render `r.studentName`
      rollNumber:   s.rollNumber,
      attendanceId: att?.id    || null,
      status:       att?.status || "None",
      swipeTime:    att?.swipeTime || null,
    };
  });

  return NextResponse.json({ timetable, records });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, studentId, status } = body;
  if (!sessionId || !studentId || !status) {
    return NextResponse.json({ error: "sessionId, studentId, status required" }, { status: 400 });
  }

  try {
    const att = await prisma.attendance.upsert({
      where: { timetableId_studentId: { timetableId: parseInt(sessionId), studentId: parseInt(studentId) } },
      update: { status },
      create: { timetableId: parseInt(sessionId), studentId: parseInt(studentId), status },
    });

    await prisma.timetable.update({
      where: { id: parseInt(sessionId) },
      data: { isConducted: true },
    });

    return NextResponse.json(att);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
