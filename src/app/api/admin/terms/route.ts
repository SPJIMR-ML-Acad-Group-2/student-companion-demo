import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batchId");
  const terms = await prisma.term.findMany({
    where: batchId ? { batchId: parseInt(batchId) } : {},
    include: { batch: { include: { programme: true } }, _count: { select: { courses: true } } },
    orderBy: [{ batchId: "asc" }, { number: "asc" }],
  });
  return NextResponse.json(terms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { batchId, number, startDate, isActive } = body;
  if (!batchId || !number) return NextResponse.json({ error: "batchId and number required" }, { status: 400 });
  const name = `Term ${number}`;
  if (isActive) {
    await prisma.term.updateMany({ where: { batchId, isActive: true }, data: { isActive: false } });
  }
  const term = await prisma.term.create({
    data: { batchId, number, name, startDate: startDate || null, isActive: isActive || false },
    include: { batch: true },
  });
  return NextResponse.json(term, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, isActive } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = await prisma.term.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Term not found" }, { status: 404 });
  if (isActive) {
    await prisma.term.updateMany({ where: { batchId: existing.batchId, isActive: true }, data: { isActive: false } });
  }
  const term = await prisma.term.update({ where: { id }, data: { isActive } });
  return NextResponse.json(term);
}
