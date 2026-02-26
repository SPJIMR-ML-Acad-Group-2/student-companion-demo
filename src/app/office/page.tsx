"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface DivisionSummary {
  divisionId: number; divisionName: string; divisionType: string;
  studentCount: number; totalSessions: number;
  courses: CourseStat[];
}

interface CourseStat {
  courseId: number; courseCode: string; courseName: string;
  courseType: string; credits: number; totalSessions: number;
  avgAttendance: number;
  lowAttendanceStudents: Array<{ name: string; rollNumber: string | null; percentage: number }>;
}

interface ProgrammeSummary {
  programmeId: number; programmeName: string; programmeCode: string;
  batch: { id: number; name: string; activeTerm: string | null } | null;
  studentCount: number; divisions: DivisionSummary[];
}

interface SpecSummary {
  id: number; name: string; code: string; divisions: DivisionSummary[];
}

interface RecentSession {
  id: number; date: string; slot: number; course: string; courseName: string;
  division: string; divisionType: string; programme: string; attendanceCount: number;
}

interface UploadResults {
  totalSwipes: number; studentsMatched: number; studentsNotFound: number;
  sessionsCreated: number; attendanceMarked: number; absentMarked: number;
  lateMarked: number; duplicatesSkipped: number; errors: string[];
}

