"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ────────────────────────────────────────────── */
interface Programme { id: number; code: string; name: string; fullName: string; batches: BatchFull[]; }
interface BatchFull { id: number; name: string; programmeId: number; startYear: number; endYear: number; isActive: boolean; terms: Term[]; divisions: Division[]; _count: { students: number }; programme?: Programme; }
interface Batch { id: number; name: string; programmeId: number; startYear: number; endYear: number; programme?: Programme; }
interface Term { id: number; batchId: number; number: number; name: string; startDate: string | null; isActive: boolean; batch?: Batch & { programme?: Programme }; }
interface Division { id: number; name: string; type: string; batchId: number | null; specialisationId: number | null; batch?: Batch & { programme?: Programme } | null; specialisation?: { name: string; code: string } | null; _count?: { coreStudents: number; specStudents: number }; }
interface Specialisation { id: number; name: string; code: string; divisions?: Division[]; _count?: { students: number }; }
interface Student { id: number; name: string; email: string; rollNumber: string | null; batch?: BatchFull & { programme?: Programme }; coreDivision?: Division | null; specialisation?: Specialisation | null; specDivision?: Division | null; }
interface Course { id: number; code: string; name: string; totalSessions: number; credits: number; type: string; termId: number | null; specialisationId: number | null; term?: Term | null; specialisation?: Specialisation | null; }
interface Faculty { id: number; name: string; email: string; _count?: { timetable: number }; }
interface TimetableEntry { id: number; divisionId: number; courseId: number; facultyId: number | null; date: string; slotNumber: number; startTime: string; endTime: string; division: Division; course: Course; faculty?: Faculty | null; }
type Tab = "students" | "programmes" | "divisions" | "specialisations" | "courses" | "faculty" | "timetable";

const FIXED_SLOTS = [
  { slot: 1, start: "08:15", end: "09:00", label: "8:15–9:00" },
  { slot: 2, start: "09:00", end: "10:10", label: "9:00–10:10" },
  { slot: 3, start: "10:40", end: "11:50", label: "10:40–11:50" },
  { slot: 4, start: "12:10", end: "13:20", label: "12:10–1:20" },
  { slot: 5, start: "14:30", end: "15:40", label: "2:30–3:40" },
  { slot: 6, start: "16:00", end: "17:10", label: "4:00–5:10" },
  { slot: 7, start: "17:30", end: "18:40", label: "5:30–6:40" },
  { slot: 8, start: "19:00", end: "20:10", label: "7:00–8:10" },
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ManagePage() {
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => { (async () => {
    const res = await fetch("/api/auth/me"); if (!res.ok) { router.push("/"); return; }
    const data = await res.json(); if (data.user?.role !== "programme_office") { router.push("/"); return; }
    setUser(data.user); setLoading(false);
  })(); }, [router]);
  const handleLogout = async () => { await fetch("/api/auth/me", { method: "DELETE" }); router.push("/"); };
  if (loading) return <div className="login-container"><div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} /></div>;
  if (!user) return null;
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "students", label: "Students", icon: "🎓" }, { key: "programmes", label: "Programmes", icon: "🏫" },
    { key: "divisions", label: "Divisions", icon: "🏷️" }, { key: "specialisations", label: "Specs", icon: "⭐" },
    { key: "courses", label: "Courses", icon: "📘" }, { key: "faculty", label: "Faculty", icon: "👨‍🏫" },
    { key: "timetable", label: "Timetable", icon: "📅" },
  ];
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="sidebar-brand-icon">📚</div><h2>Companion</h2></div>
        <nav className="sidebar-nav">
          <a className="sidebar-link" href="/office"><span className="sidebar-link-icon">📊</span> Dashboard</a>
          <div className="sidebar-link active"><span className="sidebar-link-icon">⚙️</span> Manage</div>
          <a className="sidebar-link" href="/office/calendar"><span className="sidebar-link-icon">📅</span> Calendar</a>
        </nav>
        <div className="sidebar-user"><div className="sidebar-avatar">{user.name[0]}</div>
          <div className="sidebar-user-info"><div className="sidebar-user-name">{user.name}</div><div className="sidebar-user-role">Programme Office</div></div>
          <button className="quick-btn" onClick={handleLogout} style={{ padding: "6px 10px", fontSize: "11px" }}>↩</button></div>
      </aside>
      <main className="main-content">
        <div className="page-header"><h1 className="page-title">Manage</h1></div>
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border-primary)", overflowX: "auto" }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 16px", background: activeTab === tab.key ? "var(--accent-glow)" : "transparent",
              border: "none", borderBottom: activeTab === tab.key ? "2px solid var(--accent-primary)" : "2px solid transparent",
              color: activeTab === tab.key ? "var(--accent-secondary)" : "var(--text-secondary)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>{tab.icon} {tab.label}</button>
          ))}
        </div>
        {activeTab === "students" && <StudentsTab />}
        {activeTab === "programmes" && <ProgrammesTab />}
        {activeTab === "divisions" && <DivisionsTab />}
        {activeTab === "specialisations" && <SpecialisationsTab />}
        {activeTab === "courses" && <CoursesTab />}
        {activeTab === "faculty" && <FacultyTab />}
        {activeTab === "timetable" && <TimetableTab />}
      </main>
    </div>
  );
}

