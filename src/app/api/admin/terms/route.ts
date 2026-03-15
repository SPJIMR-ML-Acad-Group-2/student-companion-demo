import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

function validateDateRange(startDate?: string | null, endDate?: string | null) {
  if (startDate && !isIsoDate(startDate)) return "startDate must be YYYY-MM-DD";
  if (endDate && !isIsoDate(endDate)) return "endDate must be YYYY-MM-DD";
  if (startDate && endDate && startDate > endDate) {
    return "startDate cannot be after endDate";
  }
  return null;
}

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batchId");
  const terms = await prisma.term.findMany({
    where: batchId ? { batchId } : {},
    include: { batch: { include: { programme: true } }, _count: { select: { courses: true } } },
    orderBy: [{ batchId: "asc" }, { number: "asc" }],
  });
  return NextResponse.json(terms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { batchId, number, startDate, endDate } = body;
  if (!batchId || !number) return NextResponse.json({ error: "batchId and number required" }, { status: 400 });
  const rangeError = validateDateRange(startDate ?? null, endDate ?? null);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  const name = `Term ${number}`;
  const term = await prisma.term.create({
    data: {
      batchId,
      number,
      name,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    },
    include: { batch: { include: { programme: true } } },
  });
  return NextResponse.json(term, { status: 201 });
}

/** PATCH — set a term as the active term for its batch (isActive: true) or deactivate (false) */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, isActive, startDate, endDate } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const hasStartDate = Object.prototype.hasOwnProperty.call(body, "startDate");
  const hasEndDate = Object.prototype.hasOwnProperty.call(body, "endDate");
  const hasIsActive = Object.prototype.hasOwnProperty.call(body, "isActive");

  const existing = await prisma.term.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Term not found" }, { status: 404 });

  const effectiveStartDate = hasStartDate
    ? (startDate ?? null)
    : (existing.startDate ?? null);
  const effectiveEndDate = hasEndDate
    ? (endDate ?? null)
    : (existing.endDate ?? null);
  const rangeError = validateDateRange(effectiveStartDate, effectiveEndDate);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  if (hasStartDate || hasEndDate) {
    await prisma.term.update({
      where: { id },
      data: {
        ...(hasStartDate ? { startDate: startDate ?? null } : {}),
        ...(hasEndDate ? { endDate: endDate ?? null } : {}),
      },
    });
  }

  if (hasIsActive) {
    // Active term is tracked on the Batch (not on Term itself)
    await prisma.batch.update({
      where: { id: existing.batchId },
      data: { activeTermId: isActive ? id : null },
    });
  }

  const updated = await prisma.term.findUnique({
    where: { id },
    include: { batch: { include: { programme: true, activeTerm: true } } },
  });
  return NextResponse.json({
    ...updated,
    isActive: updated?.batch?.activeTermId === id,
  });
}
