"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { toast } from "sonner";

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

// ── CohortMultiSelect ──────────────────────────────────────────────────────────

interface CohortOption {
  value: string;   // "div_{id}" | "grp_{id}"
  label: string;
  sublabel?: string; // batch name(s) for context
}

function CohortMultiSelect({
  selected,
  onChange,
  options,
  placeholder = "Select cohorts…",
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  options: CohortOption[];
  placeholder?: string;
}) {
  const toggle = (val: string) =>
    onChange(
      selected.includes(val)
        ? selected.filter((v) => v !== val)
        : [...selected, val],
    );

  const divOptions = options.filter((o) => o.value.startsWith("div_"));
  const grpOptions = options.filter((o) => o.value.startsWith("grp_"));

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : `${selected.length} cohort${selected.length > 1 ? "s" : ""} selected`;

  return (
    <Popover>
      <PopoverTrigger
        className={`inline-flex h-9 w-[260px] items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm ${
          selected.length === 0
            ? "text-[var(--color-text-muted)]"
            : "text-[var(--color-text-primary)]"
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDownIcon className="w-4 h-4 ml-2 shrink-0 text-[var(--color-text-muted)]" />
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 overflow-hidden" sideOffset={4}>
        <div className="max-h-[320px] overflow-y-auto">
          {divOptions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] uppercase">
                Divisions
              </div>
              {divOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-secondary)]/60 transition-colors border-b border-[var(--color-border)]/30 last:border-b-0"
                  onClick={() => toggle(opt.value)}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    readOnly
                    className="w-3.5 h-3.5 accent-[#531f75] pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--color-text-primary)]">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="text-[10px] text-[var(--color-text-muted)] truncate">{opt.sublabel}</div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
          {grpOptions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] uppercase">
                Groups
              </div>
              {grpOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-secondary)]/60 transition-colors border-b border-[var(--color-border)]/30 last:border-b-0"
                  onClick={() => toggle(opt.value)}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    readOnly
                    className="w-3.5 h-3.5 accent-[#531f75] pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--color-text-primary)]">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="text-[10px] text-[var(--color-text-muted)] truncate">{opt.sublabel}</div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
          {options.length === 0 && (
            <div className="px-3 py-4 text-sm text-center text-[var(--color-text-muted)]">
              No cohorts available
            </div>
          )}
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-[var(--color-border)] flex justify-end">
              <button
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                onClick={(e) => { e.stopPropagation(); onChange([]); }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

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

interface UploadJob {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  fileName: string;
  totalSwipes: number;
  studentsMatched: number;
  studentsNotFound: number;
  attendanceMarked: number;
  absentMarked: number;
  lateMarked: number;
  duplicatesSkipped: number;
  errors: string[];
  completedAt: string | null;
}

export default function OfficeAttendance() {
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<UploadJob | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [calData, setCalData] = useState<CalendarData | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterDiv, setFilterDiv] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterCalCourse, setFilterCalCourse] = useState("");
  const [batches, setBatches] = useState<
    Array<{ id: string; name: string; programme?: { name: string } }>
  >([]);
  const [divisions, setDivisions] = useState<
    Array<{ id: string; name: string; batchId: string }>
  >([]);
  const [groups, setGroups] = useState<
    Array<{
      id: string;
      name: string;
      batchId: string;
      allowedBatchIds: string[];
      allowedBatches: Array<{ id: string; name: string }>;
    }>
  >([]);
  const [selectedSession, setSelectedSession] = useState<CalendarSlot | null>(
    null,
  );
  const [attRecords, setAttRecords] = useState<any[]>([]);
  const [editingRemarks, setEditingRemarks] = useState<Record<string, string>>({});
  const [editingStatus, setEditingStatus] = useState<Record<string, string>>({});
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
  const [reportCourseId, setReportCourseId] = useState("");
  const [courses, setCourses] = useState<
    Array<{ id: string; code: string; name: string; divisionIds: string[]; groupIds: string[] }>
  >([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMode, setReportMode] = useState<"term" | "custom">("custom");
  const [reportCohorts, setReportCohorts] = useState<string[]>([]);
  const [reportTermId, setReportTermId] = useState("");
  const [terms, setTerms] = useState<
    Array<{ id: string; name: string; batchId: string; startDate: string | null; endDate: string | null }>
  >([]);

  // History section state
  const [histCohorts, setHistCohorts] = useState<string[]>([]);
  const [histMode, setHistMode] = useState<"term" | "custom">("term");
  const [histTermId, setHistTermId] = useState("");
  const [histStartDate, setHistStartDate] = useState("");
  const [histEndDate, setHistEndDate] = useState("");
  const [histCourseId, setHistCourseId] = useState("");
  const [histSource, setHistSource] = useState("");
  const [histPage, setHistPage] = useState(1);
  const [histData, setHistData] = useState<{
    items: any[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [histLoading, setHistLoading] = useState(false);

  const fetchCalendar = async (offset: number) => {
    setCalLoading(true);
    try {
      const ref = new Date();
      ref.setDate(ref.getDate() + offset * 7);
      const url = `/api/calendar?role=office&weekOf=${ref.toISOString().split("T")[0]}`;
      const res = await fetch(url);
      if (res.ok) setCalData(await res.json());
    } finally {
      setCalLoading(false);
    }
  };

  // Start polling a job. Stops automatically when status is completed/failed.
  const startPolling = useCallback((jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/upload/status?jobId=${jobId}`);
        if (!res.ok) return;
        const job: UploadJob = await res.json();
        setActiveJob(job);
        if (job.status === "completed" || job.status === "failed") {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          fetchCalendar(weekOffset);
        }
      } catch {
        // Network error — keep polling
      }
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    // On mount, check if there is an in-progress job from a previous session
    (async () => {
      try {
        const res = await fetch("/api/upload/status", { method: "HEAD" });
        if (res.status === 200) {
          const jobId = res.headers.get("X-Job-Id");
          if (jobId) {
            const jobRes = await fetch(`/api/upload/status?jobId=${jobId}`);
            if (jobRes.ok) {
              const job: UploadJob = await jobRes.json();
              setActiveJob(job);
              if (job.status === "queued" || job.status === "processing") {
                startPolling(jobId);
              }
            }
          }
        }
      } catch {
        // Ignore — just means no active job
      }
    })();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const [, cRes, dRes, bRes, gRes, tRes] = await Promise.all([
        fetchCalendar(0),
        fetch("/api/admin/courses"),
        fetch("/api/admin/divisions"),
        fetch("/api/admin/batches"),
        fetch("/api/admin/groups"),
        fetch("/api/admin/terms"),
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        setCourses(
          data.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            divisionIds: (c.courseDivisions ?? []).map((cd: any) => cd.divisionId),
            groupIds: (c.courseGroups ?? []).map((cg: any) => cg.groupId),
          })),
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
            allowedBatchIds: g.allowedBatchIds ?? [g.batchId],
            allowedBatches: (g.allowedBatches ?? []).map((b: any) => ({ id: b.id, name: b.name })),
          })),
        );
      }
      if (tRes.ok) {
        const data = await tRes.json();
        setTerms(
          (Array.isArray(data) ? data : []).map((t: any) => ({
            id: t.id,
            name: t.name,
            batchId: t.batchId,
            startDate: t.startDate ?? null,
            endDate: t.endDate ?? null,
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
      toast.error("Please upload an Excel (.xlsx) or CSV file");
      return;
    }
    setSelectedFile(file);
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
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) {
        setSelectedFile(null);
        setPreviewData(null);
        // Seed the job state immediately so UI shows "queued" right away
        setActiveJob({
          jobId: d.jobId,
          status: "queued",
          fileName: selectedFile.name,
          totalSwipes: d.totalSwipes,
          studentsMatched: 0,
          studentsNotFound: 0,
          attendanceMarked: 0,
          absentMarked: 0,
          lateMarked: 0,
          duplicatesSkipped: 0,
          errors: [],
          completedAt: null,
        });
        startPolling(d.jobId);
      } else {
        toast.error(d.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setSubmitting(false);
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
    setEditingStatus({});
    setDialogFilterSearch("");
    setDialogFilterStatus("__all__");
    const res = await fetch(
      `/api/admin/attendance?sessionId=${slot.sessionId}`,
    );
    if (res.ok) {
      const data = await res.json();
      setAttRecords(data.records);
      const remarksInit: Record<string, string> = {};
      const statusInit: Record<string, string> = {};
      data.records.forEach((r: any) => {
        if (r.remarks) remarksInit[r.studentId] = r.remarks;
        statusInit[r.studentId] = r.status;
      });
      setEditingRemarks(remarksInit);
      setEditingStatus(statusInit);
    }
  };

  const saveRow = async (studentId: string) => {
    if (!selectedSession?.sessionId) return;
    const status = editingStatus[studentId];
    if (!status || status === "None") return;
    const remarks = editingRemarks[studentId] || null;
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
    setAttRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, status, remarks } : r,
      ),
    );
    toast.success("Attendance saved");
    fetchCalendar(weekOffset);
  };

  const saveAll = async () => {
    if (!selectedSession?.sessionId) return;
    const dirty = attRecords.filter((r) => {
      const pendingStatus = editingStatus[r.studentId] ?? r.status;
      const pendingRemarks = editingRemarks[r.studentId] ?? (r.remarks || "");
      return (
        pendingStatus !== r.status ||
        pendingRemarks !== (r.remarks || "")
      );
    });
    if (dirty.length === 0) {
      toast.info("No unsaved changes");
      return;
    }
    await Promise.all(
      dirty.map((r) =>
        fetch("/api/admin/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: selectedSession.sessionId,
            studentId: r.studentId,
            status: editingStatus[r.studentId] ?? r.status,
            remarks: editingRemarks[r.studentId] || null,
          }),
        }),
      ),
    );
    setAttRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status: editingStatus[r.studentId] ?? r.status,
        remarks: editingRemarks[r.studentId] ?? (r.remarks || null),
      })),
    );
    toast.success(`Saved ${dirty.length} record${dirty.length > 1 ? "s" : ""}`);
    fetchCalendar(weekOffset);
  };

  const downloadReport = async () => {
    if (reportCohorts.length === 0) { toast.error("Select at least one cohort"); return; }
    let start = reportStartDate;
    let end   = reportEndDate;
    if (reportMode === "term") {
      if (!reportTermId) { toast.error("Select a term"); return; }
      const term = terms.find((t) => t.id === reportTermId);
      if (!term?.startDate || !term?.endDate) {
        toast.error("Selected term has no date range configured");
        return;
      }
      start = term.startDate;
      end   = term.endDate;
    }
    if (!start || !end) { toast.error("Set a date range"); return; }
    const rDivIds = reportCohorts.filter((c) => c.startsWith("div_")).map((c) => c.slice(4));
    const rGrpIds = reportCohorts.filter((c) => c.startsWith("grp_")).map((c) => c.slice(4));
    setReportLoading(true);
    try {
      let url = `/api/admin/attendance/report?startDate=${start}&endDate=${end}`;
      if (rDivIds.length) url += `&divisionIds=${rDivIds.join(",")}`;
      if (rGrpIds.length) url += `&groupIds=${rGrpIds.join(",")}`;
      if (reportCourseId) url += `&courseId=${reportCourseId}`;
      const res = await fetch(url);
      if (!res.ok) { toast.error("Failed to generate report"); return; }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `attendance-${start}-to-${end}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchHistory = async (pg = histPage) => {
    if (histCohorts.length === 0) { toast.error("Select at least one cohort"); return; }
    const hDivIds = histCohorts.filter((c) => c.startsWith("div_")).map((c) => c.slice(4));
    const hGrpIds = histCohorts.filter((c) => c.startsWith("grp_")).map((c) => c.slice(4));
    setHistLoading(true);
    try {
      let url = `/api/admin/attendance/history?page=${pg}&limit=10`;
      if (hDivIds.length) url += `&divisionIds=${hDivIds.join(",")}`;
      if (hGrpIds.length) url += `&groupIds=${hGrpIds.join(",")}`;
      if (histMode === "term" && histTermId) {
        url += `&termId=${histTermId}`;
      } else {
        if (histStartDate) url += `&startDate=${histStartDate}`;
        if (histEndDate)   url += `&endDate=${histEndDate}`;
      }
      if (histCourseId) url += `&courseId=${histCourseId}`;
      if (histSource)   url += `&source=${histSource}`;
      const res = await fetch(url);
      if (!res.ok) { toast.error("Failed to load history"); return; }
      setHistData(await res.json());
      setHistPage(pg);
    } finally {
      setHistLoading(false);
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

  // ── Cohort options (all divisions + groups with batch labels) ─────────────
  const cohortOptions: CohortOption[] = [
    ...divisions.map((d) => ({
      value: `div_${d.id}`,
      label: d.name,
      sublabel: batches.find((b) => b.id === d.batchId)?.name ?? "",
    })),
    ...groups.map((g) => ({
      value: `grp_${g.id}`,
      label: g.name,
      sublabel: g.allowedBatches.map((b) => b.name).join(", "),
    })),
  ];

  // ── Derive batchIds from selected cohorts ──────────────────────────────────
  const getBatchIdsFromCohorts = (cohorts: string[]) =>
    [...new Set(
      cohorts.flatMap((c) => {
        if (c.startsWith("div_")) {
          const d = divisions.find((x) => x.id === c.slice(4));
          return d ? [d.batchId] : [];
        }
        if (c.startsWith("grp_")) {
          const g = groups.find((x) => x.id === c.slice(4));
          return g ? g.allowedBatchIds : [];
        }
        return [];
      }),
    )];

  const reportBatchIds = getBatchIdsFromCohorts(reportCohorts);
  const histBatchIds   = getBatchIdsFromCohorts(histCohorts);

  const reportFilteredTerms = terms.filter((t) => reportBatchIds.includes(t.batchId));
  const histFilteredTerms   = terms.filter((t) => histBatchIds.includes(t.batchId));

  // ── Filter courses by selected cohorts ────────────────────────────────────
  const reportSelDivIds = reportCohorts.filter((c) => c.startsWith("div_")).map((c) => c.slice(4));
  const reportSelGrpIds = reportCohorts.filter((c) => c.startsWith("grp_")).map((c) => c.slice(4));
  const reportFilteredCourses =
    reportCohorts.length === 0
      ? courses
      : courses.filter(
          (c) =>
            c.divisionIds.some((d) => reportSelDivIds.includes(d)) ||
            c.groupIds.some((g) => reportSelGrpIds.includes(g)),
        );

  const histSelDivIds = histCohorts.filter((c) => c.startsWith("div_")).map((c) => c.slice(4));
  const histSelGrpIds = histCohorts.filter((c) => c.startsWith("grp_")).map((c) => c.slice(4));
  const histFilteredCourses =
    histCohorts.length === 0
      ? courses
      : courses.filter(
          (c) =>
            c.divisionIds.some((d) => histSelDivIds.includes(d)) ||
            c.groupIds.some((g) => histSelGrpIds.includes(g)),
        );

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

        {!selectedFile && !submitting && !activeJob && (
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

        {submitting && (
          <div className="rounded-2xl border-2 border-dashed p-12 text-center border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="flex justify-center mb-4">
              <Spinner size={48} />
            </div>
            <div className="text-base font-semibold text-[var(--color-text-primary)]">
              Parsing file…
            </div>
            <div className="text-sm mt-1 text-[var(--color-text-muted)]">
              Preparing upload job
            </div>
          </div>
        )}

        {activeJob && (
          <UploadJobCard
            job={activeJob}
            onDismiss={() => setActiveJob(null)}
          />
        )}

        {selectedFile && !submitting && previewData && (
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

      </div>

      {/* ── Report Download Section ── */}
      <div className="mb-10 border-t border-[var(--color-border)] pt-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-1 text-[var(--color-text-primary)]">
          <ChartBarIcon className="w-5 h-5 text-[#531f75]" /> Download Attendance Report
        </h2>
        <p className="text-sm mb-4 text-[var(--color-text-secondary)]">
          Export attendance records as Excel. Select cohorts (required) and a date scope.
        </p>

        {/* Row 1: Mode toggle + Cohort multi-select */}
        <div className="flex gap-3 flex-wrap items-end mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Mode</label>
            <div className="flex rounded-md overflow-hidden border border-[var(--color-border)]">
              <button
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${reportMode === "term" ? "bg-[#531f75] text-white" : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/80"}`}
                onClick={() => setReportMode("term")}
              >Term</button>
              <button
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${reportMode === "custom" ? "bg-[#531f75] text-white" : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/80"}`}
                onClick={() => setReportMode("custom")}
              >Custom Range</button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              Cohorts <span className="text-red-400">*</span>
            </label>
            <CohortMultiSelect
              selected={reportCohorts}
              onChange={(v) => { setReportCohorts(v); setReportTermId(""); setReportCourseId(""); }}
              options={cohortOptions}
              placeholder="Select cohorts…"
            />
          </div>
        </div>

        {/* Row 2: Date scope */}
        <div className="flex gap-3 flex-wrap items-end mb-3">
          {reportMode === "term" ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Term</label>
              <Select
                value={reportTermId || "__none__"}
                onValueChange={(v) => setReportTermId(v === "__none__" ? "" : v)}
                disabled={reportCohorts.length === 0}
              >
                <SelectTrigger className="w-[200px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                  <SelectValue placeholder={reportCohorts.length === 0 ? "Select cohorts first" : "Select term"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select term…</SelectItem>
                  {reportFilteredTerms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reportTermId && (() => {
                const t = terms.find((x) => x.id === reportTermId);
                if (t && (!t.startDate || !t.endDate))
                  return <p className="text-xs text-amber-500 mt-0.5">⚠ Term has no dates configured</p>;
                if (t?.startDate && t?.endDate)
                  return <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.startDate} → {t.endDate}</p>;
              })()}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">From</label>
                <DatePicker value={reportStartDate} onChange={setReportStartDate} placeholder="Start date" className="w-[160px]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">To</label>
                <DatePicker value={reportEndDate} onChange={setReportEndDate} placeholder="End date" className="w-[160px]" />
              </div>
            </>
          )}
        </div>

        {/* Row 3: Course filter + Download button */}
        <div className="flex gap-3 flex-wrap items-end mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Course</label>
            <Select
              value={reportCourseId || "__all__"}
              onValueChange={(v) => setReportCourseId(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-[260px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Courses</SelectItem>
                {reportFilteredCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="gap-2 bg-[#531f75] hover:bg-[#531f75]/90"
            onClick={downloadReport}
            disabled={reportLoading || reportCohorts.length === 0}
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            {reportLoading ? "Generating…" : "Download Excel"}
          </Button>
        </div>
      </div>

      {/* ── Calendar Section ── */}
      {calLoading && !calData && (
        <div className="flex justify-center py-12"><Spinner size={32} /></div>
      )}
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

          {calLoading && (
            <div className="flex justify-center py-4"><Spinner size={24} /></div>
          )}
          <div
            className={`text-xs overflow-x-auto transition-opacity ${calLoading ? "opacity-40 pointer-events-none" : ""}`}
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
                    ? "text-[#f58220] bg-[#531f75]/10"
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
                            (a) => a.status === "P",
                          ).length;
                          const sl = slot.attendance.filter(
                            (a) => a.status === "P#",
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
                              <div className="font-bold text-[var(--color-text-primary)]" style={{ fontSize: 11 }}>
                                {slot.courseCode}
                              </div>
                              <div
                                className="truncate text-[var(--color-text-muted)]"
                                style={{ fontSize: 9 }}
                              >
                                {slot.courseName}
                              </div>
                              <div
                                className="mt-0.5 text-[#f58220]"
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
                                  {sl > 0 && (
                                    <span className="text-blue-400">{sl}SL</span>
                                  )}
                                  {lt > 0 && (
                                    <span className="text-yellow-500">{lt}LT</span>
                                  )}
                                  {ab > 0 && (
                                    <span className="text-red-500">{ab}AB</span>
                                  )}
                                </div>
                              ) : (
                                <div
                                  className="mt-0.5 font-semibold text-[#f58220]"
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

      {/* ── Attendance Update History ── */}
      <div className="mb-10 border-t border-[var(--color-border)] pt-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-1 text-[var(--color-text-primary)]">
          <ClockIcon className="w-5 h-5 text-[#531f75]" /> Attendance Update History
        </h2>
        <p className="text-sm mb-4 text-[var(--color-text-secondary)]">
          View biometric and manual attendance updates. Select cohorts and a date scope, then click Load.
        </p>

        {/* Filter row 1: Mode toggle + Cohort multi-select */}
        <div className="flex gap-3 flex-wrap items-end mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Mode</label>
            <div className="flex rounded-md overflow-hidden border border-[var(--color-border)]">
              <button
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${histMode === "term" ? "bg-[#531f75] text-white" : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/80"}`}
                onClick={() => setHistMode("term")}
              >Term</button>
              <button
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${histMode === "custom" ? "bg-[#531f75] text-white" : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/80"}`}
                onClick={() => setHistMode("custom")}
              >Custom Range</button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              Cohorts <span className="text-red-400">*</span>
            </label>
            <CohortMultiSelect
              selected={histCohorts}
              onChange={(v) => { setHistCohorts(v); setHistTermId(""); setHistCourseId(""); }}
              options={cohortOptions}
              placeholder="Select cohorts…"
            />
          </div>
          {/* Date scope inline */}
          {histMode === "term" ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Term</label>
              <Select
                value={histTermId || "__none__"}
                onValueChange={(v) => setHistTermId(v === "__none__" ? "" : v)}
                disabled={histCohorts.length === 0}
              >
                <SelectTrigger className="w-[180px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                  <SelectValue placeholder={histCohorts.length === 0 ? "Select cohorts first" : "Select term"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All terms</SelectItem>
                  {histFilteredTerms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">From</label>
                <DatePicker value={histStartDate} onChange={setHistStartDate} placeholder="Start date" className="w-[150px]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">To</label>
                <DatePicker value={histEndDate} onChange={setHistEndDate} placeholder="End date" className="w-[150px]" />
              </div>
            </>
          )}
        </div>

        {/* Filter row 2: Course, Source, Load button */}
        <div className="flex gap-3 flex-wrap items-end mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Course</label>
            <Select
              value={histCourseId || "__all__"}
              onValueChange={(v) => setHistCourseId(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-[240px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All courses</SelectItem>
                {histFilteredCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Source</label>
            <Select value={histSource || "__all__"} onValueChange={(v) => setHistSource(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-[160px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All sources</SelectItem>
                <SelectItem value="biometric">Biometric</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-[#531f75] hover:bg-[#531f75]/90 gap-2"
            onClick={() => { setHistPage(1); fetchHistory(1); }}
            disabled={histLoading || histCohorts.length === 0}
          >
            {histLoading ? <Spinner size={14} /> : <ClockIcon className="w-4 h-4" />}
            {histLoading ? "Loading…" : "Load History"}
          </Button>
        </div>

        {/* Results table */}
        {histData && (
          <>
            <div className="overflow-x-auto rounded border border-[var(--color-border)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--color-bg-secondary)]">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Slot</TableHead>
                    <TableHead className="text-xs">Course</TableHead>
                    <TableHead className="text-xs">Div / Group</TableHead>
                    <TableHead className="text-xs">Roll</TableHead>
                    <TableHead className="text-xs">Student</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Swipe / Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-[var(--color-text-muted)] py-8">
                        No records found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    histData.items.map((row: any) => (
                      <TableRow key={row.id} className="text-xs hover:bg-[var(--color-bg-secondary)]/50">
                        <TableCell className="font-mono">{row.date}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.startTime}–{row.endTime}</TableCell>
                        <TableCell>
                          <div className="font-medium">{row.courseCode}</div>
                          <div className="text-[var(--color-text-muted)] text-[10px] truncate max-w-[140px]">{row.courseName}</div>
                        </TableCell>
                        <TableCell>{row.divisionOrGroup}</TableCell>
                        <TableCell className="font-mono">{row.rollNumber}</TableCell>
                        <TableCell>{row.studentName}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            row.status === "P"  ? "bg-green-500/15 text-green-500" :
                            row.status === "P#" ? "bg-blue-500/15 text-blue-400" :
                            row.status === "LT" ? "bg-yellow-500/15 text-yellow-500" :
                            "bg-red-500/15 text-red-500"
                          }`}>
                            {row.status === "P#" ? "SL" : row.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {row.source === "biometric" ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400">Biometric</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-500">Manual</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[var(--color-text-muted)]">
                          {row.swipeTime ?? new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          {row.remarks && <div className="text-[10px] italic truncate max-w-[120px]" title={row.remarks}>{row.remarks}</div>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-3 mt-3">
              <Button
                size="sm"
                variant="outline"
                disabled={histPage <= 1 || histLoading}
                onClick={() => { const p = histPage - 1; setHistPage(p); fetchHistory(p); }}
              >
                ← Prev
              </Button>
              <span className="text-sm text-[var(--color-text-secondary)]">
                Page {histData.page} of {histData.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={histPage >= histData.totalPages || histLoading}
                onClick={() => { const p = histPage + 1; setHistPage(p); fetchHistory(p); }}
              >
                Next →
              </Button>
              <span className="text-xs text-[var(--color-text-muted)]">
                {histData.total.toLocaleString()} records total
              </span>
            </div>
          </>
        )}
      </div>

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
                    <SelectItem value="P#">Sanctioned Leave (P#)</SelectItem>
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
                      <TableHead className="text-[var(--color-text-muted)]">
                        Action
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
                          <div className="flex gap-1 items-center">
                            {(["P", "P#", "LT", "AB"] as const).map((s) => {
                              const currentStatus = editingStatus[r.studentId] ?? r.status;
                              return (
                                <button
                                  key={s}
                                  onClick={() =>
                                    setEditingStatus((prev) => ({
                                      ...prev,
                                      [r.studentId]: s,
                                    }))
                                  }
                                  title={s === "P#" ? "Sanctioned Leave" : undefined}
                                  className={`px-2 py-0.5 rounded text-xs font-medium border cursor-pointer transition-colors ${
                                    currentStatus === s
                                      ? statusColors[s]
                                      : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-transparent hover:border-[var(--color-text-muted)]"
                                  }`}
                                >
                                  {s}
                                </button>
                              );
                            })}
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
                          />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const pendingStatus = editingStatus[r.studentId] ?? r.status;
                            const pendingRemarks = editingRemarks[r.studentId] ?? (r.remarks || "");
                            const isDirty =
                              pendingStatus !== r.status ||
                              pendingRemarks !== (r.remarks || "");
                            return (
                              <Button
                                size="sm"
                                variant={isDirty ? "default" : "outline"}
                                className="h-7 text-xs px-3"
                                onClick={() => saveRow(r.studentId)}
                              >
                                Save
                              </Button>
                            );
                          })()}
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
            <Button onClick={saveAll}>
              Save All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── UploadJobCard ──────────────────────────────────────────────────────────────

function UploadJobCard({
  job,
  onDismiss,
}: {
  job: UploadJob;
  onDismiss: () => void;
}) {
  const isDone = job.status === "completed" || job.status === "failed";

  const statusConfig = {
    queued: {
      icon: <ClockIcon className="w-5 h-5 text-yellow-400" />,
      label: "Queued",
      color: "text-yellow-400",
      bg: "border-yellow-500/30 bg-yellow-500/5",
    },
    processing: {
      icon: <Spinner size={20} />,
      label: "Processing…",
      color: "text-blue-400",
      bg: "border-blue-500/30 bg-blue-500/5",
    },
    completed: {
      icon: <CheckCircleIcon className="w-5 h-5 text-green-400" />,
      label: "Completed",
      color: "text-green-400",
      bg: "border-green-500/30 bg-green-500/5",
    },
    failed: {
      icon: <XCircleIcon className="w-5 h-5 text-red-400" />,
      label: "Failed",
      color: "text-red-400",
      bg: "border-red-500/30 bg-red-500/5",
    },
  };

  const cfg = statusConfig[job.status];

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${cfg.bg} border-[var(--color-border)]`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {cfg.icon}
          <div>
            <span className={`text-sm font-semibold ${cfg.color}`}>
              {cfg.label}
            </span>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate max-w-[280px]">
              {job.fileName}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!isDone}
          onClick={onDismiss}
          className="text-xs h-7 px-3 shrink-0"
        >
          Dismiss
        </Button>
      </div>

      {/* Counters grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatPill
          label="Total Swipes"
          value={job.totalSwipes}
          color="text-[var(--color-text-primary)]"
        />
        <StatPill label="Present" value={job.attendanceMarked} color="text-green-400" />
        <StatPill label="Absent" value={job.absentMarked} color="text-red-400" />
        <StatPill
          label="Duplicates Skipped"
          value={job.duplicatesSkipped}
          color="text-yellow-400"
        />
      </div>

      {/* Secondary counters */}
      {(job.studentsNotFound > 0 || job.lateMarked > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {job.lateMarked > 0 && (
            <StatPill label="Late" value={job.lateMarked} color="text-blue-400" />
          )}
          {job.studentsNotFound > 0 && (
            <StatPill
              label="Unmatched"
              value={job.studentsNotFound}
              color="text-orange-400"
            />
          )}
        </div>
      )}

      {/* Errors */}
      {job.errors.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">
            Errors ({job.errors.length})
          </p>
          <ul className="text-xs text-red-300 space-y-0.5 max-h-24 overflow-y-auto">
            {job.errors.map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mt-0.5">
        {label}
      </p>
    </div>
  );
}
