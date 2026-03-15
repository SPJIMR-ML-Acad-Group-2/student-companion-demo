import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const activeOnlyParam = req.nextUrl.searchParams.get("activeOnly");
  const activeOnly = activeOnlyParam === "1" || activeOnlyParam === "true";

  const batches = await prisma.batch.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: {
      programme: true,
      activeTerm: true,
      _count: { select: { students: true } },
    },
    orderBy: { startYear: "desc" },
  });
  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { programmeId, name, startYear, endYear } = body;
  if (!programmeId || !name || !startYear || !endYear) {
    return NextResponse.json(
      { error: "programmeId, name, startYear, endYear required" },
      { status: 400 },
    );
  }

  const batch = await prisma.batch.create({
    data: { programmeId, name, startYear, endYear },
    include: { programme: true },
  });
  return NextResponse.json(batch, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, startYear, endYear, isActive, activeTermId } = body;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const batch = await prisma.batch.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(startYear !== undefined ? { startYear } : {}),
      ...(endYear !== undefined ? { endYear } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(activeTermId !== undefined ? { activeTermId } : {}),
    },
    include: {
      programme: true,
      activeTerm: true,
      _count: { select: { students: true } },
    },
  });

  return NextResponse.json(batch);
}
