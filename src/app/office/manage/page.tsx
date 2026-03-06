"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
interface TimetableEntry { id: number; divisionId: number; courseId: number; facultyId: number | null; roomId: number | null; date: string; slotNumber: number; startTime: string; endTime: string; isConducted: boolean; sessionNumber: number | null; division: Division; course: Course; faculty?: Faculty | null; room?: { id: number; name: string } | null; }
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

const inputCls = "tw-input";

function Label({ text }: { text: string }) {
  return <label className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-[var(--color-text-secondary)]">{text}</label>;
}
function Err({ msg }: { msg: string }) {
  return msg ? <p className="text-sm mb-3 text-[var(--color-danger)]">{msg}</p> : null;
}
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex gap-2 justify-center mt-4">
      <Button size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>Prev</Button>
      <span className="self-center text-sm text-[var(--color-text-secondary)]">Page {page} of {total}</span>
      <Button size="sm" disabled={page === total} onClick={() => onChange(page + 1)}>Next</Button>
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
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Manage</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 border-b overflow-x-auto border-[var(--color-border)]">
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap cursor-pointer border-0 transition-colors"
              style={{
                background: active ? "varvar(--color-accent-glow)" : "transparent",
                borderBottom: active ? "2px solid varvar(--color-accent)" : "2px solid transparent",
                color: active ? "varvar(--color-accent-sec)" : "varvar(--color-text-secondary)",
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
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">🎓 Students ({students.length})</h2>
        <div className="flex gap-2 items-center">
          <input type="text" className={inputCls} placeholder="Search by name, roll, or batch..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ padding: "6px 12px", width: 280 }} />
          <Button size="sm" onClick={() => { setEditingId(null); setForm(empty); setShowForm(!showForm); }}>+ Add</Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}>📤 Bulk</Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("file", f); await fetch("/api/admin/students/upload", { method: "POST", body: fd }); fetchAll(); e.target.value = ""; }} />
        </div>
      </div>

      {showForm && (
        <Card className={`mb-5 ${editingId ? "border-[var(--color-accent)]" : ""}`}>
          <h3 className="text-sm font-medium mb-3 text-[var(--color-text-secondary)]">{editingId ? "✏️ Edit Student" : "➕ Add Student"}</h3>
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
            <Button variant="primary" className="max-w-[160px]" onClick={handleSave}>{editingId ? "Save" : "Add"}</Button>
            <Button size="sm" onClick={() => { setEditingId(null); setForm(empty); setShowForm(false); setError(""); }}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="rounded-2xl border overflow-hidden bg-[var(--color-bg-card)] border-[var(--color-border)]">
        <table className="tw-table">
          <thead><tr><th>Roll</th><th>Name</th><th>Batch</th><th>Div</th><th>Spec</th><th>S.Div</th><th></th></tr></thead>
          <tbody>
            {paged.map(s => (
              <tr key={s.id}>
                <td className="font-medium text-[var(--color-text-primary)]">{s.rollNumber}</td>
                <td className="text-[var(--color-text-primary)]">{s.name}</td>
                <td className="text-xs text-[var(--color-text-secondary)]">{s.batch?.name || "—"}</td>
                <td className="text-[var(--color-text-secondary)]">{s.coreDivision?.name || "—"}</td>
                <td className="text-[var(--color-text-secondary)]">{s.specialisation?.name || "—"}</td>
                <td className="text-[var(--color-text-secondary)]">{s.specDivision?.name || "—"}</td>
                <td><Button size="sm" className="px-2.5 py-0.5" style={{ fontSize: 11 }} onClick={() => startEdit(s)}>✏️</Button></td>
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
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">🏫 Programmes & Batches</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>+ Add Programme</Button>
      </div>

      {showForm && (
        <Card className="mb-5">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><Label text="Code" /><input className={inputCls} placeholder="PGP" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label text="Name" /><input className={inputCls} placeholder="PGDM" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label text="Full Name" /><input className={inputCls} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
          </div>
          <Button variant="primary" className="max-w-[160px]" onClick={addProg}>Create</Button>
        </Card>
      )}

      {programmes.map(p => (
        <Card key={p.id} className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-lg font-semibold text-[var(--color-text-primary)]">{p.name} <span className="text-sm text-[var(--color-accent-sec)]">({p.code})</span></div>
              <div className="text-sm text-[var(--color-text-muted)]">{p.fullName}</div>
            </div>
          </div>
          {p.Term && p.Term.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {p.Term.map(t => <span key={t.id} className="badge-success">T{t.number}</span>)}
            </div>
          )}
          {p.batches.map(b => (
            <div key={b.id} className="pt-3 mt-3 border-t border-[var(--color-border)]">
              <div className="font-semibold text-sm text-[var(--color-text-primary)]">{b.name}</div>
              <div className="text-xs mt-1 text-[var(--color-text-muted)]">{b._count.students} students · Divs: {b.divisions.map(d => d.name).join(", ") || "—"}</div>
              {b.activeTermId && <div className="mt-2"><span className="badge-success">Active: T{p.Term?.find(t => t.id === b.activeTermId)?.number}</span></div>}
            </div>
          ))}
        </Card>
      ))}

      <Card className="mb-5">
        <h3 className="text-sm font-semibold mb-4 text-[var(--color-text-secondary)]">Quick Add</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label text="Add Batch" />
            <div className="flex gap-2 flex-wrap">
              <select className={inputCls} style={{ flex: 1 }} value={batchForm.programmeId} onChange={e => setBatchForm({ ...batchForm, programmeId: e.target.value })}><option value="">Programme</option>{programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input className={inputCls} style={{ width: 80 }} placeholder="Start" value={batchForm.startYear} onChange={e => setBatchForm({ ...batchForm, startYear: e.target.value })} />
              <input className={inputCls} style={{ width: 80 }} placeholder="End"   value={batchForm.endYear}   onChange={e => setBatchForm({ ...batchForm, endYear:   e.target.value })} />
              <input className={inputCls} style={{ flex: 1 }}   placeholder="Name"  value={batchForm.name}      onChange={e => setBatchForm({ ...batchForm, name:      e.target.value })} />
              <Button size="sm" onClick={addBatch}>Add</Button>
            </div>
          </div>
          <div>
            <Label text="Add Term" />
            <div className="flex gap-2">
              <select className={inputCls} style={{ flex: 1 }} value={termForm.programmeId} onChange={e => setTermForm({ ...termForm, programmeId: e.target.value })}><option value="">Programme</option>{programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input className={inputCls} style={{ width: 60 }}  placeholder="#"    value={termForm.number}    onChange={e => setTermForm({ ...termForm, number:    e.target.value })} />
              <input className={inputCls} style={{ width: 140 }} type="date"        value={termForm.startDate} onChange={e => setTermForm({ ...termForm, startDate: e.target.value })} />
              <Button size="sm" onClick={addTerm}>Add</Button>
            </div>
          </div>
        </div>
      </Card>
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
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">🏷️ Divisions</h2>
      <Card className="mb-5">
        <Label text="Add Division" />
        <Err msg={error} />
        <div className="flex gap-2 items-end flex-wrap">
          <select className={inputCls} style={{ width: 150 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="core">Core</option><option value="specialisation">Spec</option></select>
          {form.type === "core"
            ? <select className={inputCls} style={{ flex: 1 }} value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}><option value="">Batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            : <select className={inputCls} style={{ flex: 1 }} value={form.specialisationId} onChange={e => setForm({ ...form, specialisationId: e.target.value })}><option value="">Spec</option>{specialisations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select>}
          <input className={inputCls} style={{ width: 100 }} placeholder="e.g., A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          {form.type === "specialisation" && preview && <span className="text-sm text-[var(--color-accent-sec)]">→ {preview}</span>}
          <Button size="sm" onClick={addDiv}>Add</Button>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        {[["core","Core","coreStudents"],["specialisation","Specialisation","specStudents"]].map(([type, title, countKey]) => (
          <Card key={type}>
            <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">{title}</h3>
            <table className="tw-table">
              <thead><tr><th>Name</th><th>{type === "core" ? "Batch" : "Spec"}</th><th>Students</th></tr></thead>
              <tbody>
                {divisions.filter(d => d.type === type).map(d => (
                  <tr key={d.id}>
                    <td className="font-medium text-[var(--color-text-primary)]">{d.name}</td>
                    <td className="text-[var(--color-text-secondary)]">{type === "core" ? (d.batch?.name || "—") : (d.specialisation?.name || "—")}</td>
                    <td className="text-[var(--color-text-secondary)]">{(d._count as any)?.[countKey] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
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
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Specialisations</h2>
      <Card className="mb-5">
        <div className="flex gap-2">
          <input className={inputCls} style={{ flex: 1 }}   placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} style={{ width: 100 }} placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <Button size="sm" onClick={addSpec}>Add</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specs.map(s => (
          <div key={s.id} className="rounded-2xl border p-5 flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <div className="text-xl font-bold mb-1 text-[var(--color-text-primary)]">{s.name}</div>
            <div className="text-sm font-semibold mb-5 text-[var(--color-accent-sec)]">Code: {s.code}</div>

            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--color-text-secondary)]">Associated Divisions</div>
              {s.divisions?.length && s.divisions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {s.divisions.map(d => (
                    <span key={d.id} className="px-3 py-1.5 rounded-lg text-sm font-medium border shadow-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                      {d.name.replace(/^[^-]+-/, '')} <span className="opacity-50 text-[10px] ml-1">Mixed</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm italic text-[var(--color-text-muted)]">No divisions yet</div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t flex justify-between items-center border-[var(--color-border)]">
               <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Total Capacity</span>
               <span className="text-base font-bold text-[var(--color-text-primary)]">{s.divisions?.length || 0} Divs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Courses Tab ──────────────────────────────────────── */
function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [terms, setTerms]     = useState<Term[]>([]);
  const [specs, setSpecs]     = useState<Specialisation[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const empty = { code: "", name: "", credits: "3", termIds: [] as string[], type: "core", specialisationId: "", facultyIds: [] as string[] };
  const [form, setForm]       = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const PER = 20;

  const fetchAll = useCallback(async () => {
    const [cR, tR, sR, fR] = await Promise.all([
      fetch("/api/admin/courses"), fetch("/api/admin/terms"),
      fetch("/api/admin/specialisations"), fetch("/api/admin/faculty")
    ]);
    setCourses(await cR.json()); setTerms(await tR.json()); setSpecs(await sR.json()); setFaculty(await fR.json());
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sesMap: Record<string,number> = { "1": 9, "2": 18, "3": 26, "4": 35 };

  const handleFacultyToggle = (fId: number) => {
    const idStr = fId.toString();
    setForm(prev => ({
      ...prev,
      facultyIds: prev.facultyIds.includes(idStr)
        ? prev.facultyIds.filter(id => id !== idStr)
        : [...prev.facultyIds, idStr]
    }));
  };

  const handleTermToggle = (tId: number) => {
    const idStr = tId.toString();
    setForm(prev => ({
      ...prev,
      termIds: prev.termIds.includes(idStr)
        ? prev.termIds.filter(id => id !== idStr)
        : [...prev.termIds, idStr]
    }));
  };

  const save = async () => {
    setError("");
    const payload = {
      code: form.code, name: form.name, credits: parseInt(form.credits),
      totalSessions: sesMap[form.credits] || 26,
      termIds: form.termIds,
      type: form.type,
      specialisationId: form.type === "specialisation" && form.specialisationId ? parseInt(form.specialisationId) : null,
      facultyIds: form.facultyIds
    };
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
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">📘 Courses</h2>
        <input type="text" className={inputCls} placeholder="Search courses..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ padding: "6px 12px", width: 250 }} />
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] p-6 mb-6 shadow-2xl relative overflow-hidden bg-[var(--color-bg-card)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <h3 className="text-xl font-bold text-[var(--color-accent-sec)] mb-6">
          {editingId ? "✏️ Edit Course" : "✨ Add New Course"}
        </h3>

        <Err msg={error} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 mb-6 relative z-10">

          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Course Code</label>
            <input className="tw-input rounded-xl" placeholder="FIN101" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          </div>

          <div className="lg:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Course Name</label>
            <input className="tw-input rounded-xl" placeholder="Financial Accounting" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Credits</label>
            <div className="flex gap-2 items-center">
              <select className="tw-input flex-1 rounded-xl cursor-pointer" value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })}>
                {["1","2","3","4"].map(c => <option key={c} value={c}>{c} Credits</option>)}
              </select>
            </div>
            <div className="text-[10px] font-medium px-1 text-[var(--color-text-muted)]">({sesMap[form.credits]} mandatory sessions)</div>
          </div>

          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Type</label>
            <select className="tw-input rounded-xl cursor-pointer" value={form.type} onChange={e => setForm({ ...form, type: e.target.value, specialisationId: "" })}>
              <option value="core">Core</option><option value="specialisation">Specialisation</option><option value="elective">Elective</option>
            </select>
          </div>

          {form.type === "specialisation" && (
            <div className="lg:col-span-12 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-sec)]">Select Specialisation</label>
              <select className="tw-input w-full lg:w-1/3 rounded-xl cursor-pointer" value={form.specialisationId} onChange={e => setForm({ ...form, specialisationId: e.target.value })}>
                <option value="">Choose a Specialisation...</option>{specs.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
          )}

          <div className="lg:col-span-6 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider flex justify-between text-[var(--color-text-muted)]">
              <span>Mapped Terms</span>
              <span className="text-[var(--color-accent-sec)] font-bold">{form.termIds.length} Selected</span>
            </label>
            <div className="flex flex-col gap-1.5 h-48 overflow-y-auto px-2 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              {terms.length === 0 ? <p className="text-xs text-center p-4 italic text-[var(--color-text-muted)]">No terms available. Create one in Programmes.</p> : null}
              {terms.map(t => (
                <label key={t.id} className={`flex items-center gap-3 text-sm p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
                  form.termIds.includes(t.id.toString())
                    ? 'bg-indigo-500/20 border-indigo-500/30 text-[var(--color-accent-sec)]'
                    : 'hover:bg-[var(--color-bg-card-hover)] border-transparent text-[var(--color-text-secondary)]'
                }`}>
                  <input type="checkbox" className="accent-indigo-500 w-4 h-4 rounded cursor-pointer" checked={form.termIds.includes(t.id.toString())} onChange={() => handleTermToggle(t.id)} />
                  <span className="truncate flex-1 font-medium">{t.programme?.code} <span className="opacity-50 mx-1">—</span> Term {t.number}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider flex justify-between text-[var(--color-text-muted)]">
              <span>Teaching Faculty</span>
              <span className="text-[var(--color-success)] font-bold">{form.facultyIds.length} Assigned</span>
            </label>
            <div className="flex flex-col gap-1.5 h-48 overflow-y-auto px-2 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              {faculty.length === 0 ? <p className="text-xs text-center p-4 italic text-[var(--color-text-muted)]">No faculty available. Add them in the Faculty tab.</p> : null}
              {faculty.map(f => (
                <label key={f.id} className={`flex items-center gap-3 text-sm p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
                  form.facultyIds.includes(f.id.toString())
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-[var(--color-success)]'
                    : 'hover:bg-[var(--color-bg-card-hover)] border-transparent text-[var(--color-text-secondary)]'
                }`}>
                  <input type="checkbox" className="accent-emerald-500 w-4 h-4 rounded cursor-pointer" checked={form.facultyIds.includes(f.id.toString())} onChange={() => handleFacultyToggle(f.id)} />
                  <div className="flex flex-col truncate">
                    <span className="font-medium">{f.name}</span>
                    {f.teachingArea && <span className="text-[10px] opacity-60 font-medium tracking-wide uppercase">{f.teachingArea}</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>

        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-[var(--color-border)] relative z-10 mt-6">
          {editingId && (
            <button className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] font-medium hover:bg-[var(--color-bg-card-hover)] transition-colors text-[var(--color-text-secondary)]" onClick={() => { setEditingId(null); setForm(empty); }}>
              Cancel
            </button>
          )}
          <button className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${editingId ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-indigo-500 to-violet-600"}`} onClick={save}>
            {editingId ? "Save Changes" : "Create Course"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-xl bg-[var(--color-bg-card)]">
        <table className="tw-table">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Credits &amp; Sessions</th><th className="w-64">Mapped Terms</th><th className="w-64">Faculty Assigned</th><th className="text-right">Action</th></tr></thead>
          <tbody>
            {paged.map((c: any) => (
              <tr key={c.id}>
                <td className="font-semibold whitespace-nowrap text-[var(--color-text-primary)]">{c.code}</td>
                <td className="font-medium text-[var(--color-text-primary)]">{c.name}</td>
                <td className="whitespace-nowrap">
                  <span className={`badge-${
                    c.type === "core" ? "success" :
                    c.type === "specialisation" ? "warning" : "danger"
                  }`}>{c.type}</span>
                </td>
                <td className="font-medium whitespace-nowrap text-[var(--color-text-secondary)]">
                  <span className="text-[var(--color-text-primary)]">{c.credits}</span> Cr <span className="opacity-50 mx-1">•</span> <span className="text-[var(--color-text-primary)]">{c.totalSessions}</span> Sess
                </td>
                <td>
                  {c.courseTerms && c.courseTerms.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                      {c.courseTerms.map((ct: any) => (
                        <span key={ct.termId} className="px-2 py-0.5 bg-[var(--color-accent-glow)] border border-[var(--color-border-glow)] text-[var(--color-accent-sec)] rounded text-[10px] font-semibold tracking-wide whitespace-nowrap" title={ct.term.programme?.name}>
                          {ct.term.programme?.code} <span className="opacity-60">T{ct.term.number}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {c.specialisation ? <span className="inline-block mt-2 px-2 py-0.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded text-[10px] font-medium max-w-[200px] truncate" title={c.specialisation.name}>{c.specialisation.name}</span> : null}
                  {(!c.courseTerms || c.courseTerms.length === 0) && !c.specialisation && <span className="italic text-xs text-[var(--color-text-muted)]">Unmapped</span>}
                </td>
                <td>
                  {c.facultyCourses && c.facultyCourses.length > 0 ? (
                    <div className="flex flex-col gap-1 max-w-[200px]">
                      {c.facultyCourses.map((fc: any) => (
                        <div key={fc.facultyId} className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] shrink-0 opacity-60"></div>
                          <span className="text-xs truncate cursor-default text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors" title={fc.faculty.name}>{fc.faculty.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="badge-danger text-[10px]">Unassigned</span>
                  )}
                </td>
                <td className="text-right whitespace-nowrap">
                  <button className="p-2 hover:bg-[var(--color-accent-glow)] text-[var(--color-accent-sec)] rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
                    title="Edit Course"
                    onClick={() => {
                      setEditingId(c.id);
                      setForm({
                        code: c.code, name: c.name, credits: c.credits.toString(),
                        termIds: c.courseTerms ? c.courseTerms.map((ct: any) => ct.termId.toString()) : [],
                        type: c.type,
                        specialisationId: c.specialisationId?.toString() || "",
                        facultyIds: c.facultyCourses ? c.facultyCourses.map((fc: any) => fc.facultyId.toString()) : []
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </td>
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
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">👨‍🏫 Faculty</h2>
        <input type="text" className={inputCls} placeholder="Search faculty..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ padding: "6px 12px", width: 250 }} />
      </div>
      <Card className="mb-5">
        <Label text={editingId ? "✏️ Edit" : "Add Faculty"} />
        <Err msg={error} />
        <div className="flex gap-2 flex-wrap">
          <input className={inputCls} style={{ flex: 1 }}   placeholder="Name"  value={form.name}         onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} style={{ flex: 1 }}   placeholder="Email" value={form.email}        onChange={e => setForm({ ...form, email: e.target.value })} />
          <select className={inputCls} style={{ width: 220 }} value={form.teachingArea} onChange={e => setForm({ ...form, teachingArea: e.target.value })}>
            <option value="">Teaching Area</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <Button size="sm" onClick={save}>{editingId ? "Save" : "Add"}</Button>
          {editingId && <Button size="sm" onClick={() => { setEditingId(null); setForm(empty); }}>✕</Button>}
        </div>
      </Card>
      <div className="rounded-2xl border overflow-hidden bg-[var(--color-bg-card)] border-[var(--color-border)]">
        <table className="tw-table">
          <thead><tr><th>Name</th><th>Email</th><th>Teaching Area</th><th>Courses</th><th>Slots</th><th></th></tr></thead>
          <tbody>
            {paged.map((f: any) => (
              <tr key={f.id}>
                <td className="font-medium text-[var(--color-text-primary)]">{f.name}</td>
                <td className="text-[var(--color-text-secondary)]">{f.email}</td>
                <td className="text-xs text-[var(--color-text-secondary)]">{f.teachingArea || "—"}</td>
                <td className="text-[var(--color-text-secondary)]">{f._count?.courses || 0}</td>
                <td className="text-[var(--color-text-secondary)]">{f._count?.timetable || 0}</td>
                <td><Button size="sm" className="px-2.5 py-0.5" style={{ fontSize: 11 }} onClick={() => { setEditingId(f.id); setForm({ name: f.name, email: f.email, teachingArea: f.teachingArea || "" }); }}>✏️</Button></td>
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
  const [rooms, setRooms]         = useState<Array<{ id: number; name: string }>>([]);
  const [filterDiv, setFilterDiv] = useState("");
  const [viewMode, setViewMode]   = useState<"list"|"calendar">("calendar");
  const [weekOffset, setWeekOffset] = useState(0);
  const todayStr = new Date().toISOString().split("T")[0];
  const [form, setForm]           = useState({ divisionId: "", courseId: "", facultyId: "", date: todayStr, slotNumber: "1", roomId: "" });
  const [error, setError]         = useState("");

  const getWeekDates = (offset: number) => {
    const ref = new Date(); ref.setDate(ref.getDate() + offset * 7);
    const dow = ref.getDay(); const mon = new Date(ref); mon.setDate(ref.getDate() + (dow === 0 ? -6 : 1 - dow));
    return Array.from({ length: 6 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d.toISOString().split("T")[0]; });
  };
  const weekDates = getWeekDates(weekOffset);
  const [weekStart, weekEnd] = [weekDates[0], weekDates[5]];

  const fetchAll = useCallback(async () => {
    const [tR, dR, cR, fR, rR] = await Promise.all([fetch(`/api/admin/timetable?weekOf=${weekStart}`), fetch("/api/admin/divisions"), fetch("/api/admin/courses"), fetch("/api/admin/faculty"), fetch("/api/admin/rooms")]);
    setEntries(await tR.json()); setDivisions(await dR.json()); setCourses(await cR.json()); setFaculty(await fR.json()); setRooms(await rR.json());
  }, [weekStart]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addEntry    = async () => { setError(""); const res = await fetch("/api/admin/timetable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ divisionId: parseInt(form.divisionId), courseId: parseInt(form.courseId), facultyId: form.facultyId ? parseInt(form.facultyId) : null, date: form.date, slotNumber: parseInt(form.slotNumber), roomId: form.roomId ? parseInt(form.roomId) : null }) }); if (res.ok) { setForm({ ...form, courseId: "", facultyId: "" }); fetchAll(); } else { setError((await res.json()).error); } };
  const deleteEntry = async (id: number) => { await fetch(`/api/admin/timetable?id=${id}`, { method: "DELETE" }); fetchAll(); };

  const selDiv      = divisions.find(d => d.id === parseInt(form.divisionId || filterDiv));
  const filtCourses = selDiv ? courses.filter(c => selDiv.type === "core" ? c.type === "core" : (c.type === "specialisation" && c.specialisationId === selDiv.specialisationId)) : courses;
  const filtEntries = filterDiv ? entries.filter(e => e.divisionId === parseInt(filterDiv)) : entries;

  // Filter faculties available based on the currently selected course
  const selectedCourseObj = courses.find(c => c.id === parseInt(form.courseId));
  const availableFaculties = selectedCourseObj && (selectedCourseObj as any).facultyCourses
    ? (selectedCourseObj as any).facultyCourses.map((fc: any) => fc.faculty)
    : faculty; // Fallback to all if course not selected or mappings missing

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">📅 Timetable</h2>
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-bg-secondary)]">
          {(["calendar","list"] as const).map(m => (
            <Button key={m} size="sm"
              className={viewMode === m ? "bg-[var(--color-bg-card)] border-[var(--color-border)]" : "bg-transparent border-transparent"}
              onClick={() => setViewMode(m)}>
              {m === "calendar" ? "📅 Calendar" : "📋 List"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Button size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>◀ Prev</Button>
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{weekStart} — {weekEnd}</span>
        <Button size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>Next ▶</Button>
        {weekOffset !== 0 && <Button size="sm" onClick={() => setWeekOffset(0)}>Current Week</Button>}
      </div>

      <Card className="mb-5">
        <Label text="Add Timetable Entry" />
        <Err msg={error} />
        <div className="flex gap-2 flex-wrap items-end">
          <select className={inputCls} style={{ width: 140 }} value={form.divisionId} onChange={e => { setForm({ ...form, divisionId: e.target.value, courseId: "", facultyId: "" }); setFilterDiv(e.target.value); }}><option value="">Division</option>{divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select className={inputCls} style={{ width: 200 }} value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value, facultyId: "" })}><option value="">Course</option>{filtCourses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select>
          <select className={inputCls} style={{ width: 180 }} value={form.facultyId} onChange={e => setForm({ ...form, facultyId: e.target.value })}>
            <option value="">Faculty (Required)</option>
            {availableFaculties.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input type="date" className={inputCls} style={{ width: 140 }} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <select className={inputCls} style={{ width: 160 }} value={form.slotNumber} onChange={e => setForm({ ...form, slotNumber: e.target.value })}>{FIXED_SLOTS.map(s => <option key={s.slot} value={s.slot}>Slot {s.slot} ({s.start})</option>)}</select>
          <select className={inputCls} style={{ width: 140 }} value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })}><option value="">Room</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <Button size="sm" onClick={addEntry} disabled={!form.divisionId || !form.courseId || !form.facultyId}>Add</Button>
        </div>
      </Card>

      <div className="mb-3">
        <select className={inputCls} style={{ width: 200 }} value={filterDiv} onChange={e => setFilterDiv(e.target.value)}><option value="">All Divisions (filter)</option>{divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-2xl border overflow-hidden bg-[var(--color-bg-card)] border-[var(--color-border)]">
          <table className="tw-table">
            <thead><tr><th>Division</th><th>Date</th><th>Slot</th><th>Time</th><th>Course</th><th>Faculty</th><th>Room</th><th></th></tr></thead>
            <tbody>
              {filtEntries.map(e => (
                <tr key={e.id}>
                  <td className="font-medium text-[var(--color-text-primary)]">{e.division.name}</td>
                  <td className="text-[var(--color-text-secondary)]">{e.date}</td>
                  <td className="text-[var(--color-text-secondary)]">{e.slotNumber}</td>
                  <td className="text-[var(--color-text-secondary)]">{e.startTime}–{e.endTime}</td>
                  <td className="text-[var(--color-text-primary)]">{e.course.code} — {e.course.name}</td>
                  <td className={e.faculty ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>{e.faculty?.name || "—"}</td>
                  <td className={e.room ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"}>{e.room?.name || "—"}</td>
                  <td>
                    <Button size="sm" className="px-2 py-0.5"
                      style={{ fontSize: 11, color: e.isConducted ? "varvar(--color-text-muted)" : "varvar(--color-danger)", opacity: e.isConducted ? 0.4 : 1, cursor: e.isConducted ? "not-allowed" : "pointer" }}
                      onClick={() => !e.isConducted && deleteEntry(e.id)} disabled={e.isConducted}>🗑</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-xs overflow-x-auto grid gap-0.5" style={{ gridTemplateColumns: "80px repeat(6,1fr)" }}>
          <div className="p-2 font-bold text-[var(--color-text-muted)]">Slot</div>
          {weekDates.map((date, i) => (
            <div key={date} className="p-2 font-bold text-center rounded"
              style={{
                background: date === todayStr ? "varvar(--color-accent-glow)" : "transparent",
                color: date === todayStr ? "varvar(--color-accent-sec)" : "varvar(--color-text-primary)",
              }}>
              {["Mon","Tue","Wed","Thu","Fri","Sat"][i]}<br /><span className="font-normal text-[var(--color-text-muted)]" style={{ fontSize: 11 }}>{date.slice(5)}</span>
            </div>
          ))}
          {FIXED_SLOTS.map(slotDef => (
            <React.Fragment key={slotDef.slot}>
              <div className="flex flex-col justify-center border-t border-[var(--color-border)] text-[var(--color-text-muted)]" style={{ padding: "10px 6px" }}>
                <div className="font-semibold">S{slotDef.slot}</div><div>{slotDef.label}</div>
              </div>
              {weekDates.map(date => {
                const dayEntries = filtEntries.filter(e => e.date === date && e.slotNumber === slotDef.slot);
                return (
                  <div key={`${date}-${slotDef.slot}`} className="flex flex-col gap-1 p-1 border-t border-[var(--color-border)]">
                    {dayEntries.map(entry => (
                      <div key={entry.id} className="rounded relative p-1.5 bg-[var(--color-bg-secondary)]">
                        <div className="font-bold text-[var(--color-text-primary)]" style={{ fontSize: 11 }}>{entry.course.code}</div>
                        <div className="mt-0.5 text-[var(--color-text-muted)]" style={{ fontSize: 10 }}>Div {entry.division.name}</div>
                        {entry.faculty && <div className="text-[var(--color-accent-sec)]" style={{ fontSize: 10 }}>{entry.faculty.name}</div>}
                        {entry.room && <div className="text-[var(--color-text-muted)]" style={{ fontSize: 10 }}>{entry.room.name}</div>}
                        {entry.isConducted
                          ? <span className="absolute top-1 right-1.5 text-[10px] text-[var(--color-success)]" title="Conducted">✓</span>
                          : <button onClick={() => deleteEntry(entry.id)} className="absolute top-1 right-1 bg-transparent border-0 cursor-pointer text-xs text-[var(--color-danger)]">✕</button>}
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
