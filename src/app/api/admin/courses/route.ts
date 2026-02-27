import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const courses = await prisma.course.findMany({
    include: {
      courseTerms: { include: { term: { include: { programme: true } } } },
      specialisation: true,
      facultyCourses: { include: { faculty: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, name, totalSessions, credits, termIds, type, specialisationId, facultyIds } = body;
  if (!code || !name) return NextResponse.json({ error: "code and name required" }, { status: 400 });
  const creditSessionMap: Record<number, number> = { 1: 9, 2: 18, 3: 26, 4: 35 };
  const finalCredits = credits || 3;
  const finalSessions = totalSessions || creditSessionMap[finalCredits] || 26;
  try {
    const course = await prisma.course.create({
      data: {
        code, name, totalSessions: finalSessions, credits: finalCredits, type: type || "core",
        specialisationId: (type === "specialisation" && specialisationId) ? specialisationId : null,
        courseTerms: termIds && termIds.length > 0 ? {
          create: termIds.map((tId: string) => ({ termId: parseInt(tId) }))
        } : undefined,
        facultyCourses: facultyIds && facultyIds.length > 0 ? {
          create: facultyIds.map((fId: string) => ({ facultyId: parseInt(fId) }))
        } : undefined
      },
      include: { specialisation: true, courseTerms: { include: { term: true } }, facultyCourses: { include: { faculty: true } } },
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
  const { id, facultyIds, termIds, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Recalculate totalSessions if credits changed
  if (data.credits) {
    const creditSessionMap: Record<number, number> = { 1: 9, 2: 18, 3: 26, 4: 35 };
    data.totalSessions = creditSessionMap[data.credits] || data.totalSessions;
  }

  // Handle wiping and creating new faculty mappings if provided
  const updateData: any = { ...data };
  if (facultyIds !== undefined) {
    updateData.facultyCourses = { deleteMany: {}, create: facultyIds.map((fId: string) => ({ facultyId: parseInt(fId) })) };
  }
  if (termIds !== undefined) {
    updateData.courseTerms = { deleteMany: {}, create: termIds.map((tId: string) => ({ termId: parseInt(tId) })) };
  }

  const course = await prisma.course.update({
    where: { id }, data: updateData,
    include: { courseTerms: { include: { term: true } }, specialisation: true, facultyCourses: { include: { faculty: true } } },
  });
  return NextResponse.json(course);
}
