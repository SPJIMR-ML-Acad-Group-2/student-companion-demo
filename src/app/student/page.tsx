"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PenaltyInfo { level: string; label: string; description: string; thresholds: { L1: number; L2: number; L3: number }; absencesUntilL1: number; }
interface LogEntry { sessionId: number; date: string; slot: number; status: string; swipeTime: string | null; }
interface CourseStats {
  courseId: number; courseCode: string; courseName: string; courseType: string;
  credits: number; totalPlanned: number; totalConducted: number;
  present: number; absent: number; late: number; percentage: number;
  penalty: PenaltyInfo; specialisation: string | null; log: LogEntry[];
}
interface TermInfo { id: number; number: number; name: string; isActive: boolean; }
interface StudentData {
  student: { name: string; rollNumber: string; programme: string; batch: string; coreDivision: string; specialisation: string; specDivision: string; activeTerm: string | null; };
  courses: CourseStats[]; terms: TermInfo[]; selectedTermId: number | null;
}

function ProgressRing({ percentage, size = 72 }: { percentage: number; size?: number }) {
  const strokeWidth = 6; const radius = (size - strokeWidth) / 2; const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 85 ? "var(--success)" : percentage >= 75 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}><circle className="ring-bg" cx={size / 2} cy={size / 2} r={radius} /><circle className="ring-fill" cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeDasharray={circumference} strokeDashoffset={offset} /></svg>
      <span className="progress-ring-text" style={{ color }}>{percentage}%</span>
    </div>
  );
}

export default function StudentDashboard() {
  const [data, setData] = useState<StudentData | null>(null);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const router = useRouter();

  const fetchData = async (termId?: number | null) => {
    const url = termId ? `/api/dashboard/student?termId=${termId}` : "/api/dashboard/student";
    const res = await fetch(url);
    if (res.ok) { const d = await res.json(); setData(d); setSelectedTermId(d.selectedTermId); }
  };

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me"); if (!meRes.ok) { router.push("/"); return; }
      const meData = await meRes.json(); if (meData.user?.role !== "student") { router.push("/"); return; }
      setUser(meData.user); await fetchData(); setLoading(false);
    })();
  }, [router]);

  const handleTermChange = async (termId: string) => {
    const id = parseInt(termId);
    setSelectedTermId(id); setExpandedCourse(null);
    await fetchData(id);
  };

  const handleLogout = async () => { await fetch("/api/auth/me", { method: "DELETE" }); router.push("/"); };
  if (loading) return <div className="login-container"><div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} /></div>;
  if (!data || !user) return null;

  const coreCourses = data.courses.filter(c => c.courseType === "core");
  const specCourses = data.courses.filter(c => c.courseType === "specialisation");
  const totalPresent = data.courses.reduce((s, c) => s + c.present, 0);
  const totalAbsent = data.courses.reduce((s, c) => s + c.absent, 0);
  const totalLate = data.courses.reduce((s, c) => s + c.late, 0);
  const totalSessions = data.courses.reduce((s, c) => s + c.totalConducted, 0);
  const overallPct = totalSessions > 0 ? Math.round(((totalPresent + totalLate) / totalSessions) * 100) : 100;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="sidebar-brand-icon">📚</div><h2>Companion</h2></div>
        <nav className="sidebar-nav"><div className="sidebar-link active"><span className="sidebar-link-icon">📊</span> My Attendance</div></nav>
        <div className="sidebar-user"><div className="sidebar-avatar">{user.name[0]}</div>
          <div className="sidebar-user-info"><div className="sidebar-user-name">{user.name}</div><div className="sidebar-user-role">Student</div></div>
          <button className="quick-btn" onClick={handleLogout} style={{ padding: "6px 10px", fontSize: "11px" }}>↩</button></div>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Welcome, {data.student.name.split(" ")[0]} 👋</h1>
          <p className="page-description">
            {data.student.rollNumber} · {data.student.programme} · Div {data.student.coreDivision}
            {data.student.specialisation && <> · {data.student.specialisation} ({data.student.specDivision})</>}
          </p>
        </div>

        {/* Term Selector */}
        {data.terms.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Term:</span>
            {data.terms.map(t => (
              <button key={t.id} onClick={() => handleTermChange(t.id.toString())}
                className={`badge badge-${selectedTermId === t.id ? "success" : "warning"}`}
                style={{ cursor: "pointer", border: "none", fontFamily: "inherit", fontSize: 13, padding: "6px 14px" }}>
                {t.name} {t.isActive ? "●" : ""}
              </button>
            ))}
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Overall</div>
            <div className="stat-value" style={{ color: overallPct >= 85 ? "var(--success)" : overallPct >= 75 ? "var(--warning)" : "var(--danger)" }}>{overallPct}%</div>
            <div className="stat-subtext">{totalPresent + totalLate}/{totalSessions}</div></div>
          <div className="stat-card"><div className="stat-label">Present</div><div className="stat-value" style={{ color: "var(--success)" }}>{totalPresent}</div></div>
          <div className="stat-card"><div className="stat-label">Late</div><div className="stat-value" style={{ color: "var(--warning)" }}>{totalLate}</div></div>
          <div className="stat-card"><div className="stat-label">Absent</div><div className="stat-value" style={{ color: "var(--danger)" }}>{totalAbsent}</div></div>
        </div>

        {coreCourses.length > 0 && (
          <><div className="section-header"><h2 className="section-title">Core Courses</h2></div>
          <div className="attendance-grid">{coreCourses.map((c, i) => (
            <CourseCard key={c.courseId} course={c} delay={i * 0.1} expanded={expandedCourse === c.courseId} onToggle={() => setExpandedCourse(expandedCourse === c.courseId ? null : c.courseId)} />
          ))}</div></>
        )}
        {specCourses.length > 0 && (
          <><div className="section-header" style={{ marginTop: 24 }}><h2 className="section-title">Specialisation Courses</h2></div>
          <div className="attendance-grid">{specCourses.map((c, i) => (
            <CourseCard key={c.courseId} course={c} delay={(coreCourses.length + i) * 0.1} expanded={expandedCourse === c.courseId} onToggle={() => setExpandedCourse(expandedCourse === c.courseId ? null : c.courseId)} />
          ))}</div></>
        )}
        {data.courses.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div><p>No courses for this term.</p>
          </div>
        )}

        {/* Penalty Table */}
        <div className="division-card" style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12, color: "var(--text-secondary)" }}>📜 Absenteeism Penalty Table</h3>
          <table className="data-table">
            <thead><tr><th>Credits</th><th>Sessions</th><th>L1 (1-level ↓)</th><th>L2 (2-level ↓)</th><th>L3 (F grade)</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>9</td><td>2</td><td>4</td><td>5</td></tr>
              <tr><td>2</td><td>18</td><td>4</td><td>6</td><td>8</td></tr>
              <tr><td>3</td><td>26</td><td>5</td><td>6</td><td>8</td></tr>
              <tr><td>4</td><td>35</td><td>5</td><td>7</td><td>9</td></tr>
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>L1 = 1-level downgrade (A+→A) · L2 = 1-letter downgrade (A→B) · L3 = F grade</div>
        </div>
      </main>
    </div>
  );
}

