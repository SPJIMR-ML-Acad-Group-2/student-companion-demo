import { NextRequest, NextResponse } from "next/server";
import { syncPendingRecords } from "@/lib/attendanceSync";

export const dynamic = "force-dynamic";
// Allow up to 5 minutes for a large force-sync on Vercel
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { configId, includeSkipped } = body as {
    configId?: string;
    includeSkipped?: boolean;
  };

  if (process.env.GOOGLE_SHEETS_SYNC_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Google Sheets sync is not enabled. Set GOOGLE_SHEETS_SYNC_ENABLED=true." },
      { status: 503 },
    );
  }

  try {
    const result = await syncPendingRecords(configId, includeSkipped ?? false);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
