"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import {
  UsersIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CourseStat {
  courseId: string;
  courseCode: string;
  courseName: string;
  courseType: string;
  credits: number;
  totalSessions: number;
  avgAttendance: number;
  lowAttendanceStudents: Array<{
    name: string;
    rollNumber: string | null;
    percentage: number;
  }>;
}
interface DivisionSummary {
  divisionId: string;
  divisionName: string;
  type: string;
  batchId: string | null;
  studentCount: number;
  displayStudentCount?: number;
  totalSessions: number;
  courses: CourseStat[];
}
interface GroupSummary {
  groupId: string;
  groupName: string;
  type: string;
  batchId: string;
  allowedBatchIds?: string[];
  studentCount: number;
  displayStudentCount?: number;
  totalSessions: number;
  courses: CourseStat[];
}
interface ProgrammeSummary {
  programmeId: string;
  programmeName: string;
  programmeCode: string;
  batch: { id: string; name: string; activeTerm: string | null } | null;
  studentCount: number;
  divisions: DivisionSummary[];
}
interface SpecSummary {
  id: string;
  name: string;
  code: string;
  groups: GroupSummary[];
}
interface TrendPoint {
  date: string;
  avgPct: number;
}
interface AlertItem {
  name: string;
  rollNumber: string | null;
  percentage: number;
  courseCode: string;
  courseName: string;
  divisionOrGroup: string;
}

interface Term {
  id: string;
  name: string;
  batchId: string;
  batch?: { name: string; programme?: { code: string } };
}

