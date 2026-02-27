import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const programmeId = req.nextUrl.searchParams.get("programmeId");
  const terms = await prisma.term.findMany({
    where: programmeId ? { programmeId: parseInt(programmeId) } : {},
    include: { programme: true, _count: { select: { courses: true } } },
    orderBy: [{ programmeId: "asc" }, { number: "asc" }],
  });
  return NextResponse.json(terms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { programmeId, number } = body;
  if (!programmeId || !number) return NextResponse.json({ error: "programmeId and number required" }, { status: 400 });
  const name = `Term ${number}`;
  const term = await prisma.term.create({
    data: { programmeId, number, name },
    include: { programme: true },
  });
  return NextResponse.json(term, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, isActive } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = await prisma.term.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Term not found" }, { status: 404 });
  const term = await prisma.term.update({ where: { id }, data: { isActive } });
  return NextResponse.json(term);
}
