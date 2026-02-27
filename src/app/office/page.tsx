"use client";

import { useEffect, useState, useCallback } from "react";

interface DivisionSummary {
  divisionId: number; divisionName: string; divisionType: string; batchId: number | null;
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
      if (data.programmes.length > 0 && !selectedBatchId) {
        const first = data.programmes.find((p: ProgrammeSummary) => p.batch)?.batch;
        if (first) setSelectedBatchId(first.id.toString());
      }
    }
  }, [selectedBatchId]);

  useEffect(() => { fetchDashboard().then(() => setLoading(false)); }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="rounded-full border-2 border-t-white animate-spin" style={{ width: 40, height: 40, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
      </div>
    );
  }

  // Filter by selected batch
  const filtered = programmes.filter(p => !selectedBatchId || p.batch?.id.toString() === selectedBatchId);

  // Filter spec divisions by the selected batch id
  const filteredSpecs = specialisations.map(spec => ({
    ...spec,
    divisions: spec.divisions.filter(d => !selectedBatchId || d.batchId?.toString() === selectedBatchId),
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
          <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>Programme Office Dashboard</h1>
          <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>Overview of attendance, sessions, and programme health</p>
        </div>
        {uniqueBatches.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Batch:</span>
            <select
              className="tw-input"
              style={{ minWidth: 200, padding: "8px 12px" }}
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
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        {[
          { label: "Total Students",         value: totalStudents,  sub: `Across ${filtered.length} batch${filtered.length !== 1 ? "es" : ""}` },
          { label: "Sessions Conducted",     value: totalSessions,  sub: null },
          { label: "Low Attendance Alerts",  value: allLow.length,  sub: null, danger: allLow.length > 0 },
        ].map(({ label, value, sub, danger }) => (
          <div key={label} className="rounded-2xl p-5 border transition-all hover:-translate-y-0.5"
            style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>{label}</div>
            <div className="text-3xl font-bold" style={{ color: danger ? "var(--color-danger)" : "var(--color-text-primary)" }}>{value}</div>
            {sub && <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Core Divisions per Programme */}
      {filtered.map((prog, pi) => (
        <div key={`${prog.programmeId}-${prog.batch?.id}`} className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {prog.programmeName}{" "}
              <span className="text-sm" style={{ color: "var(--color-accent-sec)" }}>({prog.programmeCode})</span>
              {" "}— Core Divisions
            </h2>
            {prog.batch && <span className="badge-success">{prog.batch.name} · {prog.batch.activeTerm || "No active term"}</span>}
          </div>
          {prog.divisions.map((div, di) => (
            <DivisionCard key={div.divisionId} div={div} delay={(pi * 2 + di) * 0.1} onViewLowAttendance={setLowModal} />
          ))}
        </div>
      ))}

      {/* Specialisation Divisions */}
      {filteredSpecs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>⭐ Specialisation Divisions</h2>
          </div>
          {filteredSpecs.map((spec, si) => (
            <div key={spec.id} className="mb-4">
              <h3 className="text-sm font-semibold mb-2">
                <span style={{ color: "var(--color-text-primary)" }}>{spec.name}</span>{" "}
                <span className="text-xs" style={{ color: "var(--color-accent-sec)" }}>({spec.code})</span>
              </h3>
              {spec.divisions.map((div, di) => (
                <DivisionCard key={div.divisionId} div={div} delay={(si * 2 + di) * 0.1} onViewLowAttendance={setLowModal} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>📋 Recent Sessions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="tw-table">
              <thead><tr><th>Date</th><th>Slot</th><th>Course</th><th>Division</th><th>Type</th><th>Records</th></tr></thead>
              <tbody>
                {recentSessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--color-text-primary)" }}>{s.date}</td>
                    <td style={{ color: "var(--color-text-secondary)" }}>Slot {s.slot}</td>
                    <td><strong style={{ color: "var(--color-text-primary)" }}>{s.course}</strong></td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{s.division}</td>
                    <td><span className={s.divisionType === "core" ? "badge-success" : "badge-warning"}>{s.divisionType}</span></td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{s.attendanceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Attendance Modal */}
      {lowModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setLowModal(null)}>
          <div className="rounded-2xl w-full max-w-lg mx-4 flex flex-col" style={{ background: "var(--color-bg-secondary)", maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Low Attendance Alerts</h2>
              <button className="text-xl cursor-pointer bg-transparent border-0" style={{ color: "var(--color-text-muted)" }} onClick={() => setLowModal(null)}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>{lowModal.courseName}</p>
              <table className="tw-table">
                <thead><tr><th>Roll Number</th><th>Name</th><th>Attendance %</th></tr></thead>
                <tbody>
                  {lowModal.students.map((st, i) => (
                    <tr key={i}>
                      <td className="font-medium" style={{ color: "var(--color-text-primary)" }}>{st.rollNumber}</td>
                      <td style={{ color: "var(--color-text-secondary)" }}>{st.name}</td>
                      <td><span className={st.percentage >= 75 ? "badge-warning" : "badge-danger"}>{st.percentage}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={() => setLowModal(null)}
                className="px-5 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                style={{ background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontFamily: "inherit" }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DivisionCard({ div, delay, onViewLowAttendance }: {
  div: DivisionSummary; delay: number;
  onViewLowAttendance: (data: { courseName: string; students: DivisionSummary["courses"][0]["lowAttendanceStudents"] }) => void;
}) {
  return (
    <div className="rounded-2xl border p-6 mb-5" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", animationDelay: `${delay}s` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Division {div.divisionName}</div>
          <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>{div.studentCount} students · {div.totalSessions} sessions</div>
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
                    <strong style={{ color: "var(--color-text-primary)" }}>{course.courseCode}</strong>
                    <br /><span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{course.courseName}</span>
                  </td>
                  <td><span className={course.courseType === "core" ? "badge-success" : "badge-warning"}>{course.courseType}</span></td>
                  <td style={{ color: "var(--color-text-secondary)" }}>{course.credits}</td>
                  <td style={{ color: "var(--color-text-secondary)" }}>{course.totalSessions}</td>
                  <td>
                    <span className={course.avgAttendance >= 85 ? "badge-success" : course.avgAttendance >= 75 ? "badge-warning" : "badge-danger"}>
                      {course.avgAttendance}%
                    </span>
                  </td>
                  <td>
                    {course.lowAttendanceStudents.length === 0
                      ? <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>None</span>
                      : (
                        <button
                          onClick={() => onViewLowAttendance({ courseName: course.courseName, students: course.lowAttendanceStudents })}
                          className="px-2 py-1 rounded text-xs cursor-pointer transition-colors"
                          style={{ background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontFamily: "inherit" }}
                        >
                          {course.lowAttendanceStudents.length} Students
                        </button>
                      )
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-sm" style={{ color: "var(--color-text-muted)", padding: "8px 0" }}>No sessions yet.</p>}
    </div>
  );
}
