import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

    // Expected columns: Name, Email, Roll Number, Batch (name), Core Division (name), Specialisation (code), Spec Division (name)
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    // Pre-fetch lookups
    const batches = await prisma.batch.findMany();
    const divisions = await prisma.division.findMany();
    const specialisations = await prisma.specialisation.findMany();

    for (const row of rows) {
      const name = (row["Name"] || "").trim();
      const email = (row["Email"] || "").trim();
      const rollNumber = (row["Roll Number"] || row["Roll No"] || "").trim();

      if (!name || !email || !rollNumber) {
        results.errors.push(`Skipped row: missing name/email/rollNumber`);
        results.skipped++;
        continue;
      }

      // Resolve foreign keys
      const batchName = (row["Batch"] || "").trim();
      const batch = batches.find(b => b.name === batchName);

      const coreDivName = (row["Core Division"] || "").trim();
      const coreDivision = divisions.find(d => d.name === coreDivName && d.type === "core");

      const specCode = (row["Specialisation"] || "").trim();
      const spec = specialisations.find(s => s.code === specCode || s.name === specCode);

      const specDivName = (row["Spec Division"] || "").trim();
      const specDiv = divisions.find(d => d.name === specDivName && d.type === "specialisation");

      try {
        // Check if already exists
        const existing = await prisma.user.findFirst({
          where: { OR: [{ rollNumber }, { email }] },
        });

        if (existing) {
          results.errors.push(`Skipped ${rollNumber}: already exists`);
          results.skipped++;
          continue;
        }

        await prisma.user.create({
          data: {
            name, email, rollNumber, role: "student",
            batchId: batch?.id || null,
            coreDivisionId: coreDivision?.id || null,
            specialisationId: spec?.id || null,
            specDivisionId: specDiv?.id || null,
          },
        });
        results.created++;
      } catch (err) {
        results.errors.push(`Error: ${rollNumber} - ${err}`);
        results.skipped++;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
