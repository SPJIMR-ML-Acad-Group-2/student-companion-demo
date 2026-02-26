import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const session = await prisma.session.findUnique({
    where: { id: parseInt(sessionId) },
    include: {
      course: true,
      division: {
        include: {
          coreStudents: { orderBy: { rollNumber: "asc" } },
          specStudents: { orderBy: { rollNumber: "asc" } }
        }
      },
      attendance: { include: { student: true } }
    }
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Determine all students for this division
  const students = session.division.type === "core" ? session.division.coreStudents : session.division.specStudents;

  // Build attendance map
  const attendanceMap = new Map(session.attendance.map(a => [a.studentId, a]));

  const records = students.map(s => {
    const att = attendanceMap.get(s.id);
    return {
      studentId: s.id,
      name: s.name,
      rollNumber: s.rollNumber,
      attendanceId: att?.id || null,
      status: att?.status || "None", // None means not marked
      swipeTime: att?.swipeTime || null
    };
  });

  return NextResponse.json({ session, records });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, studentId, status } = body;
  if (!sessionId || !studentId || !status) return NextResponse.json({ error: "sessionId, studentId, status required" }, { status: 400 });

  try {
    const att = await prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId: parseInt(sessionId), studentId: parseInt(studentId) } },
      update: { status },
      create: { sessionId: parseInt(sessionId), studentId: parseInt(studentId), status }
    });
    return NextResponse.json(att);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
