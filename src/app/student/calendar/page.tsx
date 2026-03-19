"use client";

import React, { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

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
  roomName: string | null;
}
interface CalendarDay { date: string; dayOfWeek: number; dayName: string; slots: CalendarSlot[]; }
interface CalendarData { weekOf: string; weekEnd: string; weekDates: string[]; calendar: CalendarDay[]; divisions: Array<{ id: number; name: string }>; }

function StatusBadge({ att, entry }: { att: { status: string } | undefined; entry: CalendarSlot }) {
  const cls = "w-2.5 h-2.5 inline-block mr-0.5 align-text-bottom shrink-0";
  if (!att) {
    if (!entry.hasSession) return null;
    if (entry.noSwipes) return <><ExclamationTriangleIcon className={cls} />No Swipes</>;
    return <>—</>;
  }
  if (att.status === "P")  return <><CheckCircleIcon  className={cls} />Present</>;
  if (att.status === "AB") return <><XCircleIcon       className={cls} />Absent</>;
  if (att.status === "P#") return <><ShieldCheckIcon   className={cls} />Sanctioned</>;
  return <><ClockIcon className={cls} />Late</>;
}

export default function StudentCalendar() {
  const [data, setData]             = useState<CalendarData | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading]       = useState(true);

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
        <Spinner size={40} />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="relative z-[1]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)] flex items-center gap-2">
          <CalendarDaysIcon className="w-8 h-8 shrink-0" />
          My Schedule
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Weekly timetable with your attendance status</p>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => handleWeekChange(-1)}>◀ Prev</Button>
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          {fmtDate(data.weekOf)} — {fmtDate(data.weekEnd)}
        </span>
        <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => handleWeekChange(1)}>Next ▶</Button>
        {weekOffset !== 0 && (
          <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => { setWeekOffset(0); fetchCalendar(0); }}>Today</Button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="text-xs overflow-x-auto" style={{ display: "grid", gridTemplateColumns: "80px repeat(7,1fr)", gap: 2 }}>
        {/* Column headers */}
        <div className="p-2 font-bold text-[var(--color-text-muted)]">Slot</div>
        {data.calendar.map(day => (
          <div key={day.date}
            className={`p-2 font-bold text-center rounded ${day.date === today ? "text-[var(--color-accent-sec)] bg-[var(--color-accent-glow)]" : "text-[var(--color-text-primary)] bg-transparent"}`}>
            {day.dayName}<br />
            <span className="font-normal text-[var(--color-text-muted)]" style={{ fontSize: 11 }}>{day.date.slice(5)}</span>
          </div>
        ))}

        {/* Slot rows */}
        {FIXED_SLOTS.map(slotDef => (
          <React.Fragment key={slotDef.slot}>
            <div className="flex flex-col justify-center border-t border-[var(--color-border)] text-[var(--color-text-muted)]"
              style={{ padding: "10px 6px" }}>
              <div className="font-semibold">S{slotDef.slot}</div>
              <div>{slotDef.label}</div>
            </div>
            {data.calendar.map(day => {
              const entry = day.slots.find(s => s.slotNumber === slotDef.slot);
              if (!entry) {
                return <div key={`${day.date}-${slotDef.slot}`} className="p-1.5 border-t border-[var(--color-border)]" />;
              }
              const att = entry.attendance?.[0];
              const statusColor =
                !att          ? "text-[var(--color-text-muted)]" :
                att.status === "P"  ? "text-[var(--color-success)]" :
                att.status === "AB" ? "text-[var(--color-danger)]" :
                att.status === "P#" ? "text-[#3b82f6]" : "text-[var(--color-warning)]";
              const bgColor =
                att?.status === "P"  ? "rgba(34,197,94,0.07)"  :
                att?.status === "AB" ? "rgba(239,68,68,0.07)"  :
                att?.status === "P#" ? "rgba(59,130,246,0.07)" : "var(--color-bg-secondary)";

              return (
                <div key={`${day.date}-${slotDef.slot}`}
                  className="p-2 border-t border-[var(--color-border)] rounded"
                  style={{
                    background: entry.hasSession ? bgColor : "var(--color-bg-secondary)",
                    borderLeft: `3px solid var(${entry.courseType === "core" ? "--color-accent" : "--color-warning"})`,
                  }}>
                  <div className="font-bold text-[var(--color-text-primary)]">
                    {entry.courseCode}
                    {entry.sessionNumber && <span className="font-normal float-right text-[var(--color-text-muted)]" style={{ fontSize: 9 }}>S{entry.sessionNumber}</span>}
                  </div>
                  <div className="truncate text-[var(--color-text-muted)] mt-0.5" style={{ fontSize: 10 }}>{entry.courseName}</div>
                  {entry.facultyName && <div className="text-[var(--color-accent-sec)] mt-0.5" style={{ fontSize: 10 }}>{entry.facultyName}</div>}
                  {entry.roomName && <div className="text-[var(--color-text-muted)] mt-px" style={{ fontSize: 10 }}>{entry.roomName}</div>}
                  {entry.hasSession && (
                    <div className={`flex items-center font-semibold mt-1 ${statusColor}`} style={{ fontSize: 10 }}>
                      <StatusBadge att={att} entry={entry} />
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-5 text-xs flex-wrap text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm align-middle bg-[var(--color-accent)]" /> Core
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm align-middle bg-[var(--color-warning)]" /> Specialisation
        </span>
        <span className="flex items-center gap-1 text-[var(--color-success)]">
          <CheckCircleIcon className="w-3 h-3" /> Present
        </span>
        <span className="flex items-center gap-1 text-[var(--color-danger)]">
          <XCircleIcon className="w-3 h-3" /> Absent
        </span>
        <span className="flex items-center gap-1 text-[var(--color-warning)]">
          <ClockIcon className="w-3 h-3" /> Late
        </span>
        <span className="flex items-center gap-1 text-[#3b82f6]">
          <ShieldCheckIcon className="w-3 h-3" /> Sanctioned Leave
        </span>
      </div>
    </div>
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
