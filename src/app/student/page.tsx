"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";

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
  const colorClass = percentage >= 85 ? "text-[var(--color-success)]" : percentage >= 75 ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]";
  const strokeColor = percentage >= 85 ? "varvar(--color-success)" : percentage >= 75 ? "varvar(--color-warning)" : "varvar(--color-danger)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeColor} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-bold ${colorClass}`} style={{ fontSize: size * 0.22 }}>
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
        <Spinner size={40} />
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
        <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">
          Welcome, {data.student.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {data.student.rollNumber} · {data.student.programme} · Div {data.student.coreDivision}
          {data.student.specialisation && <> · {data.student.specialisation} ({data.student.specDivision})</>}
        </p>
      </div>

      {/* Term Selector */}
      {data.terms.length > 0 && (
        <div className="flex gap-2 items-center mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Term:</span>
          {data.terms.map(t => (
            <button key={t.id} onClick={() => handleTermChange(t.id.toString())}
              className={`${selectedTermId === t.id ? "badge-success" : "badge-warning"} cursor-pointer border-none font-[inherit] text-[13px] px-3.5 py-1.5`}>
              {t.name}{t.isActive ? " ●" : ""}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Overall",  value: `${overallPct}%`, colorClass: overallPct >= 85 ? "text-[var(--color-success)]" : overallPct >= 75 ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]", sub: `${totalPresent + totalLate}/${totalSessions}` },
          { label: "Present",  value: totalPresent,  colorClass: "text-[var(--color-success)]" },
          { label: "Late",     value: totalLate,     colorClass: "text-[var(--color-warning)]" },
          { label: "Absent",   value: totalAbsent,   colorClass: "text-[var(--color-danger)]"  },
        ].map(({ label, value, colorClass, sub }) => (
          <Card key={label} padding="p-5">
            <div className="text-xs uppercase tracking-widest mb-2 text-[var(--color-text-muted)]">{label}</div>
            <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
            {sub && <div className="text-xs mt-1 text-[var(--color-text-secondary)]">{sub}</div>}
          </Card>
        ))}
      </div>

      {/* Core Courses */}
      {coreCourses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3 text-[var(--color-text-secondary)]">Core Courses</h2>
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
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
          <h2 className="text-base font-semibold mb-3 text-[var(--color-text-secondary)]">Specialisation Courses</h2>
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
            {specCourses.map((c, i) => (
              <CourseCard key={c.courseId} course={c} delay={(coreCourses.length + i) * 0.08}
                expanded={expandedCourse === c.courseId}
                onToggle={() => setExpandedCourse(expandedCourse === c.courseId ? null : c.courseId)} />
            ))}
          </div>
        </div>
      )}

      {data.courses.length === 0 && (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-sm">No courses for this term.</p>
        </div>
      )}

      {/* Penalty Reference */}
      <Card padding="p-5" className="mt-4">
        <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">
          📜 Absenteeism Penalty Reference &nbsp;·&nbsp; <span className="font-normal">2 Lates = 1 Effective Absence</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="tw-table">
            <thead><tr><th>Credits</th><th>Sessions</th><th>L1 (1-level ↓)</th><th>L2 (2-level ↓)</th><th>L3 (F grade)</th></tr></thead>
            <tbody>
              <tr><td className="text-[var(--color-text-primary)]">1</td><td className="text-[var(--color-text-secondary)]">9</td><td className="text-[var(--color-warning)]">2</td><td className="text-[var(--color-warning)]">4</td><td className="text-[var(--color-danger)]">5</td></tr>
              <tr><td className="text-[var(--color-text-primary)]">2</td><td className="text-[var(--color-text-secondary)]">18</td><td className="text-[var(--color-warning)]">4</td><td className="text-[var(--color-warning)]">6</td><td className="text-[var(--color-danger)]">8</td></tr>
              <tr><td className="text-[var(--color-text-primary)]">3</td><td className="text-[var(--color-text-secondary)]">26</td><td className="text-[var(--color-warning)]">5</td><td className="text-[var(--color-warning)]">6</td><td className="text-[var(--color-danger)]">8</td></tr>
              <tr><td className="text-[var(--color-text-primary)]">4</td><td className="text-[var(--color-text-secondary)]">35</td><td className="text-[var(--color-warning)]">5</td><td className="text-[var(--color-warning)]">7</td><td className="text-[var(--color-danger)]">9</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-2 text-[var(--color-text-muted)]">
          L1 = 1-level downgrade (A+→A) · L2 = 1-letter downgrade (A→B) · L3 = F grade
        </p>
      </Card>
    </div>
  );
}

