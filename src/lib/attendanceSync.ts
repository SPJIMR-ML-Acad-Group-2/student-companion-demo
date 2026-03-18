/**
 * Attendance → Google Sheets sync service.
 *
 * The DB is always written first; this service syncs committed attendance records
 * to the matching Google Sheets workbook as a derived view.
 *
 * All public functions are designed to be called fire-and-forget:
 *   syncAttendanceRecord(id).catch(console.error);
 *
 * The AttendanceSyncLog table tracks every record's sync status so that
 * failures can be retried via the admin "Force Sync" UI.
 */

import { prisma } from '@/lib/prisma';
import {
  readRange,
  batchWriteCells,
  formatSheetDate,
  colIndexToLetter,
} from '@/lib/googleSheets';

// ─── Column boundary: never write into col AP (index 41) or beyond ───────────
const MAX_DATA_COL = 40; // 0-based, inclusive  (col AO = index 40)

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * In-memory index built by reading an entire course tab once.
 * Used during bulk syncs to avoid re-reading the sheet for every session.
 */
interface SheetIndex {
  /** "YYYY-MM-DD:sessionNumber" → 0-based column index */
  colIndex: Map<string, number>;
  /** rollNumber → 1-based row number in the spreadsheet */
  rowIndex: Map<string, number>;
  /** Last occupied 0-based col index in row 1 (before AP boundary) */
  lastDataCol: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Sync a single attendance record.
 * Called fire-and-forget from POST /api/admin/attendance after the DB upsert.
 */
export async function syncAttendanceRecord(attendanceId: string): Promise<void> {
  if (process.env.GOOGLE_SHEETS_SYNC_ENABLED !== 'true') return;

  const att = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      timetable: { include: { course: { select: { sheetsTabName: true } } } },
      student: true,
    },
  });
  if (!att) return;

  const config = await findConfig(
    att.timetable.divisionId ?? undefined,
    att.timetable.groupId ?? undefined,
    att.timetable.termId ?? undefined,
  );

  if (!config) {
    await upsertLog(att.id, att.timetableId, att.studentId, null, 'skipped');
    return;
  }

  const sheetTabName = att.timetable.course.sheetsTabName;
  if (!sheetTabName) {
    await upsertLog(att.id, att.timetableId, att.studentId, config.id, 'skipped',
      'Course sheetsTabName not configured');
    return;
  }

  try {
    const idx = await buildSheetIndex(config.spreadsheetId, sheetTabName);
    const colIdx = await resolveColumn(
      config.spreadsheetId,
      sheetTabName,
      att.timetable.date,
      att.timetable.sessionNumber,
      idx,
    );
    const rowNum = idx.rowIndex.get(att.student.rollNumber ?? '');

    if (colIdx === null || rowNum === undefined) {
      const msg = colIdx === null
        ? `Session column not found for date=${att.timetable.date} session=${att.timetable.sessionNumber}`
        : `Student row not found for rollNumber=${att.student.rollNumber}`;
      await upsertLog(att.id, att.timetableId, att.studentId, config.id, 'failed', msg);
      return;
    }

    const cellRange = `${sheetTabName}!${colIndexToLetter(colIdx)}${rowNum}`;
    await batchWriteCells(config.spreadsheetId, [{ range: cellRange, value: att.status }]);
    await upsertLog(att.id, att.timetableId, att.studentId, config.id, 'synced');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await upsertLog(att.id, att.timetableId, att.studentId, config.id, 'failed', msg);
    throw err; // re-throw so fire-and-forget callers can log it
  }
}

/**
 * Sync all attendance records for a set of timetable sessions.
 * Optimized: reads each (spreadsheet, tab) pair ONCE and batches all cell updates.
 * Called fire-and-forget from POST /api/upload after the bulk processing loop.
 */
