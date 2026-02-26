import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Roll number pattern: CODE-YY-NNN (e.g., PGP-25-001, PGPBM-25-003)
const ROLL_NUMBER_REGEX = /^[A-Z]+-\d{2}-\d{3}$/;

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batchId");
  const divisionId = req.nextUrl.searchParams.get("divisionId");
  const where: Record<string, unknown> = { role: "student" };
  if (batchId) where.batchId = parseInt(batchId);
  if (divisionId) where.coreDivisionId = parseInt(divisionId);

  const students = await prisma.user.findMany({
    where,
    include: {
      batch: { include: { programme: true } },
      coreDivision: true, specialisation: true, specDivision: true,
    },
    orderBy: { rollNumber: "asc" },
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, rollNumber, batchId, coreDivisionId, specialisationId, specDivisionId } = body;
  if (!name || !email || !rollNumber) return NextResponse.json({ error: "name, email, rollNumber required" }, { status: 400 });

  // Validate roll number format
  if (!ROLL_NUMBER_REGEX.test(rollNumber)) {
    return NextResponse.json({ error: `Invalid roll number format "${rollNumber}". Expected pattern: CODE-YY-NNN (e.g., PGP-25-001)` }, { status: 400 });
  }

  // Validate roll number prefix matches programme code if batch is selected
  if (batchId) {
    const batch = await prisma.batch.findUnique({ where: { id: batchId }, include: { programme: true } });
    if (batch) {
      const prefix = rollNumber.split("-")[0];
      if (prefix !== batch.programme.code) {
        return NextResponse.json({ error: `Roll number prefix "${prefix}" doesn't match programme code "${batch.programme.code}"` }, { status: 400 });
      }
    }
  }

  try {
    const student = await prisma.user.create({
      data: { name, email, rollNumber, role: "student", batchId: batchId || null, coreDivisionId: coreDivisionId || null, specialisationId: specialisationId || null, specDivisionId: specDivisionId || null },
      include: { batch: true, coreDivision: true, specialisation: true, specDivision: true },
    });
    return NextResponse.json(student, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") return NextResponse.json({ error: "Student with this roll number or email already exists" }, { status: 409 });
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, rollNumber, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Validate roll number if changed
  if (rollNumber) {
    if (!ROLL_NUMBER_REGEX.test(rollNumber)) {
      return NextResponse.json({ error: `Invalid roll number format "${rollNumber}". Expected: CODE-YY-NNN` }, { status: 400 });
    }
    data.rollNumber = rollNumber;
  }

  const student = await prisma.user.update({
    where: { id }, data,
    include: { batch: true, coreDivision: true, specialisation: true, specDivision: true },
  });
  return NextResponse.json(student);
}
