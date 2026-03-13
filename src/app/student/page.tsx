"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

interface PenaltyInfo {
  level: string;
  label: string;
  description: string;
  thresholds: { L1: number; L2: number; L3: number };
  effectiveAbsences: number;
}
interface LogEntry {
  sessionId: number;
  sessionNumber: number | null;
  date: string;
  slot: number;
  status: string;
  swipeTime: string | null;
}
interface CourseStats {
  courseId: number;
  courseCode: string;
  courseName: string;
  courseType: string;
  credits: number;
  totalPlanned: number;
  totalConducted: number;
  present: number;
  absent: number;
  late: number;
  pLeave: number;
  percentage: number;
  penalty: PenaltyInfo;
  specialisation: string | null;
  log: LogEntry[];
}
interface TermInfo {
  id: string;
  number: number;
  name: string;
  isActive: boolean;
}
interface StudentData {
  student: {
    name: string;
    rollNumber: string;
    programme: string;
    batch: string;
    coreDivision: string | null;
    specialisation: string | null;
    specDivision: string | null;
    activeTerm: string | null;
    groups: string[];
  };
  courses: CourseStats[];
  terms: TermInfo[];
  selectedTermId: string | null;
}

function ProgressRing({
  percentage,
  size = 72,
}: {
  percentage: number;
  size?: number;
}) {
  const sw = 6,
    r = (size - sw) / 2,
    circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  const color =
    percentage >= 85 ? "#22c55e" : percentage >= 75 ? "#f58220" : "#ef4444";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={sw}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-bold"
        style={{ color, fontSize: size * 0.22 }}
      >
        {percentage}%
      </span>
    </div>
  );
}