export async function triggerBatchSync(timetableIds: string[]): Promise<void> {
  if (process.env.GOOGLE_SHEETS_SYNC_ENABLED !== 'true') return;
  if (timetableIds.length === 0) return;

  // Load all attendance records for these sessions in one query
  const records = await prisma.attendance.findMany({
    where: { timetableId: { in: timetableIds } },
    include: {
      timetable: { include: { course: { select: { sheetsTabName: true } } } },
      student: true,
    },
  });
  if (records.length === 0) return;

  // Preload all active configs into a lookup map — avoids N+1 queries in the loop below.
  // Key: `div_{divisionId}:{termId}` or `grp_{groupId}:{termId}`
  const allConfigs = await prisma.googleSheetsConfig.findMany({
    where: { isActive: true },
  });
  const configMap = new Map(
    allConfigs.map((c) => {
      const cohortKey = c.divisionId ? `div_${c.divisionId}` : `grp_${c.groupId}`;
      return [`${cohortKey}:${c.termId}`, c];
    }),
  );
  const lookupConfig = (divisionId?: string, groupId?: string, termId?: string) => {
    if (divisionId) return configMap.get(`div_${divisionId}:${termId ?? ''}`) ?? null;
    if (groupId)    return configMap.get(`grp_${groupId}:${termId ?? ''}`) ?? null;
    return null;
  };

  // Group by (spreadsheetId + sheetTabName) — one read+write per tab
  type TabKey = string; // `${spreadsheetId}::${sheetTabName}`
  const groups = new Map<TabKey, {
    spreadsheetId: string;
    sheetTabName: string;
    configId: string;
    items: typeof records;
  }>();

  for (const att of records) {
    const sheetTabName = att.timetable.course.sheetsTabName;
    if (!sheetTabName) {
      await upsertLog(att.id, att.timetableId, att.studentId, null, 'skipped',
        'Course sheetsTabName not configured');
      continue;
    }
    const config = lookupConfig(
      att.timetable.divisionId ?? undefined,
      att.timetable.groupId ?? undefined,
      att.timetable.termId ?? undefined,
    );
    if (!config) {
      await upsertLog(att.id, att.timetableId, att.studentId, null, 'skipped');
      continue;
    }
    const key: TabKey = `${config.spreadsheetId}::${sheetTabName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        spreadsheetId: config.spreadsheetId,
        sheetTabName,
        configId: config.id,
        items: [],
      });
    }
    groups.get(key)!.items.push(att);
  }

  // Process each tab: one read, one write
  // Reads for different spreadsheets can run in parallel (different rate-limit buckets)
  await Promise.all(
    Array.from(groups.values()).map(async (group) => {
      try {
        const idx = await buildSheetIndex(group.spreadsheetId, group.sheetTabName);
        const updates: Array<{ range: string; value: string }> = [];
        const successIds: string[] = [];
        const failures: Array<{ id: string; timetableId: string; studentId: string; msg: string }> = [];

        for (const att of group.items) {
          const colIdx = await resolveColumn(
            group.spreadsheetId,
            group.sheetTabName,
            att.timetable.date,
            att.timetable.sessionNumber,
            idx,
          );
          const rowNum = idx.rowIndex.get(att.student.rollNumber ?? '');

          if (colIdx === null || rowNum === undefined) {
            const msg = colIdx === null
              ? `Session column not found for date=${att.timetable.date} session=${att.timetable.sessionNumber}`
              : `Student row not found for rollNumber=${att.student.rollNumber}`;
            failures.push({ id: att.id, timetableId: att.timetableId, studentId: att.studentId, msg });
            continue;
          }

          const cellRange = `${group.sheetTabName}!${colIndexToLetter(colIdx)}${rowNum}`;
          updates.push({ range: cellRange, value: att.status });
          successIds.push(att.id);
        }

        if (updates.length > 0) {
          await batchWriteCells(group.spreadsheetId, updates);
        }

        // Update sync logs
        for (const id of successIds) {
          const att = group.items.find((a) => a.id === id)!;
          await upsertLog(att.id, att.timetableId, att.studentId, group.configId, 'synced');
        }
        for (const f of failures) {
          await upsertLog(f.id, f.timetableId, f.studentId, group.configId, 'failed', f.msg);
        }
      } catch (err) {
        // Entire tab write failed — mark all its records as failed
        const msg = err instanceof Error ? err.message : String(err);
        for (const att of group.items) {
          await upsertLog(att.id, att.timetableId, att.studentId, group.configId, 'failed', msg);
        }
        console.error(`[SheetsSync] Tab sync failed for ${group.sheetTabName}:`, err);
      }
    }),
  );
}

/**
 * Replay all pending/failed sync logs.
 * Called from POST /api/admin/sheets-sync/trigger (awaited — returns SyncResult to UI).
 * @param configId  If provided, scopes the sync to one GoogleSheetsConfig.
 * @param includeSkipped  If true, also retries records with status="skipped".
 */
export async function syncPendingRecords(
  configId?: string,
  includeSkipped = false,
): Promise<SyncResult> {
  const statuses = includeSkipped
    ? ['pending', 'failed', 'skipped']
    : ['pending', 'failed'];

  const logs = await prisma.attendanceSyncLog.findMany({
    where: {
      status: { in: statuses },
      ...(configId ? { configId } : {}),
    },
    select: { attendanceId: true },
    take: 500, // Safety cap — force-sync more via UI if needed
  });

  const timetableIds = await prisma.attendance.findMany({
    where: { id: { in: logs.map((l) => l.attendanceId) } },
    select: { timetableId: true },
  });
  const uniqueTimetableIds = [...new Set(timetableIds.map((t) => t.timetableId))];

  // Delegate to batch sync (optimized: one read per tab)
  await triggerBatchSync(uniqueTimetableIds);

  // Re-read updated logs to compile result
  const updated = await prisma.attendanceSyncLog.findMany({
    where: { attendanceId: { in: logs.map((l) => l.attendanceId) } },
    select: { status: true, errorMessage: true },
  });

  const result: SyncResult = { synced: 0, failed: 0, skipped: 0, errors: [] };
  for (const log of updated) {
    if (log.status === 'synced') result.synced++;
    else if (log.status === 'failed') {
      result.failed++;
      if (log.errorMessage) result.errors.push(log.errorMessage);
    } else {
      result.skipped++;
    }
  }
  return result;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Find the GoogleSheetsConfig for a cohort (division or group) scoped to a term.
 * If termId is provided it is used as an exact filter; without it we fall back to
 * the most-recently-created active config for the cohort so single-config setups
 * still work.
 */
async function findConfig(divisionId?: string, groupId?: string, termId?: string) {
  if (divisionId) {
    return prisma.googleSheetsConfig.findFirst({
      where: { divisionId, isActive: true, ...(termId ? { termId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }
  if (groupId) {
    return prisma.googleSheetsConfig.findFirst({
      where: { groupId, isActive: true, ...(termId ? { termId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }
  return null;
}

/**
 * Read an entire course tab and build in-memory lookup maps.
 * Reading columns A through AO (up to index 40) covers all data columns.
 */
async function buildSheetIndex(
  spreadsheetId: string,
  sheetTabName: string,
): Promise<SheetIndex> {
  // Read full sheet up to col AO (index 40) — covers headers + all student rows
  const rows = await readRange(spreadsheetId, `${sheetTabName}!A:AO`);

  const colIndex = new Map<string, number>();
  const rowIndex = new Map<string, number>();
  let lastDataCol = 1; // start at col B (index 1)

  const row1 = rows[0] ?? []; // date headers
  const row2 = rows[1] ?? []; // session numbers

  // Build column index from row 1 (dates) + row 2 (session numbers)
  // Columns start at index 2 (col C). Skip non-date cells (e.g. summary columns).
  for (let c = 2; c <= MAX_DATA_COL; c++) {
    const cellDate = row1[c];
    if (cellDate == null || cellDate === '') continue;
    const normalizedDate = normalizeDate(String(cellDate));
    // Only treat the cell as a session column if it parses to a valid ISO date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) continue;
    lastDataCol = c;
    const sessionNum = row2[c] != null ? Number(row2[c]) : null;
    const key = `${normalizedDate}:${sessionNum ?? 'null'}`;
    colIndex.set(key, c);
    // Also index by date-only (fallback when sessionNumber is null in Timetable)
    const dateOnlyKey = `${normalizedDate}:null`;
    if (!colIndex.has(dateOnlyKey)) colIndex.set(dateOnlyKey, c);
  }

  // Build row index from column A (roll numbers), starting at row 3 (index 2).
  // Row 1 is the header row, row 2 is the sub-header; student rolls start at row 3.
  for (let r = 2; r < rows.length; r++) {
    const roll = rows[r]?.[0];
    if (roll == null || roll === '') continue;
    // Skip any header-like values that may appear in column A
    if (String(roll).toLowerCase().startsWith('roll') || String(roll).toLowerCase() === 'no.') continue;
    rowIndex.set(String(roll).trim(), r + 1); // +1: convert 0-based to 1-based sheet row
  }

  return { colIndex, rowIndex, lastDataCol };
}

/**
 * Normalize a sheet date string ("8-Jan-2026") to ISO format "2026-01-08"
 * so it can be matched against Timetable.date.
 */
function normalizeDate(sheetDate: string): string {
  // If it looks like an ISO date already, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(sheetDate)) return sheetDate;
  // Parse "8-Jan-2026"
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const parts = sheetDate.split('-');
  if (parts.length !== 3) return sheetDate;
  const [d, mon, y] = parts;
  const m = months[mon];
  if (!m) return sheetDate;
  return `${y}-${m}-${d.padStart(2, '0')}`;
}

/**
 * Find the column index for a (date, sessionNumber) pair using a pre-built SheetIndex.
 * If not found, auto-appends a new column and rebuilds the index in place.
 */
async function resolveColumn(
  spreadsheetId: string,
  sheetTabName: string,
  date: string, // YYYY-MM-DD
  sessionNumber: number | null,
  idx: SheetIndex,
): Promise<number | null> {
  const key = `${date}:${sessionNumber ?? 'null'}`;
  if (idx.colIndex.has(key)) return idx.colIndex.get(key)!;

  // Try date-only fallback
  const dateKey = `${date}:null`;
  if (sessionNumber === null && idx.colIndex.has(dateKey)) {
    return idx.colIndex.get(dateKey)!;
  }

  // Auto-append new column if there's room
  const nextCol = idx.lastDataCol + 1;
  if (nextCol > MAX_DATA_COL) {
    console.error(`[SheetsSync] No room for new session column in ${sheetTabName} (reached col AO)`);
    return null;
  }

  const formattedDate = formatSheetDate(date);
  const colLetter = colIndexToLetter(nextCol);

  await batchWriteCells(spreadsheetId, [
    { range: `${sheetTabName}!${colLetter}1`, value: formattedDate },
    { range: `${sheetTabName}!${colLetter}2`, value: sessionNumber ?? '' },
  ]);

  // Update the in-memory index so subsequent students in this batch use the new col
  idx.colIndex.set(key, nextCol);
  idx.colIndex.set(`${date}:null`, nextCol);
  idx.lastDataCol = nextCol;

  return nextCol;
}

/**
 * Upsert an AttendanceSyncLog row.
 */
async function upsertLog(
  attendanceId: string,
  timetableId: string,
  studentId: string,
  configId: string | null,
  status: 'synced' | 'failed' | 'skipped' | 'pending',
  errorMessage?: string,
): Promise<void> {
  await prisma.attendanceSyncLog.upsert({
    where: { attendanceId },
    update: {
      configId,
      status,
      attempts: { increment: status === 'synced' || status === 'failed' ? 1 : 0 },
      lastAttemptAt: status !== 'skipped' ? new Date() : undefined,
      errorMessage: errorMessage ?? null,
      updatedAt: new Date(),
    },
    create: {
      attendanceId,
      timetableId,
      studentId,
      configId,
      status,
      attempts: status === 'synced' || status === 'failed' ? 1 : 0,
      lastAttemptAt: status !== 'skipped' ? new Date() : null,
      errorMessage: errorMessage ?? null,
    },
  });
}
