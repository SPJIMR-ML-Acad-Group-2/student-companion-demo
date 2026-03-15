import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const divisions = await prisma.division.findMany({
    include: {
      batch: { include: { programme: true } },
      defaultRoom: true,
      divisionTermRooms: {
        include: {
          term: true,
          room: true,
        },
      },
      _count: { select: { students: true } },
    },
    orderBy: [{ batchId: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(
    divisions.map((division) => ({
      ...division,
      termRoomAssignments: division.divisionTermRooms
        .map((link) => ({
          termId: link.termId,
          roomId: link.roomId,
          term: link.term,
          room: link.room,
        }))
        .sort((a, b) => a.term.number - b.term.number),
    })),
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, batchId } = body;
  if (!name || !batchId)
    return NextResponse.json(
      { error: "name and batchId required" },
      { status: 400 },
    );

  const existing = await prisma.division.findFirst({
    where: { name, batchId },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Division "${name}" already exists for this batch` },
      { status: 409 },
    );
  }

  try {
    const division = await prisma.division.create({
      data: { name, batchId },
      include: { batch: { include: { programme: true } } },
    });
    return NextResponse.json(division, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: `Division "${name}" already exists for this batch` },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, defaultRoomId, termRoomAssignments, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const normalizedAssignments = Array.isArray(termRoomAssignments)
    ? termRoomAssignments
        .filter((item) => item?.termId && item?.roomId)
        .map((item) => ({
          termId: item.termId as string,
          roomId: item.roomId as string,
        }))
    : undefined;

  const division = await prisma.$transaction(async (tx) => {
    const updated = await tx.division.update({
      where: { id },
      data: {
        ...data,
        defaultRoomId: defaultRoomId === undefined ? undefined : defaultRoomId,
        divisionTermRooms:
          normalizedAssignments === undefined
            ? undefined
            : {
                deleteMany: {},
                create: normalizedAssignments,
              },
      },
      include: {
        batch: { include: { programme: true } },
        defaultRoom: true,
        divisionTermRooms: {
          include: {
            term: true,
            room: true,
          },
        },
        _count: { select: { students: true } },
      },
    });
    return updated;
  });

  return NextResponse.json({
    ...division,
    termRoomAssignments: division.divisionTermRooms
      .map((link) => ({
        termId: link.termId,
        roomId: link.roomId,
        term: link.term,
        room: link.room,
      }))
      .sort((a, b) => a.term.number - b.term.number),
  });
}
