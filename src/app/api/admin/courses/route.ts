import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getAllowedBatchIds(group: {
  batchId: string;
  allowedBatches?: Array<{ batchId: string }>;
}) {
  const allowed = group.allowedBatches?.map((link) => link.batchId) ?? [];
  return allowed.length > 0 ? allowed : [group.batchId];
}

async function validateCourseCohorts(
  termIds: string[],
  groupIds: string[],
  divisionIds: string[],
) {
  const terms =
    termIds.length > 0
      ? await prisma.term.findMany({
          where: { id: { in: termIds } },
          select: { id: true, batchId: true },
        })
      : [];
  const termBatchIds = [...new Set(terms.map((term) => term.batchId))];

  if (termIds.length > 0 && terms.length !== termIds.length) {
    return "One or more selected terms were not found";
  }

  if (divisionIds.length > 0) {
    const divisions = await prisma.division.findMany({
      where: { id: { in: divisionIds } },
      select: { id: true, batchId: true },
    });
    if (divisions.length !== divisionIds.length) {
      return "One or more selected divisions were not found";
    }
    if (termBatchIds.length > 0) {
      const invalidDivision = divisions.find(
        (division) => !termBatchIds.includes(division.batchId),
      );
      if (invalidDivision) {
        return "Each selected division must belong to one of the selected term batches";
      }
    }
  }

  if (groupIds.length > 0) {
    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds } },
      include: { allowedBatches: true },
    });
    if (groups.length !== groupIds.length) {
      return "One or more selected groups were not found";
    }
    if (termBatchIds.length > 0) {
      const invalidGroup = groups.find(
        (group) =>
          !getAllowedBatchIds(group).some((batchId) =>
            termBatchIds.includes(batchId),
          ),
      );
      if (invalidGroup) {
        return "Each selected group must allow at least one of the selected term batches";
      }
    }
  }

  return null;
}

async function getCoreDivisionIdsForTerms(termIds: string[]) {
  if (termIds.length === 0) return [] as string[];
  const terms = await prisma.term.findMany({
    where: { id: { in: termIds } },
    select: { batchId: true },
  });
  const batchIds = [...new Set(terms.map((term) => term.batchId))];
  if (batchIds.length === 0) return [] as string[];
  const divisions = await prisma.division.findMany({
    where: { batchId: { in: batchIds } },
    select: { id: true },
  });
  return divisions.map((division) => division.id);
}

