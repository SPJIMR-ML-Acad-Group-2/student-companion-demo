import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [faculty, rooms, divisions, groups, courses, slots] = await Promise.all([
    prisma.faculty.findMany({ select: { id: true, name: true, erpCode: true }, orderBy: { name: "asc" } }),
    prisma.room.findMany({ select: { id: true, name: true, erpCode: true }, orderBy: { name: "asc" } }),
    prisma.division.findMany({
      select: { id: true, name: true, erpClassCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.group.findMany({
      select: { id: true, name: true, type: true, erpGroupCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({ select: { id: true, code: true, name: true, erpSubjectCode: true }, orderBy: { code: "asc" } }),
    prisma.slot.findMany({ orderBy: { slotNumber: "asc" } }),
  ]);

  return NextResponse.json({ faculty, rooms, divisions, groups, courses, slots });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { type, id, ...fields } = body as {
    type: "faculty" | "room" | "division" | "group" | "course" | "slot";
    id: string;
    [key: string]: unknown;
  };

  if (!type || !id) {
    return NextResponse.json({ error: "type and id required" }, { status: 400 });
  }

  try {
    let result;
    switch (type) {
      case "faculty":
        result = await prisma.faculty.update({
          where: { id },
          data: { erpCode: fields.erpCode as string | null },
        });
        break;
      case "room":
        result = await prisma.room.update({
          where: { id },
          data: { erpCode: fields.erpCode as string | null },
        });
        break;
      case "division":
        result = await prisma.division.update({
          where: { id },
          data: { erpClassCode: fields.erpClassCode as string | null },
        });
        break;
      case "group":
        result = await prisma.group.update({
          where: { id },
          data: { erpGroupCode: fields.erpGroupCode as string | null },
        });
        break;
      case "course":
        result = await prisma.course.update({
          where: { id },
          data: { erpSubjectCode: fields.erpSubjectCode as string | null },
        });
        break;
      case "slot":
        result = await prisma.slot.update({
          where: { slotNumber: Number(id) },
          data: {
            erpPeriodNumber: fields.erpPeriodNumber != null ? Number(fields.erpPeriodNumber) : null,
          },
        });
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    console.error("ERP code update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
