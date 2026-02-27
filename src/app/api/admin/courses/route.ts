import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const termId = req.nextUrl.searchParams.get("termId");
  const courses = await prisma.course.findMany({
    where: termId ? { termId: parseInt(termId) } : {},
    include: { term: { include: { programme: true } }, specialisation: true },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, name, totalSessions, credits, termId, type, specialisationId } = body;
  if (!code || !name) return NextResponse.json({ error: "code and name required" }, { status: 400 });
  const creditSessionMap: Record<number, number> = { 1: 9, 2: 18, 3: 26, 4: 35 };
  const finalCredits = credits || 3;
  const finalSessions = totalSessions || creditSessionMap[finalCredits] || 26;
  try {
    const course = await prisma.course.create({
      data: { code, name, totalSessions: finalSessions, credits: finalCredits, termId: termId || null, type: type || "core",
        specialisationId: (type === "specialisation" && specialisationId) ? specialisationId : null },
      include: { specialisation: true },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") return NextResponse.json({ error: "Course code already exists" }, { status: 409 });
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Recalculate totalSessions if credits changed
  if (data.credits) {
    const creditSessionMap: Record<number, number> = { 1: 9, 2: 18, 3: 26, 4: 35 };
    data.totalSessions = creditSessionMap[data.credits] || data.totalSessions;
  }

  const course = await prisma.course.update({
    where: { id }, data,
    include: { term: { include: { programme: true } }, specialisation: true },
  });
  return NextResponse.json(course);
}
