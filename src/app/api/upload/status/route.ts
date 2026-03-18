import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireOfficeRole(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return false;
  try {
    const user = JSON.parse(session.value);
    return user.role === "programme_office";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await requireOfficeRole())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const job = await prisma.uploadJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  let errors: string[] = [];
  try {
    errors = JSON.parse(job.errors) as string[];
  } catch {
    errors = [];
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
    duplicatesSkipped: job.duplicatesSkipped,
    errors,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
  });
}

// Return any active (non-completed) job — used on page load to re-attach polling
export async function HEAD() {
  if (!(await requireOfficeRole())) {
    return new NextResponse(null, { status: 401 });
  }

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
