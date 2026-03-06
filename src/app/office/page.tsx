"use client";

import { useEffect, useState, useCallback } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface DivisionSummary {
  divisionId: number; divisionName: string; divisionType: string; batchId: number | null;
  studentCount: number; studentCountByBatch?: Record<number, number>; displayStudentCount?: number; totalSessions: number;
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

export default function OfficeDashboard() {
  const [programmes, setProgrammes]       = useState<ProgrammeSummary[]>([]);
  const [specialisations, setSpecialisations] = useState<SpecSummary[]>([]);
  const [recentSessions, setRecentSessions]   = useState<RecentSession[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [lowModal, setLowModal] = useState<{ courseName: string; students: DivisionSummary["courses"][0]["lowAttendanceStudents"] } | null>(null);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard/office");
    if (res.ok) {
      const data = await res.json();
      setProgrammes(data.programmes);
      setSpecialisations(data.specialisations || []);
      setRecentSessions(data.recentSessions);
    }
  }, []);

  useEffect(() => { fetchDashboard().then(() => setLoading(false)); }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={40} />
      </div>
    );
  }

  // Filter by selected batch
  const filtered = programmes.filter(p => !selectedBatchId || p.batch?.id.toString() === selectedBatchId);

  // Filter spec divisions by the selected batch id safely using the new mixed-cohort batchesInvolved array
  const filteredSpecs = specialisations.map(spec => ({
    ...spec,
    divisions: spec.divisions
      .filter((d: any) => !selectedBatchId || (d.batchesInvolved && d.batchesInvolved.includes(Number(selectedBatchId))))
      .map((d: any) => ({ ...d, displayStudentCount: selectedBatchId && d.studentCountByBatch ? d.studentCountByBatch[Number(selectedBatchId)] || 0 : d.studentCount })),
  })).filter(spec => spec.divisions.length > 0);

  const totalStudents = filtered.reduce((s, p) => s + (p.studentCount || 0), 0);
  const totalSessions = filtered.reduce((s, p) => s + p.divisions.reduce((ds, d) => ds + d.totalSessions, 0), 0);
  const allLow        = filtered.flatMap(p => p.divisions.flatMap(d => d.courses.flatMap(c => c.lowAttendanceStudents)));

  const uniqueBatches = Array.from(
    new Map(programmes.filter(p => p.batch).map(p => [p.batch!.id, p.batch!])).values()
  );

  return (
    <div className="relative z-[1]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">Programme Office Dashboard</h1>
          <p className="text-base text-[var(--color-text-secondary)]">Overview of attendance, sessions, and programme health</p>
        </div>
        {uniqueBatches.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">Batch:</span>
            <select
              className="tw-input min-w-[200px] px-3 py-2"
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
            >
              <option value="">All Active Batches</option>
              {uniqueBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 mb-8 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {[
          { label: "Total Students",         value: totalStudents,  sub: `Across ${filtered.length} batch${filtered.length !== 1 ? "es" : ""}` },
          { label: "Sessions Conducted",     value: totalSessions,  sub: null },
          { label: "Low Attendance Alerts",  value: allLow.length,  sub: null, danger: allLow.length > 0 },
        ].map(({ label, value, sub, danger }) => (
          <Card key={label} padding="p-5" className="transition-all hover:-translate-y-0.5">
            <div className="text-xs uppercase tracking-widest mb-2 text-[var(--color-text-muted)]">{label}</div>
            <div className={`text-3xl font-bold ${danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}>{value}</div>
            {sub && <div className="text-xs mt-1 text-[var(--color-text-secondary)]">{sub}</div>}
          </Card>
        ))}
      </div>

      {/* Core Divisions per Programme */}
      {filtered.map((prog, pi) => (
        <div key={`${prog.programmeId}-${prog.batch?.id}`} className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {prog.programmeName}{" "}
              <span className="text-sm text-[var(--color-accent-sec)]">({prog.programmeCode})</span>
              {" "}— Core Divisions
            </h2>
            {prog.batch && <span className="badge-success">{prog.batch.name} · {prog.batch.activeTerm || "No active term"}</span>}
          </div>
          {prog.divisions.map((div, di) => (
            <DivisionCard key={div.divisionId} div={div} delay={(pi * 2 + di) * 0.1} onViewLowAttendance={setLowModal} />
          ))}
        </div>
      ))}

      {/* Specialisation Divisions (Grid View) */}
      {filteredSpecs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Specialisation Divisions</h2>
          </div>
          <div className="space-y-8">
            {filteredSpecs.map((spec, si) => (
              <div key={spec.id} className="mb-4">
                <h3 className="text-base font-semibold mb-4 border-b border-[var(--color-border)] pb-2">
                  <span className="text-[var(--color-text-primary)]">{spec.name}</span>{" "}
                  <span className="text-sm text-[var(--color-accent-sec)]">({spec.code})</span>
                </h3>
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                  {spec.divisions.map((div, di) => (
                    <CompactDivisionCard key={div.divisionId} div={div} delay={(si * 2 + di) * 0.1} onViewLowAttendance={setLowModal} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Recent Sessions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="tw-table">
              <thead><tr><th>Date</th><th>Slot</th><th>Course</th><th>Division</th><th>Type</th><th>Records</th></tr></thead>
              <tbody>
                {recentSessions.map(s => (
                  <tr key={s.id}>
                    <td className="text-[var(--color-text-primary)]">{s.date}</td>
                    <td className="text-[var(--color-text-secondary)]">Slot {s.slot}</td>
                    <td><strong className="text-[var(--color-text-primary)]">{s.course}</strong></td>
                    <td className="text-[var(--color-text-secondary)]">{s.division}</td>
                    <td><span className={s.divisionType === "core" ? "badge-success" : "badge-warning"}>{s.divisionType}</span></td>
                    <td className="text-[var(--color-text-secondary)]">{s.attendanceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Low Attendance Modal */}
      <Modal
        open={!!lowModal}
        onClose={() => setLowModal(null)}
        title="Low Attendance Alerts"
        maxWidth="max-w-lg"
        footer={
          <Button variant="secondary" size="md" onClick={() => setLowModal(null)}>
            Close
          </Button>
        }
      >
        {lowModal && (
          <>
            <p className="text-sm mb-4 text-[var(--color-text-muted)]">{lowModal.courseName}</p>
            <table className="tw-table">
              <thead><tr><th>Roll Number</th><th>Name</th><th>Attendance %</th></tr></thead>
              <tbody>
                {lowModal.students.map((st, i) => (
                  <tr key={i}>
                    <td className="font-medium text-[var(--color-text-primary)]">{st.rollNumber}</td>
                    <td className="text-[var(--color-text-secondary)]">{st.name}</td>
                    <td><span className={st.percentage >= 75 ? "badge-warning" : "badge-danger"}>{st.percentage}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Modal>
    </div>
  );
}

function DivisionCard({ div, delay, onViewLowAttendance }: {
  div: DivisionSummary; delay: number;
  onViewLowAttendance: (data: { courseName: string; students: DivisionSummary["courses"][0]["lowAttendanceStudents"] }) => void;
}) {
  return (
    <Card padding="p-6" className="mb-5" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">Division {div.divisionName}</div>
          <div className="text-sm text-[var(--color-text-muted)]">{div.displayStudentCount ?? div.studentCount} students · {div.totalSessions} sessions</div>
        </div>
      </div>
      {div.courses.some(c => c.totalSessions > 0) ? (
        <div className="overflow-x-auto">
          <table className="tw-table">
            <thead>
              <tr><th>Course</th><th>Type</th><th>Credits</th><th>Sessions</th><th>Avg Attendance</th><th>Alerts (&lt;75%)</th></tr>
            </thead>
            <tbody>
              {div.courses.filter(c => c.totalSessions > 0).map(course => (
                <tr key={course.courseId}>
                  <td>
                    <strong className="text-[var(--color-text-primary)]">{course.courseCode}</strong>
                    <br /><span className="text-xs text-[var(--color-text-muted)]">{course.courseName}</span>
                  </td>
                  <td><span className={course.courseType === "core" ? "badge-success" : "badge-warning"}>{course.courseType}</span></td>
                  <td className="text-[var(--color-text-secondary)]">{course.credits}</td>
                  <td className="text-[var(--color-text-secondary)]">{course.totalSessions}</td>
                  <td>
                    <span className={course.avgAttendance >= 85 ? "badge-success" : course.avgAttendance >= 75 ? "badge-warning" : "badge-danger"}>
                      {course.avgAttendance}%
                    </span>
                  </td>
                  <td>
                    {course.lowAttendanceStudents.length === 0
                      ? <span className="text-sm text-[var(--color-text-muted)]">None</span>
                      : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onViewLowAttendance({ courseName: course.courseName, students: course.lowAttendanceStudents })}
                        >
                          {course.lowAttendanceStudents.length} Students
                        </Button>
                      )
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-sm text-[var(--color-text-muted)] py-2">No sessions yet.</p>}
    </Card>
  );
}

function CompactDivisionCard({ div, delay, onViewLowAttendance }: {
  div: DivisionSummary; delay: number;
  onViewLowAttendance: (data: { courseName: string; students: DivisionSummary["courses"][0]["lowAttendanceStudents"] }) => void;
}) {
  return (
    <Card padding="p-5" className="transition-all hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${delay}s` }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">{div.divisionName}</div>
          <div className="text-xs font-semibold uppercase tracking-wider mt-1 text-[var(--color-accent-sec)]">Division</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[var(--color-text-primary)]">{div.displayStudentCount ?? div.studentCount}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Students</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-[var(--color-bg-secondary)]">
        <div className="text-sm font-medium text-[var(--color-text-secondary)]">Sessions Conducted</div>
        <div className="text-base font-bold text-[var(--color-text-primary)]">{div.totalSessions}</div>
      </div>

      <div className="space-y-3 mt-4">
        {div.courses.slice(0, 3).map(c => {
          const hasAlerts = c.lowAttendanceStudents.length > 0;
          return (
           <div key={c.courseId} className="flex justify-between items-center text-sm border-t border-[var(--color-border)] pt-3">
             <span className="truncate font-medium pr-2 max-w-[120px] text-[var(--color-text-primary)]" title={c.courseName}>{c.courseCode}</span>
             <div className="flex items-center gap-3">
               <span className={`font-bold ${c.avgAttendance >= 85 ? 'text-green-500' : c.avgAttendance >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>{c.avgAttendance}%</span>
               {hasAlerts && (
                 <button
                    onClick={() => onViewLowAttendance({ courseName: c.courseName, students: c.lowAttendanceStudents })}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    title={`${c.lowAttendanceStudents.length} Students below 75%`}
                 >
                   !
                 </button>
               )}
             </div>
           </div>
          )
        })}
        {div.courses.length === 0 && (
          <div className="text-xs text-center italic py-2 text-[var(--color-text-muted)]">No active courses</div>
        )}
      </div>
    </Card>
  )
}