function CourseCard({ course, delay, expanded, onToggle }: {
  course: CourseStats; delay: number; expanded: boolean; onToggle: () => void;
}) {
  const p      = course.penalty;
  const badge  = p.level === "none" ? "badge-success" : p.level === "L1" ? "badge-warning" : "badge-danger";
  const pColorClass = p.level === "none" ? "text-[var(--color-success)]" : p.level === "L1" ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]";

  return (
    <Card padding="p-5" style={{ animationDelay: `${delay}s` }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-[var(--color-text-primary)]">{course.courseCode}</span>
            <span className={`${course.courseType === "core" ? "badge-success" : "badge-warning"} text-[10px]`}>{course.courseType}</span>
            <span className="text-[11px] text-[var(--color-text-muted)]">{course.credits}cr</span>
          </div>
          <div className="text-xs mb-3 text-[var(--color-text-secondary)]">{course.courseName}</div>
          <span className={badge}>
            {p.level === "none" ? "● No Penalty" : `⚠ ${p.label}`}
          </span>
        </div>
        <ProgressRing percentage={course.percentage} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: "Present",  value: course.present, colorClass: "text-[var(--color-success)]" },
          { label: "Absent",   value: course.absent,  colorClass: "text-[var(--color-danger)]"  },
          { label: "Late",     value: course.late,    colorClass: "text-[var(--color-warning)]" },
          { label: "P# Leave", value: course.pLeave,  colorClass: "text-[var(--color-accent-sec)]" },
        ].map(({ label, value, colorClass }) => (
          <div key={label} className="rounded-lg p-2 text-center bg-[var(--color-bg-secondary)]">
            <div className={`text-xl font-bold ${colorClass}`}>{value}</div>
            <div className="text-[10px] mt-0.5 text-[var(--color-text-muted)]">{label}</div>
          </div>
        ))}
      </div>

      {/* Penalty summary */}
      <div className={`rounded-lg px-3 py-2 text-xs mb-2 bg-[var(--color-bg-secondary)] ${pColorClass}`}>
        {p.level === "none"
          ? `${Math.max(0, p.thresholds.L1 - p.effectiveAbsences)} more eff. absences before L1 penalty`
          : p.description}
      </div>

      {/* Thresholds */}
      <div className="flex gap-3 text-[11px] mb-1 text-[var(--color-text-muted)]">
        <span>Eff. Absences: <strong className="text-[var(--color-text-primary)]">{p.effectiveAbsences}</strong></span>
        <span className="flex-1" />
        <span className={p.effectiveAbsences >= p.thresholds.L1 ? "text-[var(--color-warning)]" : ""}>L1: {p.thresholds.L1}</span>
        <span className={p.effectiveAbsences >= p.thresholds.L2 ? "text-[var(--color-danger)]" : ""}>L2: {p.thresholds.L2}</span>
        <span className={p.effectiveAbsences >= p.thresholds.L3 ? "text-[var(--color-danger)]" : ""}>L3: {p.thresholds.L3}</span>
      </div>

      {/* Log toggle */}
      <button onClick={onToggle}
        className="w-full py-2 mt-2 text-xs font-semibold cursor-pointer transition-colors bg-transparent border-none text-[var(--color-accent-sec)] font-[inherit]">
        {expanded ? "▲ Hide Log" : "▼ View Attendance Log"}
      </button>

      {/* Log table */}
      {expanded && (
        <div className="mt-1 max-h-[280px] overflow-y-auto">
          {course.log.length === 0
            ? <p className="text-xs text-center py-4 text-[var(--color-text-muted)]">No sessions yet</p>
            : (
              <table className="tw-table text-xs">
                <thead><tr><th>Date</th><th>Slot</th><th>Status</th><th>Swipe</th></tr></thead>
                <tbody>
                  {course.log.map(l => (
                    <tr key={l.sessionId}>
                      <td className="text-[var(--color-text-primary)]">{l.date}</td>
                      <td className="text-[var(--color-text-secondary)]">Slot {l.slot}</td>
                      <td>
                        <span className={`${l.status === "P" ? "badge-success" : l.status === "AB" ? "badge-danger" : "badge-warning"} text-[11px]`}>
                          {l.status === "P" ? "Present" : l.status === "AB" ? "Absent" : l.status === "LT" ? "Late" : l.status}
                        </span>
                      </td>
                      <td className="text-[var(--color-text-muted)]">{l.swipeTime || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}
    </Card>
  );
}