/* ─── Students Tab ─────────────────────────────────────── */
function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [specialisations, setSpecialisations] = useState<Specialisation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const emptyForm = { name: "", email: "", rollNumber: "", batchId: "", coreDivisionId: "", specialisationId: "", specDivisionId: "" };
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    const [sRes, bRes, dRes, spRes] = await Promise.all([
      fetch("/api/admin/students"), fetch("/api/admin/batches"), fetch("/api/admin/divisions"), fetch("/api/admin/specialisations"),
    ]);
    setStudents(await sRes.json()); setBatches(await bRes.json()); setDivisions(await dRes.json()); setSpecialisations(await spRes.json());
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selectedBatch = batches.find(b => b.id === parseInt(form.batchId));
  const filteredCoreDivs = divisions.filter(d => d.type === "core" && (!form.batchId || d.batchId === parseInt(form.batchId)));
  const specDivs = divisions.filter(d => d.type === "specialisation" && (!form.specialisationId || d.specialisationId === parseInt(form.specialisationId)));

  const handleSave = async () => {
    setError("");
    const payload = {
      ...form, batchId: form.batchId ? parseInt(form.batchId) : null,
      coreDivisionId: form.coreDivisionId ? parseInt(form.coreDivisionId) : null,
      specialisationId: form.specialisationId ? parseInt(form.specialisationId) : null,
      specDivisionId: form.specDivisionId ? parseInt(form.specDivisionId) : null,
    };
    const res = editingId
      ? await fetch("/api/admin/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...payload }) })
      : await fetch("/api/admin/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setForm(emptyForm); setShowForm(false); setEditingId(null); fetchAll(); }
    else { const d = await res.json(); setError(d.error || "Failed"); }
  };
  const startEdit = (s: Student) => {
    setEditingId(s.id); setError("");
    setForm({ name: s.name, email: s.email, rollNumber: s.rollNumber || "",
      batchId: s.batch?.id?.toString() || "", coreDivisionId: s.coreDivision?.id?.toString() || "",
      specialisationId: s.specialisation?.id?.toString() || "", specDivisionId: s.specDivision?.id?.toString() || "" });
    setShowForm(true);
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setShowForm(false); setError(""); };
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    await fetch("/api/admin/students/upload", { method: "POST", body: fd }); fetchAll(); e.target.value = "";
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🎓 Students ({students.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="quick-btn" onClick={() => { cancelEdit(); setShowForm(!showForm); }}>+ Add</button>
          <button className="quick-btn" onClick={() => fileRef.current?.click()}>📤 Bulk</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleBulkUpload} style={{ display: "none" }} />
        </div>
      </div>
      {showForm && (
        <div className="division-card" style={{ marginBottom: 16, border: editingId ? "1px solid var(--accent-primary)" : undefined }}>
          <h3 style={{ fontSize: 14, marginBottom: 12, color: "var(--text-secondary)" }}>{editingId ? "✏️ Edit Student" : "➕ Add Student"}</h3>
          {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Roll ({selectedBatch?.programme?.code || "CODE"}-YY-NNN)</label>
              <input className="form-input" placeholder={`${selectedBatch?.programme?.code || "PGP"}-25-001`} value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Batch</label>
              <select className="form-input" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value, coreDivisionId: "" })}>
                <option value="">Select</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Core Division</label>
              <select className="form-input" value={form.coreDivisionId} onChange={e => setForm({ ...form, coreDivisionId: e.target.value })}>
                <option value="">Select</option>{filteredCoreDivs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Specialisation</label>
              <select className="form-input" value={form.specialisationId} onChange={e => setForm({ ...form, specialisationId: e.target.value, specDivisionId: "" })}>
                <option value="">Select</option>{specialisations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Spec Div</label>
              <select className="form-input" value={form.specDivisionId} onChange={e => setForm({ ...form, specDivisionId: e.target.value })}>
                <option value="">Select</option>{specDivs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn-primary" style={{ maxWidth: 200 }} onClick={handleSave}>{editingId ? "Save" : "Add"}</button>
            {editingId && <button className="quick-btn" onClick={cancelEdit}>Cancel</button>}
          </div>
        </div>
      )}
      <div className="recent-sessions"><table className="data-table">
        <thead><tr><th>Roll</th><th>Name</th><th>Batch</th><th>Div</th><th>Spec</th><th>S.Div</th><th></th></tr></thead>
        <tbody>{students.map(s => (
          <tr key={s.id}><td><strong>{s.rollNumber}</strong></td><td>{s.name}</td><td style={{ fontSize: 12 }}>{s.batch?.name || "—"}</td>
            <td>{s.coreDivision?.name || "—"}</td><td>{s.specialisation?.name || "—"}</td><td>{s.specDivision?.name || "—"}</td>
            <td><button className="quick-btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => startEdit(s)}>✏️</button></td></tr>
        ))}</tbody></table></div>
    </div>
  );
}

/* ─── Programmes Tab ───────────────────────────────────── */
function ProgrammesTab() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", fullName: "" });
  const [batchForm, setBatchForm] = useState({ programmeId: "", name: "", startYear: "", endYear: "" });
  const [termForm, setTermForm] = useState({ batchId: "", number: "", startDate: "" });
  const fetchProgrammes = useCallback(async () => { setProgrammes(await (await fetch("/api/admin/programmes")).json()); }, []);
  useEffect(() => { fetchProgrammes(); }, [fetchProgrammes]);
  const addProgramme = async () => { await fetch("/api/admin/programmes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); setForm({ code: "", name: "", fullName: "" }); setShowForm(false); fetchProgrammes(); };
  const addBatch = async () => { await fetch("/api/admin/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...batchForm, programmeId: parseInt(batchForm.programmeId), startYear: parseInt(batchForm.startYear), endYear: parseInt(batchForm.endYear) }) }); setBatchForm({ programmeId: "", name: "", startYear: "", endYear: "" }); fetchProgrammes(); };
  const addTerm = async () => { await fetch("/api/admin/terms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: parseInt(termForm.batchId), number: parseInt(termForm.number), startDate: termForm.startDate || null }) }); setTermForm({ batchId: "", number: "", startDate: "" }); fetchProgrammes(); };
  const toggleTerm = async (id: number, isActive: boolean) => { await fetch("/api/admin/terms", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !isActive }) }); fetchProgrammes(); };
  return (
    <div>
      <div className="section-header"><h2 className="section-title">🏫 Programmes & Batches</h2><button className="quick-btn" onClick={() => setShowForm(!showForm)}>+ Add</button></div>
      {showForm && (
        <div className="division-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="form-group"><label className="form-label">Code</label><input className="form-input" placeholder="PGP" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="PGDM" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
          </div>
          <button className="btn-primary" style={{ maxWidth: 200, marginTop: 12 }} onClick={addProgramme}>Create</button>
        </div>
      )}
      {programmes.map(p => (
        <div className="division-card" key={p.id}>
          <div className="division-card-header"><div><div className="division-name">{p.name} <span style={{ fontSize: 13, color: "var(--accent-secondary)" }}>({p.code})</span></div><div className="division-meta">{p.fullName}</div></div></div>
          {p.batches.map(b => (
            <div key={b.id} style={{ padding: "12px 0", borderTop: "1px solid var(--border-primary)" }}>
              <div><strong>{b.name}</strong> <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{b._count.students} students · Divisions: {b.divisions.map(d => d.name).join(", ") || "—"}</span></div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {b.terms.map(t => (
                  <button key={t.id} onClick={() => toggleTerm(t.id, t.isActive)} className={`badge badge-${t.isActive ? "success" : "warning"}`}
                    style={{ cursor: "pointer", border: "none", fontFamily: "inherit" }}>
                    T{t.number} {t.startDate ? `(${t.startDate})` : ""} {t.isActive ? "● Active" : "○"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="division-card" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12, color: "var(--text-secondary)" }}>Quick Add</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div className="form-label">Add Batch</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <select className="form-input" style={{ flex: 1 }} value={batchForm.programmeId} onChange={e => setBatchForm({ ...batchForm, programmeId: e.target.value })}><option value="">Programme</option>{programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input className="form-input" style={{ width: 80 }} placeholder="Start" value={batchForm.startYear} onChange={e => setBatchForm({ ...batchForm, startYear: e.target.value })} />
              <input className="form-input" style={{ width: 80 }} placeholder="End" value={batchForm.endYear} onChange={e => setBatchForm({ ...batchForm, endYear: e.target.value })} />
              <input className="form-input" style={{ flex: 1 }} placeholder="Name" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} />
              <button className="quick-btn" onClick={addBatch}>Add</button>
            </div>
          </div>
          <div>
            <div className="form-label">Add Term</div>
            <div style={{ display: "flex", gap: 6 }}>
              <select className="form-input" style={{ flex: 1 }} value={termForm.batchId} onChange={e => setTermForm({ ...termForm, batchId: e.target.value })}><option value="">Batch</option>{programmes.flatMap(p => p.batches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              <input className="form-input" style={{ width: 60 }} placeholder="#" value={termForm.number} onChange={e => setTermForm({ ...termForm, number: e.target.value })} />
              <input className="form-input" style={{ width: 140 }} type="date" value={termForm.startDate} onChange={e => setTermForm({ ...termForm, startDate: e.target.value })} />
              <button className="quick-btn" onClick={addTerm}>Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Divisions Tab ────────────────────────────────────── */
function DivisionsTab() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [specialisations, setSpecialisations] = useState<Specialisation[]>([]);
  const [form, setForm] = useState({ name: "", type: "core", batchId: "", specialisationId: "" });
  const [error, setError] = useState("");
  const fetchAll = useCallback(async () => {
    const [dRes, bRes, sRes] = await Promise.all([fetch("/api/admin/divisions"), fetch("/api/admin/batches"), fetch("/api/admin/specialisations")]);
    setDivisions(await dRes.json()); setBatches(await bRes.json()); setSpecialisations(await sRes.json());
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const selectedSpec = specialisations.find(s => s.id === parseInt(form.specialisationId));
  const previewName = form.type === "specialisation" && selectedSpec && form.name ? `${selectedSpec.code}-${form.name}` : form.name;
  const addDivision = async () => {
    setError("");
    const res = await fetch("/api/admin/divisions", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, type: form.type, batchId: form.type === "core" && form.batchId ? parseInt(form.batchId) : null, specialisationId: form.type === "specialisation" && form.specialisationId ? parseInt(form.specialisationId) : null }) });
    if (res.ok) { setForm({ name: "", type: "core", batchId: "", specialisationId: "" }); fetchAll(); }
    else { const d = await res.json(); setError(d.error); }
  };
  return (
    <div>
      <div className="section-header"><h2 className="section-title">🏷️ Divisions</h2></div>
      <div className="division-card" style={{ marginBottom: 16 }}>
        <div className="form-label">Add Division</div>
        {error && <p className="error-msg" style={{ marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <select className="form-input" style={{ width: 150 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="core">Core</option><option value="specialisation">Spec</option></select>
          {form.type === "core" ? (
            <select className="form-input" style={{ flex: 1 }} value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}><option value="">Batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          ) : (
            <select className="form-input" style={{ flex: 1 }} value={form.specialisationId} onChange={e => setForm({ ...form, specialisationId: e.target.value })}><option value="">Spec</option>{specialisations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select>
          )}
          <input className="form-input" style={{ width: 100 }} placeholder="e.g., A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          {form.type === "specialisation" && previewName && <span style={{ fontSize: 13, color: "var(--accent-secondary)" }}>→ {previewName}</span>}
          <button className="quick-btn" onClick={addDivision}>Add</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="division-card"><h3 style={{ fontSize: 14, marginBottom: 12 }}>Core</h3>
          <table className="data-table"><thead><tr><th>Name</th><th>Batch</th><th>Students</th></tr></thead>
            <tbody>{divisions.filter(d => d.type === "core").map(d => <tr key={d.id}><td><strong>{d.name}</strong></td><td>{d.batch?.name || "—"}</td><td>{d._count?.coreStudents || 0}</td></tr>)}</tbody></table></div>
        <div className="division-card"><h3 style={{ fontSize: 14, marginBottom: 12 }}>Specialisation</h3>
          <table className="data-table"><thead><tr><th>Name</th><th>Spec</th><th>Students</th></tr></thead>
            <tbody>{divisions.filter(d => d.type === "specialisation").map(d => <tr key={d.id}><td><strong>{d.name}</strong></td><td>{d.specialisation?.name || "—"}</td><td>{d._count?.specStudents || 0}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}

/* ─── Specialisations Tab ──────────────────────────────── */
function SpecialisationsTab() {
  const [specialisations, setSpecialisations] = useState<(Specialisation & { divisions: Division[] })[]>([]);
  const [form, setForm] = useState({ name: "", code: "" });
  const fetchSpecs = useCallback(async () => { setSpecialisations(await (await fetch("/api/admin/specialisations")).json()); }, []);
  useEffect(() => { fetchSpecs(); }, [fetchSpecs]);
  const addSpec = async () => { await fetch("/api/admin/specialisations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); setForm({ name: "", code: "" }); fetchSpecs(); };
  return (
    <div>
      <div className="section-header"><h2 className="section-title">⭐ Specialisations</h2></div>
      <div className="division-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="form-input" style={{ width: 100 }} placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <button className="quick-btn" onClick={addSpec}>Add</button>
        </div>
      </div>
      {specialisations.map(s => (
        <div className="division-card" key={s.id}>
          <div className="division-name">{s.name} <span style={{ fontSize: 13, color: "var(--accent-secondary)" }}>({s.code})</span></div>
          {s.divisions?.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 8 }}>{s.divisions.map(d => <span key={d.id} className="badge badge-success">{d.name}</span>)}</div>}
        </div>
      ))}
    </div>
  );
}

/* ─── Courses Tab ──────────────────────────────────────── */
function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [specs, setSpecs] = useState<Specialisation[]>([]);
  const [form, setForm] = useState({ code: "", name: "", credits: "3", termId: "", type: "core", specialisationId: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const fetchAll = useCallback(async () => {
    const [cRes, tRes, sRes] = await Promise.all([fetch("/api/admin/courses"), fetch("/api/admin/terms"), fetch("/api/admin/specialisations")]);
    setCourses(await cRes.json()); setTerms(await tRes.json()); setSpecs(await sRes.json());
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const creditSessions: Record<string, number> = { "1": 9, "2": 18, "3": 26, "4": 35 };
  const handleSave = async () => {
    setError("");
    const payload = { code: form.code, name: form.name, credits: parseInt(form.credits), totalSessions: creditSessions[form.credits] || 26,
      termId: form.termId ? parseInt(form.termId) : null, type: form.type,
      specialisationId: (form.type === "specialisation" && form.specialisationId) ? parseInt(form.specialisationId) : null };
    const res = editingId
      ? await fetch("/api/admin/courses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...payload }) })
      : await fetch("/api/admin/courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setForm({ code: "", name: "", credits: "3", termId: "", type: "core", specialisationId: "" }); setEditingId(null); fetchAll(); }
    else { const d = await res.json(); setError(d.error); }
  };
  const startEdit = (c: Course) => { setEditingId(c.id); setForm({ code: c.code, name: c.name, credits: c.credits.toString(), termId: c.termId?.toString() || "", type: c.type, specialisationId: c.specialisationId?.toString() || "" }); };
  return (
    <div>
      <div className="section-header"><h2 className="section-title">📘 Courses</h2></div>
      <div className="division-card" style={{ marginBottom: 16 }}>
        <div className="form-label">{editingId ? "✏️ Edit" : "Add Course"}</div>
        {error && <p className="error-msg" style={{ marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input className="form-input" style={{ width: 100 }} placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <input className="form-input" style={{ flex: 1 }} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <select className="form-input" style={{ width: 80 }} value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })}>
            <option value="1">1cr</option><option value="2">2cr</option><option value="3">3cr</option><option value="4">4cr</option></select>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>({creditSessions[form.credits]}s)</span>
          <select className="form-input" style={{ width: 100 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value, specialisationId: "" })}>
            <option value="core">Core</option><option value="specialisation">Spec</option><option value="elective">Elective</option></select>
          {form.type === "specialisation" && <select className="form-input" style={{ width: 180 }} value={form.specialisationId} onChange={e => setForm({ ...form, specialisationId: e.target.value })}><option value="">Spec...</option>{specs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
          <select className="form-input" style={{ flex: 1 }} value={form.termId} onChange={e => setForm({ ...form, termId: e.target.value })}><option value="">No Term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.batch?.programme?.name} — T{t.number}</option>)}</select>
          <button className="quick-btn" onClick={handleSave}>{editingId ? "Save" : "Add"}</button>
          {editingId && <button className="quick-btn" onClick={() => { setEditingId(null); setForm({ code: "", name: "", credits: "3", termId: "", type: "core", specialisationId: "" }); }}>✕</button>}
        </div>
      </div>
      <div className="recent-sessions"><table className="data-table">
        <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Cr</th><th>Sess</th><th>Spec</th><th>Term</th><th></th></tr></thead>
        <tbody>{courses.map(c => (
          <tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.name}</td>
            <td><span className={`badge badge-${c.type === "core" ? "success" : c.type === "specialisation" ? "warning" : "danger"}`}>{c.type}</span></td>
            <td>{c.credits}</td><td>{c.totalSessions}</td><td>{c.specialisation?.name || "—"}</td>
            <td>{c.term ? `${c.term.batch?.programme?.name} — T${c.term.number}` : "—"}</td>
            <td><button className="quick-btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => startEdit(c)}>✏️</button></td></tr>
        ))}</tbody></table></div>
    </div>
  );
}

/* ─── Faculty Tab ──────────────────────────────────────── */
function FacultyTab() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const emptyForm = { name: "", email: "", teachingArea: "" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const fetchFaculty = useCallback(async () => { setFaculty(await (await fetch("/api/admin/faculty")).json()); }, []);
  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);
  const handleSave = async () => {
    setError("");
    const res = editingId
      ? await fetch("/api/admin/faculty", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...form }) })
      : await fetch("/api/admin/faculty", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setForm(emptyForm); setEditingId(null); fetchFaculty(); }
    else { const d = await res.json(); setError(d.error); }
  };
  const AREAS = ["Finance and Accounting","Marketing","Information Management and Analytics","Operations Supply Chain Management & Quantitative Methods","Economics & Policy","Organisation & Leadership Studies","Strategy"];
  return (
    <div>
      <div className="section-header"><h2 className="section-title">👨‍🏫 Faculty</h2></div>
      <div className="division-card" style={{ marginBottom: 16 }}>
        <div className="form-label">{editingId ? "✏️ Edit" : "Add Faculty"}</div>
        {error && <p className="error-msg" style={{ marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="form-input" style={{ flex: 1 }} placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <select className="form-input" style={{ width: 220 }} value={form.teachingArea} onChange={e => setForm({ ...form, teachingArea: e.target.value })}>
            <option value="">Teaching Area</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="quick-btn" onClick={handleSave}>{editingId ? "Save" : "Add"}</button>
          {editingId && <button className="quick-btn" onClick={() => { setEditingId(null); setForm(emptyForm); }}>✕</button>}
        </div>
      </div>
      <div className="recent-sessions"><table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Teaching Area</th><th>Courses</th><th>Slots</th><th></th></tr></thead>
        <tbody>{faculty.map((f: any) => (
          <tr key={f.id}><td><strong>{f.name}</strong></td><td>{f.email}</td>
            <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{f.teachingArea || "—"}</td>
            <td>{f._count?.courses || 0}</td><td>{f._count?.timetable || 0}</td>
            <td><button className="quick-btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => { setEditingId(f.id); setForm({ name: f.name, email: f.email, teachingArea: f.teachingArea || "" }); }}>✏️</button></td></tr>
        ))}</tbody></table></div>
    </div>
  );
}

/* ─── Timetable Tab (Date Specific + Faculty) ────────────── */
function TimetableTab() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [filterDiv, setFilterDiv] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [weekOffset, setWeekOffset] = useState(0);

  const todayStr = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ divisionId: "", courseId: "", facultyId: "", date: todayStr, slotNumber: "1" });
  const [error, setError] = useState("");

  const getWeekDates = (offset: number) => {
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + offset * 7);
    const dayOfWeek = refDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + mondayOffset);
    const dates = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates(weekOffset);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[5];

  const fetchAll = useCallback(async () => {
    const [tRes, dRes, cRes, fRes] = await Promise.all([
      fetch(`/api/admin/timetable?weekOf=${weekStart}`),
      fetch("/api/admin/divisions"), fetch("/api/admin/courses"), fetch("/api/admin/faculty")
    ]);
    setEntries(await tRes.json()); setDivisions(await dRes.json()); setCourses(await cRes.json()); setFaculty(await fRes.json());
  }, [weekStart]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addEntry = async () => {
    setError("");
    const res = await fetch("/api/admin/timetable", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ divisionId: parseInt(form.divisionId), courseId: parseInt(form.courseId), facultyId: form.facultyId ? parseInt(form.facultyId) : null, date: form.date, slotNumber: parseInt(form.slotNumber) }) });
    if (res.ok) { setForm({ ...form, courseId: "", facultyId: "" }); fetchAll(); }
    else { const d = await res.json(); setError(d.error); }
  };
  const deleteEntry = async (id: number) => { await fetch(`/api/admin/timetable?id=${id}`, { method: "DELETE" }); fetchAll(); };

  const selectedDiv = divisions.find(d => d.id === parseInt(form.divisionId || filterDiv));
  const filteredCourses = selectedDiv
    ? courses.filter(c => selectedDiv.type === "core" ? c.type === "core" : (c.type === "specialisation" && c.specialisationId === selectedDiv.specialisationId))
    : courses;

  const filteredEntries = filterDiv ? entries.filter(e => e.divisionId === parseInt(filterDiv)) : entries;
  const selectedSlot = FIXED_SLOTS.find(s => s.slot === parseInt(form.slotNumber));

  return (
    <div>
      <div className="section-header" style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 className="section-title">📅 Timetable Management</h2>
        <div style={{ display: "flex", gap: 8, background: "var(--bg-tertiary)", padding: 4, borderRadius: 8 }}>
          <button className="quick-btn" style={{ background: viewMode === "calendar" ? "var(--bg-primary)" : "transparent", boxShadow: viewMode === "calendar" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }} onClick={() => setViewMode("calendar")}>📅 Calendar</button>
          <button className="quick-btn" style={{ background: viewMode === "list" ? "var(--bg-primary)" : "transparent", boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }} onClick={() => setViewMode("list")}>📋 List</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="quick-btn" onClick={() => setWeekOffset(weekOffset - 1)}>◀ Prev Week</button>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{weekStart} — {weekEnd}</span>
        <button className="quick-btn" onClick={() => setWeekOffset(weekOffset + 1)}>Next Week ▶</button>
        {weekOffset !== 0 && <button className="quick-btn" onClick={() => setWeekOffset(0)}>Current Week</button>}
      </div>

      <div className="division-card" style={{ marginBottom: 16 }}>
        <div className="form-label">Add Timetable Entry</div>
        {error && <p className="error-msg" style={{ marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <select className="form-input" style={{ width: 140 }} value={form.divisionId} onChange={e => { setForm({ ...form, divisionId: e.target.value, courseId: "" }); setFilterDiv(e.target.value); }}>
            <option value="">Division</option>{divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select className="form-input" style={{ width: 180 }} value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value, facultyId: "" })}>
            <option value="">Course</option>{filteredCourses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select>
          <select className="form-input" style={{ width: 160 }} value={form.facultyId} onChange={e => setForm({ ...form, facultyId: e.target.value })}>
            <option value="">Faculty (optional)</option>{faculty.filter((f: any) => !form.courseId || f.courses?.some((fc: any) => fc.courseId === parseInt(form.courseId))).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <input type="date" className="form-input" style={{ width: 130 }} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <select className="form-input" style={{ width: 150 }} value={form.slotNumber} onChange={e => setForm({ ...form, slotNumber: e.target.value })}>
            {FIXED_SLOTS.map(s => <option key={s.slot} value={s.slot}>Slot {s.slot} ({s.start})</option>)}
          </select>
          <button className="quick-btn" onClick={addEntry}>Add</button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <select className="form-input" style={{ width: 200 }} value={filterDiv} onChange={e => setFilterDiv(e.target.value)}>
          <option value="">All Divisions (View Filter)</option>{divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      </div>

      {viewMode === "list" ? (
        <div className="recent-sessions"><table className="data-table">
          <thead><tr><th>Division</th><th>Date</th><th>Slot</th><th>Time</th><th>Course</th><th>Faculty</th><th></th></tr></thead>
          <tbody>{filteredEntries.map(e => (
            <tr key={e.id}><td><strong>{e.division.name}</strong></td><td>{e.date}</td><td>{e.slotNumber}</td>
              <td>{e.startTime}–{e.endTime}</td><td>{e.course.code} — {e.course.name}</td>
              <td style={{ color: e.faculty ? "var(--text-primary)" : "var(--text-muted)" }}>{e.faculty?.name || "—"}</td>
              <td><button className="quick-btn" style={{ padding: "4px 8px", fontSize: 11, color: "var(--danger)" }} onClick={() => deleteEntry(e.id)}>🗑</button></td></tr>
          ))}</tbody></table></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "80px repeat(6, 1fr)", gap: 2, fontSize: 12 }}>
          <div style={{ padding: 8, fontWeight: 700, color: "var(--text-muted)" }}>Slot</div>
          {weekDates.map((date, i) => (
            <div key={date} style={{ padding: 8, fontWeight: 700, textAlign: "center", background: date === todayStr ? "var(--accent-glow)" : "transparent", borderRadius: 6 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}<br /><span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>{date.slice(5)}</span>
            </div>
          ))}
          {FIXED_SLOTS.map(slotDef => (
            <React.Fragment key={slotDef.slot}>
              <div style={{ padding: "10px 6px", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-primary)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontWeight: 600 }}>S{slotDef.slot}</div><div>{slotDef.label}</div>
              </div>
              {weekDates.map(date => {
                const dayEntries = filteredEntries.filter(e => e.date === date && e.slotNumber === slotDef.slot);
                return (
                  <div key={`${date}-${slotDef.slot}`} style={{ padding: 4, borderTop: "1px solid var(--border-primary)", display: "flex", flexDirection: "column", gap: 3 }}>
                    {dayEntries.map(entry => (
                      <div key={entry.id} className="calendar-slot-entry" style={{ padding: 6, background: "var(--bg-tertiary)", borderRadius: 4, position: "relative" }}>
                        <div style={{ fontWeight: 700, fontSize: 11 }}>{entry.course.code}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Div {entry.division.name}</div>
                        {entry.faculty && <div style={{ fontSize: 10, color: "var(--accent-secondary)" }}>{entry.faculty.name}</div>}
                        <button onClick={() => deleteEntry(entry.id)} style={{ position: "absolute", top: 4, right: 4, background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 12 }}>✕</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
