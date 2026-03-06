"use client";

import React, { useEffect, useState, useRef } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

function parseCSVPreview(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  return lines.slice(0, 10).map(l => l.split(/[|,;]+/).map(c => c.trim().replace(/^"|"$/g, "")));
}

const FIXED_SLOTS = [
  { slot: 1, label: "8:15–9:00" },  { slot: 2, label: "9:00–10:10" },
  { slot: 3, label: "10:40–11:50" },{ slot: 4, label: "12:10–1:20" },
  { slot: 5, label: "2:30–3:40" },  { slot: 6, label: "4:00–5:10" },
  { slot: 7, label: "5:30–6:40" },  { slot: 8, label: "7:00–8:10" },
];

interface CalendarSlot {
  slotNumber: number; startTime: string; endTime: string;
  courseCode: string; courseName: string; courseType: string;
  divisionName: string; divisionId: number; facultyName: string | null;
  hasSession: boolean; sessionId: number | null; sessionNumber: number | null; noSwipes: boolean;
  attendance: Array<{ id: number; status: string }>;
  roomName: string | null;
  date?: string;
}
interface CalendarDay  { date: string; dayOfWeek: number; dayName: string; slots: CalendarSlot[]; }
interface CalendarData { weekOf: string; weekEnd: string; weekDates: string[]; calendar: CalendarDay[]; divisions: Array<{ id: number; name: string }>; }

