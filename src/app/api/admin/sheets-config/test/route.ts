import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRange } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

// GET /api/admin/sheets-config/test?id=<configId>
// Tests that the service account can read the configured sheet tab.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const config = await prisma.googleSheetsConfig.findUnique({ where: { id } });
  if (!config) return NextResponse.json({ error: "Config not found" }, { status: 404 });

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON == null) {
    return NextResponse.json(
      { error: "GOOGLE_SERVICE_ACCOUNT_JSON is not configured on this server." },
      { status: 503 },
    );
  }

  try {
    // Test with Sheet1!A1:C2 — just verifies credentials and spreadsheet access
    const rows = await readRange(config.spreadsheetId, "Sheet1!A1:C2");
    const headerPreview = rows[0]?.slice(0, 3).map(String) ?? [];
    return NextResponse.json({ ok: true, headerPreview });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
