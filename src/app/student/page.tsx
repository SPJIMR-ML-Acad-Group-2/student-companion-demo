"use client";

import { useEffect, useState } from "react";

const C = {
  card:    "var(--color-bg-card)",
  sec:     "var(--color-bg-secondary)",
  border:  "var(--color-border)",
  text:    "var(--color-text-primary)",
  muted:   "var(--color-text-muted)",
  sub:     "var(--color-text-secondary)",
  accentS: "var(--color-accent-sec)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger:  "var(--color-danger)",
};

interface PenaltyInfo { level: string; label: string; description: string; thresholds: { L1: number; L2: number; L3: number }; effectiveAbsences: number; }
interface LogEntry { sessionId: number; sessionNumber: number | null; date: string; slot: number; status: string; swipeTime: string | null; }
interface CourseStats {
  courseId: number; courseCode: string; courseName: string; courseType: string;
  credits: number; totalPlanned: number; totalConducted: number;
  present: number; absent: number; late: number; pLeave: number; percentage: number;
  penalty: PenaltyInfo; specialisation: string | null; log: LogEntry[];
}
interface TermInfo { id: number; number: number; name: string; isActive: boolean; }
interface StudentData {
  student: { name: string; rollNumber: string; programme: string; batch: string; coreDivision: string; specialisation: string; specDivision: string; activeTerm: string | null; };
  courses: CourseStats[]; terms: TermInfo[]; selectedTermId: number | null;
}

function ProgressRing({ percentage, size = 72 }: { percentage: number; size?: number }) {
  const sw = 6, r = (size - sw) / 2, circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  const color = percentage >= 85 ? C.success : percentage >= 75 ? C.warning : C.danger;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.22, fontWeight: 700, color }}>
        {percentage}%
      </span>
    </div>
  );
}

