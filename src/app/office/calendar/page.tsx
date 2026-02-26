"use client";

import React, { useEffect, useState } from "react";
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

export default function OfficeCalendar() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterDiv, setFilterDiv] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedSession, setSelectedSession] = useState<CalendarSlot | null>(null);
  const [attRecords, setAttRecords] = useState<any[]>([]);

  const router = useRouter();

  const fetchCalendar = async (offset: number, divId?: string) => {
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + offset * 7);
    const weekOf = refDate.toISOString().split("T")[0];
    let url = `/api/calendar?role=office&weekOf=${weekOf}`;
    if (divId) url += `&divisionId=${divId}`;
    const res = await fetch(url);
    if (res.ok) setData(await res.json());
  };

  const openAttendance = async (slot: CalendarSlot) => {
    if (!slot.sessionId) return;
    setSelectedSession(slot);
    setAttRecords([]); // Clear old while loading
    const res = await fetch(`/api/admin/attendance?sessionId=${slot.sessionId}`);
    if (res.ok) {
      const data = await res.json();
      setAttRecords(data.records);
    }
  };

  const updateAttendance = async (studentId: number, status: string) => {
    if (!selectedSession?.sessionId) return;
    
    // Optimistic update
    setAttRecords(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));
    
    // Save to DB
    await fetch("/api/admin/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: selectedSession.sessionId, studentId, status })
    });
    
    // Refresh calendar data in background to ensure sync
    fetchCalendar(weekOffset, filterDiv);
  };

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me"); if (!meRes.ok) { router.push("/"); return; }
      const meData = await meRes.json(); if (meData.user?.role !== "programme_office") { router.push("/"); return; }
      setUser(meData.user); await fetchCalendar(0); setLoading(false);
    })();
  }, [router]);

  const handleWeekChange = (dir: number) => { const next = weekOffset + dir; setWeekOffset(next); fetchCalendar(next, filterDiv); };
  const handleDivChange = (divId: string) => { setFilterDiv(divId); fetchCalendar(weekOffset, divId); };
  const handleLogout = async () => { await fetch("/api/auth/me", { method: "DELETE" }); router.push("/"); };

  if (loading) return <div className="login-container"><div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} /></div>;
  if (!data || !user) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="sidebar-brand-icon">📚</div><h2>Companion</h2></div>
        <nav className="sidebar-nav">
          <a className="sidebar-link" href="/office"><span className="sidebar-link-icon">📊</span> Dashboard</a>
          <a className="sidebar-link" href="/office/manage"><span className="sidebar-link-icon">⚙️</span> Manage</a>
          <div className="sidebar-link active"><span className="sidebar-link-icon">📅</span> Calendar</div>
        </nav>
        <div className="sidebar-user"><div className="sidebar-avatar">{user.name[0]}</div>
          <div className="sidebar-user-info"><div className="sidebar-user-name">{user.name}</div><div className="sidebar-user-role">Programme Office</div></div>
          <button className="quick-btn" onClick={handleLogout} style={{ padding: "6px 10px", fontSize: "11px" }}>↩</button></div>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">📅 Master Timetable</h1>
          <p className="page-description">Weekly schedule across all divisions</p>
        </div>
        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <button className="quick-btn" onClick={() => handleWeekChange(-1)}>◀ Prev</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {formatDate(data.weekOf)} — {formatDate(data.weekEnd)}
          </span>
          <button className="quick-btn" onClick={() => handleWeekChange(1)}>Next ▶</button>
          {weekOffset !== 0 && <button className="quick-btn" onClick={() => { setWeekOffset(0); fetchCalendar(0, filterDiv); }}>Today</button>}
          <span style={{ flex: 1 }} />
          <select className="form-input" style={{ width: 180 }} value={filterDiv} onChange={e => handleDivChange(e.target.value)}>
            <option value="">All Divisions</option>
            {data.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {/* Calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "80px repeat(6, 1fr)", gap: 2, fontSize: 12 }}>
          {/* Header */}
          <div style={{ padding: 8, fontWeight: 700, color: "var(--text-muted)" }}>Slot</div>
          {data.calendar.map(day => (
            <div key={day.date} style={{
              padding: 8, fontWeight: 700, textAlign: "center",
              color: day.date === today ? "var(--accent-secondary)" : "var(--text-primary)",
              background: day.date === today ? "var(--accent-glow)" : "transparent", borderRadius: 6,
            }}>
              {day.dayName}<br /><span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>{day.date.slice(5)}</span>
            </div>
          ))}
          {/* Slot rows */}
          {FIXED_SLOTS.map(slotDef => (
            <React.Fragment key={slotDef.slot}>
              <div key={`label-${slotDef.slot}`} style={{
                padding: "10px 6px", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-primary)",
                display: "flex", flexDirection: "column", justifyContent: "center",
              }}>
                <div style={{ fontWeight: 600 }}>S{slotDef.slot}</div>
                <div>{slotDef.label}</div>
              </div>
              {data.calendar.map(day => {
                const entries = day.slots.filter(s => s.slotNumber === slotDef.slot);
                if (entries.length === 0) return <div key={`${day.date}-${slotDef.slot}`} style={{ padding: 6, borderTop: "1px solid var(--border-primary)" }} />;
                return (
                  <div key={`${day.date}-${slotDef.slot}`} style={{
                    padding: 4, borderTop: "1px solid var(--border-primary)", display: "flex", flexDirection: "column", gap: 3,
                  }}>
                    {entries.map((entry, i) => (
                      <div key={i} onClick={() => { if (entry.hasSession) openAttendance(entry); }} style={{
                        padding: 6, background: "var(--bg-tertiary)", borderRadius: 4,
                        borderLeft: `3px solid ${entry.courseType === "core" ? "var(--accent-primary)" : "var(--warning)"}`,
                        cursor: entry.hasSession ? "pointer" : "default",
                        transition: "transform 0.1s, box-shadow 0.1s",
                      }}
                      onMouseEnter={(e) => { if(entry.hasSession) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";} }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 11 }}>{entry.courseCode} {entry.sessionNumber && <span style={{ fontSize: 9, fontWeight: "normal", color: "var(--text-muted)", float: "right" }}>S{entry.sessionNumber}</span>}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Div {entry.divisionName}</div>
                        {entry.facultyName && <div style={{ fontSize: 10, color: "var(--accent-secondary)", marginTop: 2 }}>{entry.facultyName}</div>}
                        {entry.hasSession && (
                          <div style={{ fontSize: 10, color: entry.noSwipes ? "var(--warning)" : "var(--success)", fontWeight: entry.noSwipes ? 600 : 400, marginTop: 4 }}>
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
        <div style={{ display: "flex", gap: 16, marginTop: 20, fontSize: 12, color: "var(--text-muted)" }}>
          <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "var(--accent-primary)", marginRight: 4, verticalAlign: "middle" }} /> Core</span>
          <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "var(--warning)", marginRight: 4, verticalAlign: "middle" }} /> Specialisation</span>
        </div>

        {/* Attendance Modal */}
        {selectedSession && (
          <div className="modal-overlay" onClick={() => setSelectedSession(null)} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: "var(--bg-secondary)", padding: 24, borderRadius: 12, width: 600, maxWidth: "90%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 20, marginBottom: 4 }}>Manage Attendance</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{selectedSession.courseCode} — {selectedSession.courseName} <br/> Session #{selectedSession.sessionNumber || "?"} · Div {selectedSession.divisionName}</p>
                </div>
                <button className="quick-btn" onClick={() => setSelectedSession(null)}>✕</button>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr><th>Roll Number</th><th>Name</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {attRecords.map(r => (
                      <tr key={r.studentId}>
                        <td><strong>{r.rollNumber}</strong></td>
                        <td>{r.name}</td>
                        <td>
                          <span className={`badge badge-${r.status === "P" ? "success" : r.status === "AB" ? "danger" : r.status === "LT" ? "warning" : r.status === "P#" ? "primary" : "secondary"}`} style={{ background: r.status === "P#" ? "rgba(59,130,246,0.1)" : undefined, color: r.status === "P#" ? "#3b82f6" : undefined }}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="quick-btn" style={{ padding: "4px 8px" }} onClick={() => updateAttendance(r.studentId, "P")}>P</button>
                            <button className="quick-btn" style={{ padding: "4px 8px" }} onClick={() => updateAttendance(r.studentId, "LT")}>LT</button>
                            <button className="quick-btn" style={{ padding: "4px 8px" }} onClick={() => updateAttendance(r.studentId, "AB")}>AB</button>
                            <button className="quick-btn" style={{ padding: "4px 8px", color: "#3b82f6" }} onClick={() => updateAttendance(r.studentId, "P#")}>P#</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
