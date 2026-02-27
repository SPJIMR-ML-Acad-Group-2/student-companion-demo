"use client";

import React, { useEffect, useState } from "react";

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
};

export default function OfficeCalendar() {
  const [data, setData]           = useState<CalendarData | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterDiv, setFilterDiv] = useState("");
  const [loading, setLoading]     = useState(true);
  const [selectedSession, setSelectedSession] = useState<CalendarSlot | null>(null);
  const [attRecords, setAttRecords] = useState<any[]>([]);

  const fetchCalendar = async (offset: number, divId?: string) => {
    const ref = new Date();
    ref.setDate(ref.getDate() + offset * 7);
    let url = `/api/calendar?role=office&weekOf=${ref.toISOString().split("T")[0]}`;
    if (divId) url += `&divisionId=${divId}`;
    const res = await fetch(url);
    if (res.ok) setData(await res.json());
  };

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

  useEffect(() => {
    (async () => { await fetchCalendar(0); setLoading(false); })();
  }, []);

  const handleWeekChange = (dir: number) => { const n = weekOffset + dir; setWeekOffset(n); fetchCalendar(n, filterDiv); };
  const handleDivChange  = (id: string)  => { setFilterDiv(id); fetchCalendar(weekOffset, id); };

  if (loading || !data) {
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: C.text }}>📅 Master Timetable</h1>
        <p style={{ color: C.sub }}>Weekly schedule across all divisions</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={() => handleWeekChange(-1)}
          className="px-3 py-1.5 text-xs rounded-lg cursor-pointer"
          style={{ background: C.sec, border: `1px solid ${C.border}`, color: C.sub, fontFamily: "inherit" }}>◀ Prev</button>
        <span className="text-sm font-semibold" style={{ color: C.text }}>
          {fmtDate(data.weekOf)} — {fmtDate(data.weekEnd)}
        </span>
        <button onClick={() => handleWeekChange(1)}
          className="px-3 py-1.5 text-xs rounded-lg cursor-pointer"
          style={{ background: C.sec, border: `1px solid ${C.border}`, color: C.sub, fontFamily: "inherit" }}>Next ▶</button>
        {weekOffset !== 0 && (
          <button onClick={() => { setWeekOffset(0); fetchCalendar(0, filterDiv); }}
            className="px-3 py-1.5 text-xs rounded-lg cursor-pointer"
            style={{ background: C.sec, border: `1px solid ${C.border}`, color: C.sub, fontFamily: "inherit" }}>Today</button>
        )}
        <span className="flex-1" />
        <select className="tw-input" style={{ width: 180 }} value={filterDiv} onChange={e => handleDivChange(e.target.value)}>
          <option value="">All Divisions</option>
          {data.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Calendar Grid */}
      <div className="text-xs overflow-x-auto" style={{ display: "grid", gridTemplateColumns: "80px repeat(6,1fr)", gap: 2 }}>
        <div className="p-2 font-bold" style={{ color: C.muted }}>Slot</div>
        {data.calendar.map(day => (
          <div key={day.date} className="p-2 font-bold text-center rounded"
            style={{ color: day.date === today ? C.accentS : C.text, background: day.date === today ? C.accentG : "transparent" }}>
            {day.dayName}<br />
            <span className="font-normal" style={{ fontSize: 11, color: C.muted }}>{day.date.slice(5)}</span>
          </div>
        ))}

        {FIXED_SLOTS.map(slotDef => (
          <React.Fragment key={slotDef.slot}>
            <div className="flex flex-col justify-center" style={{ padding: "10px 6px", borderTop: `1px solid ${C.border}`, color: C.muted }}>
              <div className="font-semibold">S{slotDef.slot}</div>
              <div>{slotDef.label}</div>
            </div>
            {data.calendar.map(day => {
              const entries = day.slots.filter(s => s.slotNumber === slotDef.slot);
              if (entries.length === 0) {
                return <div key={`${day.date}-${slotDef.slot}`} style={{ padding: 6, borderTop: `1px solid ${C.border}` }} />;
              }
              return (
                <div key={`${day.date}-${slotDef.slot}`} className="flex flex-col gap-1"
                  style={{ padding: 4, borderTop: `1px solid ${C.border}` }}>
                  {entries.map((entry, i) => (
                    <div key={i}
                      onClick={() => { if (entry.hasSession) openAttendance(entry); }}
                      className="rounded transition-transform hover:-translate-y-px"
                      style={{ padding: 6, background: C.sec,
                        borderLeft: `3px solid ${entry.courseType === "core" ? C.accent : C.warning}`,
                        cursor: entry.hasSession ? "pointer" : "default" }}>
                      <div className="font-bold" style={{ color: C.text, fontSize: 11 }}>
                        {entry.courseCode}
                        {entry.sessionNumber && <span className="font-normal float-right" style={{ fontSize: 9, color: C.muted }}>S{entry.sessionNumber}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Div {entry.divisionName}</div>
                      {entry.facultyName && <div style={{ fontSize: 10, color: C.accentS, marginTop: 2 }}>{entry.facultyName}</div>}
                      {entry.hasSession && (
                        <div style={{ fontSize: 10, marginTop: 4, color: entry.noSwipes ? C.warning : C.success, fontWeight: entry.noSwipes ? 600 : 400 }}>
                          {entry.noSwipes ? "⚠ No Swipes" : `📋 ${entry.attendance.length} recorded`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-5 text-xs" style={{ color: C.muted }}>
        <span><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: C.accent }} /> Core</span>
        <span><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: C.warning }} /> Specialisation</span>
      </div>

      {/* Attendance Modal */}
      {selectedSession && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setSelectedSession(null)}>
          <div className="rounded-2xl flex flex-col w-full max-w-xl mx-4" style={{ background: C.sec, maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: C.border }}>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: C.text }}>Manage Attendance</h2>
                <p className="text-sm mt-1" style={{ color: C.sub }}>
                  {selectedSession.courseCode} — {selectedSession.courseName}<br />
                  Session #{selectedSession.sessionNumber || "?"} · Div {selectedSession.divisionName}
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
                  <table className="tw-table text-sm">
                    <thead><tr><th>Roll No.</th><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {attRecords.map(r => (
                        <tr key={r.studentId}>
                          <td className="font-medium" style={{ color: C.text }}>{r.rollNumber}</td>
                          <td style={{ color: C.sub }}>{r.name}</td>
                          <td>
                            <span className={r.status === "P" ? "badge-success" : r.status === "AB" ? "badge-danger" : r.status === "LT" ? "badge-warning" : "badge-success"}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              {(["P","LT","AB","P#"] as const).map(s => (
                                <button key={s} onClick={() => updateAttendance(r.studentId, s)}
                                  className="px-2 py-1 text-xs rounded cursor-pointer"
                                  style={{ background: C.sec, border: `1px solid ${C.border}`, color: C.sub, fontFamily: "inherit" }}>{s}</button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
