import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ROLL_NUMBER_REGEX = /^[A-Z]+-\d{2}-\d{3}$/;

function getAllowedBatchIds(group: {
  batchId: string;
  allowedBatches?: Array<{ batchId: string }>;
}) {
  const allowed = group.allowedBatches?.map((link) => link.batchId) ?? [];
  return allowed.length > 0 ? allowed : [group.batchId];
}

async function validateStudentAssignments(input: {
  batchId: string;
  divisionId: string;
  specialisationId?: string | null;
  groupIds?: string[];
}) {
  const division = await prisma.division.findUnique({
    where: { id: input.divisionId },
  });
  if (!division || division.batchId !== input.batchId) {
    return "Selected division does not belong to the selected batch";
  }

  if (input.groupIds && input.groupIds.length > 0) {
    const groups = await prisma.group.findMany({
      where: { id: { in: input.groupIds } },
      include: { allowedBatches: true },
    });
    if (groups.length !== input.groupIds.length) {
      return "One or more selected groups were not found";
    }

    const invalidBatchGroup = groups.find(
      (group) => !getAllowedBatchIds(group).includes(input.batchId),
    );
    if (invalidBatchGroup) {
      return "One or more selected groups do not allow the selected batch";
    }

    const invalidSpecGroup = groups.find(
      (group) =>
        group.type === "specialisation" &&
        group.specialisationId &&
        group.specialisationId !== (input.specialisationId ?? null),
    );
    if (invalidSpecGroup) {
      return "Specialisation groups require the student to have the matching specialisation";
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batchId");
  const batchIdsRaw = req.nextUrl.searchParams.get("batchIds");
  const divisionId = req.nextUrl.searchParams.get("divisionId");
  const specialisationId = req.nextUrl.searchParams.get("specialisationId");
  const batchIds =
    batchIdsRaw
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [];

  const where: Record<string, unknown> = {};
  if (batchId) where.batchId = batchId;
  if (batchIds.length > 0) where.batchId = { in: batchIds };
  if (divisionId) where.divisionId = divisionId;
  if (specialisationId) where.specialisationId = specialisationId;

  const students = await prisma.student.findMany({
    where,
    include: {
      user: true,
      batch: { include: { programme: true } },
      division: true,
      specialisation: true,
      groups: { include: { group: true } },
    },
    orderBy: { rollNumber: "asc" },
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    email,
    rollNumber,
    batchId,
    divisionId,
    specialisationId,
    groupIds,
  } = body;
  if (!name || !email || !rollNumber || !batchId || !divisionId) {
    return NextResponse.json(
      { error: "name, email, rollNumber, batchId, divisionId required" },
      { status: 400 },
    );
  }

  if (!ROLL_NUMBER_REGEX.test(rollNumber)) {
    return NextResponse.json(
      {
        error: `Invalid roll number format "${rollNumber}". Expected: CODE-YY-NNN`,
      },
      { status: 400 },
    );
  }

  // Validate roll number prefix matches programme code
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { programme: true },
  });
  if (batch) {
    const prefix = rollNumber.split("-")[0];
    if (prefix !== batch.programme.code) {
      return NextResponse.json(
        {
          error: `Roll number prefix "${prefix}" doesn't match programme code "${batch.programme.code}"`,
        },
        { status: 400 },
      );
    }
  }

  const assignmentError = await validateStudentAssignments({
    batchId,
    divisionId,
    specialisationId: specialisationId ?? null,
    groupIds: groupIds ?? [],
  });
  if (assignmentError) {
    return NextResponse.json({ error: assignmentError }, { status: 400 });
  }

  try {
    // Create User (auth record) first
    const user = await prisma.user.create({
      data: { name, email, role: "student" },
    });

    // Create Student (academic record)
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        rollNumber,
        batchId,
        divisionId,
        specialisationId: specialisationId ?? null,
        groups: groupIds?.length
          ? { create: (groupIds as string[]).map((gid) => ({ groupId: gid })) }
          : undefined,
      },
      include: {
        user: true,
        batch: { include: { programme: true } },
        division: true,
        specialisation: true,
        groups: { include: { group: true } },
      },
    });
    return NextResponse.json(student, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Student with this roll number or email already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, email, rollNumber, batchId, divisionId, specialisationId } =
    body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (rollNumber && !ROLL_NUMBER_REGEX.test(rollNumber)) {
    return NextResponse.json(
      {
        error: `Invalid roll number format "${rollNumber}". Expected: CODE-YY-NNN`,
      },
      { status: 400 },
    );
  }

  // Find the student to get userId
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const effectiveBatchId = batchId ?? existing.batchId;
  const effectiveDivisionId = divisionId ?? existing.divisionId;
  const effectiveSpecialisationId =
    specialisationId !== undefined
      ? specialisationId
      : existing.specialisationId;

  if (rollNumber) {
    const effectiveBatch = await prisma.batch.findUnique({
      where: { id: effectiveBatchId },
      include: { programme: true },
    });
    if (effectiveBatch) {
      const prefix = rollNumber.split("-")[0];
      if (prefix !== effectiveBatch.programme.code) {
        return NextResponse.json(
          {
            error: `Roll number prefix "${prefix}" doesn't match programme code "${effectiveBatch.programme.code}"`,
          },
          { status: 400 },
        );
      }
    }
  }

  const currentGroupIds = await prisma.studentGroup.findMany({
    where: { studentId: id },
    select: { groupId: true },
  });
  const assignmentError = await validateStudentAssignments({
    batchId: effectiveBatchId,
    divisionId: effectiveDivisionId,
    specialisationId: effectiveSpecialisationId,
    groupIds: currentGroupIds.map((group) => group.groupId),
  });
  if (assignmentError) {
    return NextResponse.json({ error: assignmentError }, { status: 400 });
  }

  // Update User (auth) fields if provided
  if (name || email) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { ...(name ? { name } : {}), ...(email ? { email } : {}) },
    });
  }

  // Update Student (academic) fields
  const studentUpdate: Record<string, unknown> = {};
  if (rollNumber) studentUpdate.rollNumber = rollNumber;
  if (batchId) studentUpdate.batchId = batchId;
  if (divisionId) studentUpdate.divisionId = divisionId;
  if (specialisationId !== undefined)
    studentUpdate.specialisationId = specialisationId;

  const student = await prisma.student.update({
    where: { id },
    data: studentUpdate,
    include: {
      user: true,
      batch: { include: { programme: true } },
      division: true,
      specialisation: true,
      groups: { include: { group: true } },
    },
  });
  return NextResponse.json(student);
}
