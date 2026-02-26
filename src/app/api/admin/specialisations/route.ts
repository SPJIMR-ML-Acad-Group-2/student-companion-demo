import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const specialisations = await prisma.specialisation.findMany({
    include: {
      divisions: true,
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(specialisations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, code } = body;
  if (!name || !code) {
    return NextResponse.json({ error: "name and code required" }, { status: 400 });
  }

  const specialisation = await prisma.specialisation.create({
    data: { name, code },
  });
  return NextResponse.json(specialisation, { status: 201 });
}
