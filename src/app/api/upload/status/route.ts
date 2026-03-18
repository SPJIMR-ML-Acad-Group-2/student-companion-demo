import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const job = await prisma.uploadJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,         // "queued" | "processing" | "completed" | "failed"
    fileName: job.fileName,
    totalSwipes: job.totalSwipes,
    studentsMatched: job.studentsMatched,
    studentsNotFound: job.studentsNotFound,
    attendanceMarked: job.attendanceMarked,
    absentMarked: job.absentMarked,
    lateMarked: job.lateMarked,
    duplicatesSkipped: job.duplicatesSkipped,
    errors: JSON.parse(job.errors) as string[],
    completedAt: job.completedAt,
    createdAt: job.createdAt,
  });
}

// Also return any active (non-completed) jobs — used on page load to re-attach polling
export async function HEAD() {
  const active = await prisma.uploadJob.findFirst({
    where: { status: { in: ["queued", "processing"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!active) return new NextResponse(null, { status: 204 });
  return new NextResponse(null, {
    status: 200,
    headers: { "X-Job-Id": active.id },
  });
}