export default function OfficeDashboard() {
  const [programmes, setProgrammes] = useState<ProgrammeSummary[]>([]);
  const [specialisations, setSpecialisations] = useState<SpecSummary[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertModal, setAlertModal] = useState<AlertItem[] | null>(null);

  // Filters
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedDivOrGroup, setSelectedDivOrGroup] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [availableTerms, setAvailableTerms] = useState<Term[]>([]);

  // Fetch dashboard (re-runs when termId changes)
  useEffect(() => {
    setLoading(true);
    const params = selectedTermId ? `?termId=${selectedTermId}` : "";
    fetch(`/api/dashboard/office${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProgrammes(data.programmes || []);
        setSpecialisations(data.specialisations || []);
        setAttendanceTrend(data.attendanceTrend || []);
      })
      .finally(() => setLoading(false));
  }, [selectedTermId]);

  // Fetch terms when batch changes
  useEffect(() => {
    const url = selectedBatchId
      ? `/api/admin/terms?batchId=${selectedBatchId}`
      : `/api/admin/terms`;
    fetch(url)
      .then((r) => r.json())
      .then((terms) => setAvailableTerms(terms))
      .catch(() => setAvailableTerms([]));
  }, [selectedBatchId]);

  // Track dark mode for chart tooltip colors (theme stored as data-theme attribute)
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={40} />
      </div>
    );
  }

  const filtered = programmes.filter(
    (p) => !selectedBatchId || p.batch?.id === selectedBatchId,
  );
  const filteredSpecs = specialisations
    .map((s) => ({
      ...s,
      groups: s.groups.filter(
        (g) => !selectedBatchId || (g.allowedBatchIds ?? [g.batchId]).includes(selectedBatchId),
      ),
    }))
    .filter((s) => s.groups.length > 0);

  const uniqueBatches = Array.from(
    new Map(programmes.filter((p) => p.batch).map((p) => [p.batch!.id, p.batch!])).values(),
  );

  // Division/Group filter helpers
  const divFilter = selectedDivOrGroup.startsWith("div_") ? selectedDivOrGroup.slice(4) : "";
  const grpFilter = selectedDivOrGroup.startsWith("grp_") ? selectedDivOrGroup.slice(4) : "";

  // Options for Division/Group dropdown (all, not filtered by sessions)
  const divOrGroupOptions = [
    ...filtered.flatMap((p) =>
      p.divisions.map((d) => ({
        value: `div_${d.divisionId}`,
        label: `${p.batch?.name ?? p.programmeCode} · Div ${d.divisionName}`,
      })),
    ),
    ...filteredSpecs.flatMap((s) =>
      s.groups.map((g) => ({ value: `grp_${g.groupId}`, label: `${s.code} · ${g.groupName}` })),
    ),
  ];

  // Options for Course dropdown (from selected div/grp)
  const selectedDivData = divFilter
    ? filtered.flatMap((p) => p.divisions).find((d) => d.divisionId === divFilter)
    : null;
  const selectedGrpData = grpFilter
    ? filteredSpecs.flatMap((s) => s.groups).find((g) => g.groupId === grpFilter)
    : null;
  const courseOptions = (selectedDivData?.courses ?? selectedGrpData?.courses ?? [])
    .map((c) => ({ value: c.courseId, label: `${c.courseCode} — ${c.courseName}` }));

  // KPI: total students — respects div/grp filter
  const selectedDivData2 = divFilter
    ? filtered.flatMap((p) => p.divisions).find((d) => d.divisionId === divFilter)
    : null;
  const selectedGrpData2 = grpFilter
    ? filteredSpecs.flatMap((s) => s.groups).find((g) => g.groupId === grpFilter)
    : null;
  const totalStudents = selectedDivData2
    ? selectedDivData2.studentCount
    : selectedGrpData2
    ? selectedGrpData2.studentCount
    : filtered.reduce((s, p) => s + (p.studentCount || 0), 0);

  const studentsSub = selectedDivData2
    ? `Div ${selectedDivData2.divisionName}`
    : selectedGrpData2
    ? selectedGrpData2.groupName
    : `${filtered.length} batch${filtered.length !== 1 ? "es" : ""}`;

  // KPI: total sessions — respects div/grp/course filter
  const totalSessions = selectedDivData2
    ? selectedCourseId
      ? (selectedDivData2.courses.find((c) => c.courseId === selectedCourseId)?.totalSessions ?? 0)
      : selectedDivData2.totalSessions
    : selectedGrpData2
    ? selectedCourseId
      ? (selectedGrpData2.courses.find((c) => c.courseId === selectedCourseId)?.totalSessions ?? 0)
      : selectedGrpData2.totalSessions
    : selectedCourseId
    ? filtered.flatMap((p) => p.divisions).flatMap((d) => d.courses).filter((c) => c.courseId === selectedCourseId).reduce((s, c) => s + c.totalSessions, 0)
    : filtered.reduce((s, p) => s + p.divisions.reduce((ds, d) => ds + d.totalSessions, 0), 0);

  // Build enriched alert list (respects all filters)
  const allAlerts: AlertItem[] = [
    ...(!grpFilter ? filtered.flatMap((p) =>
      p.divisions
        .filter((d) => !divFilter || d.divisionId === divFilter)
        .flatMap((d) =>
          d.courses
            .filter((c) => !selectedCourseId || c.courseId === selectedCourseId)
            .flatMap((c) =>
              c.lowAttendanceStudents.map((st) => ({
                ...st,
                courseCode: c.courseCode,
                courseName: c.courseName,
                divisionOrGroup: `Div ${d.divisionName}`,
              })),
            ),
        ),
    ) : []),
    ...(!divFilter ? filteredSpecs.flatMap((spec) =>
      spec.groups
        .filter((g) => !grpFilter || g.groupId === grpFilter)
        .flatMap((g) =>
          g.courses
            .filter((c) => !selectedCourseId || c.courseId === selectedCourseId)
            .flatMap((c) =>
              (c.lowAttendanceStudents ?? []).map((st) => ({
                ...st,
                courseCode: c.courseCode,
                courseName: c.courseName,
                divisionOrGroup: g.groupName,
              })),
            ),
        ),
    ) : []),
  ].sort((a, b) => a.percentage - b.percentage);

  // Format trend dates as "15 Mar"
  const trendData = attendanceTrend.map((t) => ({
    ...t,
    label: new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  // Sample data shown when real data is sparse
  const sampleTrend = [
    { label: "3 Jan", avgPct: 88 }, { label: "6 Jan", avgPct: 82 },
    { label: "7 Jan", avgPct: 91 }, { label: "8 Jan", avgPct: 76 },
    { label: "10 Jan", avgPct: 84 }, { label: "13 Jan", avgPct: 69 },
    { label: "14 Jan", avgPct: 78 }, { label: "15 Jan", avgPct: 85 },
    { label: "17 Jan", avgPct: 72 }, { label: "20 Jan", avgPct: 90 },
    { label: "21 Jan", avgPct: 87 }, { label: "22 Jan", avgPct: 65 },
  ];
  const showSample = trendData.length < 2;
  const chartData = showSample ? sampleTrend : trendData;

  const anyFilterActive = !!(selectedBatchId || selectedTermId || selectedDivOrGroup || selectedCourseId);

  const clearFilters = () => {
    setSelectedBatchId("");
    setSelectedTermId("");
    setSelectedDivOrGroup("");
    setSelectedCourseId("");
  };

  return (
    <div className="flex flex-col gap-5 relative z-[1]">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Programme Office Dashboard
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          Attendance health across batches and divisions
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <FilterSelect
          label="Batch"
          value={selectedBatchId || "all"}
          onChange={(v) => {
            setSelectedBatchId(v === "all" ? "" : v);
            setSelectedTermId("");
            setSelectedDivOrGroup("");
            setSelectedCourseId("");
          }}
          options={[
            { value: "all", label: "All batches" },
            ...uniqueBatches.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
        <FilterSelect
          label="Term"
          value={selectedTermId || "active"}
          onChange={(v) => {
            setSelectedTermId(v === "active" ? "" : v);
            setSelectedDivOrGroup("");
            setSelectedCourseId("");
          }}
          options={[
            { value: "active", label: "Active term" },
            ...availableTerms.map((t) => ({
              value: t.id,
              label: selectedBatchId
                ? t.name
                : `${t.batch?.name ?? ""} ${t.name}`.trim(),
            })),
          ]}
        />
        <FilterSelect
          label="Division / Group"
          value={selectedDivOrGroup || "all"}
          onChange={(v) => {
            setSelectedDivOrGroup(v === "all" ? "" : v);
            setSelectedCourseId("");
          }}
          options={[{ value: "all", label: "All" }, ...divOrGroupOptions]}
          disabled={divOrGroupOptions.length === 0}
        />
        <FilterSelect
          label="Course"
          value={selectedCourseId || "all"}
          onChange={(v) => setSelectedCourseId(v === "all" ? "" : v)}
          options={[{ value: "all", label: "All courses" }, ...courseOptions]}
          disabled={courseOptions.length === 0}
        />
        {anyFilterActive && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-[#f58220] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Students", value: totalStudents, sub: studentsSub, Icon: UsersIcon, danger: false },
          { label: "Sessions Conducted", value: totalSessions, sub: selectedCourseId ? courseOptions.find(o => o.value === selectedCourseId)?.label.split(" — ")[0] ?? null : null, Icon: CalendarDaysIcon, danger: false },
          { label: "Low Attendance Alerts", value: allAlerts.length, sub: "< 75% threshold", Icon: ExclamationTriangleIcon, danger: allAlerts.length > 0 },
        ].map(({ label, value, sub, Icon, danger }) => (
          <Card key={label} className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-red-500/10 text-red-500" : "bg-[#531f75]/10 text-[#531f75]"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">{label}</p>
                <p className={`text-2xl font-bold leading-tight ${danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}>{value}</p>
                {sub && <p className="text-xs text-[var(--color-text-secondary)]">{sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main two-column layout ── */}
      <div className="grid grid-cols-[1fr_320px] gap-4 items-start">

        {/* ── Left: trend chart + course breakdown ── */}
        <div className="space-y-4">

          {/* Attendance trend */}
          <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Attendance Trend
                </CardTitle>
                {showSample && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f58220]/10 text-[#f58220] border border-[#f58220]/20">
                    Sample preview — populates as sessions are conducted
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#531f75" stopOpacity={showSample ? 0.15 : 0.35} />
                      <stop offset="95%" stopColor="#531f75" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--color-text-primary)",
                    }}
                    labelStyle={{ color: "var(--color-text-secondary)", fontSize: 11 }}
                    itemStyle={{ color: isDark ? "#f58220" : "#531f75", fontWeight: 600 }}
                    formatter={(v) => [`${v}%`, showSample ? "Sample" : "Avg Attendance"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgPct"
                    stroke={showSample ? "#531f7566" : "#531f75"}
                    strokeWidth={2}
                    strokeDasharray={showSample ? "6 3" : undefined}
                    fill="url(#trendGrad)"
                    dot={showSample ? false : { fill: "#531f75", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Course breakdown: compact progress bars per division */}
          <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Course Attendance by Division
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-6">
              {filtered.length === 0 && filteredSpecs.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)] italic">No data for the selected filter.</p>
              )}
              {!grpFilter && filtered.map((prog) =>
                prog.divisions
                  .filter((div) => div.totalSessions > 0 || divFilter === div.divisionId)
                  .filter((div) => !divFilter || div.divisionId === divFilter)
                  .map((div) => {
                    const activeCourses = div.courses
                      .filter((c) => c.totalSessions > 0)
                      .filter((c) => !selectedCourseId || c.courseId === selectedCourseId);
                    return (
                      <DivisionBlock
                        key={div.divisionId}
                        label={`${prog.programmeCode} — Division ${div.divisionName}`}
                        sub={`${div.displayStudentCount ?? div.studentCount} students · ${div.totalSessions} sessions`}
                        badge={prog.batch?.activeTerm ?? undefined}
                        courses={activeCourses}
                        onAlert={(c) => setAlertModal(
                          c.lowAttendanceStudents.map((st) => ({
                            ...st, courseCode: c.courseCode, courseName: c.courseName, divisionOrGroup: `Div ${div.divisionName}`,
                          }))
                        )}
                      />
                    );
                  })
              )}
              {!divFilter && filteredSpecs.map((spec) =>
                spec.groups
                  .filter((grp) => grp.totalSessions > 0 || grpFilter === grp.groupId)
                  .filter((grp) => !grpFilter || grp.groupId === grpFilter)
                  .map((grp) => {
                    const activeCourses = grp.courses
                      .filter((c) => c.totalSessions > 0)
                      .filter((c) => !selectedCourseId || c.courseId === selectedCourseId);
                    return (
                      <DivisionBlock
                        key={grp.groupId}
                        label={`${spec.code} — ${grp.groupName}`}
                        sub={`${grp.displayStudentCount ?? grp.studentCount} students · ${grp.totalSessions} sessions`}
                        courses={activeCourses}
                        onAlert={(c) => setAlertModal(
                          (c.lowAttendanceStudents ?? []).map((st) => ({
                            ...st, courseCode: c.courseCode, courseName: c.courseName, divisionOrGroup: grp.groupName,
                          }))
                        )}
                      />
                    );
                  })
              )}
              {(!grpFilter && !divFilter) &&
               filtered.every((p) => p.divisions.every((d) => d.totalSessions === 0)) &&
               filteredSpecs.every((s) => s.groups.every((g) => g.totalSessions === 0)) && (
                <p className="text-sm text-[var(--color-text-muted)] italic">No sessions conducted yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: alerts panel ── */}
        <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)] sticky top-4">
          <CardHeader className="px-4 pt-4 pb-2 border-b border-[var(--color-border)]">
            <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
              Low Attendance
              {allAlerts.length > 0 && (
                <Badge variant="outline" className="ml-auto text-red-500 border-red-500/30 bg-red-500/10 text-xs">
                  {allAlerts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {allAlerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)] italic">
                No alerts — all students above 75%
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[calc(100vh-16rem)]">
                {allAlerts.map((st, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-card-hover)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate text-[var(--color-text-primary)]">{st.name}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                        {st.rollNumber} · {st.courseCode} · {st.divisionOrGroup}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-xs text-red-500 border-red-500/30 bg-red-500/10"
                    >
                      {st.percentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Alert drill-down modal ── */}
      <Modal
        open={!!alertModal}
        onClose={() => setAlertModal(null)}
        title="Low Attendance — Student Detail"
        maxWidth="max-w-lg"
        footer={
          <Button variant="outline" size="sm" onClick={() => setAlertModal(null)}>Close</Button>
        }
      >
        {alertModal && (
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--color-border)]">
                <TableHead className="text-[var(--color-text-muted)]">Roll No.</TableHead>
                <TableHead className="text-[var(--color-text-muted)]">Name</TableHead>
                <TableHead className="text-[var(--color-text-muted)]">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertModal.map((st, i) => (
                <TableRow key={i} className="border-[var(--color-border)]">
                  <TableCell className="font-medium text-[var(--color-text-primary)]">{st.rollNumber}</TableCell>
                  <TableCell className="text-[var(--color-text-secondary)]">{st.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10">
                      {st.percentage}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Modal>
    </div>
  );
}

function DivisionBlock({
  label,
  sub,
  badge,
  courses,
  onAlert,
}: {
  label: string;
  sub: string;
  badge?: string;
  courses: CourseStat[];
  onAlert: (c: CourseStat) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">{label}</span>
          <span className="text-[10px] text-[var(--color-text-muted)] ml-2">{sub}</span>
        </div>
        {badge && (
          <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
            {badge}
          </Badge>
        )}
      </div>
      {courses.length === 0 ? (
        <p className="text-[11px] text-[var(--color-text-muted)] italic pl-1">No sessions yet.</p>
      ) : (
        <div className="space-y-1.5">
          {courses.map((c) => (
            <CourseBar key={c.courseId} course={c} onAlert={() => onAlert(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseBar({ course, onAlert }: { course: CourseStat; onAlert: () => void }) {
  const pct = course.avgAttendance;
  const barColor = pct >= 85 ? "#22c55e" : pct >= 75 ? "#f58220" : "#ef4444";
  const alerts = course.lowAttendanceStudents.length;

  return (
    <div className="flex items-center gap-3 group">
      <div className="w-28 shrink-0">
        <div className="text-[11px] font-medium text-[var(--color-text-primary)] truncate" title={course.courseName}>
          {course.courseCode}
        </div>
        <div className="text-[9px] text-[var(--color-text-muted)] truncate">{course.courseName}</div>
      </div>
      <div className="flex-1 h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
        />
      </div>
      <span className="text-[11px] font-semibold w-9 text-right shrink-0" style={{ color: barColor }}>
        {pct}%
      </span>
      <span className="text-[10px] text-[var(--color-text-muted)] w-14 shrink-0 text-right">
        {course.totalSessions} session{course.totalSessions !== 1 ? "s" : ""}
      </span>
      {alerts > 0 ? (
        <button
          onClick={onAlert}
          className="text-[10px] font-semibold text-red-500 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded hover:bg-red-500/20 transition-colors shrink-0 w-14 text-center"
        >
          {alerts} alert{alerts !== 1 ? "s" : ""}
        </button>
      ) : (
        <span className="text-[10px] text-green-500 w-14 text-center shrink-0">✓ clear</span>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] shrink-0">
        {label}:
      </span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-7 text-xs min-w-[140px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
