import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const startDate  = searchParams.get("startDate");
  const endDate    = searchParams.get("endDate");
  const divisionId = searchParams.get("divisionId");
  const courseId   = searchParams.get("courseId");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate required" },
      { status: 400 },
    );
  }

  const timetables = await prisma.timetable.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      isConducted: true,
      ...(divisionId ? { divisionId } : {}),
      ...(courseId   ? { courseId   } : {}),
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

  const escCSV = (val: string | null | undefined) => {
    if (val == null) return "";
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

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
  ].join(",");

  const rows: string[] = [header];

  for (const tt of timetables) {
    const divOrGroup = tt.division?.name ?? tt.group?.name ?? "";
    for (const att of tt.attendance) {
      rows.push(
        [
          tt.date,
          tt.slotNumber,
          escCSV(tt.slot.startTime),
          escCSV(tt.slot.endTime),
          escCSV(tt.course.code),
          escCSV(tt.course.name),
          escCSV(divOrGroup),
          escCSV(tt.faculty?.name ?? ""),
          escCSV(att.student.rollNumber),
          escCSV(att.student.user.name),
          att.status,
          escCSV(att.swipeTime),
          escCSV(att.remarks),
        ].join(","),
      );
    }
  }

  const csv = rows.join("\r\n");
  const filename = `attendance-${startDate}-to-${endDate}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
