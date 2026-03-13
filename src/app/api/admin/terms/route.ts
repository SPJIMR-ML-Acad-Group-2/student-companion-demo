import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batchId");
  const terms = await prisma.term.findMany({
    where: batchId ? { batchId } : {},
    include: { batch: { include: { programme: true } }, _count: { select: { courses: true } } },
    orderBy: [{ batchId: "asc" }, { number: "asc" }],
  });
  return NextResponse.json(terms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { batchId, number } = body;
  if (!batchId || !number) return NextResponse.json({ error: "batchId and number required" }, { status: 400 });
  const name = `Term ${number}`;
  const term = await prisma.term.create({
    data: { batchId, number, name },
    include: { batch: { include: { programme: true } } },
  });
  return NextResponse.json(term, { status: 201 });
}

/** PATCH — set a term as the active term for its batch (isActive: true) or deactivate (false) */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, isActive } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = await prisma.term.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Term not found" }, { status: 404 });
  // Active term is tracked on the Batch (not on Term itself)
  await prisma.batch.update({
    where: { id: existing.batchId },
    data:  { activeTermId: isActive ? id : null },
  });
  return NextResponse.json({ id, batchId: existing.batchId, isActive });
}
