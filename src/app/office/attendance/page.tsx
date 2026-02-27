"use client";

import React, { useEffect, useState, useRef } from "react";

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
  date?: string;
}
interface CalendarDay  { date: string; dayOfWeek: number; dayName: string; slots: CalendarSlot[]; }
interface CalendarData { weekOf: string; weekEnd: string; weekDates: string[]; calendar: CalendarDay[]; divisions: Array<{ id: number; name: string }>; }

const C = {
  card:    "var(--color-bg-card)",
  sec:     "var(--color-bg-secondary)",
  border:  "var(--color-border)",
  text:    "var(--color-text-primary)",
  muted:   "var(--color-text-muted)",
  sub:     "var(--color-text-secondary)",
  accent:  "var(--color-accent)",
  accentS: "var(--color-accent-sec)",
  accentG: "var(--color-accent-glow)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger:  "var(--color-danger)",
};

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

  const fetchCalendar = async (offset: number, divId?: string) => {
    const ref = new Date();
    ref.setDate(ref.getDate() + offset * 7);
    let url = `/api/calendar?role=office&weekOf=${ref.toISOString().split("T")[0]}`;
    if (divId) url += `&divisionId=${divId}`;
    const res = await fetch(url);
    if (res.ok) setCalData(await res.json());
  };

  useEffect(() => {
    (async () => { await fetchCalendar(0); setLoading(false); })();
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
    setSelectedSession(slot); setAttRecords([]);
    const res = await fetch(`/api/admin/attendance?sessionId=${slot.sessionId}`);
    if (res.ok) setAttRecords((await res.json()).records);
  };

  const updateAttendance = async (studentId: number, status: string) => {
    if (!selectedSession?.sessionId) return;
    setAttRecords(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));
    await fetch("/api/admin/attendance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: selectedSession.sessionId, studentId, status }),
    });
    fetchCalendar(weekOffset, filterDiv);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="rounded-full border-2 animate-spin" style={{ width: 40, height: 40, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="relative z-[1]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: C.text }}>Attendance Management</h1>
        <p style={{ color: C.sub }}>Upload biometric logs or update attendance manually</p>
      </div>

      {/* ── Upload Section ── */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: C.text }}>📤 Upload Biometric Log</h2>

        {!selectedFile && !uploading && !uploadResults && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            className="rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all"
            style={{ borderColor: dragOver ? C.accent : C.border, background: dragOver ? C.accentG : C.card }}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} />
            <div className="text-5xl mb-4">📁</div>
            <div className="text-base font-semibold mb-1" style={{ color: C.text }}>Drop Excel/CSV file here or click to upload</div>
            <div className="text-sm" style={{ color: C.muted }}>Supports .xlsx (primary) and pipe-delimited .csv</div>
          </div>
        )}

        {uploading && (
          <div className="rounded-2xl border-2 border-dashed p-12 text-center" style={{ borderColor: C.border, background: C.card }}>
            <div className="flex justify-center mb-4">
              <div className="rounded-full border-4 animate-spin" style={{ width: 48, height: 48, borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white" }} />
            </div>
            <div className="text-base font-semibold" style={{ color: C.text }}>Processing...</div>
            <div className="text-sm mt-1" style={{ color: C.muted }}>Mapping swipes to timetable slots</div>
          </div>
        )}

        {selectedFile && !uploading && previewData && (
          <div className="rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold" style={{ color: C.text }}>Preview: {selectedFile.name}</h3>
                <p className="text-sm mt-1" style={{ color: C.muted }}>Showing first few rows. Please confirm format is correct.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setSelectedFile(null); setPreviewData(null); }}
                  className="px-4 py-2 rounded-lg text-sm cursor-pointer"
                  style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.sub, fontFamily: "inherit" }}>Cancel</button>
                <button onClick={confirmUpload}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", border: "none", fontFamily: "inherit" }}>Confirm & Upload</button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.border }}>
              <table className="tw-table">
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} style={i === 0 ? { background: C.sec, fontWeight: 600 } : {}}>
                      {row.map((cell, j) => <td key={j}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {uploadResults && (
          <div className="rounded-2xl border p-5 relative" style={{ background: C.card, borderColor: C.border }}>
            <button onClick={() => setUploadResults(null)}
              className="absolute top-4 right-4 bg-transparent border-0 cursor-pointer text-lg" style={{ color: C.muted }}>✕</button>
            <h3 className="text-base font-semibold mb-4" style={{ color: C.text }}>✅ Upload Processed Successfully</h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))" }}>
              {[
                { v: uploadResults.totalSwipes,       l: "Total Swipes",     c: C.accentS },
                { v: uploadResults.sessionsCreated,   l: "Sessions Created", c: C.accentS },
                { v: uploadResults.attendanceMarked,  l: "Present",          c: C.success },
                { v: uploadResults.lateMarked,        l: "Late",             c: C.warning },
                { v: uploadResults.absentMarked,      l: "Absent",           c: C.danger  },
                { v: uploadResults.duplicatesSkipped, l: "Duplicates",       c: C.muted   },
              ].map(({ v, l, c }) => (
                <div key={l} className="p-3 rounded-lg text-center" style={{ background: C.sec }}>
                  <div className="text-2xl font-bold" style={{ color: c }}>{v}</div>
                  <div className="text-xs uppercase tracking-wide mt-1" style={{ color: C.muted }}>{l}</div>
                </div>
              ))}
            </div>
            {uploadResults.studentsNotFound > 0 && (
              <p className="mt-3 text-xs" style={{ color: C.warning }}>⚠️ {uploadResults.studentsNotFound} roll numbers not found</p>
            )}
          </div>
        )}
      </div>

      {/* ── Calendar Section ── */}
      {calData && (
        <>
          <div className="flex justify-between items-start border-t pt-6 mb-4 flex-wrap gap-3" style={{ borderColor: C.border }}>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: C.text }}>✏️ Manual Update via Calendar</h2>
              <p className="text-sm mt-1" style={{ color: C.sub }}>Click a completed session to adjust marks individually.</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <select className="tw-input" style={{ width: 180 }} value={filterDiv} onChange={e => handleDivChange(e.target.value)}>
                <option value="">All Divisions</option>
                {calData.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: C.sec }}>
                <button onClick={() => handleWeekChange(-1)}
                  className="px-3 py-1.5 text-xs rounded cursor-pointer"
                  style={{ background: "transparent", border: "none", color: C.sub, fontFamily: "inherit" }}>←</button>
                <span className="px-2 text-sm font-medium" style={{ color: C.text }}>{calData.weekDates[0]} → {calData.weekDates[6]}</span>
                <button onClick={() => handleWeekChange(1)}
                  className="px-3 py-1.5 text-xs rounded cursor-pointer"
                  style={{ background: "transparent", border: "none", color: C.sub, fontFamily: "inherit" }}>→</button>
              </div>
              <button onClick={() => { setWeekOffset(0); fetchCalendar(0, filterDiv); }}
                className="px-3 py-1.5 text-xs rounded-lg cursor-pointer"
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.sub, fontFamily: "inherit" }}>Today</button>
            </div>
          </div>

          <div className="text-xs overflow-x-auto" style={{ display: "grid", gridTemplateColumns: "72px repeat(6,1fr)", gap: 2 }}>
            <div className="p-2 font-bold" style={{ color: C.muted }}>Slot</div>
            {calData.calendar.map(day => (
              <div key={day.date} className="p-2 font-bold text-center rounded"
                style={{ color: day.date === today ? C.accentS : C.text, background: day.date === today ? C.accentG : "transparent" }}>
                {day.dayName}<br />
                <span className="font-normal" style={{ fontSize: 11, color: C.muted }}>{day.date.slice(5)}</span>
              </div>
            ))}
            {FIXED_SLOTS.map(st => (
              <React.Fragment key={st.slot}>
                <div className="flex flex-col justify-center" style={{ padding: "10px 6px", borderTop: `1px solid ${C.border}`, color: C.muted }}>
                  <div className="font-semibold">S{st.slot}</div>
                  <div>{st.label}</div>
                </div>
                {calData.calendar.map(day => {
                  const slot = day.slots.find(s => s.slotNumber === st.slot);
                  if (!slot || (filterDiv && slot.divisionId !== parseInt(filterDiv))) {
                    return <div key={`${day.date}-${st.slot}`} style={{ padding: 6, borderTop: `1px solid ${C.border}` }} />;
                  }
                  const p  = slot.attendance.filter(a => a.status === "P"  || a.status === "P#").length;
                  const ab = slot.attendance.filter(a => a.status === "AB").length;
                  const lt = slot.attendance.filter(a => a.status === "LT").length;
                  const clickable = slot.hasSession && !slot.noSwipes;
                  return (
                    <div key={`${day.date}-${st.slot}`}
                      onClick={() => { if (clickable) openAttendance({ ...slot, date: day.date }); }}
                      className="rounded"
                      style={{ padding: 6, borderTop: `1px solid ${C.border}`, marginTop: 2,
                        borderLeft: `3px solid ${slot.courseType === "core" ? C.accent : C.warning}`,
                        background: C.sec, cursor: clickable ? "pointer" : "default" }}>
                      <div className="font-bold" style={{ color: C.text }}>{slot.courseCode}</div>
                      <div className="truncate" style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{slot.courseName}</div>
                      <div style={{ fontSize: 10, color: C.accentS, marginTop: 2 }}>
                        Div {slot.divisionName}{slot.facultyName && ` • ${slot.facultyName.split(" ")[1]}`}
                      </div>
                      {slot.hasSession ? (
                        slot.noSwipes
                          ? <div style={{ fontSize: 10, color: C.warning, fontWeight: 600, marginTop: 4 }}>⚠️ Upload Missing</div>
                          : <div className="flex gap-1.5 mt-2 font-medium" style={{ fontSize: 11 }}>
                              <span style={{ color: C.success }}>{p} P</span>
                              {ab > 0 && <span style={{ color: C.danger }}>{ab} AB</span>}
                              {lt > 0 && <span style={{ color: C.warning }}>{lt} LT</span>}
                            </div>
                      ) : <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>Upcoming</div>}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="flex gap-4 mt-5 text-xs" style={{ color: C.muted }}>
            <span><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: C.accent }} /> Core</span>
            <span><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: C.warning }} /> Specialisation</span>
          </div>
        </>
      )}

      {/* ── Manual Attendance Modal ── */}
      {selectedSession && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setSelectedSession(null)}>
          <div className="rounded-2xl flex flex-col w-full max-w-2xl mx-4" style={{ background: C.sec, maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.border }}>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: C.text }}>Manual Attendance Update</h2>
                <p className="text-sm mt-1" style={{ color: C.sub }}>
                  {selectedSession.date} · Slot {selectedSession.slotNumber} · {selectedSession.courseName} · Div {selectedSession.divisionName}
                </p>
              </div>
              <button onClick={() => setSelectedSession(null)} className="bg-transparent border-0 cursor-pointer text-xl" style={{ color: C.muted }}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {attRecords.length === 0
                ? <div className="flex justify-center py-10">
                    <div className="rounded-full border-2 animate-spin" style={{ width: 36, height: 36, borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white" }} />
                  </div>
                : (
                  <table className="tw-table">
                    <thead><tr><th>Roll No.</th><th>Student</th><th>Swipe</th><th>Status</th></tr></thead>
                    <tbody>
                      {attRecords.map(r => (
                        <tr key={r.studentId}>
                          <td style={{ color: C.text }}>{r.rollNumber}</td>
                          <td style={{ color: C.sub }}>{r.studentName}</td>
                          <td style={{ color: C.muted }}>{r.swipeTime || "—"}</td>
                          <td>
                            <div className="flex gap-1">
                              {(["P","P#","LT","AB"] as const).map(s => {
                                const active = r.status === s;
                                const col = s==="P" ? C.success : s==="AB" ? C.danger : s==="LT" ? C.warning : C.accent;
                                return (
                                  <button key={s} onClick={() => updateAttendance(r.studentId, s)}
                                    style={{ padding: "3px 8px", background: active ? col+"22" : "transparent", border: `1px solid ${active ? col : C.border}`, borderRadius: 4, color: active ? col : C.muted, fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}>
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: C.border }}>
              <button onClick={() => setSelectedSession(null)}
                className="px-5 py-2 rounded-lg text-sm cursor-pointer"
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.sub, fontFamily: "inherit" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
