"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

/* ─── Types ─────────────────────────────────────────────── */
interface Programme { id: number; code: string; name: string; fullName: string; batches: BatchFull[]; Term?: Term[]; }
interface BatchFull { id: number; name: string; programmeId: number; startYear: number; endYear: number; isActive: boolean; activeTerm?: Term | null; activeTermId?: number | null; divisions: Division[]; _count: { students: number }; programme?: Programme; }
interface Batch { id: number; name: string; programmeId: number; startYear: number; endYear: number; activeTermId?: number | null; programme?: Programme; }
interface Term { id: number; programmeId: number; number: number; name: string; startDate: string | null; isActive: boolean; programme?: Programme; }
interface Division { id: number; name: string; type: string; batchId: number | null; specialisationId: number | null; batch?: Batch & { programme?: Programme } | null; specialisation?: { name: string; code: string } | null; _count?: { coreStudents: number; specStudents: number }; }
interface Specialisation { id: number; name: string; code: string; divisions?: Division[]; _count?: { students: number }; }
interface Student { id: number; name: string; email: string; rollNumber: string | null; batch?: BatchFull & { programme?: Programme }; coreDivision?: Division | null; specialisation?: Specialisation | null; specDivision?: Division | null; }
interface Course { id: number; code: string; name: string; totalSessions: number; credits: number; type: string; termId: number | null; specialisationId: number | null; term?: Term | null; specialisation?: Specialisation | null; }
interface Faculty { id: number; name: string; email: string; teachingArea: string | null; _count?: { timetable: number; courses: number }; }
interface TimetableEntry { id: number; divisionId: number; courseId: number; facultyId: number | null; date: string; slotNumber: number; startTime: string; endTime: string; isConducted: boolean; sessionNumber: number | null; division: Division; course: Course; faculty?: Faculty | null; }
type Tab = "students" | "programmes" | "divisions" | "specialisations" | "courses" | "faculty" | "timetable";

const FIXED_SLOTS = [
  { slot: 1, start: "08:15", end: "09:00",  label: "8:15–9:00"   },
  { slot: 2, start: "09:00", end: "10:10",  label: "9:00–10:10"  },
  { slot: 3, start: "10:40", end: "11:50",  label: "10:40–11:50" },
  { slot: 4, start: "12:10", end: "13:20",  label: "12:10–1:20"  },
  { slot: 5, start: "14:30", end: "15:40",  label: "2:30–3:40"   },
  { slot: 6, start: "16:00", end: "17:10",  label: "4:00–5:10"   },
  { slot: 7, start: "17:30", end: "18:40",  label: "5:30–6:40"   },
  { slot: 8, start: "19:00", end: "20:10",  label: "7:00–8:10"   },
];

/* ─── Shared style tokens ────────────────────────────────── */
const C = {
  card:    "var(--color-bg-card)",
  sec:     "var(--color-bg-secondary)",
  border:  "var(--color-border)",
  text:    "var(--color-text-primary)",
  muted:   "var(--color-text-muted)",
  sub:     "var(--color-text-secondary)",
  accent:  "var(--color-accent)",
  accentS: "var(--color-accent-sec)",
  accentG: "var(--color-accent-glow)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger:  "var(--color-danger)",
};

const card    = { background: C.card,  border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 };
const inputCls = "tw-input";
const qBtn    = { padding: "6px 14px", background: C.sec, border: `1px solid ${C.border}`, borderRadius: 6, color: C.sub, fontSize: 12, fontFamily: "inherit", cursor: "pointer" } as React.CSSProperties;
const pBtn    = { background: "linear-gradient(135deg,#6366f1,#7c3aed)", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 600, padding: "10px 24px", cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties;

function Label({ text }: { text: string }) {
  return <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: C.sub }}>{text}</label>;
}
function Err({ msg }: { msg: string }) {
  return msg ? <p className="text-sm mb-3" style={{ color: C.danger }}>{msg}</p> : null;
}
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex gap-2 justify-center mt-4">
      <button style={qBtn} disabled={page === 1} onClick={() => onChange(page - 1)}>Prev</button>
      <span className="self-center text-sm" style={{ color: C.sub }}>Page {page} of {total}</span>
      <button style={qBtn} disabled={page === total} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function ManagePage() {
  const [activeTab, setActiveTab] = useState<Tab>("students");

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "students",       label: "Students",      icon: "🎓" },
    { key: "programmes",     label: "Programmes",    icon: "🏫" },
    { key: "divisions",      label: "Divisions",     icon: "🏷️"  },
    { key: "specialisations",label: "Specs",         icon: "⭐" },
    { key: "courses",        label: "Courses",       icon: "📘" },
    { key: "faculty",        label: "Faculty",       icon: "👨‍🏫" },
    { key: "timetable",      label: "Timetable",     icon: "📅" },
  ];

  return (
    <div className="relative z-[1]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: C.text }}>Manage</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 border-b overflow-x-auto" style={{ borderColor: C.border }}>
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap cursor-pointer border-0 transition-colors"
              style={{
                background: active ? C.accentG : "transparent",
                borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
                color: active ? C.accentS : C.sub,
                fontFamily: "inherit",
              }}>
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "students"        && <StudentsTab />}
      {activeTab === "programmes"      && <ProgrammesTab />}
      {activeTab === "divisions"       && <DivisionsTab />}
      {activeTab === "specialisations" && <SpecialisationsTab />}
      {activeTab === "courses"         && <CoursesTab />}
      {activeTab === "faculty"         && <FacultyTab />}
      {activeTab === "timetable"       && <TimetableTab />}
    </div>
  );
}

