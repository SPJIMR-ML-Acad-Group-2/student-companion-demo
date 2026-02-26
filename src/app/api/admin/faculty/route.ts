import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const faculty = await prisma.faculty.findMany({
    include: {
      _count: { select: { timetable: true, courses: true } },
      courses: { include: { course: { select: { id: true, code: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(faculty);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, teachingArea } = body;
  if (!name || !email) return NextResponse.json({ error: "name and email required" }, { status: 400 });
  try {
    const faculty = await prisma.faculty.create({ data: { name, email, teachingArea: teachingArea || null } });
    return NextResponse.json(faculty, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") return NextResponse.json({ error: "Faculty with this email already exists" }, { status: 409 });
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const faculty = await prisma.faculty.update({ where: { id }, data });
  return NextResponse.json(faculty);
}
