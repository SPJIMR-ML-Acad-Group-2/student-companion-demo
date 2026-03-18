import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFirstSheetTitle, readRange } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

const includeRelations = {
  division: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
  term: { select: { id: true, name: true, batchId: true } },
};

// GET — list all configs with division/group/term names
export async function GET() {
  const configs = await prisma.googleSheetsConfig.findMany({
    include: includeRelations,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(configs);
}

// POST — create a new workbook mapping (division/group → spreadsheetId)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { divisionId, groupId, termId, spreadsheetId } = body as {
    divisionId?: string;
    groupId?: string;
    termId: string;
    spreadsheetId: string;
  };

  if (!spreadsheetId?.trim()) {
    return NextResponse.json(
      { error: "spreadsheetId is required" },
      { status: 400 },
    );
  }
  if (!divisionId && !groupId) {
    return NextResponse.json(
      { error: "Either divisionId or groupId is required" },
      { status: 400 },
    );
  }
  if (divisionId && groupId) {
    return NextResponse.json(
      { error: "Provide either divisionId or groupId, not both" },
      { status: 400 },
    );
  }
  if (!termId?.trim()) {
    return NextResponse.json(
      { error: "termId is required" },
      { status: 400 },
    );
  }

  try {
    const config = await prisma.googleSheetsConfig.create({
      data: {
        divisionId: divisionId ?? null,
        groupId: groupId ?? null,
        termId: termId.trim(),
        spreadsheetId: spreadsheetId.trim(),
      },
      include: includeRelations,
    });
    return NextResponse.json(config, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A config already exists for this division/group and term" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — update spreadsheetId, termId, or isActive
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, spreadsheetId, termId, isActive } = body as {
    id: string;
    spreadsheetId?: string;
    termId?: string;
    isActive?: boolean;
  };

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (termId !== undefined && !termId.trim()) {
    return NextResponse.json({ error: "termId cannot be empty" }, { status: 400 });
  }

  const config = await prisma.googleSheetsConfig.update({
    where: { id },
    data: {
      ...(spreadsheetId !== undefined ? { spreadsheetId: spreadsheetId.trim() } : {}),
      ...(termId !== undefined ? { termId: termId.trim() } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: includeRelations,
  });
  return NextResponse.json(config);
}

// DELETE — remove a config
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const pendingCount = await prisma.attendanceSyncLog.count({
    where: { configId: id, status: "pending" },
  });
  if (pendingCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${pendingCount} pending sync records. Force-sync first.` },
      { status: 409 },
    );
  }

  await prisma.googleSheetsConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// HEAD ?test=<id> — verify connection by reading cell A1 from the spreadsheet
export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("test");
  if (!id) return new NextResponse(null, { status: 400 });

  const config = await prisma.googleSheetsConfig.findUnique({ where: { id } });
  if (!config) return new NextResponse(null, { status: 404 });

  try {
    // Discover the first sheet title so we never hard-code "Sheet1"
    const sheetTitle = await getFirstSheetTitle(config.spreadsheetId);
    await readRange(config.spreadsheetId, `${sheetTitle}!A1:B2`);
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
