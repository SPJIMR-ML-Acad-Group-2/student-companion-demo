import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// ─── ERP period definitions (fixed for this institution) ─────────────────────
// Period 1 = morning prayer/assembly (no app slot). Periods 3,4,6,8,10,12,14,16 = class slots.
// Missing numbers (2,5,7,9,11,13,15) are break periods — rows are NOT included.
const ERP_PERIODS = [
  { period: 1, timing: "7:0-7:30", appSlot: null },
  { period: 3, timing: "8:15-9:0", appSlot: 1 },
  { period: 4, timing: "9:0-10:10", appSlot: 2 },
  { period: 6, timing: "10:40-11:50", appSlot: 3 },
  { period: 8, timing: "12:10-13:20", appSlot: 4 },
  { period: 10, timing: "14:30-15:40", appSlot: 5 },
  { period: 12, timing: "16:0-17:10", appSlot: 6 },
  { period: 14, timing: "17:30-18:40", appSlot: 7 },
  { period: 16, timing: "19:0-20:10", appSlot: 8 },
] as const;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ACTIVITY_CODE_MAP: Record<string, string> = {
  session: "ACTMTR0028",
  evaluation: "ACTMTR0014",
};

// ─── Column indices (0-based) ─────────────────────────────────────────────────
// A=0, B=1, ..., Z=25, AA=26, AB=27, ..., AN=39, AO=40, AP=41, AQ=42, AR=43, AS=44, AT=45
const COL = {
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19, // Faculty Code1
  U: 20, // Is Assistant1
  AN: 39, // Room Code
  AO: 40, // Term Code
  AP: 41, // Group Code
  AR: 43, // Open
  AS: 44, // To be deleted
  AT: 45, // To be updated
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sc(ws: XLSX.WorkSheet, r: number, c: number, v: string | number) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = typeof v === "number" ? { v, t: "n" } : { v, t: "s" };
}

