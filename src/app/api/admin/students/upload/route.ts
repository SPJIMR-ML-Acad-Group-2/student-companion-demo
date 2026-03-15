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
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
    });

    // Expected columns: Name, Email, Roll Number, Batch (name), Division (name), Specialisation (code), Group (name)
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    // Pre-fetch lookups
    const batches = await prisma.batch.findMany();
    const divisions = await prisma.division.findMany();
    const specialisations = await prisma.specialisation.findMany();
    const groups = await prisma.group.findMany({
      include: { allowedBatches: true },
    });

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
      const batch = batches.find((b) => b.name === batchName);

      const divName = (row["Core Division"] || row["Division"] || "").trim();
      const division = divisions.find(
        (d) => d.name === divName && (!batch || d.batchId === batch.id),
      );

      const specCode = (row["Specialisation"] || "").trim();
      const spec = specialisations.find(
        (s) => s.code === specCode || s.name === specCode,
      );

      const groupName = (row["Group"] || row["Spec Group"] || "").trim();
      const group = groups.find((g) => {
        if (g.name !== groupName) return false;
        if (!batch) return true;
        const allowedBatchIds =
          g.allowedBatches.length > 0
            ? g.allowedBatches.map((link) => link.batchId)
            : [g.batchId];
        return allowedBatchIds.includes(batch.id);
      });

      try {
        // Check if User already exists
        const existingUser = await prisma.user.findFirst({
          where: { email },
        });
        const existingStudent = rollNumber
          ? await prisma.student.findUnique({ where: { rollNumber } })
          : null;

        if (existingUser || existingStudent) {
          results.errors.push(`Skipped ${rollNumber}: already exists`);
          results.skipped++;
          continue;
        }

        if (!batch || !division) {
          results.errors.push(
            `Skipped ${rollNumber}: batch or division not found`,
          );
          results.skipped++;
          continue;
        }

        // Create User (auth) then Student (academic)
        const user = await prisma.user.create({
          data: { name, email, role: "student" },
        });

        await prisma.student.create({
          data: {
            userId: user.id,
            rollNumber,
            batchId: batch.id,
            divisionId: division.id,
            specialisationId: spec?.id ?? null,
            groups: group ? { create: [{ groupId: group.id }] } : undefined,
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
