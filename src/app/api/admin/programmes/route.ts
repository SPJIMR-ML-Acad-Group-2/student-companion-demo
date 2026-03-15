import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const programmes = await prisma.programme.findMany({
    include: {
      batches: {
        include: {
          activeTerm: true,
          terms: { orderBy: { number: "asc" } },
          divisions: { orderBy: { name: "asc" } },
          _count: { select: { students: true } },
        },
        orderBy: { startYear: "desc" },
      },
    },
  });

  const normalized = programmes.map((programme) => ({
    ...programme,
    batches: programme.batches.map((batch) => ({
      ...batch,
      terms: batch.terms.map((term) => ({
        ...term,
        isActive: batch.activeTermId === term.id,
      })),
    })),
  }));

  return NextResponse.json(normalized);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, name, fullName } = body;
  if (!code || !name)
    return NextResponse.json(
      { error: "code and name required" },
      { status: 400 },
    );
  const programme = await prisma.programme.create({
    data: { code, name, fullName: fullName || name },
  });
  return NextResponse.json(programme, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, code, name, fullName } = body;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const programme = await prisma.programme.update({
    where: { id },
    data: {
      ...(code !== undefined ? { code } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(fullName !== undefined ? { fullName } : {}),
    },
  });
  return NextResponse.json(programme);
}
