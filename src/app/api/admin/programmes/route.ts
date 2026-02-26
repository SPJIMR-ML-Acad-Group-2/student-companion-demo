import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const programmes = await prisma.programme.findMany({
    include: {
      batches: {
        include: {
          terms: { orderBy: { number: "asc" } },
          divisions: { where: { type: "core" }, orderBy: { name: "asc" } },
          _count: { select: { students: true } },
        },
        orderBy: { startYear: "desc" },
      },
    },
  });
  return NextResponse.json(programmes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, name, fullName } = body;
  if (!code || !name) return NextResponse.json({ error: "code and name required" }, { status: 400 });
  const programme = await prisma.programme.create({ data: { code, name, fullName: fullName || name } });
  return NextResponse.json(programme, { status: 201 });
}