export default function OfficeDashboard() {
  const [programmes, setProgrammes] = useState<ProgrammeSummary[]>([]);
  const [specialisations, setSpecialisations] = useState<SpecSummary[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard/office");
    if (res.ok) {
      const data = await res.json();
      setProgrammes(data.programmes);
      setSpecialisations(data.specialisations || []);
      setRecentSessions(data.recentSessions);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/"); return; }
      const meData = await meRes.json();
      if (meData.user?.role !== "programme_office") { router.push("/"); return; }
      setUser(meData.user);
      await fetchDashboard();
      setLoading(false);
    }
    init();
  }, [router, fetchDashboard]);

  const handleUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv", "txt"].includes(ext || "")) { alert("Please upload an Excel (.xlsx) or CSV file"); return; }
    setUploading(true); setUploadResults(null);
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) { setUploadResults(data.results); await fetchDashboard(); }
      else alert(data.error || "Upload failed");
    } catch { alert("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleUpload(file); e.target.value = ""; };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleUpload(file); };
  const handleLogout = async () => { await fetch("/api/auth/me", { method: "DELETE" }); router.push("/"); };

  if (loading) return <div className="login-container"><div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} /></div>;
  if (!user) return null;

  const totalStudents = programmes.reduce((s, p) => s + (p.studentCount || 0), 0);
  const totalSessions = programmes.reduce((s, p) => s + p.divisions.reduce((ds, d) => ds + d.totalSessions, 0), 0);
  const allLow = programmes.flatMap(p => p.divisions.flatMap(d => d.courses.flatMap(c => c.lowAttendanceStudents)));

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="sidebar-brand-icon">📚</div><h2>Companion</h2></div>
        <nav className="sidebar-nav">
          <div className="sidebar-link active"><span className="sidebar-link-icon">📊</span> Dashboard</div>
          <a className="sidebar-link" href="/office/manage"><span className="sidebar-link-icon">⚙️</span> Manage</a>
          <a className="sidebar-link" href="/office/calendar"><span className="sidebar-link-icon">📅</span> Calendar</a>
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user.name[0]}</div>
          <div className="sidebar-user-info"><div className="sidebar-user-name">{user.name}</div><div className="sidebar-user-role">Programme Office</div></div>
          <button className="quick-btn" onClick={handleLogout} style={{ padding: "6px 10px", fontSize: "11px" }}>↩</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Programme Office Dashboard</h1>
          <p className="page-description">Upload biometric logs and view attendance analytics</p>
        </div>

        {/* Upload */}
        <div className="upload-section">
          <div className="section-header"><h2 className="section-title">📤 Upload Biometric Log</h2></div>
          <div className={`upload-zone ${dragOver ? "drag-over" : ""}`} onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" onChange={handleFileSelect} style={{ display: "none" }} />
            {uploading ? (
              <><div className="upload-icon"><span className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} /></div>
              <div className="upload-title">Processing...</div><div className="upload-subtitle">Mapping swipes to timetable slots</div></>
            ) : (
              <><div className="upload-icon">📁</div>
              <div className="upload-title">Drop Excel/CSV file here or click to upload</div>
              <div className="upload-subtitle">Supports .xlsx (primary) and pipe-delimited .csv</div></>
            )}
          </div>
          {uploadResults && (
            <div className="upload-results">
              <h3>✅ Upload Processed Successfully</h3>
              <div className="upload-stats">
                <div className="upload-stat"><div className="upload-stat-value">{uploadResults.totalSwipes}</div><div className="upload-stat-label">Total Swipes</div></div>
                <div className="upload-stat"><div className="upload-stat-value">{uploadResults.sessionsCreated}</div><div className="upload-stat-label">Sessions Created</div></div>
                <div className="upload-stat"><div className="upload-stat-value" style={{ color: "var(--success)" }}>{uploadResults.attendanceMarked}</div><div className="upload-stat-label">Present</div></div>
                <div className="upload-stat"><div className="upload-stat-value" style={{ color: "var(--warning)" }}>{uploadResults.lateMarked}</div><div className="upload-stat-label">Late</div></div>
                <div className="upload-stat"><div className="upload-stat-value" style={{ color: "var(--danger)" }}>{uploadResults.absentMarked}</div><div className="upload-stat-label">Absent</div></div>
                <div className="upload-stat"><div className="upload-stat-value">{uploadResults.duplicatesSkipped}</div><div className="upload-stat-label">Duplicates</div></div>
              </div>
              {uploadResults.studentsNotFound > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--warning)" }}>⚠️ {uploadResults.studentsNotFound} roll numbers not found</div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total Students</div><div className="stat-value">{totalStudents}</div><div className="stat-subtext">Across {programmes.length} programmes</div></div>
          <div className="stat-card"><div className="stat-label">Sessions Conducted</div><div className="stat-value">{totalSessions}</div></div>
          <div className="stat-card"><div className="stat-label">Low Attendance Alerts</div><div className="stat-value" style={{ color: allLow.length > 0 ? "var(--danger)" : "var(--success)" }}>{allLow.length}</div></div>
        </div>

        {/* Core Division Summaries per Programme */}
        {programmes.map((prog, pi) => (
          <div key={prog.programmeId} style={{ marginBottom: 24 }}>
            <div className="section-header">
              <h2 className="section-title">{prog.programmeName} <span style={{ fontSize: 13, color: "var(--accent-secondary)" }}>({prog.programmeCode})</span> — Core Divisions</h2>
              {prog.batch && <span className="badge badge-success">{prog.batch.name} · {prog.batch.activeTerm || "No active term"}</span>}
            </div>
            {prog.divisions.map((div, di) => <DivisionCard key={div.divisionId} div={div} delay={(pi * 2 + di) * 0.1} />)}
          </div>
        ))}

        {/* Specialisation Division Summaries */}
        {specialisations.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="section-header"><h2 className="section-title">⭐ Specialisation Divisions</h2></div>
            {specialisations.map((spec, si) => (
              <div key={spec.id} style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                  {spec.name} <span style={{ fontSize: 12, color: "var(--accent-secondary)" }}>({spec.code})</span>
                </h3>
                {spec.divisions.map((div, di) => <DivisionCard key={div.divisionId} div={div} delay={(si * 2 + di) * 0.1} />)}
              </div>
            ))}
          </div>
        )}

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="recent-sessions">
            <div className="recent-sessions-header"><h3>📋 Recent Sessions</h3></div>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Slot</th><th>Course</th><th>Division</th><th>Type</th><th>Records</th></tr></thead>
              <tbody>{recentSessions.map(s => (
                <tr key={s.id}><td>{s.date}</td><td>Slot {s.slot}</td><td><strong>{s.course}</strong></td><td>{s.division}</td>
                <td><span className={`badge badge-${s.divisionType === "core" ? "success" : "warning"}`}>{s.divisionType}</span></td><td>{s.attendanceCount}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function DivisionCard({ div, delay }: { div: DivisionSummary; delay: number }) {
  return (
    <div className="division-card" style={{ animationDelay: `${delay}s` }}>
      <div className="division-card-header">
        <div>
          <div className="division-name">Division {div.divisionName}</div>
          <div className="division-meta">{div.studentCount} students · {div.totalSessions} sessions</div>
        </div>
      </div>
      {div.courses.some(c => c.totalSessions > 0) ? (
        <table className="data-table">
          <thead><tr><th>Course</th><th>Type</th><th>Credits</th><th>Sessions</th><th>Avg Attendance</th><th>Low Attendance</th></tr></thead>
          <tbody>
            {div.courses.filter(c => c.totalSessions > 0).map(course => (
              <tr key={course.courseId}>
                <td><strong>{course.courseCode}</strong><br /><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{course.courseName}</span></td>
                <td><span className={`badge badge-${course.courseType === "core" ? "success" : "warning"}`}>{course.courseType}</span></td>
                <td>{course.credits}</td>
                <td>{course.totalSessions}</td>
                <td><span className={`badge badge-${course.avgAttendance >= 85 ? "success" : course.avgAttendance >= 75 ? "warning" : "danger"}`}>{course.avgAttendance}%</span></td>
                <td>{course.lowAttendanceStudents.length === 0 ? <span style={{ color: "var(--text-muted)", fontSize: 13 }}>None</span> :
                  course.lowAttendanceStudents.map((s, i) => <div key={i} style={{ fontSize: 13 }}><span className="badge badge-danger">{s.percentage}%</span> {s.rollNumber} - {s.name}</div>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "8px 0" }}>No sessions yet.</p>}
    </div>
  );
}
