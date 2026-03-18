/**
 * Google Sheets low-level client.
 * Uses a service account — credentials must be set in GOOGLE_SERVICE_ACCOUNT_JSON
 * (the full service account JSON as a single-line string).
 *
 * The sheets client is a module-level singleton: one instance per Vercel cold start,
 * reused across requests in the same invocation.
 */

import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

let _sheets: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (_sheets) return _sheets;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');

  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
}

/**
 * Read a range from a spreadsheet.
 * @param spreadsheetId  The Sheets file ID from the URL
 * @param range          A1 notation, e.g. "HRM!A:AO" or "HRM!1:2"
 * @returns              2D array of cell values (empty cells are null)
 */
export async function readRange(
  spreadsheetId: string,
  range: string,
): Promise<(string | number | null)[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return (res.data.values ?? []) as (string | number | null)[][];
}

/**
 * Write multiple cells in a single batchUpdate call.
 * Each update is a single-cell range in A1 notation, e.g. "HRM!D7".
 */
export async function batchWriteCells(
  spreadsheetId: string,
  updates: Array<{ range: string; value: string | number }>,
): Promise<void> {
  if (updates.length === 0) return;

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates.map((u) => ({
        range: u.range,
        values: [[u.value]],
      })),
    },
  });
}

/**
 * Convert an ISO date string to the format used in sheet column headers.
 * "2026-01-08"  →  "8-Jan-2026"
 * "2026-12-25"  →  "25-Dec-2026"
 */
export function formatSheetDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${months[month - 1]}-${year}`;
}

/**
 * Convert a 0-based column index to A1 column letter(s).
 * 0 → "A", 25 → "Z", 26 → "AA", 27 → "AB"
 */
export function colIndexToLetter(idx: number): string {
  let result = '';
  let n = idx;
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}