/* ─── Students Tab ─────────────────────────────────────── */
function StudentsTab() {
  const [students, setStudents]           = useState<Student[]>([]);
  const [batches, setBatches]             = useState<Batch[]>([]);
  const [divisions, setDivisions]         = useState<Division[]>([]);
  const [specialisations, setSpecialisations] = useState<Specialisation[]>([]);
  const [showForm, setShowForm]           = useState(false);
  const [editingId, setEditingId]         = useState<number | null>(null);
  const [error, setError]                 = useState("");
  const empty = { name: "", email: "", rollNumber: "", batchId: "", coreDivisionId: "", specialisationId: "", specDivisionId: "" };
  const [form, setForm]                   = useState(empty);
  const [search, setSearch]               = useState("");
  const [page, setPage]                   = useState(1);
  const PER = 20;
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    const [sR, bR, dR, spR] = await Promise.all([
      fetch("/api/admin/students"), fetch("/api/admin/batches"),
      fetch("/api/admin/divisions"), fetch("/api/admin/specialisations"),
    ]);
    setStudents(await sR.json()); setBatches(await bR.json());
    setDivisions(await dR.json()); setSpecialisations(await spR.json());
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selBatch    = batches.find(b => b.id === parseInt(form.batchId));
  const coreDivs    = divisions.filter(d => d.type === "core" && (!form.batchId || d.batchId === parseInt(form.batchId)));
  const specDivs    = divisions.filter(d => d.type === "specialisation" && (!form.specialisationId || d.specialisationId === parseInt(form.specialisationId)));

  const handleSave = async () => {
    setError("");
    const p = { ...form, batchId: form.batchId ? parseInt(form.batchId) : null, coreDivisionId: form.coreDivisionId ? parseInt(form.coreDivisionId) : null, specialisationId: form.specialisationId ? parseInt(form.specialisationId) : null, specDivisionId: form.specDivisionId ? parseInt(form.specDivisionId) : null };
    const res = editingId
      ? await fetch("/api/admin/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...p }) })
      : await fetch("/api/admin/students", { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (res.ok) { setForm(empty); setShowForm(false); setEditingId(null); fetchAll(); }
    else { setError((await res.json()).error || "Failed"); }
  };
  const startEdit = (s: Student) => {
    setEditingId(s.id); setError("");
    setForm({ name: s.name, email: s.email, rollNumber: s.rollNumber || "", batchId: s.batch?.id?.toString() || "", coreDivisionId: s.coreDivision?.id?.toString() || "", specialisationId: s.specialisation?.id?.toString() || "", specDivisionId: s.specDivision?.id?.toString() || "" });
    setShowForm(true);
  };

  const filtered   = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.rollNumber || "").toLowerCase().includes(search.toLowerCase()) || (s.batch?.name || "").toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER);
  const paged      = filtered.slice((page - 1) * PER, page * PER);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: C.text }}>🎓 Students ({students.length})</h2>
        <div className="flex gap-2 items-center">
          <input type="text" className={inputCls} placeholder="Search by name, roll, or batch..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ padding: "6px 12px", width: 280 }} />
          <button style={qBtn} onClick={() => { setEditingId(null); setForm(empty); setShowForm(!showForm); }}>+ Add</button>
          <button style={qBtn} onClick={() => fileRef.current?.click()}>📤 Bulk</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("file", f); await fetch("/api/admin/students/upload", { method: "POST", body: fd }); fetchAll(); e.target.value = ""; }} />
        </div>
      </div>

      {showForm && (
        <div style={{ ...card, borderColor: editingId ? C.accent : C.border }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: C.sub }}>{editingId ? "✏️ Edit Student" : "➕ Add Student"}</h3>
          <Err msg={error} />
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><Label text="Name" /><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label text="Email" /><input className={inputCls} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label text={`Roll (${selBatch?.programme?.code || "CODE"}-YY-NNN)`} />
              <input className={inputCls} placeholder={`${selBatch?.programme?.code || "PGP"}-25-001`} value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })} /></div>
            <div><Label text="Batch" /><select className={inputCls} value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value, coreDivisionId: "" })}><option value="">Select</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><Label text="Core Division" /><select className={inputCls} value={form.coreDivisionId} onChange={e => setForm({ ...form, coreDivisionId: e.target.value })}><option value="">Select</option>{coreDivs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><Label text="Specialisation" /><select className={inputCls} value={form.specialisationId} onChange={e => setForm({ ...form, specialisationId: e.target.value, specDivisionId: "" })}><option value="">Select</option>{specialisations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><Label text="Spec Division" /><select className={inputCls} value={form.specDivisionId} onChange={e => setForm({ ...form, specDivisionId: e.target.value })}><option value="">Select</option>{specDivs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          </div>
          <div className="flex gap-2">
            <button style={{ ...pBtn, maxWidth: 160 }} onClick={handleSave}>{editingId ? "Save" : "Add"}</button>
            <button style={qBtn} onClick={() => { setEditingId(null); setForm(empty); setShowForm(false); setError(""); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
        <table className="tw-table">
          <thead><tr><th>Roll</th><th>Name</th><th>Batch</th><th>Div</th><th>Spec</th><th>S.Div</th><th></th></tr></thead>
          <tbody>
            {paged.map(s => (
              <tr key={s.id}>
                <td className="font-medium" style={{ color: C.text }}>{s.rollNumber}</td>
                <td style={{ color: C.text }}>{s.name}</td>
                <td className="text-xs" style={{ color: C.sub }}>{s.batch?.name || "—"}</td>
                <td style={{ color: C.sub }}>{s.coreDivision?.name || "—"}</td>
                <td style={{ color: C.sub }}>{s.specialisation?.name || "—"}</td>
                <td style={{ color: C.sub }}>{s.specDivision?.name || "—"}</td>
                <td><button style={{ ...qBtn, padding: "3px 10px", fontSize: 11 }} onClick={() => startEdit(s)}>✏️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={totalPages} onChange={setPage} />
    </div>
  );
}

/* ─── Programmes Tab ──────────────────────────────────────── */
function ProgrammesTab() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ code: "", name: "", fullName: "" });
  const [batchForm, setBatchForm]   = useState({ programmeId: "", name: "", startYear: "", endYear: "" });
  const [termForm, setTermForm]     = useState({ programmeId: "", number: "", startDate: "" });
  const fetch_ = useCallback(async () => { setProgrammes(await (await fetch("/api/admin/programmes")).json()); }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const addProg  = async () => { await fetch("/api/admin/programmes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); setForm({ code: "", name: "", fullName: "" }); setShowForm(false); fetch_(); };
  const addBatch = async () => { await fetch("/api/admin/batches",   { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...batchForm, programmeId: parseInt(batchForm.programmeId), startYear: parseInt(batchForm.startYear), endYear: parseInt(batchForm.endYear) }) }); setBatchForm({ programmeId: "", name: "", startYear: "", endYear: "" }); fetch_(); };
  const addTerm  = async () => { await fetch("/api/admin/terms",     { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programmeId: parseInt(termForm.programmeId), number: parseInt(termForm.number), startDate: termForm.startDate || null }) }); setTermForm({ programmeId: "", number: "", startDate: "" }); fetch_(); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: C.text }}>🏫 Programmes & Batches</h2>
        <button style={qBtn} onClick={() => setShowForm(!showForm)}>+ Add Programme</button>
      </div>

      {showForm && (
        <div style={card}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><Label text="Code" /><input className={inputCls} placeholder="PGP" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label text="Name" /><input className={inputCls} placeholder="PGDM" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label text="Full Name" /><input className={inputCls} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
          </div>
          <button style={{ ...pBtn, maxWidth: 160 }} onClick={addProg}>Create</button>
        </div>
      )}

      {programmes.map(p => (
        <div key={p.id} style={card}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-lg font-semibold" style={{ color: C.text }}>{p.name} <span className="text-sm" style={{ color: C.accentS }}>({p.code})</span></div>
              <div className="text-sm" style={{ color: C.muted }}>{p.fullName}</div>
            </div>
          </div>
          {p.Term && p.Term.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {p.Term.map(t => <span key={t.id} className="badge-success">T{t.number}</span>)}
            </div>
          )}
          {p.batches.map(b => (
            <div key={b.id} className="pt-3 mt-3 border-t" style={{ borderColor: C.border }}>
              <div className="font-semibold text-sm" style={{ color: C.text }}>{b.name}</div>
              <div className="text-xs mt-1" style={{ color: C.muted }}>{b._count.students} students · Divs: {b.divisions.map(d => d.name).join(", ") || "—"}</div>
              {b.activeTermId && <div className="mt-2"><span className="badge-success">Active: T{p.Term?.find(t => t.id === b.activeTermId)?.number}</span></div>}
            </div>
          ))}
        </div>
      ))}

      <div style={card}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: C.sub }}>Quick Add</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label text="Add Batch" />
            <div className="flex gap-2 flex-wrap">
              <select className={inputCls} style={{ flex: 1 }} value={batchForm.programmeId} onChange={e => setBatchForm({ ...batchForm, programmeId: e.target.value })}><option value="">Programme</option>{programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input className={inputCls} style={{ width: 80 }} placeholder="Start" value={batchForm.startYear} onChange={e => setBatchForm({ ...batchForm, startYear: e.target.value })} />
              <input className={inputCls} style={{ width: 80 }} placeholder="End"   value={batchForm.endYear}   onChange={e => setBatchForm({ ...batchForm, endYear:   e.target.value })} />
              <input className={inputCls} style={{ flex: 1 }}   placeholder="Name"  value={batchForm.name}      onChange={e => setBatchForm({ ...batchForm, name:      e.target.value })} />
              <button style={qBtn} onClick={addBatch}>Add</button>
            </div>
          </div>
          <div>
            <Label text="Add Term" />
            <div className="flex gap-2">
              <select className={inputCls} style={{ flex: 1 }} value={termForm.programmeId} onChange={e => setTermForm({ ...termForm, programmeId: e.target.value })}><option value="">Programme</option>{programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input className={inputCls} style={{ width: 60 }}  placeholder="#"    value={termForm.number}    onChange={e => setTermForm({ ...termForm, number:    e.target.value })} />
              <input className={inputCls} style={{ width: 140 }} type="date"        value={termForm.startDate} onChange={e => setTermForm({ ...termForm, startDate: e.target.value })} />
              <button style={qBtn} onClick={addTerm}>Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Divisions Tab ────────────────────────────────────── */
function DivisionsTab() {
  const [divisions, setDivisions]         = useState<Division[]>([]);
  const [batches, setBatches]             = useState<Batch[]>([]);
  const [specialisations, setSpecialisations] = useState<Specialisation[]>([]);
  const [form, setForm]                   = useState({ name: "", type: "core", batchId: "", specialisationId: "" });
  const [error, setError]                 = useState("");
  const fetchAll = useCallback(async () => {
    const [dR, bR, sR] = await Promise.all([fetch("/api/admin/divisions"), fetch("/api/admin/batches"), fetch("/api/admin/specialisations")]);
    setDivisions(await dR.json()); setBatches(await bR.json()); setSpecialisations(await sR.json());
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selSpec   = specialisations.find(s => s.id === parseInt(form.specialisationId));
  const preview   = form.type === "specialisation" && selSpec && form.name ? `${selSpec.code}-${form.name}` : form.name;
  const addDiv    = async () => {
    setError("");
    const res = await fetch("/api/admin/divisions", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, type: form.type, batchId: form.type === "core" && form.batchId ? parseInt(form.batchId) : null, specialisationId: form.type === "specialisation" && form.specialisationId ? parseInt(form.specialisationId) : null }) });
    if (res.ok) { setForm({ name: "", type: "core", batchId: "", specialisationId: "" }); fetchAll(); }
    else { setError((await res.json()).error); }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4" style={{ color: C.text }}>🏷️ Divisions</h2>
      <div style={card}>
        <Label text="Add Division" />
        <Err msg={error} />
        <div className="flex gap-2 items-end flex-wrap">
          <select className={inputCls} style={{ width: 150 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="core">Core</option><option value="specialisation">Spec</option></select>
          {form.type === "core"
            ? <select className={inputCls} style={{ flex: 1 }} value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}><option value="">Batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            : <select className={inputCls} style={{ flex: 1 }} value={form.specialisationId} onChange={e => setForm({ ...form, specialisationId: e.target.value })}><option value="">Spec</option>{specialisations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select>}
          <input className={inputCls} style={{ width: 100 }} placeholder="e.g., A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          {form.type === "specialisation" && preview && <span className="text-sm" style={{ color: C.accentS }}>→ {preview}</span>}
          <button style={qBtn} onClick={addDiv}>Add</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[["core","Core","coreStudents"],["specialisation","Specialisation","specStudents"]].map(([type, title, countKey]) => (
          <div key={type} style={card}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: C.sub }}>{title}</h3>
            <table className="tw-table">
              <thead><tr><th>Name</th><th>{type === "core" ? "Batch" : "Spec"}</th><th>Students</th></tr></thead>
              <tbody>
                {divisions.filter(d => d.type === type).map(d => (
                  <tr key={d.id}>
                    <td className="font-medium" style={{ color: C.text }}>{d.name}</td>
                    <td style={{ color: C.sub }}>{type === "core" ? (d.batch?.name || "—") : (d.specialisation?.name || "—")}</td>
                    <td style={{ color: C.sub }}>{(d._count as any)?.[countKey] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Specialisations Tab ──────────────────────────────── */
function SpecialisationsTab() {
  const [specs, setSpecs] = useState<(Specialisation & { divisions: Division[] })[]>([]);
  const [form, setForm]   = useState({ name: "", code: "" });
  const fetch_ = useCallback(async () => { setSpecs(await (await fetch("/api/admin/specialisations")).json()); }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  const addSpec = async () => { await fetch("/api/admin/specialisations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); setForm({ name: "", code: "" }); fetch_(); };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4" style={{ color: C.text }}>⭐ Specialisations</h2>
      <div style={card}>
        <div className="flex gap-2">
          <input className={inputCls} style={{ flex: 1 }}   placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} style={{ width: 100 }} placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <button style={qBtn} onClick={addSpec}>Add</button>
        </div>
      </div>
      {specs.map(s => (
        <div key={s.id} style={card}>
          <div className="text-lg font-semibold mb-2" style={{ color: C.text }}>{s.name} <span className="text-sm" style={{ color: C.accentS }}>({s.code})</span></div>
          {s.divisions?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {s.divisions.map(d => <span key={d.id} className="badge-warning" title={d.batch?.programme?.name}>{d.name} <span className="opacity-60 text-[10px]">({d.batch?.name || "?"})</span></span>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Courses Tab ──────────────────────────────────────── */
function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [terms, setTerms]     = useState<Term[]>([]);
  const [specs, setSpecs]     = useState<Specialisation[]>([]);
  const empty = { code: "", name: "", credits: "3", termId: "", type: "core", specialisationId: "" };
  const [form, setForm]       = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const PER = 20;
  const fetchAll = useCallback(async () => {
    const [cR, tR, sR] = await Promise.all([fetch("/api/admin/courses"), fetch("/api/admin/terms"), fetch("/api/admin/specialisations")]);
    setCourses(await cR.json()); setTerms(await tR.json()); setSpecs(await sR.json());
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sesMap: Record<string,number> = { "1": 9, "2": 18, "3": 26, "4": 35 };
  const save = async () => {
    setError("");
    const payload = { code: form.code, name: form.name, credits: parseInt(form.credits), totalSessions: sesMap[form.credits] || 26, termId: form.termId ? parseInt(form.termId) : null, type: form.type, specialisationId: form.type === "specialisation" && form.specialisationId ? parseInt(form.specialisationId) : null };
    const res = editingId
      ? await fetch("/api/admin/courses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...payload }) })
      : await fetch("/api/admin/courses", { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setForm(empty); setEditingId(null); fetchAll(); }
    else { setError((await res.json()).error); }
  };

  const filtered   = courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()) || c.type.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER);
  const paged      = filtered.slice((page - 1) * PER, page * PER);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: C.text }}>📘 Courses</h2>
        <input type="text" className={inputCls} placeholder="Search courses..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ padding: "6px 12px", width: 250 }} />
      </div>

      <div style={card}>
        <Label text={editingId ? "✏️ Edit Course" : "Add Course"} />
        <Err msg={error} />
        <div className="flex gap-2 flex-wrap items-end">
          <input className={inputCls} style={{ width: 100 }} placeholder="Code"  value={form.code}   onChange={e => setForm({ ...form, code: e.target.value })} />
          <input className={inputCls} style={{ flex: 1 }}   placeholder="Name"  value={form.name}   onChange={e => setForm({ ...form, name: e.target.value })} />
          <select className={inputCls} style={{ width: 80 }} value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })}>
            {["1","2","3","4"].map(c => <option key={c} value={c}>{c}cr</option>)}
          </select>
          <span className="text-xs self-center" style={{ color: C.muted }}>({sesMap[form.credits]}s)</span>
          <select className={inputCls} style={{ width: 110 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value, specialisationId: "" })}>
            <option value="core">Core</option><option value="specialisation">Spec</option><option value="elective">Elective</option>
          </select>
          {form.type === "specialisation" && (
            <select className={inputCls} style={{ width: 180 }} value={form.specialisationId} onChange={e => setForm({ ...form, specialisationId: e.target.value })}>
              <option value="">Spec...</option>{specs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <select className={inputCls} style={{ flex: 1 }} value={form.termId} onChange={e => setForm({ ...form, termId: e.target.value })}>
            <option value="">No Term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.programme?.name} — T{t.number}</option>)}
          </select>
          <button style={qBtn} onClick={save}>{editingId ? "Save" : "Add"}</button>
          {editingId && <button style={qBtn} onClick={() => { setEditingId(null); setForm(empty); }}>✕</button>}
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
        <table className="tw-table">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Cr</th><th>Sess</th><th>Spec</th><th>Term</th><th></th></tr></thead>
          <tbody>
            {paged.map(c => (
              <tr key={c.id}>
                <td className="font-medium" style={{ color: C.text }}>{c.code}</td>
                <td style={{ color: C.text }}>{c.name}</td>
                <td><span className={c.type === "core" ? "badge-success" : c.type === "specialisation" ? "badge-warning" : "badge-danger"}>{c.type}</span></td>
                <td style={{ color: C.sub }}>{c.credits}</td>
                <td style={{ color: C.sub }}>{c.totalSessions}</td>
                <td style={{ color: C.sub }}>{c.specialisation?.name || "—"}</td>
                <td style={{ color: C.sub }}>{c.term ? `${c.term.programme?.name} — T${c.term.number}` : "—"}</td>
                <td><button style={{ ...qBtn, padding: "3px 10px", fontSize: 11 }} onClick={() => { setEditingId(c.id); setForm({ code: c.code, name: c.name, credits: c.credits.toString(), termId: c.termId?.toString() || "", type: c.type, specialisationId: c.specialisationId?.toString() || "" }); }}>✏️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={totalPages} onChange={setPage} />
    </div>
  );
}

/* ─── Faculty Tab ──────────────────────────────────────── */
function FacultyTab() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const empty = { name: "", email: "", teachingArea: "" };
  const [form, setForm]       = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const PER = 20;
  const fetch_ = useCallback(async () => { setFaculty(await (await fetch("/api/admin/faculty")).json()); }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const save = async () => {
    setError("");
    const res = editingId
      ? await fetch("/api/admin/faculty", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...form }) })
      : await fetch("/api/admin/faculty", { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setForm(empty); setEditingId(null); fetch_(); }
    else { setError((await res.json()).error); }
  };

  const AREAS = ["Finance and Accounting","Marketing","Information Management and Analytics","Operations Supply Chain Management & Quantitative Methods","Economics & Policy","Organisation & Leadership Studies","Strategy"];
  const filtered   = faculty.filter((f: any) => f.name.toLowerCase().includes(search.toLowerCase()) || (f.email || "").toLowerCase().includes(search.toLowerCase()) || (f.teachingArea || "").toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER);
  const paged      = filtered.slice((page - 1) * PER, page * PER);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: C.text }}>👨‍🏫 Faculty</h2>
        <input type="text" className={inputCls} placeholder="Search faculty..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ padding: "6px 12px", width: 250 }} />
      </div>
      <div style={card}>
        <Label text={editingId ? "✏️ Edit" : "Add Faculty"} />
        <Err msg={error} />
        <div className="flex gap-2 flex-wrap">
          <input className={inputCls} style={{ flex: 1 }}   placeholder="Name"  value={form.name}         onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} style={{ flex: 1 }}   placeholder="Email" value={form.email}        onChange={e => setForm({ ...form, email: e.target.value })} />
          <select className={inputCls} style={{ width: 220 }} value={form.teachingArea} onChange={e => setForm({ ...form, teachingArea: e.target.value })}>
            <option value="">Teaching Area</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button style={qBtn} onClick={save}>{editingId ? "Save" : "Add"}</button>
          {editingId && <button style={qBtn} onClick={() => { setEditingId(null); setForm(empty); }}>✕</button>}
        </div>
      </div>
      <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
        <table className="tw-table">
          <thead><tr><th>Name</th><th>Email</th><th>Teaching Area</th><th>Courses</th><th>Slots</th><th></th></tr></thead>
          <tbody>
            {paged.map((f: any) => (
              <tr key={f.id}>
                <td className="font-medium" style={{ color: C.text }}>{f.name}</td>
                <td style={{ color: C.sub }}>{f.email}</td>
                <td className="text-xs" style={{ color: C.sub }}>{f.teachingArea || "—"}</td>
                <td style={{ color: C.sub }}>{f._count?.courses || 0}</td>
                <td style={{ color: C.sub }}>{f._count?.timetable || 0}</td>
                <td><button style={{ ...qBtn, padding: "3px 10px", fontSize: 11 }} onClick={() => { setEditingId(f.id); setForm({ name: f.name, email: f.email, teachingArea: f.teachingArea || "" }); }}>✏️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={totalPages} onChange={setPage} />
    </div>
  );
}

/* ─── Timetable Tab ────────────────────────────────────── */
function TimetableTab() {
  const [entries, setEntries]     = useState<TimetableEntry[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [courses, setCourses]     = useState<Course[]>([]);
  const [faculty, setFaculty]     = useState<Faculty[]>([]);
  const [filterDiv, setFilterDiv] = useState("");
  const [viewMode, setViewMode]   = useState<"list"|"calendar">("calendar");
  const [weekOffset, setWeekOffset] = useState(0);
  const todayStr = new Date().toISOString().split("T")[0];
  const [form, setForm]           = useState({ divisionId: "", courseId: "", facultyId: "", date: todayStr, slotNumber: "1" });
  const [error, setError]         = useState("");

  const getWeekDates = (offset: number) => {
    const ref = new Date(); ref.setDate(ref.getDate() + offset * 7);
    const dow = ref.getDay(); const mon = new Date(ref); mon.setDate(ref.getDate() + (dow === 0 ? -6 : 1 - dow));
    return Array.from({ length: 6 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d.toISOString().split("T")[0]; });
  };
  const weekDates = getWeekDates(weekOffset);
  const [weekStart, weekEnd] = [weekDates[0], weekDates[5]];

  const fetchAll = useCallback(async () => {
    const [tR, dR, cR, fR] = await Promise.all([fetch(`/api/admin/timetable?weekOf=${weekStart}`), fetch("/api/admin/divisions"), fetch("/api/admin/courses"), fetch("/api/admin/faculty")]);
    setEntries(await tR.json()); setDivisions(await dR.json()); setCourses(await cR.json()); setFaculty(await fR.json());
  }, [weekStart]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addEntry    = async () => { setError(""); const res = await fetch("/api/admin/timetable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ divisionId: parseInt(form.divisionId), courseId: parseInt(form.courseId), facultyId: form.facultyId ? parseInt(form.facultyId) : null, date: form.date, slotNumber: parseInt(form.slotNumber) }) }); if (res.ok) { setForm({ ...form, courseId: "", facultyId: "" }); fetchAll(); } else { setError((await res.json()).error); } };
  const deleteEntry = async (id: number) => { await fetch(`/api/admin/timetable?id=${id}`, { method: "DELETE" }); fetchAll(); };

  const selDiv      = divisions.find(d => d.id === parseInt(form.divisionId || filterDiv));
  const filtCourses = selDiv ? courses.filter(c => selDiv.type === "core" ? c.type === "core" : (c.type === "specialisation" && c.specialisationId === selDiv.specialisationId)) : courses;
  const filtEntries = filterDiv ? entries.filter(e => e.divisionId === parseInt(filterDiv)) : entries;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: C.text }}>📅 Timetable</h2>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: C.sec }}>
          {(["calendar","list"] as const).map(m => (
            <button key={m} style={{ ...qBtn, background: viewMode === m ? C.card : "transparent", border: viewMode === m ? `1px solid ${C.border}` : "1px solid transparent" }} onClick={() => setViewMode(m)}>
              {m === "calendar" ? "📅 Calendar" : "📋 List"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button style={qBtn} onClick={() => setWeekOffset(weekOffset - 1)}>◀ Prev</button>
        <span className="text-sm font-semibold" style={{ color: C.text }}>{weekStart} — {weekEnd}</span>
        <button style={qBtn} onClick={() => setWeekOffset(weekOffset + 1)}>Next ▶</button>
        {weekOffset !== 0 && <button style={qBtn} onClick={() => setWeekOffset(0)}>Current Week</button>}
      </div>

      <div style={card}>
        <Label text="Add Timetable Entry" />
        <Err msg={error} />
        <div className="flex gap-2 flex-wrap items-end">
          <select className={inputCls} style={{ width: 140 }} value={form.divisionId} onChange={e => { setForm({ ...form, divisionId: e.target.value, courseId: "" }); setFilterDiv(e.target.value); }}><option value="">Division</option>{divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select className={inputCls} style={{ width: 200 }} value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value, facultyId: "" })}><option value="">Course</option>{filtCourses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select>
          <select className={inputCls} style={{ width: 180 }} value={form.facultyId} onChange={e => setForm({ ...form, facultyId: e.target.value })}><option value="">Faculty (optional)</option>{faculty.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <input type="date" className={inputCls} style={{ width: 140 }} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <select className={inputCls} style={{ width: 160 }} value={form.slotNumber} onChange={e => setForm({ ...form, slotNumber: e.target.value })}>{FIXED_SLOTS.map(s => <option key={s.slot} value={s.slot}>Slot {s.slot} ({s.start})</option>)}</select>
          <button style={qBtn} onClick={addEntry}>Add</button>
        </div>
      </div>

      <div className="mb-3">
        <select className={inputCls} style={{ width: 200 }} value={filterDiv} onChange={e => setFilterDiv(e.target.value)}><option value="">All Divisions (filter)</option>{divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
          <table className="tw-table">
            <thead><tr><th>Division</th><th>Date</th><th>Slot</th><th>Time</th><th>Course</th><th>Faculty</th><th></th></tr></thead>
            <tbody>
              {filtEntries.map(e => (
                <tr key={e.id}>
                  <td className="font-medium" style={{ color: C.text }}>{e.division.name}</td>
                  <td style={{ color: C.sub }}>{e.date}</td>
                  <td style={{ color: C.sub }}>{e.slotNumber}</td>
                  <td style={{ color: C.sub }}>{e.startTime}–{e.endTime}</td>
                  <td style={{ color: C.text }}>{e.course.code} — {e.course.name}</td>
                  <td style={{ color: e.faculty ? C.text : C.muted }}>{e.faculty?.name || "—"}</td>
                  <td>
                    <button style={{ ...qBtn, padding: "3px 8px", fontSize: 11, color: e.isConducted ? C.muted : C.danger, opacity: e.isConducted ? 0.4 : 1, cursor: e.isConducted ? "not-allowed" : "pointer" }}
                      onClick={() => !e.isConducted && deleteEntry(e.id)} disabled={e.isConducted}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-xs overflow-x-auto" style={{ display: "grid", gridTemplateColumns: "80px repeat(6,1fr)", gap: 2 }}>
          <div className="p-2 font-bold" style={{ color: C.muted }}>Slot</div>
          {weekDates.map((date, i) => (
            <div key={date} className="p-2 font-bold text-center rounded" style={{ background: date === todayStr ? C.accentG : "transparent", color: date === todayStr ? C.accentS : C.text }}>
              {["Mon","Tue","Wed","Thu","Fri","Sat"][i]}<br /><span className="font-normal" style={{ fontSize: 11, color: C.muted }}>{date.slice(5)}</span>
            </div>
          ))}
          {FIXED_SLOTS.map(slotDef => (
            <React.Fragment key={slotDef.slot}>
              <div className="flex flex-col justify-center" style={{ padding: "10px 6px", borderTop: `1px solid ${C.border}`, color: C.muted }}>
                <div className="font-semibold">S{slotDef.slot}</div><div>{slotDef.label}</div>
              </div>
              {weekDates.map(date => {
                const dayEntries = filtEntries.filter(e => e.date === date && e.slotNumber === slotDef.slot);
                return (
                  <div key={`${date}-${slotDef.slot}`} className="flex flex-col gap-1" style={{ padding: 4, borderTop: `1px solid ${C.border}` }}>
                    {dayEntries.map(entry => (
                      <div key={entry.id} className="rounded relative" style={{ padding: 6, background: C.sec }}>
                        <div className="font-bold" style={{ fontSize: 11, color: C.text }}>{entry.course.code}</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Div {entry.division.name}</div>
                        {entry.faculty && <div style={{ fontSize: 10, color: C.accentS }}>{entry.faculty.name}</div>}
                        {entry.isConducted
                          ? <span className="absolute top-1 right-1.5 text-[10px]" style={{ color: C.success }} title="Conducted">✓</span>
                          : <button onClick={() => deleteEntry(entry.id)} className="absolute top-1 right-1 bg-transparent border-0 cursor-pointer" style={{ fontSize: 12, color: C.danger }}>✕</button>}
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
