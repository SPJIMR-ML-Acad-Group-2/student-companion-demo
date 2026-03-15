"use client";

import React, { useEffect, useState, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/datepicker";
import {
  ArrowUpTrayIcon,
  ChartBarIcon,
  PencilIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

function parseCSVPreview(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  return lines
    .slice(0, 10)
    .map((l) => l.split(/[|,;]+/).map((c) => c.trim().replace(/^"|"$/g, "")));
}

const FIXED_SLOTS = [
  { slot: 1, label: "8:15–9:00" },
  { slot: 2, label: "9:00–10:10" },
  { slot: 3, label: "10:40–11:50" },
  { slot: 4, label: "12:10–1:20" },
  { slot: 5, label: "2:30–3:40" },
  { slot: 6, label: "4:00–5:10" },
  { slot: 7, label: "5:30–6:40" },
  { slot: 8, label: "7:00–8:10" },
];

interface CalendarSlot {
  slotNumber: number;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  courseType: string;
  divisionName: string;
  divisionId: string | null;
  groupId: string | null;
  facultyName: string | null;
  hasSession: boolean;
  sessionId: string | null;
  sessionNumber: number | null;
  noSwipes: boolean;
  attendance: Array<{ id: string; status: string }>;
  roomName: string | null;
  date?: string;
}
interface CalendarDay {
  date: string;
  dayOfWeek: number;
  dayName: string;
  slots: CalendarSlot[];
}
interface CalendarData {
  weekOf: string;
  weekEnd: string;
  weekDates: string[];
  calendar: CalendarDay[];
}

export default function OfficeAttendance() {
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [calData, setCalData] = useState<CalendarData | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterDiv, setFilterDiv] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterCalCourse, setFilterCalCourse] = useState("");
  const [batches, setBatches] = useState<
    Array<{ id: string; name: string; programme?: { name: string } }>
  >([]);
  const [divisions, setDivisions] = useState<
    Array<{ id: string; name: string; batchId?: string }>
  >([]);
  const [groups, setGroups] = useState<
    Array<{ id: string; name: string; batchId?: string }>
  >([]);
  const [selectedSession, setSelectedSession] = useState<CalendarSlot | null>(
    null,
  );
  const [attRecords, setAttRecords] = useState<any[]>([]);
  const [editingRemarks, setEditingRemarks] = useState<Record<string, string>>(
    {},
  );
  const [dialogFilterSearch, setDialogFilterSearch] = useState("");
  const [dialogFilterStatus, setDialogFilterStatus] = useState("__all__");

  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [reportEndDate, setReportEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reportDivisionId, setReportDivisionId] = useState("");
  const [reportCourseId, setReportCourseId] = useState("");
  const [courses, setCourses] = useState<
    Array<{ id: string; code: string; name: string }>
  >([]);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchCalendar = async (offset: number) => {
    const ref = new Date();
    ref.setDate(ref.getDate() + offset * 7);
    const url = `/api/calendar?role=office&weekOf=${ref.toISOString().split("T")[0]}`;
    const res = await fetch(url);
    if (res.ok) setCalData(await res.json());
  };

  useEffect(() => {
    (async () => {
      const [, cRes, dRes, bRes, gRes] = await Promise.all([
        fetchCalendar(0),
        fetch("/api/admin/courses"),
        fetch("/api/admin/divisions"),
        fetch("/api/admin/batches"),
        fetch("/api/admin/groups"),
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        setCourses(
          data.map((c: any) => ({ id: c.id, code: c.code, name: c.name })),
        );
      }
      if (dRes.ok) {
        const data = await dRes.json();
        setDivisions(
          data.map((d: any) => ({
            id: d.id,
            name: d.name,
            batchId: d.batchId,
          })),
        );
      }
      if (bRes.ok) {
        const data = await bRes.json();
        setBatches(
          Array.isArray(data)
            ? data.map((b: any) => ({
                id: b.id,
                name: b.name,
                programme: b.programme,
              }))
            : [],
        );
      }
      if (gRes.ok) {
        const data = await gRes.json();
        const list = Array.isArray(data) ? data : [];
        setGroups(
          list.map((g: any) => ({
            id: g.id,
            name: g.name,
            batchId: g.batchId,
          })),
        );
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv", "txt"].includes(ext || "")) {
      alert("Please upload an Excel (.xlsx) or CSV file");
      return;
    }
    setSelectedFile(file);
    setUploadResults(null);
    try {
      setPreviewData(
        ext === "csv" || ext === "txt"
          ? parseCSVPreview(await file.text())
          : [["Preview only for CSV. Ready to submit " + file.name]],
      );
    } catch {
      setPreviewData([["Failed to generate preview"]]);
    }
  };

  const confirmUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) {
        setUploadResults(d.results);
        setSelectedFile(null);
        setPreviewData(null);
        await fetchCalendar(weekOffset);
      } else alert(d.error || "Upload failed");
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleWeekChange = (dir: number) => {
    const n = weekOffset + dir;
    setWeekOffset(n);
    fetchCalendar(n);
  };

  // Cascaded filter helpers
  const visibleDivisions = filterBatch
    ? divisions.filter((d) => d.batchId === filterBatch)
    : divisions;
  const visibleGroups = filterBatch
    ? groups.filter((g) => g.batchId === filterBatch)
    : groups;

  const openAttendance = async (slot: CalendarSlot) => {
    if (!slot.sessionId) return;
    setSelectedSession(slot);
    setAttRecords([]);
    setEditingRemarks({});
    setDialogFilterSearch("");
    setDialogFilterStatus("__all__");
    const res = await fetch(
      `/api/admin/attendance?sessionId=${slot.sessionId}`,
    );
    if (res.ok) {
      const data = await res.json();
      setAttRecords(data.records);
      const remarksInit: Record<string, string> = {};
      data.records.forEach((r: any) => {
        if (r.remarks) remarksInit[r.studentId] = r.remarks;
      });
      setEditingRemarks(remarksInit);
    }
  };

  const updateAttendance = async (studentId: string, status: string) => {
    if (!selectedSession?.sessionId) return;
    const remarks = editingRemarks[studentId] || null;
    setAttRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, status, remarks } : r,
      ),
    );
    await fetch("/api/admin/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: selectedSession.sessionId,
        studentId,
        status,
        remarks,
      }),
    });
    fetchCalendar(weekOffset);
  };

  const saveRemarks = async (studentId: string) => {
    const record = attRecords.find((r) => r.studentId === studentId);
    if (!record || !selectedSession?.sessionId || record.status === "None")
      return;
    const remarks = editingRemarks[studentId] || null;
    if (remarks === (record.remarks || null)) return;
    setAttRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r)),
    );
    await fetch("/api/admin/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: selectedSession.sessionId,
        studentId,
        status: record.status,
        remarks,
      }),
    });
  };

  const downloadReport = async () => {
    setReportLoading(true);
    try {
      let url = `/api/admin/attendance/report?startDate=${reportStartDate}&endDate=${reportEndDate}`;
      if (reportDivisionId) url += `&divisionId=${reportDivisionId}`;
      if (reportCourseId) url += `&courseId=${reportCourseId}`;
      const res = await fetch(url);
      if (!res.ok) {
        alert("Failed to generate report");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `attendance-${reportStartDate}-to-${reportEndDate}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={40} />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  const statusColors: Record<string, string> = {
    P: "text-green-500 border-green-500/40 bg-green-500/10",
    "P#": "text-blue-400 border-blue-400/40 bg-blue-400/10",
    LT: "text-yellow-500 border-yellow-500/40 bg-yellow-500/10",
    AB: "text-red-500 border-red-500/40 bg-red-500/10",
  };

  const filteredAttRecords = attRecords.filter((r) => {
    if (dialogFilterSearch) {
      const s = dialogFilterSearch.toLowerCase();
      if (
        !r.rollNumber?.toLowerCase().includes(s) &&
        !r.studentName?.toLowerCase().includes(s)
      )
        return false;
    }
    if (dialogFilterStatus !== "__all__") {
      if (r.status !== dialogFilterStatus) return false;
    }
    return true;
  });

  return (
    <div className="relative z-[1]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">
          Attendance Management
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Upload biometric logs or update attendance manually
        </p>
      </div>

      {/* ── Upload Section ── */}
      <div className="mb-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4 text-[var(--color-text-primary)]">
          <ArrowUpTrayIcon className="w-5 h-5 text-[#531f75]" /> Upload
          Biometric Log
        </h2>

        {!selectedFile && !uploading && !uploadResults && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) processFile(f);
            }}
            className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-[#531f75] bg-[#531f75]/10"
                : "border-[var(--color-border)] bg-[var(--color-bg-card)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
                e.target.value = "";
              }}
            />
            <ArrowUpTrayIcon className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
            <div className="text-base font-semibold mb-1 text-[var(--color-text-primary)]">
              Drop Excel/CSV file here or click to upload
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">
              Supports .xlsx (primary) and pipe-delimited .csv
            </div>
          </div>
        )}

        {uploading && (
          <div className="rounded-2xl border-2 border-dashed p-12 text-center border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="flex justify-center mb-4">
              <Spinner size={48} />
            </div>
            <div className="text-base font-semibold text-[var(--color-text-primary)]">
              Processing...
            </div>
            <div className="text-sm mt-1 text-[var(--color-text-muted)]">
              Mapping swipes to timetable slots
            </div>
          </div>
        )}

        {selectedFile && !uploading && previewData && (
          <div className="rounded-2xl border p-5 bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Preview: {selectedFile.name}
                </h3>
                <p className="text-sm mt-1 text-[var(--color-text-muted)]">
                  Showing first few rows. Please confirm format is correct.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewData(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#531f75] hover:bg-[#531f75]/90"
                  onClick={confirmUpload}
                >
                  Confirm & Upload
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <Table>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow
                      key={i}
                      className={
                        i === 0
                          ? "bg-[var(--color-bg-secondary)] font-semibold"
                          : ""
                      }
                    >
                      {row.map((cell, j) => (
                        <TableCell key={j}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {uploadResults && (
          <div className="rounded-2xl border p-5 relative bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setUploadResults(null)}
              className="absolute top-4 right-4 text-[var(--color-text-muted)]"
            >
              ✕
            </Button>
            <h3 className="text-base font-semibold mb-4 text-green-500">
              Upload Processed Successfully
            </h3>
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
              {[
                {
                  v: uploadResults.totalSwipes,
                  l: "Total Swipes",
                  cls: "text-[#8b5cf6]",
                },
                {
                  v: uploadResults.sessionsCreated,
                  l: "Sessions Created",
                  cls: "text-[#8b5cf6]",
                },
                {
                  v: uploadResults.attendanceMarked,
                  l: "Present",
                  cls: "text-green-500",
                },
                {
                  v: uploadResults.lateMarked,
                  l: "Late",
                  cls: "text-yellow-500",
                },
                {
                  v: uploadResults.absentMarked,
                  l: "Absent",
                  cls: "text-red-500",
                },
                {
                  v: uploadResults.duplicatesSkipped,
                  l: "Duplicates",
                  cls: "text-[var(--color-text-muted)]",
                },
              ].map(({ v, l, cls }) => (
                <div
                  key={l}
                  className="p-3 rounded-lg text-center bg-[var(--color-bg-secondary)]"
                >
                  <div className={`text-2xl font-bold ${cls}`}>{v}</div>
                  <div className="text-xs uppercase tracking-wide mt-1 text-[var(--color-text-muted)]">
                    {l}
                  </div>
                </div>
              ))}
            </div>
            {uploadResults.studentsNotFound > 0 && (
              <p className="mt-3 text-xs text-yellow-500">
                ⚠️ {uploadResults.studentsNotFound} roll numbers not found
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Report Download Section ── */}
      <div className="mb-10 border-t border-[var(--color-border)] pt-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-1 text-[var(--color-text-primary)]">
          <ChartBarIcon className="w-5 h-5 text-[#531f75]" /> Download
          Attendance Report
        </h2>
        <p className="text-sm mb-4 text-[var(--color-text-secondary)]">
          Export attendance records as CSV with optional filters.
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              From
            </label>
            <DatePicker
              value={reportStartDate}
              onChange={setReportStartDate}
              placeholder="Start date"
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              To
            </label>
            <DatePicker
              value={reportEndDate}
              onChange={setReportEndDate}
              placeholder="End date"
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              Division
            </label>
            <Select
              value={reportDivisionId || "__all__"}
              onValueChange={(v) =>
                setReportDivisionId(v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger className="w-[180px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                <SelectValue placeholder="All Divisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              Course
            </label>
            <Select
              value={reportCourseId || "__all__"}
              onValueChange={(v) => setReportCourseId(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-[240px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="gap-2 bg-[#531f75] hover:bg-[#531f75]/90"
            onClick={downloadReport}
            disabled={reportLoading}
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            {reportLoading ? "Generating…" : "Download CSV"}
          </Button>
        </div>
      </div>

      {/* ── Calendar Section ── */}
      {calData && (
        <>
          <div className="border-t border-[var(--color-border)] pt-6 mb-4">
            <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                  <PencilIcon className="w-5 h-5 text-[#531f75]" /> Manual
                  Update via Calendar
                </h2>
                <p className="text-sm mt-1 text-[var(--color-text-secondary)]">
                  Click any session to mark or adjust attendance.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekChange(-1)}
                >
                  ← Prev
                </Button>
                <span className="px-3 text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] rounded-[5px] h-7 flex items-center">
                  {calData.weekDates[0]} –{" "}
                  {calData.weekDates[calData.weekDates.length - 1]}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekChange(1)}
                >
                  Next →
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWeekOffset(0);
                    fetchCalendar(0);
                  }}
                >
                  Today
                </Button>
              </div>
            </div>
            <div className="flex gap-2 items-center flex-wrap mb-3">
              <Select
                value={filterBatch || "__all__"}
                onValueChange={(v) => {
                  setFilterBatch(v === "__all__" ? "" : v);
                  setFilterDiv("");
                  setFilterGroup("");
                }}
              >
                <SelectTrigger className="w-[180px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Batches</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterDiv || "__all__"}
                onValueChange={(v) => setFilterDiv(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-[160px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Divisions</SelectItem>
                  {visibleDivisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterGroup || "__all__"}
                onValueChange={(v) => setFilterGroup(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-[160px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Groups</SelectItem>
                  {visibleGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterCalCourse || "__all__"}
                onValueChange={(v) =>
                  setFilterCalCourse(v === "__all__" ? "" : v)
                }
              >
                <SelectTrigger className="w-[220px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className="text-xs overflow-x-auto"
            style={{
              display: "grid",
              gridTemplateColumns: `72px repeat(${calData.calendar.length}, minmax(0, 1fr))`,
              gap: 2,
            }}
          >
            <div className="p-2 font-bold text-[var(--color-text-muted)]">
              Slot
            </div>
            {calData.calendar.map((day) => (
              <div
                key={day.date}
                className={`p-2 font-bold text-center rounded ${
                  day.date === today
                    ? "text-[#8b5cf6] bg-[#531f75]/10"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                {day.dayName}
                <br />
                <span
                  className="font-normal text-[var(--color-text-muted)]"
                  style={{ fontSize: 11 }}
                >
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
            {FIXED_SLOTS.map((st) => (
              <React.Fragment key={st.slot}>
                <div
                  className="flex flex-col justify-center border-t border-[var(--color-border)] text-[var(--color-text-muted)]"
                  style={{ padding: "10px 6px" }}
                >
                  <div className="font-semibold">S{st.slot}</div>
                  <div>{st.label}</div>
                </div>
                {calData.calendar.map((day) => {
                  const slotsForTime = day.slots.filter(
                    (s) => s.slotNumber === st.slot,
                  );
                  // Apply client-side filters
                  const filtered = slotsForTime.filter((s) => {
                    if (filterDiv && s.divisionId !== filterDiv && !s.groupId)
                      return false;
                    if (
                      filterGroup &&
                      s.groupId !== filterGroup &&
                      !s.divisionId
                    )
                      return false;
                    if (filterCalCourse) {
                      // Match by course code since we have code not ID in slot
                      const matchCourse = courses.find(
                        (c) => c.id === filterCalCourse,
                      );
                      if (matchCourse && s.courseCode !== matchCourse.code)
                        return false;
                    }
                    return true;
                  });
                  if (filtered.length === 0) {
                    return (
                      <div
                        key={`${day.date}-${st.slot}`}
                        className="p-1.5 border-t border-[var(--color-border)]"
                      />
                    );
                  }
                  return (
                    <div
                      key={`${day.date}-${st.slot}`}
                      className="border-t border-[var(--color-border)] p-0.5"
                    >
                      <div className="flex flex-col gap-0.5">
                        {filtered.map((slot, idx) => {
                          const p = slot.attendance.filter(
                            (a) => a.status === "P" || a.status === "P#",
                          ).length;
                          const ab = slot.attendance.filter(
                            (a) => a.status === "AB",
                          ).length;
                          const lt = slot.attendance.filter(
                            (a) => a.status === "LT",
                          ).length;
                          const clickable = !!slot.sessionId;
                          const hasAttendance = slot.attendance.length > 0;
                          return (
                            <div
                              key={`${slot.sessionId || idx}`}
                              onClick={() => {
                                if (clickable)
                                  openAttendance({ ...slot, date: day.date });
                              }}
                              className="rounded bg-[var(--color-bg-secondary)]"
                              style={{
                                padding: 5,
                                borderLeft: `3px solid var(${slot.courseType === "core" ? "--color-accent" : "--color-warning"})`,
                                cursor: clickable ? "pointer" : "default",
                              }}
                            >
                              <div className="font-bold text-[var(--color-text-primary)]">
                                {slot.courseCode}
                              </div>
                              <div
                                className="mt-0.5 text-[#8b5cf6]"
                                style={{ fontSize: 10 }}
                              >
                                {slot.divisionName}
                                {slot.facultyName &&
                                  ` · ${slot.facultyName.split(" ")[1] || slot.facultyName}`}
                                {slot.roomName && ` · ${slot.roomName}`}
                              </div>
                              {hasAttendance ? (
                                <div
                                  className="flex gap-1.5 mt-1 font-medium"
                                  style={{ fontSize: 10 }}
                                >
                                  <span className="text-green-500">{p}P</span>
                                  {ab > 0 && (
                                    <span className="text-red-500">{ab}AB</span>
                                  )}
                                  {lt > 0 && (
                                    <span className="text-yellow-500">
                                      {lt}LT
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div
                                  className="mt-0.5 font-semibold text-[#8b5cf6]"
                                  style={{ fontSize: 9 }}
                                >
                                  Click to mark
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="flex gap-4 mt-5 text-xs text-[var(--color-text-muted)]">
            <span>
              <span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle bg-[var(--color-accent)]" />{" "}
              Core
            </span>
            <span>
              <span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle bg-[var(--color-warning)]" />{" "}
              Specialisation
            </span>
          </div>
        </>
      )}

      {/* ── Manual Attendance Dialog ── */}
      <Dialog
        open={!!selectedSession}
        onOpenChange={(open) => !open && setSelectedSession(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-[95vw] overflow-hidden bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-primary)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-text-primary)]">
              Manual Attendance Update
            </DialogTitle>
            {selectedSession && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {selectedSession.date} · Slot {selectedSession.slotNumber} ·{" "}
                {selectedSession.courseName} · Div{" "}
                {selectedSession.divisionName}
              </p>
            )}
          </DialogHeader>

          {attRecords.length === 0 ? (
            <div className="flex justify-center py-10">
              <Spinner size={36} />
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-3 flex-wrap items-center">
                <Input
                  placeholder="Search by name or roll..."
                  value={dialogFilterSearch}
                  onChange={(e) => setDialogFilterSearch(e.target.value)}
                  className="flex-1 min-w-[200px] bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
                <Select
                  value={dialogFilterStatus}
                  onValueChange={setDialogFilterStatus}
                >
                  <SelectTrigger className="w-[160px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Statuses</SelectItem>
                    <SelectItem value="P">Present (P)</SelectItem>
                    <SelectItem value="P#">Present (P#)</SelectItem>
                    <SelectItem value="LT">Late (LT)</SelectItem>
                    <SelectItem value="AB">Absent (AB)</SelectItem>
                    <SelectItem value="None">Not Marked</SelectItem>
                  </SelectContent>
                </Select>
                {filteredAttRecords.length < attRecords.length && (
                  <span className="text-xs text-[var(--color-text-muted)] self-center">
                    {filteredAttRecords.length} of {attRecords.length} shown
                  </span>
                )}
              </div>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--color-border)]">
                      <TableHead className="text-[var(--color-text-muted)]">
                        Roll No.
                      </TableHead>
                      <TableHead className="text-[var(--color-text-muted)]">
                        Student
                      </TableHead>
                      <TableHead className="text-[var(--color-text-muted)]">
                        Swipe
                      </TableHead>
                      <TableHead className="text-[var(--color-text-muted)]">
                        Status
                      </TableHead>
                      <TableHead className="text-[var(--color-text-muted)]">
                        Remarks
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttRecords.map((r) => (
                      <TableRow
                        key={r.studentId}
                        className="border-[var(--color-border)]"
                      >
                        <TableCell className="text-[var(--color-text-primary)]">
                          {r.rollNumber}
                        </TableCell>
                        <TableCell className="text-[var(--color-text-secondary)]">
                          {r.studentName}
                        </TableCell>
                        <TableCell className="text-[var(--color-text-muted)]">
                          {r.swipeTime || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(["P", "P#", "LT", "AB"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateAttendance(r.studentId, s)}
                                className={`px-2 py-0.5 rounded text-xs font-medium border cursor-pointer transition-colors ${
                                  r.status === s
                                    ? statusColors[s]
                                    : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-transparent hover:border-[var(--color-text-muted)]"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            className="w-[160px] h-7 text-xs bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                            placeholder="Add remark..."
                            value={editingRemarks[r.studentId] || ""}
                            onChange={(e) =>
                              setEditingRemarks((prev) => ({
                                ...prev,
                                [r.studentId]: e.target.value,
                              }))
                            }
                            onBlur={() => saveRemarks(r.studentId)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSession(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
