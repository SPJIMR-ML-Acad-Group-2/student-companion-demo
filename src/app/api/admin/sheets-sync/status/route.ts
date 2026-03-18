import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [counts, recentFailures] = await Promise.all([
    prisma.attendanceSyncLog.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.attendanceSyncLog.findMany({
      where: { status: "failed" },
      orderBy: { lastAttemptAt: "desc" },
      take: 20,
      include: {
        attendance: {
          include: {
            student: { select: { rollNumber: true } },
            timetable: {
              include: { course: { select: { name: true, code: true } } },
            },
          },
        },
      },
    }),
  ]);

  const statusMap: Record<string, number> = {
    pending: 0,
    failed: 0,
    synced: 0,
    skipped: 0,
  };
  for (const row of counts) {
    statusMap[row.status] = row._count.status;
  }

  return NextResponse.json({
    pending: statusMap.pending,
    failed: statusMap.failed,
    synced: statusMap.synced,
    skipped: statusMap.skipped,
    recentFailures: recentFailures.map((log) => ({
      attendanceId: log.attendanceId,
      studentRollNumber: log.attendance.student.rollNumber ?? "—",
      courseName: `${log.attendance.timetable.course.code} — ${log.attendance.timetable.course.name}`,
      sessionDate: log.attendance.timetable.date,
      error: log.errorMessage ?? "Unknown error",
      lastAttemptAt: log.lastAttemptAt,
      attempts: log.attempts,
    })),
  });
}
