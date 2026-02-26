"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const FIXED_SLOTS = [
  { slot: 1, label: "8:15–9:00" }, { slot: 2, label: "9:00–10:10" },
  { slot: 3, label: "10:40–11:50" }, { slot: 4, label: "12:10–1:20" },
  { slot: 5, label: "2:30–3:40" }, { slot: 6, label: "4:00–5:10" },
  { slot: 7, label: "5:30–6:40" }, { slot: 8, label: "7:00–8:10" },
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

export default function StudentCalendar() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchCalendar = async (offset: number) => {
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + offset * 7);
    const weekOf = refDate.toISOString().split("T")[0];
    const res = await fetch(`/api/calendar?role=student&weekOf=${weekOf}`);
    if (res.ok) setData(await res.json());
  };

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me"); if (!meRes.ok) { router.push("/"); return; }
      const meData = await meRes.json(); if (meData.user?.role !== "student") { router.push("/"); return; }
      setUser(meData.user); await fetchCalendar(0); setLoading(false);
    })();
  }, [router]);

  const handleWeekChange = (dir: number) => { const next = weekOffset + dir; setWeekOffset(next); fetchCalendar(next); };
  const handleLogout = async () => { await fetch("/api/auth/me", { method: "DELETE" }); router.push("/"); };

  if (loading) return <div className="login-container"><div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} /></div>;
  if (!data || !user) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="sidebar-brand-icon">📚</div><h2>Companion</h2></div>
        <nav className="sidebar-nav">
          <a className="sidebar-link" href="/student"><span className="sidebar-link-icon">📊</span> Attendance</a>
          <div className="sidebar-link active"><span className="sidebar-link-icon">📅</span> Calendar</div>
        </nav>
        <div className="sidebar-user"><div className="sidebar-avatar">{user.name[0]}</div>
          <div className="sidebar-user-info"><div className="sidebar-user-name">{user.name}</div><div className="sidebar-user-role">Student</div></div>
          <button className="quick-btn" onClick={handleLogout} style={{ padding: "6px 10px", fontSize: "11px" }}>↩</button></div>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">📅 My Schedule</h1>
          <p className="page-description">Weekly timetable with attendance status</p>
        </div>
        {/* Week navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button className="quick-btn" onClick={() => handleWeekChange(-1)}>◀ Prev</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {formatDate(data.weekOf)} — {formatDate(data.weekEnd)}
          </span>
          <button className="quick-btn" onClick={() => handleWeekChange(1)}>Next ▶</button>
          {weekOffset !== 0 && <button className="quick-btn" onClick={() => { setWeekOffset(0); fetchCalendar(0); }}>Today</button>}
        </div>
        {/* Calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "80px repeat(6, 1fr)", gap: 2, fontSize: 12 }}>
          {/* Header row */}
          <div style={{ padding: 8, fontWeight: 700, color: "var(--text-muted)" }}>Slot</div>
          {data.calendar.map(day => (
            <div key={day.date} style={{
              padding: 8, fontWeight: 700, textAlign: "center",
              color: day.date === today ? "var(--accent-secondary)" : "var(--text-primary)",
              background: day.date === today ? "var(--accent-glow)" : "transparent",
              borderRadius: 6,
            }}>
              {day.dayName}<br /><span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>{day.date.slice(5)}</span>
            </div>
          ))}
          {/* Slot rows */}
          {FIXED_SLOTS.map(slotDef => (
            <>
              <div key={`label-${slotDef.slot}`} style={{
                padding: "10px 6px", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-primary)",
                display: "flex", flexDirection: "column", justifyContent: "center",
              }}>
                <div style={{ fontWeight: 600 }}>S{slotDef.slot}</div>
                <div>{slotDef.label}</div>
              </div>
              {data.calendar.map(day => {
                const entry = day.slots.find(s => s.slotNumber === slotDef.slot);
                if (!entry) return <div key={`${day.date}-${slotDef.slot}`} style={{ padding: 6, borderTop: "1px solid var(--border-primary)" }} />;
                const att = entry.attendance?.[0];
                const statusColor = !att ? "var(--text-muted)" : att.status === "P" ? "var(--success)" : att.status === "AB" ? "var(--danger)" : att.status === "P#" ? "#3b82f6" : "var(--warning)";
                const statusLabel = !att ? (entry.hasSession ? (entry.noSwipes ? "⚠ No Swipes" : "—") : "") : att.status === "P" ? "✓ Present" : att.status === "AB" ? "✗ Absent" : att.status === "P#" ? "🛡️ Leave" : `⏱ ${att.status}`;
                return (
                  <div key={`${day.date}-${slotDef.slot}`} style={{
                    padding: 8, borderTop: "1px solid var(--border-primary)",
                    background: entry.hasSession ? (att?.status === "P" ? "rgba(76,175,80,0.08)" : att?.status === "AB" ? "rgba(244,67,54,0.08)" : att?.status === "P#" ? "rgba(59,130,246,0.08)" : "var(--bg-tertiary)") : "var(--bg-tertiary)",
                    borderRadius: 4, borderLeft: `3px solid ${entry.courseType === "core" ? "var(--accent-primary)" : "var(--warning)"}`,
                  }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{entry.courseCode} {entry.sessionNumber && <span style={{ fontSize: 10, fontWeight: "normal", color: "var(--text-muted)", float: "right" }}>S{entry.sessionNumber}</span>}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{entry.courseName}</div>
                    {entry.facultyName && <div style={{ fontSize: 10, color: "var(--accent-secondary)", marginTop: 2 }}>{entry.facultyName}</div>}
                    {entry.hasSession && <div style={{ fontSize: 10, fontWeight: 600, color: statusColor, marginTop: 4 }}>{statusLabel}</div>}
                  </div>
                );
              })}
            </>
          ))}
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 20, fontSize: 12, color: "var(--text-muted)" }}>
          <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "var(--accent-primary)", marginRight: 4, verticalAlign: "middle" }} /> Core</span>
          <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "var(--warning)", marginRight: 4, verticalAlign: "middle" }} /> Specialisation</span>
          <span style={{ color: "var(--success)" }}>✓ Present</span>
          <span style={{ color: "var(--danger)" }}>✗ Absent</span>
          <span style={{ color: "var(--warning)" }}>⏱ Late</span>
          <span style={{ color: "#3b82f6" }}>🛡️ Leave</span>
        </div>
      </main>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