export default function StudentDashboard() {
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  const fetchData = async (termId?: string | null) => {
    const url = termId
      ? `/api/dashboard/student?termId=${termId}`
      : "/api/dashboard/student";
    const res = await fetch(url);
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setSelectedTermId(d.selectedTermId);
    }
  };

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, []);

  const handleTermChange = async (termId: string) => {
    setSelectedTermId(termId);
    setExpandedCourse(null);
    await fetchData(termId);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={40} />
      </div>
    );
  }

  const coreCourses = data.courses.filter((c) => c.courseType === "core");
  const specCourses = data.courses.filter(
    (c) => c.courseType === "specialisation",
  );
  const minorCourses = data.courses.filter((c) => c.courseType === "minor");
  const electiveCourses = data.courses.filter(
    (c) => c.courseType === "elective",
  );
  const totalPresent = data.courses.reduce((s, c) => s + c.present, 0);
  const totalAbsent = data.courses.reduce((s, c) => s + c.absent, 0);
  const totalLate = data.courses.reduce((s, c) => s + c.late, 0);
  const totalSessions = data.courses.reduce((s, c) => s + c.totalConducted, 0);
  const overallPct =
    totalSessions > 0
      ? Math.round(((totalPresent + totalLate) / totalSessions) * 100)
      : 100;

  const statCards = [
    {
      label: "Overall",
      value: `${overallPct}%`,
      color:
        overallPct >= 85 ? "#22c55e" : overallPct >= 75 ? "#f58220" : "#ef4444",
      sub: `${totalPresent + totalLate}/${totalSessions}`,
    },
    { label: "Present", value: totalPresent, color: "#22c55e", sub: null },
    { label: "Late", value: totalLate, color: "#f58220", sub: null },
    { label: "Absent", value: totalAbsent, color: "#ef4444", sub: null },
  ];

  const courseGridClass =
    "grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,360px))] justify-start";

  return (
    <div className="relative z-[1]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">
          Welcome, {data.student.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {data.student.rollNumber} · {data.student.programme} · Div{" "}
          {data.student.coreDivision ?? "-"}
          {data.student.specialisation && (
            <>
              {" "}
              · {data.student.specialisation}
              {data.student.specDivision
                ? ` (${data.student.specDivision})`
                : ""}
            </>
          )}
        </p>
      </div>

      {/* Term Selector */}
      {data.terms.length > 0 && (
        <div className="flex gap-2 items-center mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            Term:
          </span>
          {data.terms.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTermChange(t.id.toString())}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer border transition-colors ${
                selectedTermId === t.id
                  ? "bg-[#531f75]/15 text-[#531f75] border-[#531f75]/30"
                  : "bg-[#f58220]/10 text-[#f58220] border-[#f58220]/20 hover:bg-[#f58220]/20"
              }`}
            >
              {t.name}
              {t.isActive ? " ●" : ""}
            </button>
          ))}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {statCards.map(({ label, value, color, sub }) => (
          <Card
            key={label}
            className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
          >
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-widest mb-2 text-[var(--color-text-muted)]">
                {label}
              </p>
              <p className="text-3xl font-bold" style={{ color }}>
                {value}
              </p>
              {sub && (
                <p className="text-xs mt-1 text-[var(--color-text-secondary)]">
                  {sub}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Core Courses */}
      {coreCourses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3 text-[var(--color-text-secondary)]">
            Core Courses
          </h2>
          <div className={courseGridClass}>
            {coreCourses.map((c, i) => (
              <CourseCard
                key={c.courseId}
                course={c}
                delay={i * 0.08}
                expanded={expandedCourse === c.courseId}
                onToggle={() =>
                  setExpandedCourse(
                    expandedCourse === c.courseId ? null : c.courseId,
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Spec Courses */}
      {specCourses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3 text-[var(--color-text-secondary)]">
            Specialisation Courses
          </h2>
          <div className={courseGridClass}>
            {specCourses.map((c, i) => (
              <CourseCard
                key={c.courseId}
                course={c}
                delay={(coreCourses.length + i) * 0.08}
                expanded={expandedCourse === c.courseId}
                onToggle={() =>
                  setExpandedCourse(
                    expandedCourse === c.courseId ? null : c.courseId,
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Minor Courses */}
      {minorCourses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3 text-[var(--color-text-secondary)]">
            Minor Courses
          </h2>
          <div className={courseGridClass}>
            {minorCourses.map((c, i) => (
              <CourseCard
                key={c.courseId}
                course={c}
                delay={(coreCourses.length + specCourses.length + i) * 0.08}
                expanded={expandedCourse === c.courseId}
                onToggle={() =>
                  setExpandedCourse(
                    expandedCourse === c.courseId ? null : c.courseId,
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Elective Courses */}
      {electiveCourses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3 text-[var(--color-text-secondary)]">
            Elective Courses
          </h2>
          <div className={courseGridClass}>
            {electiveCourses.map((c, i) => (
              <CourseCard
                key={c.courseId}
                course={c}
                delay={
                  (coreCourses.length +
                    specCourses.length +
                    minorCourses.length +
                    i) *
                  0.08
                }
                expanded={expandedCourse === c.courseId}
                onToggle={() =>
                  setExpandedCourse(
                    expandedCourse === c.courseId ? null : c.courseId,
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {data.courses.length === 0 && (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-sm">No courses for this term.</p>
        </div>
      )}

      {/* Penalty Reference */}
      <Card className="mt-4 bg-[var(--color-bg-card)] border-[var(--color-border)]">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">
            Absenteeism Penalty Reference &nbsp;·&nbsp;
            <span className="font-normal">2 Lates = 1 Effective Absence</span>
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--color-border)]">
                  <TableHead className="text-[var(--color-text-muted)]">
                    Credits
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    Sessions
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    L1 (1-level ↓)
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    L2 (2-level ↓)
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    L3 (F grade)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  [1, 9, 2, 4, 5],
                  [2, 18, 4, 6, 8],
                  [3, 26, 5, 6, 8],
                  [4, 35, 5, 7, 9],
                ].map(([credits, sessions, l1, l2, l3]) => (
                  <TableRow
                    key={credits}
                    className="border-[var(--color-border)]"
                  >
                    <TableCell className="text-[var(--color-text-primary)] font-medium">
                      {credits}
                    </TableCell>
                    <TableCell className="text-[var(--color-text-secondary)]">
                      {sessions}
                    </TableCell>
                    <TableCell className="text-[#f58220] font-medium">
                      {l1}
                    </TableCell>
                    <TableCell className="text-[#f58220] font-medium">
                      {l2}
                    </TableCell>
                    <TableCell className="text-red-500 font-medium">
                      {l3}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs mt-2 text-[var(--color-text-muted)]">
            L1 = 1-level downgrade (A+→A) · L2 = 1-letter downgrade (A→B) · L3 =
            F grade
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CourseCard({
  course,
  delay,
  expanded,
  onToggle,
}: {
  course: CourseStats;
  delay: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const p = course.penalty;
  const penaltyColor =
    p.level === "none" ? "#22c55e" : p.level === "L1" ? "#f58220" : "#ef4444";
  const penaltyVariantClass =
    p.level === "none"
      ? "text-green-500 border-green-500/30 bg-green-500/10"
      : p.level === "L1"
        ? "text-[#f58220] border-[#f58220]/30 bg-[#f58220]/10"
        : "text-red-500 border-red-500/30 bg-red-500/10";

  return (
    <Card
      className="w-full max-w-[360px] bg-[var(--color-bg-card)] border-[var(--color-border)]"
      style={{ animationDelay: `${delay}s` }}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                {course.courseCode}
              </span>
              <Badge
                variant="outline"
                className={
                  course.courseType === "core"
                    ? "text-green-500 border-green-500/30 bg-green-500/10 text-[10px]"
                    : "text-[#f58220] border-[#f58220]/30 bg-[#f58220]/10 text-[10px]"
                }
              >
                {course.courseType}
              </Badge>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {course.credits}cr
              </span>
            </div>
            <div className="text-xs mb-3 text-[var(--color-text-secondary)]">
              {course.courseName}
            </div>
            <Badge
              variant="outline"
              className={`${penaltyVariantClass} text-[11px]`}
            >
              {p.level === "none" ? "● No Penalty" : `⚠ ${p.label}`}
            </Badge>
          </div>
          <ProgressRing percentage={course.percentage} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "Present", value: course.present, color: "#22c55e" },
            { label: "Absent", value: course.absent, color: "#ef4444" },
            { label: "Late", value: course.late, color: "#f58220" },
            { label: "P# Leave", value: course.pLeave, color: "#8b5cf6" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-lg p-2 text-center bg-[var(--color-bg-secondary)]"
            >
              <div className="text-xl font-bold" style={{ color }}>
                {value}
              </div>
              <div className="text-[10px] mt-0.5 text-[var(--color-text-muted)]">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Penalty detail */}
        <div
          className="rounded-lg px-3 py-2 text-xs mb-2 bg-[var(--color-bg-secondary)]"
          style={{ color: penaltyColor }}
        >
          {p.level === "none"
            ? `${Math.max(0, p.thresholds.L1 - p.effectiveAbsences)} more eff. absences before L1 penalty`
            : p.description}
        </div>

        {/* Thresholds */}
        <div className="flex gap-3 text-[11px] mb-1 text-[var(--color-text-muted)]">
          <span>
            Eff. Absences:{" "}
            <strong className="text-[var(--color-text-primary)]">
              {p.effectiveAbsences}
            </strong>
          </span>
          <span className="flex-1" />
          <span
            className={
              p.effectiveAbsences >= p.thresholds.L1 ? "text-[#f58220]" : ""
            }
          >
            L1: {p.thresholds.L1}
          </span>
          <span
            className={
              p.effectiveAbsences >= p.thresholds.L2 ? "text-red-500" : ""
            }
          >
            L2: {p.thresholds.L2}
          </span>
          <span
            className={
              p.effectiveAbsences >= p.thresholds.L3 ? "text-red-500" : ""
            }
          >
            L3: {p.thresholds.L3}
          </span>
        </div>

        {/* Toggle log */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full mt-2 text-xs font-semibold text-[#8b5cf6] hover:text-[#531f75] hover:bg-[#531f75]/10"
        >
          {expanded ? (
            <>
              <ChevronUpIcon className="w-3.5 h-3.5 mr-1" /> Hide Log
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-3.5 h-3.5 mr-1" /> View Attendance
              Log
            </>
          )}
        </Button>

        {/* Log table */}
        {expanded && (
          <div className="mt-2 max-h-[280px] overflow-y-auto">
            {course.log.length === 0 ? (
              <p className="text-xs text-center py-4 text-[var(--color-text-muted)]">
                No sessions yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--color-border)]">
                    <TableHead className="text-[var(--color-text-muted)] text-xs">
                      Date
                    </TableHead>
                    <TableHead className="text-[var(--color-text-muted)] text-xs">
                      Slot
                    </TableHead>
                    <TableHead className="text-[var(--color-text-muted)] text-xs">
                      Status
                    </TableHead>
                    <TableHead className="text-[var(--color-text-muted)] text-xs">
                      Swipe
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {course.log.map((l) => (
                    <TableRow
                      key={l.sessionId}
                      className="border-[var(--color-border)]"
                    >
                      <TableCell className="text-[var(--color-text-primary)] text-xs py-2">
                        {l.date}
                      </TableCell>
                      <TableCell className="text-[var(--color-text-secondary)] text-xs py-2">
                        Slot {l.slot}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${
                            l.status === "P"
                              ? "text-green-500 border-green-500/30 bg-green-500/10"
                              : l.status === "AB"
                                ? "text-red-500 border-red-500/30 bg-red-500/10"
                                : "text-[#f58220] border-[#f58220]/30 bg-[#f58220]/10"
                          }`}
                        >
                          {l.status === "P"
                            ? "Present"
                            : l.status === "AB"
                              ? "Absent"
                              : l.status === "LT"
                                ? "Late"
                                : l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--color-text-muted)] text-xs py-2">
                        {l.swipeTime || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