export default function StudentDashboard() {
  const [data, setData]               = useState<StudentData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  const fetchData = async (termId?: number | null) => {
    const url = termId ? `/api/dashboard/student?termId=${termId}` : "/api/dashboard/student";
    const res = await fetch(url);
    if (res.ok) { const d = await res.json(); setData(d); setSelectedTermId(d.selectedTermId); }
  };

  useEffect(() => { fetchData().then(() => setLoading(false)); }, []);

  const handleTermChange = async (termId: string) => {
    const id = parseInt(termId); setSelectedTermId(id); setExpandedCourse(null);
    await fetchData(id);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="rounded-full border-2 animate-spin" style={{ width: 40, height: 40, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
      </div>
    );
  }

  const coreCourses = data.courses.filter(c => c.courseType === "core");
  const specCourses = data.courses.filter(c => c.courseType === "specialisation");
  const totalPresent  = data.courses.reduce((s, c) => s + c.present, 0);
  const totalAbsent   = data.courses.reduce((s, c) => s + c.absent, 0);
  const totalLate     = data.courses.reduce((s, c) => s + c.late, 0);
  const totalSessions = data.courses.reduce((s, c) => s + c.totalConducted, 0);
  const overallPct    = totalSessions > 0 ? Math.round(((totalPresent + totalLate) / totalSessions) * 100) : 100;

  return (
    <div className="relative z-[1]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: C.text }}>
          Welcome, {data.student.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm" style={{ color: C.sub }}>
          {data.student.rollNumber} · {data.student.programme} · Div {data.student.coreDivision}
          {data.student.specialisation && <> · {data.student.specialisation} ({data.student.specDivision})</>}
        </p>
      </div>

      {/* Term Selector */}
      {data.terms.length > 0 && (
        <div className="flex gap-2 items-center mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Term:</span>
          {data.terms.map(t => (
            <button key={t.id} onClick={() => handleTermChange(t.id.toString())}
              className={selectedTermId === t.id ? "badge-success" : "badge-warning"}
              style={{ cursor: "pointer", border: "none", fontFamily: "inherit", fontSize: 13, padding: "5px 14px" }}>
              {t.name}{t.isActive ? " ●" : ""}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {[
          { label: "Overall",  value: `${overallPct}%`, color: overallPct >= 85 ? C.success : overallPct >= 75 ? C.warning : C.danger, sub: `${totalPresent + totalLate}/${totalSessions}` },
          { label: "Present",  value: totalPresent,  color: C.success },
          { label: "Late",     value: totalLate,     color: C.warning },
          { label: "Absent",   value: totalAbsent,   color: C.danger  },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="rounded-2xl p-5 border" style={{ background: C.card, borderColor: C.border }}>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.muted }}>{label}</div>
            <div className="text-3xl font-bold" style={{ color }}>{value}</div>
            {sub && <div className="text-xs mt-1" style={{ color: C.sub }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Core Courses */}
      {coreCourses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3" style={{ color: C.sub }}>Core Courses</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
            {coreCourses.map((c, i) => (
              <CourseCard key={c.courseId} course={c} delay={i * 0.08}
                expanded={expandedCourse === c.courseId}
                onToggle={() => setExpandedCourse(expandedCourse === c.courseId ? null : c.courseId)} />
            ))}
          </div>
        </div>
      )}

      {/* Spec Courses */}
      {specCourses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3" style={{ color: C.sub }}>Specialisation Courses</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
            {specCourses.map((c, i) => (
              <CourseCard key={c.courseId} course={c} delay={(coreCourses.length + i) * 0.08}
                expanded={expandedCourse === c.courseId}
                onToggle={() => setExpandedCourse(expandedCourse === c.courseId ? null : c.courseId)} />
            ))}
          </div>
        </div>
      )}

      {data.courses.length === 0 && (
        <div className="text-center py-16" style={{ color: C.muted }}>
          <div className="text-5xl mb-4">📋</div>
          <p className="text-sm">No courses for this term.</p>
        </div>
      )}

      {/* Penalty Reference */}
      <div className="rounded-2xl border p-5 mt-4" style={{ background: C.card, borderColor: C.border }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: C.sub }}>
          📜 Absenteeism Penalty Reference &nbsp;·&nbsp; <span style={{ fontWeight: 400 }}>2 Lates = 1 Effective Absence</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="tw-table">
            <thead><tr><th>Credits</th><th>Sessions</th><th>L1 (1-level ↓)</th><th>L2 (2-level ↓)</th><th>L3 (F grade)</th></tr></thead>
            <tbody>
              <tr><td style={{ color: C.text }}>1</td><td style={{ color: C.sub }}>9</td><td style={{ color: C.warning }}>2</td><td style={{ color: C.warning }}>4</td><td style={{ color: C.danger }}>5</td></tr>
              <tr><td style={{ color: C.text }}>2</td><td style={{ color: C.sub }}>18</td><td style={{ color: C.warning }}>4</td><td style={{ color: C.warning }}>6</td><td style={{ color: C.danger }}>8</td></tr>
              <tr><td style={{ color: C.text }}>3</td><td style={{ color: C.sub }}>26</td><td style={{ color: C.warning }}>5</td><td style={{ color: C.warning }}>6</td><td style={{ color: C.danger }}>8</td></tr>
              <tr><td style={{ color: C.text }}>4</td><td style={{ color: C.sub }}>35</td><td style={{ color: C.warning }}>5</td><td style={{ color: C.warning }}>7</td><td style={{ color: C.danger }}>9</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-2" style={{ color: C.muted }}>
          L1 = 1-level downgrade (A+→A) · L2 = 1-letter downgrade (A→B) · L3 = F grade
        </p>
      </div>
    </div>
  );
}

function CourseCard({ course, delay, expanded, onToggle }: {
  course: CourseStats; delay: number; expanded: boolean; onToggle: () => void;
}) {
  const p      = course.penalty;
  const badge  = p.level === "none" ? "badge-success" : p.level === "L1" ? "badge-warning" : "badge-danger";
  const pColor = p.level === "none" ? C.success : p.level === "L1" ? C.warning : C.danger;

  return (
    <div className="rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border, animationDelay: `${delay}s` }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold" style={{ color: C.text }}>{course.courseCode}</span>
            <span className={course.courseType === "core" ? "badge-success" : "badge-warning"} style={{ fontSize: 10 }}>{course.courseType}</span>
            <span className="text-[11px]" style={{ color: C.muted }}>{course.credits}cr</span>
          </div>
          <div className="text-xs mb-3" style={{ color: C.sub }}>{course.courseName}</div>
          <span className={badge}>
            {p.level === "none" ? "● No Penalty" : `⚠ ${p.label}`}
          </span>
        </div>
        <ProgressRing percentage={course.percentage} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: "Present",  value: course.present, color: C.success },
          { label: "Absent",   value: course.absent,  color: C.danger  },
          { label: "Late",     value: course.late,    color: C.warning },
          { label: "P# Leave", value: course.pLeave,  color: C.accentS },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-2 text-center" style={{ background: C.sec }}>
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Penalty summary */}
      <div className="rounded-lg px-3 py-2 text-xs mb-2" style={{ background: C.sec, color: pColor }}>
        {p.level === "none"
          ? `${Math.max(0, p.thresholds.L1 - p.effectiveAbsences)} more eff. absences before L1 penalty`
          : p.description}
      </div>

      {/* Thresholds */}
      <div className="flex gap-3 text-[11px] mb-1" style={{ color: C.muted }}>
        <span>Eff. Absences: <strong style={{ color: C.text }}>{p.effectiveAbsences}</strong></span>
        <span className="flex-1" />
        <span style={{ color: p.effectiveAbsences >= p.thresholds.L1 ? C.warning : undefined }}>L1: {p.thresholds.L1}</span>
        <span style={{ color: p.effectiveAbsences >= p.thresholds.L2 ? C.danger  : undefined }}>L2: {p.thresholds.L2}</span>
        <span style={{ color: p.effectiveAbsences >= p.thresholds.L3 ? C.danger  : undefined }}>L3: {p.thresholds.L3}</span>
      </div>

      {/* Log toggle */}
      <button onClick={onToggle}
        className="w-full py-2 text-xs font-semibold cursor-pointer transition-colors"
        style={{ marginTop: 8, background: "none", border: "none", color: C.accentS, fontFamily: "inherit" }}>
        {expanded ? "▲ Hide Log" : "▼ View Attendance Log"}
      </button>

      {/* Log table */}
      {expanded && (
        <div style={{ marginTop: 4, maxHeight: 280, overflowY: "auto" }}>
          {course.log.length === 0
            ? <p className="text-xs text-center py-4" style={{ color: C.muted }}>No sessions yet</p>
            : (
              <table className="tw-table" style={{ fontSize: 12 }}>
                <thead><tr><th>Date</th><th>Slot</th><th>Status</th><th>Swipe</th></tr></thead>
                <tbody>
                  {course.log.map(l => (
                    <tr key={l.sessionId}>
                      <td style={{ color: C.text }}>{l.date}</td>
                      <td style={{ color: C.sub }}>Slot {l.slot}</td>
                      <td>
                        <span className={l.status === "P" ? "badge-success" : l.status === "AB" ? "badge-danger" : "badge-warning"} style={{ fontSize: 11 }}>
                          {l.status === "P" ? "Present" : l.status === "AB" ? "Absent" : l.status === "LT" ? "Late" : l.status}
                        </span>
                      </td>
                      <td style={{ color: C.muted }}>{l.swipeTime || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}
    </div>
  );
}
