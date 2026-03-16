"use client";

import { useEffect, useState, useCallback } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Modal } from "@/components/ui/modal";
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
import {
  UsersIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

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
interface RecentSession {
  id: string;
  date: string;
  slot: number;
  course: string;
  courseName: string;
  division: string;
  divisionType: string;
  programme: string;
  attendanceCount: number;
}

export default function OfficeDashboard() {
  const [programmes, setProgrammes] = useState<ProgrammeSummary[]>([]);
  const [specialisations, setSpecialisations] = useState<SpecSummary[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [lowModal, setLowModal] = useState<{
    courseName: string;
    students: CourseStat["lowAttendanceStudents"];
  } | null>(null);

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
    fetchDashboard().then(() => setLoading(false));
  }, [fetchDashboard]);

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
    .map((spec) => ({
      ...spec,
      groups: spec.groups.filter(
        (g) =>
          !selectedBatchId ||
          (g.allowedBatchIds ?? [g.batchId]).includes(selectedBatchId),
      ),
    }))
    .filter((spec) => spec.groups.length > 0);

  const totalStudents = filtered.reduce((s, p) => s + (p.studentCount || 0), 0);
  const totalSessions = filtered.reduce(
    (s, p) => s + p.divisions.reduce((ds, d) => ds + d.totalSessions, 0),
    0,
  );
  const allLow = filtered.flatMap((p) =>
    p.divisions.flatMap((d) =>
      d.courses.flatMap((c) => c.lowAttendanceStudents),
    ),
  );

  const uniqueBatches = Array.from(
    new Map(
      programmes.filter((p) => p.batch).map((p) => [p.batch!.id, p.batch!]),
    ).values(),
  );

  const statCards = [
    {
      label: "Total Students",
      value: totalStudents,
      sub: `Across ${filtered.length} batch${filtered.length !== 1 ? "es" : ""}`,
      Icon: UsersIcon,
      danger: false,
    },
    {
      label: "Sessions Conducted",
      value: totalSessions,
      sub: null,
      Icon: CalendarDaysIcon,
      danger: false,
    },
    {
      label: "Low Attendance Alerts",
      value: allLow.length,
      sub: null,
      Icon: ExclamationTriangleIcon,
      danger: allLow.length > 0,
    },
  ];

  return (
    <div className="relative z-[1]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">
            Programme Office Dashboard
          </h1>
          <p className="text-base text-[var(--color-text-secondary)]">
            Overview of attendance, sessions, and programme health
          </p>
        </div>
        {uniqueBatches.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              Batch:
            </span>
            <Select
              value={selectedBatchId || "all"}
              onValueChange={(v: string) =>
                setSelectedBatchId(v === "all" ? "" : v)
              }
            >
              <SelectTrigger className="min-w-[200px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                <SelectValue placeholder="All Active Batches" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                <SelectItem value="all">All Active Batches</SelectItem>
                {uniqueBatches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 mb-8 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {statCards.map(({ label, value, sub, Icon, danger }) => (
          <Card
            key={label}
            className="transition-all hover:-translate-y-0.5 bg-[var(--color-bg-card)] border-[var(--color-border)]"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
                  {label}
                </p>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${danger ? "bg-red-500/10 text-red-500" : "bg-[#531f75]/10 text-[#531f75]"}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p
                className={`text-3xl font-bold ${danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}
              >
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

      {/* Core Divisions per Programme */}
      {filtered.map((prog, pi) => (
        <div key={`${prog.programmeId}-${prog.batch?.id}`} className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {prog.programmeName}{" "}
              <span className="text-sm text-[#8b5cf6]">
                ({prog.programmeCode})
              </span>{" "}
              — Core Divisions
            </h2>
            {prog.batch && (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-500 border-green-500/20"
              >
                {prog.batch.name} · {prog.batch.activeTerm || "No active term"}
              </Badge>
            )}
          </div>
          {prog.divisions.map((div, di) => (
            <DivisionCard
              key={div.divisionId}
              div={div}
              delay={(pi * 2 + di) * 0.1}
              onViewLowAttendance={setLowModal}
            />
          ))}
        </div>
      ))}

      {/* Specialisation Groups */}
      {filteredSpecs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              Specialisation Groups
            </h2>
          </div>
          <div className="space-y-8">
            {filteredSpecs.map((spec, si) => (
              <div key={spec.id} className="mb-4">
                <h3 className="text-base font-semibold mb-4 border-b border-[var(--color-border)] pb-2">
                  <span className="text-[var(--color-text-primary)]">
                    {spec.name}
                  </span>{" "}
                  <span className="text-sm text-[#8b5cf6]">({spec.code})</span>
                </h3>
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                  {spec.groups.map((grp, gi) => (
                    <CompactGroupCard
                      key={grp.groupId}
                      grp={grp}
                      delay={(si * 2 + gi) * 0.1}
                      onViewLowAttendance={setLowModal}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card className="overflow-hidden bg-[var(--color-bg-card)] border-[var(--color-border)]">
          <CardHeader className="px-5 py-4 border-b border-[var(--color-border)]">
            <CardTitle className="text-base font-semibold text-[var(--color-text-primary)]">
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--color-border)]">
                    <TableHead className="text-[var(--color-text-muted)]">
                      Date
                    </TableHead>
                    <TableHead className="text-[var(--color-text-muted)]">
                      Slot
                    </TableHead>
                    <TableHead className="text-[var(--color-text-muted)]">
                      Course
                    </TableHead>
                    <TableHead className="text-[var(--color-text-muted)]">
                      Division
                    </TableHead>
                    <TableHead className="text-[var(--color-text-muted)]">
                      Type
                    </TableHead>
                    <TableHead className="text-[var(--color-text-muted)]">
                      Records
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map((s) => (
                    <TableRow
                      key={s.id}
                      className="border-[var(--color-border)] hover:bg-[var(--color-bg-card-hover)]"
                    >
                      <TableCell className="text-[var(--color-text-primary)] font-medium">
                        {s.date}
                      </TableCell>
                      <TableCell className="text-[var(--color-text-secondary)]">
                        Slot {s.slot}
                      </TableCell>
                      <TableCell>
                        <strong className="text-[var(--color-text-primary)]">
                          {s.course}
                        </strong>
                      </TableCell>
                      <TableCell className="text-[var(--color-text-secondary)]">
                        {s.division}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            s.divisionType === "core"
                              ? "text-green-500 border-green-500/30 bg-green-500/10"
                              : "text-[#f58220] border-[#f58220]/30 bg-[#f58220]/10"
                          }
                        >
                          {s.divisionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--color-text-secondary)]">
                        {s.attendanceCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Attendance Modal */}
      <Modal
        open={!!lowModal}
        onClose={() => setLowModal(null)}
        title="Low Attendance Alerts"
        maxWidth="max-w-lg"
        footer={
          <Button variant="outline" size="sm" onClick={() => setLowModal(null)}>
            Close
          </Button>
        }
      >
        {lowModal && (
          <>
            <p className="text-sm mb-4 text-[var(--color-text-muted)]">
              {lowModal.courseName}
            </p>
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--color-border)]">
                  <TableHead className="text-[var(--color-text-muted)]">
                    Roll Number
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    Name
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    Attendance %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowModal.students.map((st, i) => (
                  <TableRow key={i} className="border-[var(--color-border)]">
                    <TableCell className="font-medium text-[var(--color-text-primary)]">
                      {st.rollNumber}
                    </TableCell>
                    <TableCell className="text-[var(--color-text-secondary)]">
                      {st.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          st.percentage >= 75
                            ? "text-[#f58220] border-[#f58220]/30 bg-[#f58220]/10"
                            : "text-red-500 border-red-500/30 bg-red-500/10"
                        }
                      >
                        {st.percentage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Modal>
    </div>
  );
}

function DivisionCard({
  div,
  delay,
  onViewLowAttendance,
}: {
  div: DivisionSummary;
  delay: number;
  onViewLowAttendance: (data: {
    courseName: string;
    students: CourseStat["lowAttendanceStudents"];
  }) => void;
}) {
  return (
    <Card
      className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]"
      style={{ animationDelay: `${delay}s` }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold text-[var(--color-text-primary)]">
              Division {div.divisionName}
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">
              {div.displayStudentCount ?? div.studentCount} students ·{" "}
              {div.totalSessions} sessions
            </div>
          </div>
        </div>
        {div.courses.some((c) => c.totalSessions > 0) ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--color-border)]">
                  <TableHead className="text-[var(--color-text-muted)]">
                    Course
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    Type
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    Credits
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    Sessions
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    Avg Attendance
                  </TableHead>
                  <TableHead className="text-[var(--color-text-muted)]">
                    Alerts (&lt;75%)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {div.courses
                  .filter((c) => c.totalSessions > 0)
                  .map((course) => (
                    <TableRow
                      key={course.courseId}
                      className="border-[var(--color-border)] hover:bg-[var(--color-bg-card-hover)]"
                    >
                      <TableCell>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {course.courseCode}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {course.courseName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            course.courseType === "core"
                              ? "text-green-500 border-green-500/30 bg-green-500/10"
                              : "text-[#f58220] border-[#f58220]/30 bg-[#f58220]/10"
                          }
                        >
                          {course.courseType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--color-text-secondary)]">
                        {course.credits}
                      </TableCell>
                      <TableCell className="text-[var(--color-text-secondary)]">
                        {course.totalSessions}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            course.avgAttendance >= 85
                              ? "text-green-500 border-green-500/30 bg-green-500/10"
                              : course.avgAttendance >= 75
                                ? "text-[#f58220] border-[#f58220]/30 bg-[#f58220]/10"
                                : "text-red-500 border-red-500/30 bg-red-500/10"
                          }
                        >
                          {course.avgAttendance}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {course.lowAttendanceStudents.length === 0 ? (
                          <span className="text-sm text-[var(--color-text-muted)]">
                            None
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                            onClick={() =>
                              onViewLowAttendance({
                                courseName: course.courseName,
                                students: course.lowAttendanceStudents,
                              })
                            }
                          >
                            {course.lowAttendanceStudents.length} Students
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] py-2">
            No sessions yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CompactGroupCard({
  grp,
  delay,
  onViewLowAttendance,
}: {
  grp: GroupSummary;
  delay: number;
  onViewLowAttendance: (data: {
    courseName: string;
    students: CourseStat["lowAttendanceStudents"];
  }) => void;
}) {
  return (
    <Card
      className="transition-all hover:-translate-y-1 bg-[var(--color-bg-card)] border-[var(--color-border)]"
      style={{ animationDelay: `${delay}s` }}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {grp.groupName}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider mt-1 text-[#8b5cf6]">
              Group
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[var(--color-text-primary)]">
              {grp.displayStudentCount ?? grp.studentCount}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              Students
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-[var(--color-bg-secondary)]">
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">
            Sessions Conducted
          </div>
          <div className="text-base font-bold text-[var(--color-text-primary)]">
            {grp.totalSessions}
          </div>
        </div>

        <div className="space-y-3 mt-4">
          {grp.courses.slice(0, 3).map((c) => {
            const hasAlerts = (c.lowAttendanceStudents?.length ?? 0) > 0;
            return (
              <div
                key={c.courseId}
                className="flex justify-between items-center text-sm border-t border-[var(--color-border)] pt-3"
              >
                <span
                  className="truncate font-medium pr-2 max-w-[120px] text-[var(--color-text-primary)]"
                  title={c.courseName}
                >
                  {c.courseCode}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold text-sm ${c.avgAttendance >= 85 ? "text-green-500" : c.avgAttendance >= 75 ? "text-[#f58220]" : "text-red-500"}`}
                  >
                    {c.avgAttendance}%
                  </span>
                  {hasAlerts && (
                    <button
                      onClick={() =>
                        onViewLowAttendance({
                          courseName: c.courseName,
                          students: c.lowAttendanceStudents ?? [],
                        })
                      }
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      title={`${c.lowAttendanceStudents?.length ?? 0} Students below 75%`}
                    >
                      !
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {grp.courses.length === 0 && (
            <div className="text-xs text-center italic py-2 text-[var(--color-text-muted)]">
              No active courses
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
