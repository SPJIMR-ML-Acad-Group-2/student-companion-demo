"use client";

import React, { useEffect, useState } from "react";

const FIXED_SLOTS = [
  { slot: 1, label: "8:15–9:00"   }, { slot: 2, label: "9:00–10:10"  },
  { slot: 3, label: "10:40–11:50" }, { slot: 4, label: "12:10–1:20"  },
  { slot: 5, label: "2:30–3:40"   }, { slot: 6, label: "4:00–5:10"   },
  { slot: 7, label: "5:30–6:40"   }, { slot: 8, label: "7:00–8:10"   },
];

interface CalendarSlot {
  slotNumber: number; startTime: string; endTime: string;
  courseCode: string; courseName: string; courseType: string;
  divisionName: string; divisionId: number; facultyName: string | null;
  hasSession: boolean; sessionId: number | null; sessionNumber: number | null; noSwipes: boolean;
  attendance: Array<{ id: number; status: string }>;
}
interface CalendarDay { date: string; dayOfWeek: number; dayName: string; slots: CalendarSlot[]; }
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

export default function StudentCalendar() {
  const [data, setData]           = useState<CalendarData | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading]     = useState(true);

  const fetchCalendar = async (offset: number) => {
    const ref = new Date();
    ref.setDate(ref.getDate() + offset * 7);
    const res = await fetch(`/api/calendar?role=student&weekOf=${ref.toISOString().split("T")[0]}`);
    if (res.ok) setData(await res.json());
  };

  useEffect(() => { fetchCalendar(0).then(() => setLoading(false)); }, []);

  const handleWeekChange = (dir: number) => { const n = weekOffset + dir; setWeekOffset(n); fetchCalendar(n); };

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
        <h1 className="text-3xl font-bold mb-1" style={{ color: C.text }}>📅 My Schedule</h1>
        <p className="text-sm" style={{ color: C.sub }}>Weekly timetable with your attendance status</p>
      </div>

      {/* Week nav */}
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
          <button onClick={() => { setWeekOffset(0); fetchCalendar(0); }}
            className="px-3 py-1.5 text-xs rounded-lg cursor-pointer"
            style={{ background: C.sec, border: `1px solid ${C.border}`, color: C.sub, fontFamily: "inherit" }}>Today</button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="text-xs overflow-x-auto" style={{ display: "grid", gridTemplateColumns: "80px repeat(6,1fr)", gap: 2 }}>
        {/* Column headers */}
        <div className="p-2 font-bold" style={{ color: C.muted }}>Slot</div>
        {data.calendar.map(day => (
          <div key={day.date} className="p-2 font-bold text-center rounded"
            style={{ color: day.date === today ? C.accentS : C.text, background: day.date === today ? C.accentG : "transparent" }}>
            {day.dayName}<br />
            <span className="font-normal" style={{ fontSize: 11, color: C.muted }}>{day.date.slice(5)}</span>
          </div>
        ))}

        {/* Slot rows */}
        {FIXED_SLOTS.map(slotDef => (
          <React.Fragment key={slotDef.slot}>
            <div className="flex flex-col justify-center"
              style={{ padding: "10px 6px", borderTop: `1px solid ${C.border}`, color: C.muted }}>
              <div className="font-semibold">S{slotDef.slot}</div>
              <div>{slotDef.label}</div>
            </div>
            {data.calendar.map(day => {
              const entry = day.slots.find(s => s.slotNumber === slotDef.slot);
              if (!entry) {
                return <div key={`${day.date}-${slotDef.slot}`} style={{ padding: 6, borderTop: `1px solid ${C.border}` }} />;
              }
              const att = entry.attendance?.[0];
              const statusColor =
                !att          ? C.muted :
                att.status === "P"  ? C.success :
                att.status === "AB" ? C.danger :
                att.status === "P#" ? "#3b82f6" : C.warning;
              const statusLabel =
                !att          ? (entry.hasSession ? (entry.noSwipes ? "⚠ No Swipes" : "—") : "") :
                att.status === "P"  ? "✓ Present" :
                att.status === "AB" ? "✗ Absent"  :
                att.status === "P#" ? "🛡 Leave"  : `⏱ ${att.status}`;
              const bgColor =
                att?.status === "P"  ? "rgba(34,197,94,0.07)"  :
                att?.status === "AB" ? "rgba(239,68,68,0.07)"  :
                att?.status === "P#" ? "rgba(59,130,246,0.07)" : C.sec;

              return (
                <div key={`${day.date}-${slotDef.slot}`}
                  style={{ padding: 8, borderTop: `1px solid ${C.border}`, borderRadius: 4,
                    background: entry.hasSession ? bgColor : C.sec,
                    borderLeft: `3px solid ${entry.courseType === "core" ? C.accent : C.warning}` }}>
                  <div className="font-bold" style={{ color: C.text }}>
                    {entry.courseCode}
                    {entry.sessionNumber && <span className="font-normal float-right" style={{ fontSize: 9, color: C.muted }}>S{entry.sessionNumber}</span>}
                  </div>
                  <div className="truncate" style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{entry.courseName}</div>
                  {entry.facultyName && <div style={{ fontSize: 10, color: C.accentS, marginTop: 2 }}>{entry.facultyName}</div>}
                  {entry.hasSession && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: statusColor, marginTop: 4 }}>{statusLabel}</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-5 text-xs flex-wrap" style={{ color: C.muted }}>
        <span><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: C.accent }} /> Core</span>
        <span><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: C.warning }} /> Specialisation</span>
        <span style={{ color: C.success }}>✓ Present</span>
        <span style={{ color: C.danger }}>✗ Absent</span>
        <span style={{ color: C.warning }}>⏱ Late</span>
        <span style={{ color: "#3b82f6" }}>🛡 Leave</span>
      </div>
    </div>
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