export default function OfficeAttendance() {
  const [loading, setLoading]         = useState(true);
  const [dragOver, setDragOver]       = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadResults, setUploadResults] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [calData, setCalData]         = useState<CalendarData | null>(null);
  const [weekOffset, setWeekOffset]   = useState(0);
  const [filterDiv, setFilterDiv]     = useState("");
  const [selectedSession, setSelectedSession] = useState<CalendarSlot | null>(null);
  const [attRecords, setAttRecords]   = useState<any[]>([]);
  const [editingRemarks, setEditingRemarks] = useState<Record<number, string>>({});

  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [reportEndDate, setReportEndDate]     = useState(new Date().toISOString().split("T")[0]);
  const [reportDivisionId, setReportDivisionId] = useState("");
  const [reportCourseId, setReportCourseId]   = useState("");
  const [courses, setCourses]                 = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [reportLoading, setReportLoading]     = useState(false);

  const fetchCalendar = async (offset: number, divId?: string) => {
    const ref = new Date();
    ref.setDate(ref.getDate() + offset * 7);
    let url = `/api/calendar?role=office&weekOf=${ref.toISOString().split("T")[0]}`;
    if (divId) url += `&divisionId=${divId}`;
    const res = await fetch(url);
    if (res.ok) setCalData(await res.json());
  };

  useEffect(() => {
    (async () => {
      const [, cRes] = await Promise.all([fetchCalendar(0), fetch("/api/admin/courses")]);
      if (cRes.ok) {
        const data = await cRes.json();
        setCourses(data.map((c: any) => ({ id: c.id, code: c.code, name: c.name })));
      }
      setLoading(false);
    })();
  }, []);

  const processFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx","xls","csv","txt"].includes(ext || "")) { alert("Please upload an Excel (.xlsx) or CSV file"); return; }
    setSelectedFile(file); setUploadResults(null);
    try {
      setPreviewData(ext === "csv" || ext === "txt" ? parseCSVPreview(await file.text()) : [["Preview only for CSV. Ready to submit " + file.name]]);
    } catch { setPreviewData([["Failed to generate preview"]]); }
  };

  const confirmUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", selectedFile);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) { setUploadResults(d.results); setSelectedFile(null); setPreviewData(null); await fetchCalendar(weekOffset, filterDiv); }
      else alert(d.error || "Upload failed");
    } catch { alert("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleWeekChange = (dir: number) => { const n = weekOffset + dir; setWeekOffset(n); fetchCalendar(n, filterDiv); };
  const handleDivChange  = (id: string)  => { setFilterDiv(id); fetchCalendar(weekOffset, id); };

  const openAttendance = async (slot: CalendarSlot) => {
    if (!slot.sessionId) return;
    setSelectedSession(slot); setAttRecords([]); setEditingRemarks({});
    const res = await fetch(`/api/admin/attendance?sessionId=${slot.sessionId}`);
    if (res.ok) {
      const data = await res.json();
      setAttRecords(data.records);
      const remarksInit: Record<number, string> = {};
      data.records.forEach((r: any) => { if (r.remarks) remarksInit[r.studentId] = r.remarks; });
      setEditingRemarks(remarksInit);
    }
  };

  const updateAttendance = async (studentId: number, status: string) => {
    if (!selectedSession?.sessionId) return;
    const remarks = editingRemarks[studentId] || null;
    setAttRecords(prev => prev.map(r => r.studentId === studentId ? { ...r, status, remarks } : r));
    await fetch("/api/admin/attendance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: selectedSession.sessionId, studentId, status, remarks }),
    });
    fetchCalendar(weekOffset, filterDiv);
  };

  const saveRemarks = async (studentId: number) => {
    const record = attRecords.find(r => r.studentId === studentId);
    if (!record || !selectedSession?.sessionId || record.status === "None") return;
    const remarks = editingRemarks[studentId] || null;
    if (remarks === (record.remarks || null)) return; // no change
    setAttRecords(prev => prev.map(r => r.studentId === studentId ? { ...r, remarks } : r));
    await fetch("/api/admin/attendance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: selectedSession.sessionId, studentId, status: record.status, remarks }),
    });
  };

  const downloadReport = async () => {
    setReportLoading(true);
    try {
      let url = `/api/admin/attendance/report?startDate=${reportStartDate}&endDate=${reportEndDate}`;
      if (reportDivisionId) url += `&divisionId=${reportDivisionId}`;
      if (reportCourseId)   url += `&courseId=${reportCourseId}`;
      const res = await fetch(url);
      if (!res.ok) { alert("Failed to generate report"); return; }
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

  return (
    <div className="relative z-[1]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">Attendance Management</h1>
        <p className="text-[var(--color-text-secondary)]">Upload biometric logs or update attendance manually</p>
      </div>

      {/* ── Upload Section ── */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">📤 Upload Biometric Log</h2>

        {!selectedFile && !uploading && !uploadResults && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-[var(--color-accent)] bg-[var(--color-accent-glow)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-card)]"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} />
            <div className="text-5xl mb-4">📁</div>
            <div className="text-base font-semibold mb-1 text-[var(--color-text-primary)]">Drop Excel/CSV file here or click to upload</div>
            <div className="text-sm text-[var(--color-text-muted)]">Supports .xlsx (primary) and pipe-delimited .csv</div>
          </div>
        )}

        {uploading && (
          <div className="rounded-2xl border-2 border-dashed p-12 text-center border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="flex justify-center mb-4">
              <Spinner size={48} />
            </div>
            <div className="text-base font-semibold text-[var(--color-text-primary)]">Processing...</div>
            <div className="text-sm mt-1 text-[var(--color-text-muted)]">Mapping swipes to timetable slots</div>
          </div>
        )}

        {selectedFile && !uploading && previewData && (
          <div className="rounded-2xl border p-5 bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Preview: {selectedFile.name}</h3>
                <p className="text-sm mt-1 text-[var(--color-text-muted)]">Showing first few rows. Please confirm format is correct.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setSelectedFile(null); setPreviewData(null); }}>Cancel</Button>
                <Button variant="primary" onClick={confirmUpload}>Confirm & Upload</Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="tw-table">
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className={i === 0 ? "bg-[var(--color-bg-secondary)] font-semibold" : ""}>
                      {row.map((cell, j) => <td key={j}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {uploadResults && (
          <div className="rounded-2xl border p-5 relative bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <button onClick={() => setUploadResults(null)}
              className="absolute top-4 right-4 bg-transparent border-0 cursor-pointer text-lg text-[var(--color-text-muted)]">✕</button>
            <h3 className="text-base font-semibold mb-4 text-[var(--color-text-primary)]">✅ Upload Processed Successfully</h3>
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
              {[
                { v: uploadResults.totalSwipes,       l: "Total Swipes",     cls: "text-[var(--color-accent-sec)]" },
                { v: uploadResults.sessionsCreated,   l: "Sessions Created", cls: "text-[var(--color-accent-sec)]" },
                { v: uploadResults.attendanceMarked,  l: "Present",          cls: "text-[var(--color-success)]" },
                { v: uploadResults.lateMarked,        l: "Late",             cls: "text-[var(--color-warning)]" },
                { v: uploadResults.absentMarked,      l: "Absent",           cls: "text-[var(--color-danger)]" },
                { v: uploadResults.duplicatesSkipped, l: "Duplicates",       cls: "text-[var(--color-text-muted)]" },
              ].map(({ v, l, cls }) => (
                <div key={l} className="p-3 rounded-lg text-center bg-[var(--color-bg-secondary)]">
                  <div className={`text-2xl font-bold ${cls}`}>{v}</div>
                  <div className="text-xs uppercase tracking-wide mt-1 text-[var(--color-text-muted)]">{l}</div>
                </div>
              ))}
            </div>
            {uploadResults.studentsNotFound > 0 && (
              <p className="mt-3 text-xs text-[var(--color-warning)]">⚠️ {uploadResults.studentsNotFound} roll numbers not found</p>
            )}
          </div>
        )}
      </div>

      {/* ── Report Download Section ── */}
      <div className="mb-10 border-t border-[var(--color-border)] pt-6">
        <h2 className="text-lg font-semibold mb-1 text-[var(--color-text-primary)]">📊 Download Attendance Report</h2>
        <p className="text-sm mb-4 text-[var(--color-text-secondary)]">Export attendance records as CSV with optional filters.</p>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">From</label>
            <input type="date" className="tw-input" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">To</label>
            <input type="date" className="tw-input" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Division</label>
            <select className="tw-input w-[180px]" value={reportDivisionId} onChange={e => setReportDivisionId(e.target.value)}>
              <option value="">All Divisions</option>
              {calData?.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Course</label>
            <select className="tw-input w-[240px]" value={reportCourseId} onChange={e => setReportCourseId(e.target.value)}>
              <option value="">All Courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <Button variant="primary" onClick={downloadReport} disabled={reportLoading}>
            {reportLoading ? "Generating…" : "Download CSV"}
          </Button>
        </div>
      </div>

      {/* ── Calendar Section ── */}
      {calData && (
        <>
          <div className="flex justify-between items-start border-t border-[var(--color-border)] pt-6 mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">✏️ Manual Update via Calendar</h2>
              <p className="text-sm mt-1 text-[var(--color-text-secondary)]">Click any session to mark or adjust attendance.</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <select className="tw-input w-[180px]" value={filterDiv} onChange={e => handleDivChange(e.target.value)}>
                <option value="">All Divisions</option>
                {calData.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div className="flex items-center gap-1 rounded-lg p-1 bg-[var(--color-bg-secondary)]">
                <button onClick={() => handleWeekChange(-1)}
                  className="px-3 py-1.5 text-xs rounded cursor-pointer bg-transparent border-none text-[var(--color-text-secondary)] font-[inherit]">←</button>
                <span className="px-2 text-sm font-medium text-[var(--color-text-primary)]">{calData.weekDates[0]} → {calData.weekDates[6]}</span>
                <button onClick={() => handleWeekChange(1)}
                  className="px-3 py-1.5 text-xs rounded cursor-pointer bg-transparent border-none text-[var(--color-text-secondary)] font-[inherit]">→</button>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setWeekOffset(0); fetchCalendar(0, filterDiv); }}>Today</Button>
            </div>
          </div>

          <div className="text-xs overflow-x-auto" style={{ display: "grid", gridTemplateColumns: "72px repeat(6,1fr)", gap: 2 }}>
            <div className="p-2 font-bold text-[var(--color-text-muted)]">Slot</div>
            {calData.calendar.map(day => (
              <div key={day.date}
                className={`p-2 font-bold text-center rounded ${
                  day.date === today
                    ? "text-[var(--color-accent-sec)] bg-[var(--color-accent-glow)]"
                    : "text-[var(--color-text-primary)] bg-transparent"
                }`}>
                {day.dayName}<br />
                <span className="font-normal text-[var(--color-text-muted)]" style={{ fontSize: 11 }}>{day.date.slice(5)}</span>
              </div>
            ))}
            {FIXED_SLOTS.map(st => (
              <React.Fragment key={st.slot}>
                <div className="flex flex-col justify-center border-t border-[var(--color-border)] text-[var(--color-text-muted)]"
                  style={{ padding: "10px 6px" }}>
                  <div className="font-semibold">S{st.slot}</div>
                  <div>{st.label}</div>
                </div>
                {calData.calendar.map(day => {
                  const slot = day.slots.find(s => s.slotNumber === st.slot);
                  if (!slot || (filterDiv && slot.divisionId !== parseInt(filterDiv))) {
                    return <div key={`${day.date}-${st.slot}`} className="p-1.5 border-t border-[var(--color-border)]" />;
                  }
                  const p  = slot.attendance.filter(a => a.status === "P"  || a.status === "P#").length;
                  const ab = slot.attendance.filter(a => a.status === "AB").length;
                  const lt = slot.attendance.filter(a => a.status === "LT").length;
                  const clickable = !!slot.sessionId;
                  const hasAttendance = slot.attendance.length > 0;
                  return (
                    <div key={`${day.date}-${st.slot}`}
                      onClick={() => { if (clickable) openAttendance({ ...slot, date: day.date }); }}
                      className="rounded bg-[var(--color-bg-secondary)] mt-0.5"
                      style={{ padding: 6, borderTop: "1px solid varvar(--color-border)",
                        borderLeft: `3px solid var(${slot.courseType === "core" ? "--color-accent" : "--color-warning"})`,
                        cursor: clickable ? "pointer" : "default" }}>
                      <div className="font-bold text-[var(--color-text-primary)]">{slot.courseCode}</div>
                      <div className="truncate mt-0.5 text-[var(--color-text-muted)]" style={{ fontSize: 10 }}>{slot.courseName}</div>
                      <div className="mt-0.5 text-[var(--color-accent-sec)]" style={{ fontSize: 10 }}>
                        Div {slot.divisionName}{slot.facultyName && ` • ${slot.facultyName.split(" ")[1]}`}
                        {slot.roomName && ` • ${slot.roomName}`}
                      </div>
                      {hasAttendance ? (
                        <div className="flex gap-1.5 mt-2 font-medium" style={{ fontSize: 11 }}>
                          <span className="text-[var(--color-success)]">{p} P</span>
                          {ab > 0 && <span className="text-[var(--color-danger)]">{ab} AB</span>}
                          {lt > 0 && <span className="text-[var(--color-warning)]">{lt} LT</span>}
                        </div>
                      ) : (
                        <div className="mt-1 font-semibold text-[var(--color-accent-sec)]" style={{ fontSize: 10 }}>Click to mark</div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="flex gap-4 mt-5 text-xs text-[var(--color-text-muted)]">
            <span><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle bg-[var(--color-accent)]" /> Core</span>
            <span><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle bg-[var(--color-warning)]" /> Specialisation</span>
          </div>
        </>
      )}

      {/* ── Manual Attendance Modal ── */}
      <Modal
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Manual Attendance Update"
        subtitle={selectedSession ? `${selectedSession.date} · Slot ${selectedSession.slotNumber} · ${selectedSession.courseName} · Div ${selectedSession.divisionName}` : ""}
        maxWidth="max-w-4xl"
        footer={
          <Button variant="secondary" onClick={() => setSelectedSession(null)}>Close</Button>
        }
      >
        {attRecords.length === 0
          ? <div className="flex justify-center py-10"><Spinner size={36} /></div>
          : (
            <table className="tw-table">
              <thead><tr><th>Roll No.</th><th>Student</th><th>Swipe</th><th>Status</th><th>Remarks</th></tr></thead>
              <tbody>
                {attRecords.map(r => (
                  <tr key={r.studentId}>
                    <td className="text-[var(--color-text-primary)]">{r.rollNumber}</td>
                    <td className="text-[var(--color-text-secondary)]">{r.studentName}</td>
                    <td className="text-[var(--color-text-muted)]">{r.swipeTime || "—"}</td>
                    <td>
                      <div className="flex gap-1">
                        {(["P","P#","LT","AB"] as const).map(s => {
                          const active = r.status === s;
                          const colVar = s==="P" ? "--color-success" : s==="AB" ? "--color-danger" : s==="LT" ? "--color-warning" : "--color-accent";
                          return (
                            <button key={s} onClick={() => updateAttendance(r.studentId, s)}
                              className={`px-2 py-0.5 rounded cursor-pointer font-[inherit] ${
                                active
                                  ? `border border-[${colVar}] text-[${colVar}]`
                                  : `border border-[var(--color-border)] text-[var(--color-text-muted)]`
                              }`}
                              style={{
                                fontSize: 11,
                                background: active ? `var(${colVar})22` : "transparent",
                                borderColor: `var(${active ? colVar : "--color-border"})`,
                                color: `var(${active ? colVar : "--color-text-muted"})`,
                              }}>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="tw-input px-2 py-1 text-[11px] w-[160px] min-w-[120px]"
                        placeholder="Add remark..."
                        value={editingRemarks[r.studentId] || ""}
                        onChange={e => setEditingRemarks(prev => ({ ...prev, [r.studentId]: e.target.value }))}
                        onBlur={() => saveRemarks(r.studentId)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Modal>
    </div>
  );
}