export async function GET(req: NextRequest) {
  const termId = req.nextUrl.searchParams.get("termId");
  const batchId = req.nextUrl.searchParams.get("batchId");

  const where: any = {};
  if (termId) {
    where.courseTerms = { some: { termId } };
  } else if (batchId) {
    where.courseTerms = { some: { term: { batchId } } };
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      courseTerms: {
        include: {
          term: { include: { batch: { include: { programme: true } } } },
        },
      },
      courseDivisions: {
        include: {
          division: { include: { batch: { include: { programme: true } } } },
        },
      },
      courseGroups: { include: { group: true } },
      specialisation: true,
      facultyCourses: { include: { faculty: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    code,
    name,
    totalSessions,
    credits,
    termIds,
    groupIds,
    divisionIds,
    type,
    specialisationId,
    sheetsTabName,
    facultyIds,
  } = body;
  if (!code || !name)
    return NextResponse.json(
      { error: "code and name required" },
      { status: 400 },
    );
  const creditSessionMap: Record<number, number> = {
    1: 9,
    2: 18,
    3: 26,
    4: 35,
  };
  const finalCredits = credits || 3;
  const finalSessions = totalSessions || creditSessionMap[finalCredits] || 26;
  const courseTermIds = termIds ?? [];
  const courseGroupIds = groupIds ?? [];
  const courseDivisionIds =
    (type || "core") === "core"
      ? await getCoreDivisionIdsForTerms(courseTermIds)
      : (divisionIds ?? []);
  const validationError = await validateCourseCohorts(
    courseTermIds,
    courseGroupIds,
    courseDivisionIds,
  );
  if (validationError)
    return NextResponse.json({ error: validationError }, { status: 400 });
  try {
    const course = await prisma.course.create({
      data: {
        code,
        name,
        totalSessions: finalSessions,
        credits: finalCredits,
        type: type || "core",
        specialisationId:
          type === "specialisation" && specialisationId
            ? specialisationId
            : null,
        sheetsTabName: sheetsTabName ?? null,
        courseTerms:
          courseTermIds.length > 0
            ? {
                create: courseTermIds.map((tId: string) => ({ termId: tId })),
              }
            : undefined,
        courseDivisions:
          courseDivisionIds.length > 0
            ? {
                create: courseDivisionIds.map((dId: string) => ({
                  divisionId: dId,
                })),
              }
            : undefined,
        courseGroups:
          courseGroupIds.length > 0
            ? {
                create: courseGroupIds.map((gId: string) => ({ groupId: gId })),
              }
            : undefined,
        facultyCourses:
          facultyIds && facultyIds.length > 0
            ? {
                create: facultyIds.map((fId: string) => ({ facultyId: fId })),
              }
            : undefined,
      },
      include: {
        specialisation: true,
        courseTerms: {
          include: {
            term: { include: { batch: { include: { programme: true } } } },
          },
        },
        courseDivisions: {
          include: {
            division: { include: { batch: { include: { programme: true } } } },
          },
        },
        courseGroups: { include: { group: true } },
        facultyCourses: { include: { faculty: true } },
      },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Course code already exists" },
        { status: 409 },
      );
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, facultyIds, termIds, groupIds, divisionIds, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existingCourse = await prisma.course.findUnique({
    where: { id },
    include: {
      courseTerms: { select: { termId: true } },
      courseGroups: { select: { groupId: true } },
      courseDivisions: { select: { divisionId: true } },
    },
  });
  if (!existingCourse)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Recalculate totalSessions if credits changed
  if (data.credits) {
    const creditSessionMap: Record<number, number> = {
      1: 9,
      2: 18,
      3: 26,
      4: 35,
    };
    data.totalSessions = creditSessionMap[data.credits] || data.totalSessions;
  }

  // Handle wiping and creating new mappings if provided
  const updateData: any = { ...data };
  const effectiveType = data.type ?? existingCourse.type;
  const effectiveTermIds =
    termIds ?? existingCourse.courseTerms.map((term) => term.termId);
  const effectiveGroupIds =
    groupIds ?? existingCourse.courseGroups.map((group) => group.groupId);
  const effectiveDivisionIds =
    effectiveType === "core"
      ? await getCoreDivisionIdsForTerms(effectiveTermIds)
      : (divisionIds ??
        existingCourse.courseDivisions.map((division) => division.divisionId));
  const validationError = await validateCourseCohorts(
    effectiveTermIds,
    effectiveGroupIds,
    effectiveDivisionIds,
  );
  if (validationError)
    return NextResponse.json({ error: validationError }, { status: 400 });

  if (facultyIds !== undefined) {
    updateData.facultyCourses = {
      deleteMany: {},
      create: facultyIds.map((fId: string) => ({ facultyId: fId })),
    };
  }
  if (termIds !== undefined) {
    updateData.courseTerms = {
      deleteMany: {},
      create: termIds.map((tId: string) => ({ termId: tId })),
    };
  }
  if (divisionIds !== undefined || effectiveType === "core") {
    updateData.courseDivisions = {
      deleteMany: {},
      create: effectiveDivisionIds.map((dId: string) => ({ divisionId: dId })),
    };
  }
  if (groupIds !== undefined) {
    updateData.courseGroups = {
      deleteMany: {},
      create: groupIds.map((gId: string) => ({ groupId: gId })),
    };
  }

  const course = await prisma.course.update({
    where: { id },
    data: updateData,
    include: {
      courseTerms: {
        include: {
          term: { include: { batch: { include: { programme: true } } } },
        },
      },
      courseDivisions: {
        include: {
          division: { include: { batch: { include: { programme: true } } } },
        },
      },
      courseGroups: { include: { group: true } },
      specialisation: true,
      facultyCourses: { include: { faculty: true } },
    },
  });
  return NextResponse.json(course);
}