function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** YYYY-MM-DD → M/D/YYYY (ERP format, no leading zeros) */
function erpDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const termStart = req.nextUrl.searchParams.get("termStart");
  const termEnd = req.nextUrl.searchParams.get("termEnd");

  if (!termStart || !termEnd) {
    return NextResponse.json(
      { error: "termStart and termEnd required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  // Load template buffer once
  const templatePath = path.join(process.cwd(), "public", "erp-template.xlsx");
  let templateBuffer: Buffer;
  try {
    templateBuffer = fs.readFileSync(templatePath);
  } catch {
    return NextResponse.json(
      { error: "ERP template not found at public/erp-template.xlsx" },
      { status: 500 },
    );
  }

  // Build working date list (Mon-Sun)
  const allDates: string[] = [];
  for (
    let d = new Date(termStart + "T00:00:00");
    d <= new Date(termEnd + "T00:00:00");
    d.setDate(d.getDate() + 1)
  ) {
    allDates.push(localDateStr(d));
  }

  // Load core divisions
  const coreDivisions = await prisma.division.findMany();

  // ── Fetch ALL group timetable entries globally (outside the division loop) ──
  // This ensures spec/elective group rows appear in ALL division files,
  // not just divisions that happen to have students in that group.
  const allGroupTT = await prisma.timetable.findMany({
    where: { groupId: { not: null }, date: { in: allDates } },
    include: {
      course: true,
      faculty: true,
      room: true,
      group: { select: { id: true, name: true, erpGroupCode: true } },
    },
  });

  // Build multi-value map: "date-slotNumber" → GroupEntry[] (array, not single entry)
  // Handles the case where 2+ spec/elective groups have classes in the same slot.
  type GroupEntry = (typeof allGroupTT)[number];
  const globalGroupMap = new Map<string, GroupEntry[]>();
  for (const e of allGroupTT) {
    const key = `${e.date}-${e.slotNumber}`;
    const arr = globalGroupMap.get(key) ?? [];
    arr.push(e);
    globalGroupMap.set(key, arr);
  }

  const warnings: string[] = [];
  const zip = new JSZip();

  for (const coreDiv of coreDivisions) {
    // ── Clone the template workbook for this division ─────────────────────
    const wb = XLSX.read(templateBuffer, { type: "buffer" });
    const ws = wb.Sheets["upload_template"];
    if (!ws) continue;

    const origRange = XLSX.utils.decode_range(ws["!ref"]!);

    // Clear data rows (row 5+ = 0-indexed row 4+)
    for (const key of Object.keys(ws)) {
      if (key.startsWith("!")) continue;
      const { r } = XLSX.utils.decode_cell(key);
      if (r >= 4) delete ws[key];
    }

    // ── Fetch core (division-specific) timetable entries ─────────────────
    const coreTT = await prisma.timetable.findMany({
      where: { divisionId: coreDiv.id, date: { in: allDates } },
      include: { course: true, faculty: true, room: true },
    });

    type CoreEntry = (typeof coreTT)[number];
    const coreMap = new Map<string, CoreEntry>(
      coreTT.map((e) => [`${e.date}-${e.slotNumber}`, e]),
    );

    if (!coreDiv.erpClassCode)
      warnings.push(`Division "${coreDiv.name}" missing erpClassCode`);

    // ── Helper: write one ERP row ─────────────────────────────────────────
    // Called once per core entry, once per group entry per slot, or once for empty slots.
    const rowIdxRef = { v: 4 }; // 0-based → starts at row 5 in Excel
    const ttdidRef = { v: 692385 + coreDivisions.indexOf(coreDiv) * 10000 };

    function writeRow(
      ep: (typeof ERP_PERIODS)[number],
      date: string,
      weekday: string,
      dateErp: string,
      entry: CoreEntry | GroupEntry | null,
      isGroup: boolean,
    ) {
      const ri = rowIdxRef.v;

      // ── Constant columns (same for every row) ───────────────────────────
      sc(ws, ri, COL.B, 2);
      sc(ws, ri, COL.C, 181);
      sc(ws, ri, COL.D, 682);
      sc(ws, ri, COL.E, 8811);
      sc(ws, ri, COL.F, ttdidRef.v++);
      sc(ws, ri, COL.G, 3165);
      sc(ws, ri, COL.H, "SPJMUM");
      sc(ws, ri, COL.I, "BATCH0323");
      sc(ws, ri, COL.J, "SES0034");
      sc(ws, ri, COL.K, coreDiv.name);
      sc(ws, ri, COL.L, coreDiv.erpClassCode ?? "");
      sc(ws, ri, COL.M, weekday);
      sc(ws, ri, COL.N, dateErp);
      sc(ws, ri, COL.O, ep.period);
      sc(ws, ri, COL.P, ep.timing);
      sc(ws, ri, COL.R, ""); // empty string default (overridden below if entry exists)
      sc(ws, ri, COL.AR, "N");
      sc(ws, ri, COL.AS, "N");
      sc(ws, ri, COL.AT, "N");

      // ── Class-specific columns (only when a class is scheduled) ─────────
      if (entry) {
        if (!entry.course.erpSubjectCode)
          warnings.push(`Course "${entry.course.code}" missing erpSubjectCode`);

        // Q: session number (Remarks) — blank for evaluations
        if (
          entry.activityType === "session" &&
          (entry as CoreEntry & { sessionNumber?: number }).sessionNumber !=
            null
        )
          sc(
            ws,
            ri,
            COL.Q,
            (entry as CoreEntry & { sessionNumber?: number }).sessionNumber!,
          );

        // R: subject code (Mandatory)
        sc(ws, ri, COL.R, entry.course.erpSubjectCode ?? entry.course.code);

        // S: activity code (Mandatory)
        sc(
          ws,
          ri,
          COL.S,
          ACTIVITY_CODE_MAP[entry.activityType] ?? ACTIVITY_CODE_MAP.session,
        );

        // T: Faculty Code1, U: Is Assistant1
        if (entry.faculty?.erpCode) {
          sc(ws, ri, COL.T, entry.faculty.erpCode);
          sc(ws, ri, COL.U, "N");
        } else if (entry.facultyId) {
          warnings.push(`Faculty ID ${entry.facultyId} missing erpCode`);
        }

        // AN: Room Code
        if (entry.room?.erpCode) {
          sc(ws, ri, COL.AN, entry.room.erpCode);
        } else if (entry.roomId) {
          warnings.push(`Room ID ${entry.roomId} missing erpCode`);
        }

        // AP: Group Code — only for group-based (spec/elective) classes
        if (isGroup) {
          const grp = (entry as GroupEntry).group;
          if (grp?.erpGroupCode) {
            sc(ws, ri, COL.AP, grp.erpGroupCode);
          } else {
            warnings.push(
              `Group "${grp?.name ?? "unknown"}" missing erpGroupCode`,
            );
          }
        }
      }

      rowIdxRef.v++;
    }

    // ── Generate ALL date × ERP-period rows ───────────────────────────────
    for (const date of allDates) {
      const d = new Date(date + "T00:00:00");
      const weekday = WEEKDAY_NAMES[d.getDay()];
      const dateErp = erpDate(date);

      for (const ep of ERP_PERIODS) {
        // Period 1 (prayer/assembly) — always one empty row, no class data
        if (ep.appSlot === null) {
          writeRow(ep, date, weekday, dateErp, null, false);
          continue;
        }

        const key = `${date}-${ep.appSlot}`;
        const coreEntry = coreMap.get(key) ?? null;
        const groupEntries = globalGroupMap.get(key) ?? [];

        let rowsWritten = 0;

        // Case 1: Core course — write one row for this division (no group code)
        if (coreEntry) {
          writeRow(ep, date, weekday, dateErp, coreEntry, false);
          rowsWritten++;
        }

        // Case 2: Spec/elective groups — write one row per group, replicated
        // across ALL division files (so every student can see it in ERP regardless
        // of which division they belong to)
        for (const gEntry of groupEntries) {
          writeRow(ep, date, weekday, dateErp, gEntry, true);
          rowsWritten++;
        }

        // Empty period — ERP expects every time slot to appear, even with no class
        if (rowsWritten === 0) {
          writeRow(ep, date, weekday, dateErp, null, false);
        }
      }
    }

    // Update sheet range to cover all new rows (preserve original column count)
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rowIdxRef.v - 1, c: origRange.e.c },
    });

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const safeName = coreDiv.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    zip.file(`Timetable_Div${safeName}.xlsx`, buf);
  }

  // Warnings file (if any ERP codes were missing)
  const uniqWarnings = [...new Set(warnings)];
  if (uniqWarnings.length > 0) {
    const warnWb = XLSX.utils.book_new();
    const warnWs = XLSX.utils.aoa_to_sheet([
      ["Warning"],
      ...uniqWarnings.map((w) => [w]),
    ]);
    XLSX.utils.book_append_sheet(warnWb, warnWs, "Warnings");
    zip.file(
      "_WARNINGS.xlsx",
      XLSX.write(warnWb, { type: "buffer", bookType: "xlsx" }),
    );
  }

  const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
  const ab = zipBuf.buffer.slice(
    zipBuf.byteOffset,
    zipBuf.byteOffset + zipBuf.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(ab, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ERP_Timetable_Export.zip"`,
    },
  });
}
