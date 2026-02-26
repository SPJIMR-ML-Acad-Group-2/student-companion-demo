import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const divisions = await prisma.division.findMany({
    include: {
      batch: { include: { programme: true } },
      specialisation: true,
      _count: { select: { coreStudents: true, specStudents: true } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(divisions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, batchId, specialisationId } = body;
  if (!name || !type) return NextResponse.json({ error: "name and type required" }, { status: 400 });

  // Auto-prepend specialisation code for spec divisions
  let finalName = name;
  if (type === "specialisation" && specialisationId) {
    const spec = await prisma.specialisation.findUnique({ where: { id: specialisationId } });
    if (spec && !name.startsWith(spec.code + "-")) {
      finalName = `${spec.code}-${name}`;
    }
  }

  // Check uniqueness within batch
  const existing = await prisma.division.findFirst({ where: { name: finalName, batchId: batchId || null } });
  if (existing) {
    return NextResponse.json({ error: `Division "${finalName}" already exists for this batch` }, { status: 409 });
  }

  try {
    const division = await prisma.division.create({
      data: { name: finalName, type, batchId: batchId || null, specialisationId: specialisationId || null },
      include: { batch: { include: { programme: true } }, specialisation: true },
    });
    return NextResponse.json(division, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") return NextResponse.json({ error: `Division "${finalName}" already exists for this batch` }, { status: 409 });
    throw err;
  }
}
