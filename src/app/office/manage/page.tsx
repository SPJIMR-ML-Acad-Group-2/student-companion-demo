"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/datepicker";
import {
  AcademicCapIcon, BuildingLibraryIcon, RectangleGroupIcon,
  StarIcon, BookOpenIcon, UserGroupIcon, CalendarDaysIcon,
  PencilSquareIcon, TrashIcon, PlusIcon, ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import type { ColumnDef } from "@tanstack/react-table";

interface Programme { id: number; code: string; name: string; fullName: string; batches: BatchFull[]; Term?: Term[]; }
interface BatchFull { id: number; name: string; programmeId: number; startYear: number; endYear: number; isActive: boolean; activeTerm?: Term | null; activeTermId?: number | null; divisions: Division[]; _count: { students: number }; programme?: Programme; }
interface Batch { id: number; name: string; programmeId: number; startYear: number; endYear: number; activeTermId?: number | null; programme?: Programme; }
interface Term { id: number; programmeId: number; number: number; name: string; startDate: string | null; isActive: boolean; programme?: Programme; }
interface Division { id: number; name: string; type: string; batchId: number | null; specialisationId: number | null; batch?: Batch & { programme?: Programme } | null; specialisation?: { name: string; code: string } | null; _count?: { coreStudents: number; specStudents: number }; }
interface Specialisation { id: number; name: string; code: string; divisions?: Division[]; _count?: { students: number }; }
interface Student { id: number; name: string; email: string; rollNumber: string | null; batch?: BatchFull & { programme?: Programme }; coreDivision?: Division | null; specialisation?: Specialisation | null; specDivision?: Division | null; }
interface Course { id: number; code: string; name: string; totalSessions: number; credits: number; type: string; termId: number | null; specialisationId: number | null; term?: Term | null; specialisation?: Specialisation | null; courseTerms?: any[]; }
interface Faculty { id: number; name: string; email: string; teachingArea: string | null; _count?: { timetable: number; courses: number }; }
interface TimetableEntry { id: number; divisionId: number; courseId: number; facultyId: number | null; roomId: number | null; date: string; slotNumber: number; startTime: string; endTime: string; isConducted: boolean; sessionNumber: number | null; division: Division; course: Course; faculty?: Faculty | null; room?: { id: number; name: string } | null; }

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

function FieldLabel({ text }: { text: string }) {
  return <label className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-[var(--color-text-secondary)]">{text}</label>;
}
function Err({ msg }: { msg: string }) {
  return msg ? <p className="text-sm mb-3 text-red-500">{msg}</p> : null;
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function ManagePage() {
  const tabs = [
    { value: "students",        label: "Students",     Icon: AcademicCapIcon     },
    { value: "programmes",      label: "Programmes",   Icon: BuildingLibraryIcon },
    { value: "divisions",       label: "Divisions",    Icon: RectangleGroupIcon  },
    { value: "specialisations", label: "Specs",        Icon: StarIcon            },
    { value: "courses",         label: "Courses",      Icon: BookOpenIcon        },
    { value: "faculty",         label: "Faculty",      Icon: UserGroupIcon       },
    { value: "timetable",       label: "Timetable",    Icon: CalendarDaysIcon    },
  ];

  return (
    <div className="relative z-[1]">
      <h1 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">Manage</h1>
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="flex gap-0.5 mb-6 h-auto bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-1 overflow-x-auto">
          {tabs.map(({ value, label, Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] rounded-lg data-[active]:bg-[#531f75] data-[active]:text-white data-[active]:shadow-sm transition-all whitespace-nowrap"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="students" className="border border-[var(--color-border)] rounded-[5px] p-4"><StudentsTab /></TabsContent>
        <TabsContent value="programmes" className="border border-[var(--color-border)] rounded-[5px] p-4"><ProgrammesTab /></TabsContent>
        <TabsContent value="divisions" className="border border-[var(--color-border)] rounded-[5px] p-4"><DivisionsTab /></TabsContent>
        <TabsContent value="specialisations" className="border border-[var(--color-border)] rounded-[5px] p-4"><SpecialisationsTab /></TabsContent>
        <TabsContent value="courses" className="border border-[var(--color-border)] rounded-[5px] p-4"><CoursesTab /></TabsContent>
        <TabsContent value="faculty" className="border border-[var(--color-border)] rounded-[5px] p-4"><FacultyTab /></TabsContent>
        <TabsContent value="timetable" className="border border-[var(--color-border)] rounded-[5px] p-4"><TimetableTab /></TabsContent>
      </Tabs>
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
  const empty = { name: "", email: "", rollNumber: "", batchId: "", coreDivisionId: "", specialisationId: "", specDivisionId: "" };
  const [form, setForm] = useState(empty);
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

  const selBatch = batches.find(b => b.id === parseInt(form.batchId));
  const coreDivs = divisions.filter(d => d.type === "core" && (!form.batchId || d.batchId === parseInt(form.batchId)));
  const specDivs = divisions.filter(d => d.type === "specialisation" && (!form.specialisationId || d.specialisationId === parseInt(form.specialisationId)));

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

  const columns: ColumnDef<Student>[] = [
    { accessorKey: "rollNumber", header: "Roll", size: 120, cell: ({ row }) => <span className="font-medium text-[var(--color-text-primary)]">{row.original.rollNumber || "—"}</span> },
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-[var(--color-text-primary)]">{row.original.name}</span> },
    { accessorFn: r => r.batch?.name, header: "Batch", size: 130, cell: ({ row }) => <span className="text-xs text-[var(--color-text-secondary)]">{row.original.batch?.name || "—"}</span> },
    { accessorFn: r => r.coreDivision?.name, header: "Div", size: 80, cell: ({ row }) => <span className="text-[var(--color-text-secondary)]">{row.original.coreDivision?.name || "—"}</span> },
    { accessorFn: r => r.specialisation?.name, header: "Spec", size: 120, cell: ({ row }) => <span className="text-[var(--color-text-secondary)]">{row.original.specialisation?.name || "—"}</span> },
    { accessorFn: r => r.specDivision?.name, header: "S.Div", size: 80, cell: ({ row }) => <span className="text-[var(--color-text-secondary)]">{row.original.specDivision?.name || "—"}</span> },
    { id: "actions", size: 60, cell: ({ row }) => (
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-[#531f75]" onClick={() => startEdit(row.original)}>
        <PencilSquareIcon className="w-4 h-4" />
      </Button>
    )},
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Students ({students.length})</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="gap-1.5">
            <ArrowUpTrayIcon className="w-4 h-4" /> Bulk Import
          </Button>
          <Button size="sm" onClick={() => { setEditingId(null); setForm(empty); setShowForm(!showForm); }} className="gap-1.5">
            <PlusIcon className="w-4 h-4" /> Add Student
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("file", f); await fetch("/api/admin/students/upload", { method: "POST", body: fd }); fetchAll(); e.target.value = ""; }} />
        </div>
      </div>

      {showForm && (
        <Card className={`mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)] ${editingId ? "border-[#531f75]" : ""}`}>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">{editingId ? "Edit Student" : "Add Student"}</h3>
            <Err msg={error} />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div><FieldLabel text="Name" /><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
              <div><FieldLabel text="Email" /><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
              <div><FieldLabel text={`Roll (${selBatch?.programme?.code || "CODE"}-YY-NNN)`} />
                <Input placeholder={`${selBatch?.programme?.code || "PGP"}-25-001`} value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
              <div><FieldLabel text="Batch" />
                <Select value={form.batchId} onValueChange={(v: string) => setForm({ ...form, batchId: v, coreDivisionId: "" })}>
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>{batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><FieldLabel text="Core Division" />
                <Select value={form.coreDivisionId} onValueChange={(v: string) => setForm({ ...form, coreDivisionId: v })}>
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Select division" /></SelectTrigger>
                  <SelectContent>{coreDivs.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><FieldLabel text="Specialisation" />
                <Select value={form.specialisationId} onValueChange={(v: string) => setForm({ ...form, specialisationId: v, specDivisionId: "" })}>
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Select spec" /></SelectTrigger>
                  <SelectContent>{specialisations.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><FieldLabel text="Spec Division" />
                <Select value={form.specDivisionId} onValueChange={(v: string) => setForm({ ...form, specDivisionId: v })}>
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Select spec div" /></SelectTrigger>
                  <SelectContent>{specDivs.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="">{editingId ? "Save Changes" : "Add Student"}</Button>
              <Button variant="outline" onClick={() => { setEditingId(null); setForm(empty); setShowForm(false); setError(""); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable columns={columns} data={students} searchPlaceholder="Search by name, roll, or batch..." />
    </div>
  );
}

/* ─── Programmes Tab ──────────────────────────────────────── */
function ProgrammesTab() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", fullName: "" });
  const [batchForm, setBatchForm] = useState({ programmeId: "", name: "", startYear: "", endYear: "" });
  const [termForm, setTermForm] = useState({ programmeId: "", number: "", startDate: "" });
  const fetch_ = useCallback(async () => { setProgrammes(await (await fetch("/api/admin/programmes")).json()); }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const addProg  = async () => { await fetch("/api/admin/programmes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); setForm({ code: "", name: "", fullName: "" }); setShowForm(false); fetch_(); };
  const addBatch = async () => { await fetch("/api/admin/batches",   { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...batchForm, programmeId: parseInt(batchForm.programmeId), startYear: parseInt(batchForm.startYear), endYear: parseInt(batchForm.endYear) }) }); setBatchForm({ programmeId: "", name: "", startYear: "", endYear: "" }); fetch_(); };
  const addTerm  = async () => { await fetch("/api/admin/terms",     { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programmeId: parseInt(termForm.programmeId), number: parseInt(termForm.number), startDate: termForm.startDate || null }) }); setTermForm({ programmeId: "", number: "", startDate: "" }); fetch_(); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Programmes & Batches</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5"><PlusIcon className="w-4 h-4" /> Add Programme</Button>
      </div>
      {showForm && (
        <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]"><CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><FieldLabel text="Code" /><Input placeholder="PGP" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
            <div><FieldLabel text="Name" /><Input placeholder="PGDM" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
            <div><FieldLabel text="Full Name" /><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
          </div>
          <Button onClick={addProg} className="">Create Programme</Button>
        </CardContent></Card>
      )}
      {programmes.map(p => (
        <Card key={p.id} className="mb-4 bg-[var(--color-bg-card)] border-[var(--color-border)]"><CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-lg font-semibold text-[var(--color-text-primary)]">{p.name} <span className="text-sm text-[#8b5cf6]">({p.code})</span></div>
              <div className="text-sm text-[var(--color-text-muted)]">{p.fullName}</div>
            </div>
          </div>
          {p.Term && p.Term.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {p.Term.map(t => <Badge key={t.id} variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">T{t.number}{t.isActive ? " ●" : ""}</Badge>)}
            </div>
          )}
          {p.batches.map(b => (
            <div key={b.id} className="pt-3 mt-3 border-t border-[var(--color-border)]">
              <div className="font-semibold text-sm text-[var(--color-text-primary)]">{b.name}</div>
              <div className="text-xs mt-1 text-[var(--color-text-muted)]">{b._count.students} students · Divs: {b.divisions.map(d => d.name).join(", ") || "—"}</div>
              {b.activeTermId && <div className="mt-2"><Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">Active: T{p.Term?.find(t => t.id === b.activeTermId)?.number}</Badge></div>}
            </div>
          ))}
        </CardContent></Card>
      ))}
      <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]"><CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4 text-[var(--color-text-secondary)]">Quick Add</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <FieldLabel text="Add Batch" />
            <div className="flex gap-2 flex-wrap">
              <Select value={batchForm.programmeId} onValueChange={(v: string) => setBatchForm({ ...batchForm, programmeId: v })}>
                <SelectTrigger className="flex-1 bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Programme" /></SelectTrigger>
                <SelectContent>{programmes.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input style={{ width: 70 }} placeholder="Start" value={batchForm.startYear} onChange={e => setBatchForm({ ...batchForm, startYear: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" />
              <Input style={{ width: 70 }} placeholder="End"   value={batchForm.endYear}   onChange={e => setBatchForm({ ...batchForm, endYear:   e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" />
              <Input style={{ flex: 1 }}   placeholder="Name"  value={batchForm.name}      onChange={e => setBatchForm({ ...batchForm, name:      e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" />
              <Button size="sm" onClick={addBatch} className="">Add</Button>
            </div>
          </div>
          <div>
            <FieldLabel text="Add Term" />
            <div className="flex gap-2">
              <Select value={termForm.programmeId} onValueChange={(v: string) => setTermForm({ ...termForm, programmeId: v })}>
                <SelectTrigger className="flex-1 bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Programme" /></SelectTrigger>
                <SelectContent>{programmes.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input style={{ width: 60 }} placeholder="#" value={termForm.number} onChange={e => setTermForm({ ...termForm, number: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" />
              <DatePicker value={termForm.startDate} onChange={v => setTermForm({ ...termForm, startDate: v })} placeholder="Start date" className="w-[160px]" />
              <Button size="sm" onClick={addTerm} className="">Add</Button>
            </div>
          </div>
        </div>
      </CardContent></Card>
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
    const [dR, bR, sR] = await Promise.all([fetch("/api/admin/divisions"), fetch("/api/admin/batches"), fetch("/api/admin/specialisations")]);
    setDivisions(await dR.json()); setBatches(await bR.json()); setSpecialisations(await sR.json());
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selSpec = specialisations.find(s => s.id === parseInt(form.specialisationId));
  const preview = form.type === "specialisation" && selSpec && form.name ? `${selSpec.code}-${form.name}` : form.name;
  const addDiv = async () => {
    setError("");
    const res = await fetch("/api/admin/divisions", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, type: form.type, batchId: form.type === "core" && form.batchId ? parseInt(form.batchId) : null, specialisationId: form.type === "specialisation" && form.specialisationId ? parseInt(form.specialisationId) : null }) });
    if (res.ok) { setForm({ name: "", type: "core", batchId: "", specialisationId: "" }); fetchAll(); }
    else { setError((await res.json()).error); }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Divisions</h2>
      <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]"><CardContent className="p-4">
        <FieldLabel text="Add Division" />
        <Err msg={error} />
        <div className="flex gap-2 items-end flex-wrap">
          <Select value={form.type} onValueChange={(v: string) => setForm({ ...form, type: v })}>
            <SelectTrigger className="w-[130px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="core">Core</SelectItem><SelectItem value="specialisation">Specialisation</SelectItem></SelectContent>
          </Select>
          {form.type === "core"
            ? <Select value={form.batchId} onValueChange={(v: string) => setForm({ ...form, batchId: v })}>
                <SelectTrigger className="flex-1 bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                <SelectContent>{batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            : <Select value={form.specialisationId} onValueChange={(v: string) => setForm({ ...form, specialisationId: v })}>
                <SelectTrigger className="flex-1 bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Select Spec" /></SelectTrigger>
                <SelectContent>{specialisations.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
              </Select>}
          <Input style={{ width: 100 }} placeholder="e.g., A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" />
          {form.type === "specialisation" && preview && <span className="text-sm text-[#8b5cf6]">→ {preview}</span>}
          <Button size="sm" onClick={addDiv} className="">Add</Button>
        </div>
      </CardContent></Card>
      <div className="grid grid-cols-2 gap-4">
        {[["core","Core","coreStudents"],["specialisation","Specialisation","specStudents"]].map(([type, title, countKey]) => (
          <Card key={type} className="bg-[var(--color-bg-card)] border-[var(--color-border)]"><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">{title}</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 text-xs uppercase text-[var(--color-text-muted)]">Name</th>
                <th className="text-left py-2 text-xs uppercase text-[var(--color-text-muted)]">{type === "core" ? "Batch" : "Spec"}</th>
                <th className="text-left py-2 text-xs uppercase text-[var(--color-text-muted)]">Students</th>
              </tr></thead>
              <tbody>{divisions.filter(d => d.type === type).map(d => (
                <tr key={d.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2 font-medium text-[var(--color-text-primary)]">{d.name}</td>
                  <td className="py-2 text-[var(--color-text-secondary)]">{type === "core" ? (d.batch?.name || "—") : (d.specialisation?.name || "—")}</td>
                  <td className="py-2 text-[var(--color-text-secondary)]">{(d._count as any)?.[countKey] || 0}</td>
                </tr>
              ))}</tbody>
            </table>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Specialisations Tab ──────────────────────────────── */
function SpecialisationsTab() {
  const [specs, setSpecs] = useState<Specialisation[]>([]);
  const [form, setForm] = useState({ name: "", code: "" });
  const fetch_ = useCallback(async () => { setSpecs(await (await fetch("/api/admin/specialisations")).json()); }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  const addSpec = async () => {
    await fetch("/api/admin/specialisations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ name: "", code: "" }); fetch_();
  };
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Specialisations</h2>
      <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]"><CardContent className="p-4">
        <FieldLabel text="Add Specialisation" />
        <div className="flex gap-2 items-end flex-wrap">
          <div><FieldLabel text="Code" /><Input style={{ width: 100 }} placeholder="FIN" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
          <div><FieldLabel text="Name" /><Input style={{ width: 240 }} placeholder="Finance" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
          <Button size="sm" onClick={addSpec} className="mb-0.5">Add</Button>
        </div>
      </CardContent></Card>
      <div className="grid grid-cols-2 gap-3">
        {specs.map(s => (
          <Card key={s.id} className="bg-[var(--color-bg-card)] border-[var(--color-border)]"><CardContent className="p-3">
            <div className="font-semibold text-[var(--color-text-primary)]">{s.name}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.code} · {s._count?.students ?? 0} students</div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Courses Tab ──────────────────────────────────────── */
function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [specs, setSpecs] = useState<Specialisation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const empty = { code: "", name: "", totalSessions: "", credits: "", type: "core", termId: "", specialisationId: "" };
  const [form, setForm] = useState(empty);
  const fetchAll = useCallback(async () => {
    const [cR, tR, sR] = await Promise.all([fetch("/api/admin/courses"), fetch("/api/admin/terms"), fetch("/api/admin/specialisations")]);
    setCourses(await cR.json()); setTerms(await tR.json()); setSpecs(await sR.json());
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const handleSave = async () => {
    setError("");
    const payload = { ...form, totalSessions: parseInt(form.totalSessions), credits: parseInt(form.credits), termId: form.termId ? parseInt(form.termId) : null, specialisationId: form.specialisationId ? parseInt(form.specialisationId) : null };
    const res = editingId
      ? await fetch("/api/admin/courses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...payload }) })
      : await fetch("/api/admin/courses", { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setForm(empty); setShowForm(false); setEditingId(null); fetchAll(); }
    else { setError((await res.json()).error || "Failed"); }
  };
  const startEdit = (c: Course) => {
    setEditingId(c.id);
    setForm({ code: c.code, name: c.name, totalSessions: String(c.totalSessions), credits: String(c.credits), type: c.type, termId: c.termId ? String(c.termId) : "", specialisationId: c.specialisationId ? String(c.specialisationId) : "" });
    setShowForm(true);
  };
  const columns: ColumnDef<Course>[] = [
    { accessorKey: "code", header: "Code", size: 120, cell: ({ row }) => <span className="font-mono font-medium text-[var(--color-text-primary)]">{row.original.code}</span> },
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-[var(--color-text-primary)]">{row.original.name}</span> },
    { accessorKey: "type", header: "Type", size: 110, cell: ({ row }) => <Badge variant="outline" className={row.original.type === "core" ? "text-[#531f75] border-[#531f75]/30 bg-[#531f75]/10" : "text-[#f58220] border-[#f58220]/30 bg-[#f58220]/10"}>{row.original.type}</Badge> },
    { accessorKey: "credits", header: "Credits", size: 80, cell: ({ row }) => <span className="text-[var(--color-text-secondary)]">{row.original.credits}</span> },
    { accessorKey: "totalSessions", header: "Sessions", size: 90, cell: ({ row }) => <span className="text-[var(--color-text-secondary)]">{row.original.totalSessions}</span> },
    { accessorFn: r => r.term?.name ?? r.specialisation?.name, header: "Term/Spec", cell: ({ row }) => <span className="text-xs text-[var(--color-text-muted)]">{row.original.term?.name || row.original.specialisation?.code || "—"}</span> },
    { id: "actions", size: 60, cell: ({ row }) => <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-[#531f75]" onClick={() => startEdit(row.original)}><PencilSquareIcon className="w-4 h-4" /></Button> },
  ];
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Courses ({courses.length})</h2>
        <Button size="sm" onClick={() => { setEditingId(null); setForm(empty); setShowForm(!showForm); }} className="gap-1.5"><PlusIcon className="w-4 h-4" /> Add Course</Button>
      </div>
      {showForm && (
        <Card className={`mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)] ${editingId ? "border-[#531f75]" : ""}`}><CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">{editingId ? "Edit Course" : "Add Course"}</h3>
          <Err msg={error} />
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><FieldLabel text="Code" /><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
            <div className="col-span-2"><FieldLabel text="Name" /><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
            <div><FieldLabel text="Type" />
              <Select value={form.type} onValueChange={(v: string) => setForm({ ...form, type: v, specialisationId: "" })}>
                <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="core">Core</SelectItem><SelectItem value="specialisation">Specialisation</SelectItem></SelectContent>
              </Select></div>
            <div><FieldLabel text="Credits" /><Input type="number" value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
            <div><FieldLabel text="Sessions" /><Input type="number" value={form.totalSessions} onChange={e => setForm({ ...form, totalSessions: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
            <div><FieldLabel text="Term" />
              <Select value={form.termId} onValueChange={(v: string) => setForm({ ...form, termId: v })}>
                <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent><SelectItem value="">None</SelectItem>{terms.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select></div>
            {form.type === "specialisation" && (
              <div><FieldLabel text="Specialisation" />
                <Select value={form.specialisationId} onValueChange={(v: string) => setForm({ ...form, specialisationId: v })}>
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Select spec" /></SelectTrigger>
                  <SelectContent>{specs.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select></div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="">{editingId ? "Save Changes" : "Add Course"}</Button>
            <Button variant="outline" onClick={() => { setEditingId(null); setForm(empty); setShowForm(false); setError(""); }}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      <DataTable columns={columns} data={courses} searchPlaceholder="Search by code or name..." />
    </div>
  );
}

/* ─── Faculty Tab ──────────────────────────────────────── */
function FacultyTab() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const empty = { name: "", email: "", teachingArea: "" };
  const [form, setForm] = useState(empty);
  const fetchAll = useCallback(async () => { setFaculty(await (await fetch("/api/admin/faculty")).json()); }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const save = async () => {
    setError("");
    const res = editingId
      ? await fetch("/api/admin/faculty", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...form }) })
      : await fetch("/api/admin/faculty", { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setForm(empty); setShowForm(false); setEditingId(null); fetchAll(); }
    else { setError((await res.json()).error || "Failed"); }
  };
  const startEdit = (f: Faculty) => { setEditingId(f.id); setForm({ name: f.name, email: f.email, teachingArea: f.teachingArea || "" }); setShowForm(true); };
  const columns: ColumnDef<Faculty>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium text-[var(--color-text-primary)]">{row.original.name}</span> },
    { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="text-[var(--color-text-secondary)]">{row.original.email}</span> },
    { accessorKey: "teachingArea", header: "Teaching Area", cell: ({ row }) => <span className="text-xs text-[var(--color-text-secondary)]">{row.original.teachingArea || "—"}</span> },
    { accessorFn: r => r._count?.courses, header: "Courses", size: 80, cell: ({ row }) => <span className="text-[var(--color-text-secondary)]">{row.original._count?.courses || 0}</span> },
    { accessorFn: r => r._count?.timetable, header: "Slots", size: 80, cell: ({ row }) => <span className="text-[var(--color-text-secondary)]">{row.original._count?.timetable || 0}</span> },
    { id: "actions", size: 60, cell: ({ row }) => <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-[#531f75]" onClick={() => startEdit(row.original)}><PencilSquareIcon className="w-4 h-4" /></Button> },
  ];
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Faculty ({faculty.length})</h2>
        <Button size="sm" onClick={() => { setEditingId(null); setForm(empty); setShowForm(!showForm); }} className="gap-1.5"><PlusIcon className="w-4 h-4" /> Add Faculty</Button>
      </div>
      {showForm && (
        <Card className={`mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)] ${editingId ? "border-[#531f75]" : ""}`}><CardContent className="p-4">
          <Err msg={error} />
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><FieldLabel text="Name" /><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
            <div><FieldLabel text="Email" /><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
            <div><FieldLabel text="Teaching Area" /><Input value={form.teachingArea} onChange={e => setForm({ ...form, teachingArea: e.target.value })} className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]" /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="">{editingId ? "Save Changes" : "Add Faculty"}</Button>
            <Button variant="outline" onClick={() => { setEditingId(null); setForm(empty); setShowForm(false); setError(""); }}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      <DataTable columns={columns} data={faculty} searchPlaceholder="Search faculty..." />
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

  // Use LOCAL date components to avoid UTC offset shifting dates (e.g. IST = UTC+5:30)
  const localDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const todayStr = localDate(new Date());
  const [form, setForm] = useState({ divisionId: "", courseId: "", facultyId: "", date: todayStr, slotNumber: "1", roomId: "" });
  const [error, setError] = useState("");

  const getWeekDates = (offset: number) => {
    const ref = new Date(); ref.setDate(ref.getDate() + offset * 7);
    const dow = ref.getDay(); const mon = new Date(ref); mon.setDate(ref.getDate() + (dow === 0 ? -6 : 1 - dow));
    return Array.from({ length: 6 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return localDate(d); });
  };
  const weekDates = getWeekDates(weekOffset);
  const [weekStart, weekEnd] = [weekDates[0], weekDates[5]];

  const fetchAll = useCallback(async () => {
    const [tR, dR, cR, fR, rR] = await Promise.all([
      fetch(`/api/admin/timetable?weekOf=${weekStart}`),
      fetch("/api/admin/divisions"), fetch("/api/admin/courses"),
      fetch("/api/admin/faculty"), fetch("/api/admin/rooms"),
    ]);
    if (tR.ok) setEntries(await tR.json());
    setDivisions(await dR.json()); setCourses(await cR.json());
    setFaculty(await fR.json()); setRooms(await rR.json());
  }, [weekStart]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addEntry = async () => {
    setError("");
    const res = await fetch("/api/admin/timetable", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ divisionId: parseInt(form.divisionId), courseId: parseInt(form.courseId), facultyId: form.facultyId ? parseInt(form.facultyId) : null, date: form.date, slotNumber: parseInt(form.slotNumber), roomId: form.roomId ? parseInt(form.roomId) : null }) });
    if (res.ok) { setForm({ ...form, courseId: "", facultyId: "" }); fetchAll(); }
    else { setError((await res.json()).error); }
  };
  const deleteEntry = async (id: number) => { await fetch(`/api/admin/timetable?id=${id}`, { method: "DELETE" }); fetchAll(); };

  const selDiv      = divisions.find(d => d.id === parseInt(form.divisionId || filterDiv));
  const filtCourses = selDiv ? courses.filter(c => selDiv.type === "core" ? c.type === "core" : (c.type === "specialisation" && c.specialisationId === selDiv.specialisationId)) : courses;
  const filtEntries = filterDiv ? entries.filter(e => e.divisionId === parseInt(filterDiv)) : entries;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Timetable</h2>
        <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-0.5 gap-0.5">
          {(["calendar","list"] as const).map(m => (
            <Button key={m} size="sm" variant={viewMode === m ? "default" : "ghost"}
              className={viewMode === m ? "h-7 rounded-md" : "h-7 rounded-md text-[var(--color-text-secondary)]"}
              onClick={() => setViewMode(m)}>
              {m === "calendar" ? "Calendar" : "List"}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <Button size="sm" variant="outline" onClick={() => setWeekOffset(weekOffset - 1)}>← Prev</Button>
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{weekStart} — {weekEnd}</span>
        <Button size="sm" variant="outline" onClick={() => setWeekOffset(weekOffset + 1)}>Next →</Button>
        {weekOffset !== 0 && <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)} className="text-[#f58220] hover:text-[#f58220]/80">Today</Button>}
      </div>
      <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]"><CardContent className="p-4">
        <FieldLabel text="Add Timetable Entry" />
        <Err msg={error} />
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <FieldLabel text="Division" />
            <Select value={form.divisionId} onValueChange={(v: string) => { setForm({ ...form, divisionId: v, courseId: "", facultyId: "" }); setFilterDiv(v); }}>
              <SelectTrigger className="w-[130px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Division" /></SelectTrigger>
              <SelectContent>{divisions.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel text="Course" />
            <Select value={form.courseId} onValueChange={(v: string) => setForm({ ...form, courseId: v, facultyId: "" })}>
              <SelectTrigger className="w-[200px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>{filtCourses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel text="Faculty" />
            <Select value={form.facultyId} onValueChange={(v: string) => setForm({ ...form, facultyId: v })}>
              <SelectTrigger className="w-[160px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Faculty" /></SelectTrigger>
              <SelectContent>{faculty.map((f: Faculty) => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel text="Date" />
            <DatePicker value={form.date} onChange={v => setForm({ ...form, date: v })} className="w-[160px]" />
          </div>
          <div>
            <FieldLabel text="Slot" />
            <Select value={form.slotNumber} onValueChange={(v: string) => setForm({ ...form, slotNumber: v })}>
              <SelectTrigger className="w-[150px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue /></SelectTrigger>
              <SelectContent>{FIXED_SLOTS.map(s => <SelectItem key={s.slot} value={String(s.slot)}>Slot {s.slot} ({s.start})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel text="Room" />
            <Select value={form.roomId || "__none__"} onValueChange={(v: string) => setForm({ ...form, roomId: v === "__none__" ? "" : v })}>
              <SelectTrigger className="w-[120px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="Room" /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">No Room</SelectItem>{rooms.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={addEntry} disabled={!form.divisionId || !form.courseId || !form.facultyId} className="mt-5">Add Entry</Button>
        </div>
      </CardContent></Card>

      <div className="mb-3">
        <Select value={filterDiv || "__all__"} onValueChange={v => setFilterDiv(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[200px] bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"><SelectValue placeholder="All Divisions" /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">All Divisions</SelectItem>{divisions.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-xl border overflow-hidden bg-[var(--color-bg-card)] border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <tr>{["Division","Date","Slot","Time","Course","Faculty","Room",""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtEntries.map(e => (
                <tr key={e.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-card-hover)] transition-colors">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{e.division.name}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{e.date}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{e.slotNumber}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{e.startTime}–{e.endTime}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)]">{e.course.code}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{e.faculty?.name || "—"}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{e.room?.name || "—"}</td>
                  <td className="px-4 py-2.5">
                    {!e.isConducted && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-500" onClick={() => deleteEntry(e.id)}>
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
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
            <div key={date} className={`p-2 font-bold text-center rounded text-sm ${date === todayStr ? "text-[#f58220] bg-[#f58220]/10" : "text-[var(--color-text-primary)]"}`}>
              {["Mon","Tue","Wed","Thu","Fri","Sat"][i]}<br />
              <span className="font-normal text-[var(--color-text-muted)]" style={{ fontSize: 11 }}>{date.slice(5)}</span>
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
                      <div key={entry.id} className="rounded relative p-1.5 bg-[var(--color-bg-secondary)]"
                        style={{ borderLeft: `3px solid var(${entry.course.type === "core" ? "--color-accent" : "--color-warning"})` }}>
                        <div className="font-bold text-[var(--color-text-primary)]" style={{ fontSize: 11 }}>{entry.course.code}</div>
                        <div className="mt-0.5 text-[var(--color-text-muted)]" style={{ fontSize: 10 }}>Div {entry.division.name}</div>
                        {entry.faculty && <div className="text-[#8b5cf6]" style={{ fontSize: 10 }}>{entry.faculty.name}</div>}
                        {entry.room && <div className="text-[var(--color-text-muted)]" style={{ fontSize: 10 }}>{entry.room.name}</div>}
                        {entry.isConducted
                          ? <span className="absolute top-1 right-1.5 text-green-500" style={{ fontSize: 10 }} title="Conducted">✓</span>
                          : <Button variant="ghost" size="icon-xs" onClick={() => deleteEntry(entry.id)} className="absolute top-1 right-1 p-0 h-4 w-4 text-red-400 hover:text-red-500">✕</Button>}
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
