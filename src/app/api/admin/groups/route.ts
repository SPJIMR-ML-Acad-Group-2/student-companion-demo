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

function serializeGroup(group: {
  id: string;
  name: string;
  batchId: string;
  type: string;
  specialisationId: string | null;
  erpGroupCode: string | null;
  defaultRoomId?: string | null;
  defaultRoom?: { id: string; name: string } | null;
  groupTermRooms?: Array<{
    termId: string;
    roomId: string;
    term: { id: string; name: string; number: number; batchId: string };
    room: { id: string; name: string };
  }>;
  batch?: unknown;
  specialisation?: unknown;
  allowedBatches?: Array<{
    batchId: string;
    batch: {
      id: string;
      name: string;
      programmeId: string;
      programme?: { id: string; name: string; code: string } | null;
    };
  }>;
  _count?: { members: number };
  members?: unknown;
}) {
  const allowedBatches = group.allowedBatches ?? [];
  const allowedBatchIds = getAllowedBatchIds(group);
  return {
    ...group,
    termRoomAssignments: (group.groupTermRooms ?? [])
      .map((link) => ({
        termId: link.termId,
        roomId: link.roomId,
        term: link.term,
        room: link.room,
      }))
      .sort((a, b) => a.term.number - b.term.number),
    allowedBatches:
      allowedBatches.length > 0
        ? allowedBatches.map((link) => link.batch)
        : group.batch
          ? [group.batch]
          : [],
    allowedBatchIds,
  };
}

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batchId");
  const specialisationId = req.nextUrl.searchParams.get("specialisationId");
  const batchIdsParam = req.nextUrl.searchParams.get("batchIds");
  const batchIds =
    batchIdsParam
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [];

  const where: Record<string, unknown> = {};
  if (specialisationId) where.specialisationId = specialisationId;
  if (batchId) {
    where.OR = [{ batchId }, { allowedBatches: { some: { batchId } } }];
  } else if (batchIds.length > 0) {
    where.OR = [
      { batchId: { in: batchIds } },
      { allowedBatches: { some: { batchId: { in: batchIds } } } },
    ];
  }

  const groups = await prisma.group.findMany({
    where,
    include: {
      batch: { include: { programme: true } },
      allowedBatches: { include: { batch: { include: { programme: true } } } },
      specialisation: true,
      defaultRoom: true,
      groupTermRooms: { include: { term: true, room: true } },
      _count: { select: { members: true } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(groups.map(serializeGroup));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, batchId, type, specialisationId, allowedBatchIds } = body;
  if (!name || !batchId || !type) {
    return NextResponse.json(
      { error: "name, batchId, and type required" },
      { status: 400 },
    );
  }

  const normalizedAllowedBatchIds = [
    ...new Set(
      [batchId, ...((allowedBatchIds as string[] | undefined) ?? [])].filter(
        Boolean,
      ),
    ),
  ];

  // Auto-prepend specialisation code for specialisation groups
  let finalName = name;
  if (type === "specialisation" && specialisationId) {
    const spec = await prisma.specialisation.findUnique({
      where: { id: specialisationId },
    });
    if (spec && !name.startsWith(spec.code + "-")) {
      finalName = `${spec.code}-${name}`;
    }
  }

  try {
    const group = await prisma.group.create({
      data: {
        name: finalName,
        batchId,
        type,
        specialisationId: specialisationId ?? null,
        allowedBatches:
          normalizedAllowedBatchIds.length > 0
            ? {
                create: normalizedAllowedBatchIds.map((allowedBatchId) => ({
                  batchId: allowedBatchId,
                })),
              }
            : undefined,
      },
      include: {
        batch: { include: { programme: true } },
        allowedBatches: {
          include: { batch: { include: { programme: true } } },
        },
        specialisation: true,
        defaultRoom: true,
        groupTermRooms: { include: { term: true, room: true } },
      },
    });
    return NextResponse.json(serializeGroup(group), { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: `Group "${finalName}" already exists for this batch` },
        { status: 409 },
      );
    }
    throw err;
  }
}

/** PATCH — replace all members of a group with the provided studentIds list */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const {
    id,
    studentIds,
    name: newName,
    allowedBatchIds: newAllowedBatchIds,
    defaultRoomId,
    termRoomAssignments,
  } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existingGroup = await prisma.group.findUnique({
    where: { id },
    include: {
      batch: { include: { programme: true } },
      allowedBatches: { include: { batch: { include: { programme: true } } } },
      specialisation: true,
      members: {
        include: {
          student: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!existingGroup)
    return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const normalizedAllowedBatchIds =
    newAllowedBatchIds !== undefined
      ? [
          ...new Set(
            [...((newAllowedBatchIds as string[] | undefined) ?? [])].filter(
              Boolean,
            ),
          ),
        ]
      : undefined;

  if (
    normalizedAllowedBatchIds !== undefined &&
    normalizedAllowedBatchIds.length === 0
  ) {
    return NextResponse.json(
      { error: "Select at least one allowed batch" },
      { status: 400 },
    );
  }

  const effectiveAllowedBatchIds =
    normalizedAllowedBatchIds ?? getAllowedBatchIds(existingGroup);
  let autoRemovedMembersCount = 0;

  const normalizedTermRoomAssignments = Array.isArray(termRoomAssignments)
    ? termRoomAssignments
        .filter((item) => item?.termId && item?.roomId)
        .map((item) => ({
          termId: item.termId as string,
          roomId: item.roomId as string,
        }))
    : undefined;

  // Update group metadata if provided
  if (
    newName !== undefined ||
    newAllowedBatchIds !== undefined ||
    defaultRoomId !== undefined ||
    normalizedTermRoomAssignments !== undefined
  ) {
    const updateData: Record<string, unknown> = {};
    if (newName !== undefined) updateData.name = newName;
    if (defaultRoomId !== undefined) updateData.defaultRoomId = defaultRoomId;
    if (normalizedAllowedBatchIds !== undefined) {
      updateData.allowedBatches = {
        deleteMany: {},
        create: normalizedAllowedBatchIds.map((bId: string) => ({
          batchId: bId,
        })),
      };
    }
    if (normalizedTermRoomAssignments !== undefined) {
      updateData.groupTermRooms = {
        deleteMany: {},
        create: normalizedTermRoomAssignments,
      };
    }
    await prisma.group.update({ where: { id }, data: updateData });

    if (normalizedAllowedBatchIds !== undefined) {
      const invalidStudentIds = existingGroup.members
        .filter(
          (member) =>
            !normalizedAllowedBatchIds.includes(member.student.batchId),
        )
        .map((member) => member.studentId);
      if (invalidStudentIds.length > 0) {
        await prisma.studentGroup.deleteMany({
          where: {
            groupId: id,
            studentId: { in: invalidStudentIds },
          },
        });
        autoRemovedMembersCount = invalidStudentIds.length;
      }
    }

    if (studentIds === undefined) {
      const updated = await prisma.group.findUnique({
        where: { id },
        include: {
          batch: { include: { programme: true } },
          allowedBatches: {
            include: { batch: { include: { programme: true } } },
          },
          specialisation: true,
          defaultRoom: true,
          groupTermRooms: { include: { term: true, room: true } },
          _count: { select: { members: true } },
        },
      });
      return NextResponse.json(
        updated
          ? {
              ...serializeGroup(updated),
              autoRemovedMembersCount,
            }
          : null,
      );
    }
  }

  if (studentIds && studentIds.length > 0) {
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds as string[] } },
      select: { id: true, batchId: true, specialisationId: true },
    });
    if (students.length !== (studentIds as string[]).length) {
      return NextResponse.json(
        { error: "One or more students were not found" },
        { status: 400 },
      );
    }

    const invalidBatchStudent = students.find(
      (student) => !effectiveAllowedBatchIds.includes(student.batchId),
    );
    if (invalidBatchStudent) {
      return NextResponse.json(
        {
          error:
            "One or more students belong to batches not allowed for this group",
        },
        { status: 400 },
      );
    }

    if (
      existingGroup.type === "specialisation" &&
      existingGroup.specialisationId
    ) {
      const invalidSpecStudent = students.find(
        (student) =>
          student.specialisationId !== existingGroup.specialisationId,
      );
      if (invalidSpecStudent) {
        return NextResponse.json(
          {
            error:
              "Specialisation groups can only include students from the same specialisation",
          },
          { status: 400 },
        );
      }
    }
  }

  // Replace-all strategy: delete existing memberships, create new ones
  await prisma.studentGroup.deleteMany({ where: { groupId: id } });
  if (studentIds && studentIds.length > 0) {
    await prisma.studentGroup.createMany({
      data: (studentIds as string[]).map((sId: string) => ({
        studentId: sId,
        groupId: id,
      })),
    });
  }

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      batch: { include: { programme: true } },
      allowedBatches: { include: { batch: { include: { programme: true } } } },
      specialisation: true,
      defaultRoom: true,
      groupTermRooms: { include: { term: true, room: true } },
      members: {
        include: { student: { include: { user: true } } },
        orderBy: { student: { rollNumber: "asc" } },
      },
      _count: { select: { members: true } },
    },
  });
  return NextResponse.json(group ? serializeGroup(group) : null);
}

/** DELETE — delete a group (only if it has no timetable entries) */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const timetableCount = await prisma.timetable.count({
    where: { groupId: id },
  });
  if (timetableCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete group with existing timetable entries" },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Clear linked rows before deleting group to satisfy FK constraints.
      await tx.studentGroup.deleteMany({ where: { groupId: id } });
      await tx.courseGroup.deleteMany({ where: { groupId: id } });
      await tx.draftTimetable.deleteMany({ where: { groupId: id } });
      await tx.group.update({
        where: { id },
        data: { allowedBatches: { deleteMany: {} } },
      });
      await tx.group.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Cannot delete group because it is still referenced by other records",
        },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    throw err;
  }
}