function CourseCard({ course, delay, expanded, onToggle }: { course: CourseStats; delay: number; expanded: boolean; onToggle: () => void }) {
  const penalty = course.penalty;
  const penaltyBadge = penalty.level === "none" ? "success" : penalty.level === "L1" ? "warning" : "danger";
  const penaltyColor = penalty.level === "none" ? "var(--success)" : penalty.level === "L1" ? "var(--warning)" : "var(--danger)";
  return (
    <div className="attendance-card" style={{ animationDelay: `${delay}s` }}>
      <div className="attendance-card-header">
        <div>
          <div className="attendance-course-code">
            {course.courseCode}
            <span className={`badge badge-${course.courseType === "core" ? "success" : "warning"}`} style={{ fontSize: 10, marginLeft: 4 }}>{course.courseType}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>{course.credits}cr</span>
          </div>
          <div className="attendance-course-name">{course.courseName}</div>
          <span className={`badge badge-${penaltyBadge}`} style={{ marginTop: 8, display: "inline-flex" }}>
            {penalty.level === "none" ? "● No Penalty" : `⚠ ${penalty.label}`}
          </span>
        </div>
        <ProgressRing percentage={course.percentage} />
      </div>
      <div className="attendance-details">
        <div className="attendance-detail"><div className="attendance-detail-value detail-present">{course.present}</div><div className="attendance-detail-label">Present</div></div>
        <div className="attendance-detail"><div className="attendance-detail-value detail-absent">{course.absent}</div><div className="attendance-detail-label">Absent</div></div>
        <div className="attendance-detail"><div className="attendance-detail-value detail-late">{course.late}</div><div className="attendance-detail-label">Late</div></div>
      </div>
      <div style={{ padding: "8px 12px", background: "var(--bg-tertiary)", borderRadius: 8, fontSize: 12, color: penaltyColor, marginTop: 8 }}>
        {penalty.level === "none" ? `${penalty.absencesUntilL1} more absence${penalty.absencesUntilL1 !== 1 ? "s" : ""} before L1` : penalty.description}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
        <span>Absences: {course.absent}</span><span style={{ flex: 1 }} />
        <span style={{ color: course.absent >= penalty.thresholds.L1 ? "var(--warning)" : undefined }}>L1: {penalty.thresholds.L1}</span>
        <span style={{ color: course.absent >= penalty.thresholds.L2 ? "var(--danger)" : undefined }}>L2: {penalty.thresholds.L2}</span>
        <span style={{ color: course.absent >= penalty.thresholds.L3 ? "var(--danger)" : undefined }}>L3: {penalty.thresholds.L3}</span>
      </div>

      {/* Attendance Log Toggle */}
      <button onClick={onToggle} style={{
        marginTop: 12, padding: "8px 0", width: "100%", background: "none", border: "none",
        color: "var(--accent-secondary)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
      }}>{expanded ? "▲ Hide Log" : "▼ View Attendance Log"}</button>

      {expanded && course.log.length > 0 && (
        <div style={{ marginTop: 4, maxHeight: 300, overflowY: "auto" }}>
          <table className="data-table" style={{ fontSize: 12 }}>
            <thead><tr><th>Date</th><th>Slot</th><th>Status</th><th>Swipe Time</th></tr></thead>
            <tbody>{course.log.map(l => (
              <tr key={l.sessionId}>
                <td>{l.date}</td><td>Slot {l.slot}</td>
                <td><span className={`badge badge-${l.status === "P" ? "success" : l.status === "LT" ? "warning" : l.status === "AB" ? "danger" : "warning"}`} style={{ fontSize: 11 }}>
                  {l.status === "P" ? "Present" : l.status === "AB" ? "Absent" : l.status === "LT" ? "Late" : l.status}
                </span></td>
                <td style={{ color: "var(--text-muted)" }}>{l.swipeTime || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {expanded && course.log.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: 12 }}>No sessions yet</p>
      )}
    </div>
  );
}
