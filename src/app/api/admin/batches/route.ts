import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const batches = await prisma.batch.findMany({
    include: { programme: true, terms: true, _count: { select: { students: true } } },
    orderBy: { startYear: "desc" },
  });
  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { programmeId, name, startYear, endYear } = body;
  if (!programmeId || !name || !startYear || !endYear) {
    return NextResponse.json({ error: "programmeId, name, startYear, endYear required" }, { status: 400 });
  }

  const batch = await prisma.batch.create({
    data: { programmeId, name, startYear, endYear },
    include: { programme: true },
  });
  return NextResponse.json(batch, { status: 201 });
}
