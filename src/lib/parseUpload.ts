import * as XLSX from "xlsx";

export interface SwipeRecord {
  rollNumber: string;
  name: string;
  swipeTime: Date;
  date: string;       // YYYY-MM-DD
  timeStr: string;    // HH:mm
  dayOfWeek: number;  // 0-6
  batch: string;
  swipeType: string;  // In | Out
}

/**
 * Parse an uploaded file (Excel or pipe-delimited CSV) into SwipeRecords.
 */
export async function parseUploadFile(file: File): Promise<SwipeRecord[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return parseExcelFile(await file.arrayBuffer());
  } else if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    return parsePipeDelimited(await file.text());
  } else {
    throw new Error("Unsupported file format. Please upload .xlsx, .xls, or .csv");
  }
}

/**
 * Parse Excel file using xlsx library.
 */
function parseExcelFile(buffer: ArrayBuffer): SwipeRecord[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON rows
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  return normalizeRows(rows);
}

/**
 * Parse pipe-delimited text format.
 * Handles multi-line quoted fields (like Geo Location).
 */
function parsePipeDelimited(text: string): SwipeRecord[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split("|").map(h => h.trim());

  const rows: Record<string, string>[] = [];
  let i = 1;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // Split by pipe
    let fields = line.split("|");

    // Check if we have a multi-line quoted field (Geo Location)
    // If field count is less than headers, concatenate next lines
    while (fields.length < headers.length && i + 1 < lines.length) {
      i++;
      const nextLine = lines[i];
      // Continue the previous field
      fields[fields.length - 1] += "\n" + nextLine;
      // Re-split from the complete concatenated line
      const fullLine = fields.join("|");
      fields = fullLine.split("|");
    }

    if (fields.length >= headers.length) {
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = (fields[j] || "").trim().replace(/^"|"$/g, "");
      }
      rows.push(row);
    }

    i++;
  }

  return normalizeRows(rows);
}

/**
 * Normalize raw rows into typed SwipeRecords.
 * Handles the biometric log column names and date format.
 */
function normalizeRows(rows: Record<string, string>[]): SwipeRecord[] {
  const swipes: SwipeRecord[] = [];
  const seen = new Set<string>(); // dedup key: rollNumber + date + timeStr

  for (const row of rows) {
    // Column names from the biometric system
    const rollNumber = (row["Roll No"] || row["Roll Number"] || row["rollNumber"] || "").trim();
    const name = (row["Name"] || row["name"] || "").trim();
    const swipeTimeStr = (row["Swipe TIme"] || row["Swipe Time"] || row["Swipe DateTime"] || row["swipeTime"] || "").trim();
    const batch = (row["Batch"] || row["batch"] || "").trim();
    const swipeType = (row["Swipe Type"] || row["swipeType"] || "In").trim();

    if (!rollNumber || !swipeTimeStr) continue;

    // Parse date: handle both "Nov 01 2023 09:02 AM" and "2026-02-23 09:02:00" formats
    const swipeTime = parseSwipeDate(swipeTimeStr);
    if (!swipeTime || isNaN(swipeTime.getTime())) continue;

    // Extract date and time
    const year = swipeTime.getFullYear();
    const month = String(swipeTime.getMonth() + 1).padStart(2, "0");
    const day = String(swipeTime.getDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;

    const hours = String(swipeTime.getHours()).padStart(2, "0");
    const minutes = String(swipeTime.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    const dayOfWeek = swipeTime.getDay();

    // Dedup: first swipe per student per date+time wins
    const dedupKey = `${rollNumber}:${date}:${timeStr}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    swipes.push({
      rollNumber,
      name,
      swipeTime,
      date,
      timeStr,
      dayOfWeek,
      batch,
      swipeType,
    });
  }

  return swipes;
}

/**
 * Parse various date formats into a Date object.
 * - "Nov 01 2023 09:02 AM" (biometric system format)
 * - "2026-02-23 09:02:00" (ISO-ish format)
 */
function parseSwipeDate(str: string): Date | null {
  // Try ISO format first: "2026-02-23 09:02:00"
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(str.replace(" ", "T"));
  }

  // Try biometric format: "Nov 01 2023 09:02 AM"
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const match = str.match(/^(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    const [, monthStr, dayStr, yearStr, hourStr, minuteStr, ampm] = match;
    const month = months[monthStr];
    if (month === undefined) return null;

    let hour = parseInt(hourStr);
    if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

    return new Date(parseInt(yearStr), month, parseInt(dayStr), hour, parseInt(minuteStr));
  }

  // Fallback: try native parser
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}
