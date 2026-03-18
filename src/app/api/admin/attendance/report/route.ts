import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const startDate        = searchParams.get("startDate");
  const endDate          = searchParams.get("endDate");
  const divisionIdsParam = searchParams.get("divisionIds"); // comma-separated
  const groupIdsParam    = searchParams.get("groupIds");    // comma-separated
  const courseId         = searchParams.get("courseId");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate required" },
      { status: 400 },
    );
  }

  const divIds = divisionIdsParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const grpIds = groupIdsParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  // Build the cohort filter
  let cohortFilter: object = {};
  if (divIds.length > 0 && grpIds.length > 0) {
    cohortFilter = {
      OR: [
        { divisionId: { in: divIds } },
        { groupId: { in: grpIds } },
      ],
    };
  } else if (divIds.length > 0) {
    cohortFilter = { divisionId: { in: divIds } };
  } else if (grpIds.length > 0) {
    cohortFilter = { groupId: { in: grpIds } };
  }

  const timetables = await prisma.timetable.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      isConducted: true,
      ...(courseId ? { courseId } : {}),
      ...cohortFilter,
    },
    include: {
      course:   true,
      division: true,
      group:    true,
      faculty:  true,
      slot:     true,
      attendance: {
        include: { student: { include: { user: true } } },
        orderBy: { student: { rollNumber: "asc" } },
      },
    },
    orderBy: [{ date: "asc" }, { slotNumber: "asc" }],
  });

  // Build rows for Excel
  const header = [
    "Date",
    "Slot",
    "Start Time",
    "End Time",
    "Course Code",
    "Course Name",
    "Division/Group",
    "Faculty",
    "Roll Number",
    "Student Name",
    "Status",
    "Swipe Time",
    "Remarks",
  ];

  const rows: (string | number | null)[][] = [header];

  for (const tt of timetables) {
    const divOrGroup = tt.division?.name ?? tt.group?.name ?? "";
    for (const att of tt.attendance) {
      rows.push([
        tt.date,
        tt.slotNumber,
        tt.slot.startTime,
        tt.slot.endTime,
        tt.course.code,
        tt.course.name,
        divOrGroup,
        tt.faculty?.name ?? "",
        att.student.rollNumber ?? "",
        att.student.user.name,
        att.status,
        att.swipeTime ?? "",
        att.remarks ?? "",
      ]);
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-size columns (approximate)
  const colWidths = header.map((h, i) => {
    const maxLen = rows.reduce((max, row) => {
      const cell = row[i];
      return Math.max(max, cell != null ? String(cell).length : 0);
    }, h.length);
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `attendance-${startDate}-to-${endDate}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
