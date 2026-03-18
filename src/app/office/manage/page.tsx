"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/datepicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  RectangleGroupIcon,
  StarIcon,
  BookOpenIcon,
  UserGroupIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  TableCellsIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

interface Programme {
  id: string;
  code: string;
  name: string;
  fullName: string;
  batches: BatchFull[];
}
interface BatchFull {
  id: string;
  name: string;
  programmeId: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  activeTerm?: Term | null;
  activeTermId?: string | null;
  divisions: Division[];
  terms: Term[];
  groups: Group[];
  _count: { students: number };
  programme?: Programme;
}
interface Batch {
  id: string;
  name: string;
  programmeId: string;
  startYear: number;
  endYear: number;
  activeTermId?: string | null;
  programme?: Programme;
}
interface Term {
  id: string;
  batchId: string;
  number: number;
  name: string;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  batch?: Batch;
}
interface TermRoomAssignment {
  termId: string;
  roomId: string;
  term?: { id: string; name: string; number: number; batchId: string };
  room?: { id: string; name: string };
}
interface Division {
  id: string;
  name: string;
  batchId: string;
  erpClassCode?: string | null;
  defaultRoomId?: string | null;
  defaultRoom?: { id: string; name: string } | null;
  termRoomAssignments?: TermRoomAssignment[];
  batch?: Batch | null;
  _count?: { students: number };
}
interface Group {
  id: string;
  name: string;
  batchId: string;
  type: string;
  specialisationId?: string | null;
  erpGroupCode?: string | null;
  defaultRoomId?: string | null;
  defaultRoom?: { id: string; name: string } | null;
  termRoomAssignments?: TermRoomAssignment[];
  batch?: Batch | null;
  allowedBatches?: Batch[];
  allowedBatchIds?: string[];
  specialisation?: { name: string; code: string } | null;
  _count?: { members: number };
}
interface Specialisation {
  id: string;
  name: string;
  code: string;
  groups?: Group[];
  _count?: { students: number };
}
interface Student {
  id: string;
  rollNumber: string | null;
  user: { name: string; email: string };
  batch?: BatchFull & { programme?: Programme };
  division?: Division | null;
  specialisation?: Specialisation | null;
  groups?: {
    groupId: string;
    group: { id: string; name: string; type: string };
  }[];
}
interface Course {
  id: string;
  code: string;
  name: string;
  totalSessions: number;
  credits: number;
  type: string;
  specialisationId: string | null;
  sheetsTabName?: string | null;
  specialisation?: Specialisation | null;
  courseTerms?: { term: Term & { batch?: Batch } }[];
  courseDivisions?: { division: Division }[];
  courseGroups?: { group: Group }[];
  facultyCourses?: { faculty: Faculty }[];
}
interface Faculty {
  id: string;
  name: string;
  email: string;
  teachingArea: string | null;
  _count?: { timetable: number; courses: number };
}

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

function FieldLabel({ text }: { text: string }) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-[var(--color-text-secondary)]">
      {text}
    </label>
  );
}
function Err({ msg }: { msg: string }) {
  return msg ? <p className="text-sm mb-3 text-red-500">{msg}</p> : null;
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function ManagePage() {
  const tabs = [
    { value: "students", label: "Students", Icon: AcademicCapIcon },
    { value: "programmes", label: "Programmes", Icon: BuildingLibraryIcon },
    { value: "divisions", label: "Divisions", Icon: RectangleGroupIcon },
    { value: "groups", label: "Groups", Icon: UserGroupIcon },
    { value: "specialisations", label: "Specs", Icon: StarIcon },
    { value: "courses", label: "Courses", Icon: BookOpenIcon },
    { value: "faculty", label: "Faculty", Icon: UserGroupIcon },
    { value: "erp-settings", label: "ERP Settings", Icon: Cog6ToothIcon },
    { value: "sheets-sync", label: "Sheets Sync", Icon: TableCellsIcon },
  ];

  return (
    <div className="relative z-[1]">
      <h1 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">
        Manage
      </h1>
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
        <TabsContent
          value="students"
          className="border border-[var(--color-border)] rounded-[5px] p-4"
        >
          <StudentsTab />
        </TabsContent>
        <TabsContent
          value="programmes"
          className="border border-[var(--color-border)] rounded-[5px] p-4"
        >
          <ProgrammesTab />
        </TabsContent>
        <TabsContent
          value="divisions"
          className="border border-[var(--color-border)] rounded-[5px] p-4"
        >
          <DivisionsTab />
        </TabsContent>
        <TabsContent
          value="groups"
          className="border border-[var(--color-border)] rounded-[5px] p-4"
        >
          <GroupsTab />
        </TabsContent>
        <TabsContent
          value="specialisations"
          className="border border-[var(--color-border)] rounded-[5px] p-4"
        >
          <SpecialisationsTab />
        </TabsContent>
        <TabsContent
          value="courses"
          className="border border-[var(--color-border)] rounded-[5px] p-4"
        >
          <CoursesTab />
        </TabsContent>
        <TabsContent
          value="faculty"
          className="border border-[var(--color-border)] rounded-[5px] p-4"
        >
          <FacultyTab />
        </TabsContent>
        <TabsContent
          value="erp-settings"
          className="border border-[var(--color-border)] rounded-[5px] p-4"
        >
          <ErpSettingsTab />
        </TabsContent>
        <TabsContent
          value="sheets-sync"
          className="border border-[var(--color-border)] rounded-[5px] p-4"
        >
          <SheetsSyncTab />
        </TabsContent>
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const empty = {
    name: "",
    email: "",
    rollNumber: "",
    batchId: "",
    divisionId: "",
    specialisationId: "",
    groupIds: [] as string[],
  };
  const [form, setForm] = useState(empty);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [sR, bR, dR, spR] = await Promise.all([
        fetch("/api/admin/students"),
        fetch("/api/admin/batches"),
        fetch("/api/admin/divisions"),
        fetch("/api/admin/specialisations"),
      ]);
      setStudents(await sR.json());
      setBatches(await bR.json());
      setDivisions(await dR.json());
      setSpecialisations(await spR.json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const selBatch = batches.find((b) => b.id === form.batchId);
  const coreDivs = divisions.filter(
    (d) => !form.batchId || d.batchId === form.batchId,
  );

  const handleSave = async () => {
    setError("");
    const p = {
      name: form.name,
      email: form.email,
      rollNumber: form.rollNumber,
      batchId: form.batchId || null,
      divisionId: form.divisionId || null,
      specialisationId: form.specialisationId || null,
      groupIds: form.groupIds,
    };
    const res = editingId
      ? await fetch("/api/admin/students", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            name: form.name,
            email: form.email,
            rollNumber: form.rollNumber,
            batchId: form.batchId || null,
            divisionId: form.divisionId || null,
            specialisationId: form.specialisationId || null,
          }),
        })
      : await fetch("/api/admin/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
    if (res.ok) {
      setForm(empty);
      setShowForm(false);
      setEditingId(null);
      fetchAll();
      toast.success(editingId ? "Student updated" : "Student created");
    } else {
      const msg = (await res.json()).error || "Failed";
      setError(msg);
      toast.error(msg);
    }
  };
  const startEdit = (s: Student) => {
    setEditingId(s.id);
    setError("");
    setForm({
      name: s.user.name,
      email: s.user.email,
      rollNumber: s.rollNumber || "",
      batchId: s.batch?.id || "",
      divisionId: s.division?.id || "",
      specialisationId: s.specialisation?.id || "",
      groupIds: s.groups?.map((g) => g.groupId) || [],
    });
    setShowForm(true);
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "rollNumber",
      header: "Roll",
      size: 120,
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-text-primary)]">
          {row.original.rollNumber || "—"}
        </span>
      ),
    },
    {
      accessorFn: (r) => r.user.name,
      header: "Name",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-primary)]">
          {row.original.user.name}
        </span>
      ),
    },
    {
      accessorFn: (r) => r.batch?.name,
      header: "Batch",
      size: 130,
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {row.original.batch?.name || "—"}
        </span>
      ),
    },
    {
      accessorFn: (r) => r.division?.name,
      header: "Div",
      size: 80,
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.division?.name || "—"}
        </span>
      ),
    },
    {
      accessorFn: (r) => r.specialisation?.name,
      header: "Spec",
      size: 120,
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.specialisation?.name || "—"}
        </span>
      ),
    },
    {
      accessorFn: (r) => r.groups?.map((g) => g.group.name).join(", "),
      header: "Groups",
      size: 120,
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {row.original.groups?.map((g) => g.group.name).join(", ") || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-[#531f75]"
          onClick={() => startEdit(row.original)}
        >
          <PencilSquareIcon className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Students ({students.length})
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="gap-1.5"
          >
            <ArrowUpTrayIcon className="w-4 h-4" /> Bulk Import
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingId(null);
              setForm(empty);
              setShowForm(!showForm);
            }}
            className="gap-1.5"
          >
            <PlusIcon className="w-4 h-4" /> Add Student
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.append("file", f);
              await fetch("/api/admin/students/upload", {
                method: "POST",
                body: fd,
              });
              fetchAll();
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {showForm && (
        <Card
          className={`mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)] ${editingId ? "border-[#531f75]" : ""}`}
        >
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">
              {editingId ? "Edit Student" : "Add Student"}
            </h3>
            <Err msg={error} />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <FieldLabel text="Name" />
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
              <div>
                <FieldLabel text="Email" />
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
              <div>
                <FieldLabel
                  text={`Roll (${selBatch?.programme?.code || "CODE"}-YY-NNN)`}
                />
                <Input
                  placeholder={`${selBatch?.programme?.code || "PGP"}-25-001`}
                  value={form.rollNumber}
                  onChange={(e) =>
                    setForm({ ...form, rollNumber: e.target.value })
                  }
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
              <div>
                <FieldLabel text="Batch" />
                <Select
                  value={form.batchId}
                  onValueChange={(v: string) =>
                    setForm({ ...form, batchId: v, divisionId: "" })
                  }
                >
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel text="Division" />
                <Select
                  value={form.divisionId}
                  onValueChange={(v: string) =>
                    setForm({ ...form, divisionId: v })
                  }
                >
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {coreDivs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel text="Specialisation" />
                <Select
                  value={form.specialisationId}
                  onValueChange={(v: string) =>
                    setForm({ ...form, specialisationId: v })
                  }
                >
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                    <SelectValue placeholder="Select spec" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialisations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="">
                {editingId ? "Save Changes" : "Add Student"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm(empty);
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={students}
        searchPlaceholder="Search by name, roll, or batch..."
      />
    </div>
  );
}

/* ─── Programmes Tab ──────────────────────────────────────── */
function ProgrammesTab() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", fullName: "" });
  const [batchForm, setBatchForm] = useState({
    programmeId: "",
    name: "",
    startYear: "",
    endYear: "",
  });
  const [termForm, setTermForm] = useState({
    batchId: "",
    number: "",
    startDate: "",
    endDate: "",
  });
  const [editingProgrammeId, setEditingProgrammeId] = useState<string | null>(
    null,
  );
  const [editProgrammeForm, setEditProgrammeForm] = useState({
    code: "",
    name: "",
    fullName: "",
  });
  const [termDrafts, setTermDrafts] = useState<
    Record<string, { startDate: string; endDate: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetch_ = useCallback(async () => {
    try {
      setProgrammes(await (await fetch("/api/admin/programmes")).json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const beginProgrammeEdit = (programme: Programme) => {
    setEditingProgrammeId(programme.id);
    setEditProgrammeForm({
      code: programme.code,
      name: programme.name,
      fullName: programme.fullName,
    });
  };

  const saveProgramme = async () => {
    if (!editingProgrammeId) return;
    setError("");
    const res = await fetch("/api/admin/programmes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingProgrammeId, ...editProgrammeForm }),
    });
    if (!res.ok) {
      const data = await res.json();
      const msg = data.error ?? "Could not update programme";
      setError(msg);
      toast.error(msg);
      return;
    }
    setEditingProgrammeId(null);
    fetch_();
    toast.success("Programme updated");
  };

  const toggleBatchStatus = async (batch: BatchFull) => {
    setError("");
    const res = await fetch("/api/admin/batches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: batch.id, isActive: !batch.isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      const msg = data.error ?? "Could not update batch status";
      setError(msg);
      toast.error(msg);
      return;
    }
    fetch_();
    toast.success(`Batch ${!batch.isActive ? "activated" : "deactivated"}`);
  };

  const getTermDraft = (term: Term) =>
    termDrafts[term.id] ?? {
      startDate: term.startDate ?? "",
      endDate: term.endDate ?? "",
    };

  const setTermDraftField = (
    term: Term,
    field: "startDate" | "endDate",
    value: string,
  ) => {
    setTermDrafts((prev) => ({
      ...prev,
      [term.id]: {
        ...getTermDraft(term),
        [field]: value,
      },
    }));
  };

  const saveTermDates = async (term: Term) => {
    const draft = getTermDraft(term);
    setError("");
    const res = await fetch("/api/admin/terms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: term.id,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not update term dates");
      toast.error(data.error ?? `Could not save dates for ${term.name}`);
      return;
    }
    toast.success(`Saved dates for ${term.name}`);
    fetch_();
  };

  const setActiveTerm = async (term: Term, isActive: boolean) => {
    setError("");
    const res = await fetch("/api/admin/terms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: term.id, isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not update active term");
      toast.error(
        data.error ?? `Could not ${isActive ? "set" : "clear"} active term`,
      );
      return;
    }
    toast.success(
      isActive
        ? `${term.name} is now the active term`
        : `Active term cleared for this batch`,
    );
    fetch_();
  };

  const addProg = async () => {
    setError("");
    const res = await fetch("/api/admin/programmes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      const msg = data.error ?? "Could not create programme";
      setError(msg);
      toast.error(msg);
      return;
    }
    setForm({ code: "", name: "", fullName: "" });
    setShowForm(false);
    fetch_();
    toast.success("Programme created");
  };
  const addBatch = async () => {
    setError("");
    const res = await fetch("/api/admin/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...batchForm,
        startYear: parseInt(batchForm.startYear),
        endYear: parseInt(batchForm.endYear),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      const msg = data.error ?? "Could not create batch";
      setError(msg);
      toast.error(msg);
      return;
    }
    setBatchForm({ programmeId: "", name: "", startYear: "", endYear: "" });
    fetch_();
    toast.success("Batch created");
  };
  const addTerm = async () => {
    setError("");
    const res = await fetch("/api/admin/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: termForm.batchId,
        number: parseInt(termForm.number),
        startDate: termForm.startDate || null,
        endDate: termForm.endDate || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      const msg = data.error ?? "Could not create term";
      setError(msg);
      toast.error(msg);
      return;
    }
    setTermForm({ batchId: "", number: "", startDate: "", endDate: "" });
    fetch_();
    toast.success("Term created");
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Programmes & Batches
        </h2>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1.5"
        >
          <PlusIcon className="w-4 h-4" /> Add Programme
        </Button>
      </div>
      <Err msg={error} />
      {showForm && (
        <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <FieldLabel text="Code" />
                <Input
                  placeholder="PGP"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
              <div>
                <FieldLabel text="Name" />
                <Input
                  placeholder="PGDM"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
              <div>
                <FieldLabel text="Full Name" />
                <Input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
            </div>
            <Button onClick={addProg} className="">
              Create Programme
            </Button>
          </CardContent>
        </Card>
      )}
      {programmes.map((p) => (
        <Card
          key={p.id}
          className="mb-4 bg-[var(--color-bg-card)] border-[var(--color-border)]"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                {editingProgrammeId === p.id ? (
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input
                      value={editProgrammeForm.code}
                      onChange={(e) =>
                        setEditProgrammeForm((prev) => ({
                          ...prev,
                          code: e.target.value,
                        }))
                      }
                      className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                    />
                    <Input
                      value={editProgrammeForm.name}
                      onChange={(e) =>
                        setEditProgrammeForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                    />
                    <Input
                      value={editProgrammeForm.fullName}
                      onChange={(e) =>
                        setEditProgrammeForm((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                      className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                    />
                  </div>
                ) : (
                  <>
                    <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {p.name}{" "}
                      <span className="text-sm text-[#f58220]">({p.code})</span>
                    </div>
                    <div className="text-sm text-[var(--color-text-muted)]">
                      {p.fullName}
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {editingProgrammeId === p.id ? (
                  <>
                    <Button size="sm" onClick={saveProgramme}>
                      Save Programme
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingProgrammeId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => beginProgrammeEdit(p)}
                  >
                    <PencilSquareIcon className="w-4 h-4 mr-1" /> Edit
                  </Button>
                )}
              </div>
            </div>
            {p.batches.map((b) => (
              <div
                key={b.id}
                className="pt-3 mt-3 border-t border-[var(--color-border)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-[var(--color-text-primary)]">
                      {b.name}
                    </div>
                    <div className="text-xs mt-1 text-[var(--color-text-muted)]">
                      {b._count.students} students · Divs:{" "}
                      {b.divisions.map((d) => d.name).join(", ") || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        b.isActive
                          ? "text-green-500 border-green-500/30 bg-green-500/10"
                          : "text-slate-500 border-slate-500/30 bg-slate-500/10"
                      }
                    >
                      {b.isActive ? "Open" : "Closed"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleBatchStatus(b)}
                    >
                      {b.isActive ? "Close Batch" : "Reopen Batch"}
                    </Button>
                  </div>
                </div>
                {b.terms && b.terms.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {b.terms.map((t) => {
                      const termIsActive =
                        t.isActive || b.activeTermId === t.id;
                      const termDraft = getTermDraft(t);
                      return (
                        <div
                          key={t.id}
                          className={`rounded-lg border p-3 ${
                            termIsActive
                              ? "border-emerald-500/50 bg-emerald-500/10 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]"
                              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  termIsActive
                                    ? "text-emerald-700 border-emerald-500/40 bg-emerald-500/20"
                                    : "text-[var(--color-text-muted)]"
                                }
                              >
                                T{t.number}
                              </Badge>
                              <span className="text-sm text-[var(--color-text-primary)]">
                                {t.name}
                              </span>
                              {termIsActive && (
                                <Badge className="text-[10px] bg-emerald-600 text-white border-emerald-700">
                                  Active Term
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveTerm(t, !termIsActive)}
                              >
                                {termIsActive ? "Clear Active" : "Set Active"}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveTermDates(t)}
                              >
                                Save Dates
                              </Button>
                            </div>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div>
                              <FieldLabel text="Start Date" />
                              <Input
                                type="date"
                                value={termDraft.startDate}
                                onChange={(e) =>
                                  setTermDraftField(
                                    t,
                                    "startDate",
                                    e.target.value,
                                  )
                                }
                                className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
                              />
                            </div>
                            <div>
                              <FieldLabel text="End Date" />
                              <Input
                                type="date"
                                value={termDraft.endDate}
                                onChange={(e) =>
                                  setTermDraftField(
                                    t,
                                    "endDate",
                                    e.target.value,
                                  )
                                }
                                className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]">
        <CardContent className="p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Quick Add
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Create a new batch or term without leaving this screen.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Add Batch
                </h4>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Pick a programme, define the year range, and give the batch a
                  clear label.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel text="Programme" />
                  <Select
                    value={batchForm.programmeId}
                    onValueChange={(v: string) =>
                      setBatchForm({ ...batchForm, programmeId: v })
                    }
                  >
                    <SelectTrigger className="bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                      <SelectValue placeholder="Select programme" />
                    </SelectTrigger>
                    <SelectContent>
                      {programmes.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel text="Start Year" />
                  <Input
                    placeholder="2026"
                    value={batchForm.startYear}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, startYear: e.target.value })
                    }
                    className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
                  />
                </div>
                <div>
                  <FieldLabel text="End Year" />
                  <Input
                    placeholder="2028"
                    value={batchForm.endYear}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, endYear: e.target.value })
                    }
                    className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel text="Batch Name" />
                  <Input
                    placeholder="PGDM 2026-28"
                    value={batchForm.name}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, name: e.target.value })
                    }
                    className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={addBatch}>Create Batch</Button>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Add Term
                </h4>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Attach a numbered term to a batch and optionally define its
                  scheduling window.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel text="Batch" />
                  <Select
                    value={termForm.batchId}
                    onValueChange={(v: string) =>
                      setTermForm({ ...termForm, batchId: v })
                    }
                  >
                    <SelectTrigger className="bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {programmes.flatMap((p) =>
                        p.batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {p.name} - {b.name}
                          </SelectItem>
                        )),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel text="Term Number" />
                  <Input
                    placeholder="1"
                    value={termForm.number}
                    onChange={(e) =>
                      setTermForm({ ...termForm, number: e.target.value })
                    }
                    className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
                  />
                </div>
                <div className="flex items-end text-xs text-[var(--color-text-muted)] pb-2">
                  Example: use 1, 2, 3 to match your academic sequence.
                </div>
                <div>
                  <FieldLabel text="Start Date" />
                  <Input
                    type="date"
                    value={termForm.startDate}
                    onChange={(e) =>
                      setTermForm({ ...termForm, startDate: e.target.value })
                    }
                    className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
                  />
                </div>
                <div>
                  <FieldLabel text="End Date" />
                  <Input
                    type="date"
                    value={termForm.endDate}
                    onChange={(e) =>
                      setTermForm({ ...termForm, endDate: e.target.value })
                    }
                    className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={addTerm}>Create Term</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Divisions Tab ────────────────────────────────────── */
function DivisionsTab() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTermByDivision, setSelectedTermByDivision] = useState<
    Record<string, string>
  >({});
  const [form, setForm] = useState({ name: "", batchId: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDefaultRoom, setPendingDefaultRoom] = useState<Record<string, string | null>>({});
  const [pendingTermRoom, setPendingTermRoom] = useState<Record<string, { termId: string; roomId: string | null }>>({});
  const fetchAll = useCallback(async () => {
    const [dR, bR, tR, rR] = await Promise.all([
      fetch("/api/admin/divisions"),
      fetch("/api/admin/batches"),
      fetch("/api/admin/terms"),
      fetch("/api/admin/rooms"),
    ]);
    const divisionsData: Division[] = await dR.json();
    const batchesData: Batch[] = await bR.json();
    const termsData: Term[] = await tR.json();

    setDivisions(divisionsData);
    setBatches(batchesData);
    setTerms(termsData);

    setSelectedTermByDivision((prev) => {
      const next = { ...prev };
      for (const division of divisionsData) {
        if (next[division.id]) continue;
        const batchTerms = termsData
          .filter((term) => term.batchId === division.batchId)
          .sort((a, b) => a.number - b.number);
        if (!batchTerms.length) continue;
        const assignedTermId =
          division.termRoomAssignments &&
          division.termRoomAssignments.length > 0
            ? division.termRoomAssignments[0]?.termId
            : undefined;
        next[division.id] = assignedTermId ?? batchTerms[0].id;
      }
      return next;
    });

    const roomData = await rR.json();
    setRooms(Array.isArray(roomData) ? roomData : []);
    setLoading(false);
  }, []);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveDivisionRooms = async (divId: string) => {
    const tasks: Promise<void>[] = [];
    if (pendingDefaultRoom[divId] !== undefined) {
      tasks.push(
        fetch("/api/admin/divisions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: divId, defaultRoomId: pendingDefaultRoom[divId] }),
        }).then(() => undefined),
      );
    }
    if (pendingTermRoom[divId]) {
      const { termId, roomId } = pendingTermRoom[divId];
      const division = divisions.find((d) => d.id === divId);
      if (division) {
        const baseAssignments = division.termRoomAssignments ?? [];
        const nextAssignments = baseAssignments.filter((item) => item.termId !== termId);
        if (roomId) nextAssignments.push({ termId, roomId });
        tasks.push(
          fetch("/api/admin/divisions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: divId,
              termRoomAssignments: nextAssignments.map((item) => ({ termId: item.termId, roomId: item.roomId })),
            }),
          }).then(() => undefined),
        );
      }
    }
    if (tasks.length === 0) { toast.info("No changes to save"); return; }
    try {
      await Promise.all(tasks);
      setPendingDefaultRoom((prev) => { const next = { ...prev }; delete next[divId]; return next; });
      setPendingTermRoom((prev) => { const next = { ...prev }; delete next[divId]; return next; });
      fetchAll();
      toast.success("Room assignment saved");
    } catch {
      toast.error("Failed to save room assignment");
    }
  };

  const getBatchTerms = (batchId: string) =>
    terms
      .filter((term) => term.batchId === batchId)
      .sort((a, b) => a.number - b.number);

  const getTermRoomValue = (division: Division, termId: string) =>
    division.termRoomAssignments?.find((item) => item.termId === termId)
      ?.roomId ?? "__none__";

  const addDiv = async () => {
    setError("");
    const res = await fetch("/api/admin/divisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, batchId: form.batchId || null }),
    });
    if (res.ok) {
      setForm({ name: "", batchId: "" });
      fetchAll();
      toast.success("Division created");
    } else {
      const msg = (await res.json()).error || "Failed";
      setError(msg);
      toast.error(msg);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">
        Divisions
      </h2>
      <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]">
        <CardContent className="p-4">
          <FieldLabel text="Add Division" />
          <Err msg={error} />
          <div className="flex gap-2 items-end flex-wrap">
            <Select
              value={form.batchId}
              onValueChange={(v: string) => setForm({ ...form, batchId: v })}
            >
              <SelectTrigger className="flex-1 bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              style={{ width: 100 }}
              placeholder="e.g., A"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
            />
            <Button size="sm" onClick={addDiv} className="">
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">
            All Divisions
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 text-xs uppercase text-[var(--color-text-muted)]">
                  Name
                </th>
                <th className="text-left py-2 text-xs uppercase text-[var(--color-text-muted)]">
                  Batch
                </th>
                <th className="text-left py-2 text-xs uppercase text-[var(--color-text-muted)]">
                  Students
                </th>
                <th className="text-left py-2 text-xs uppercase text-[var(--color-text-muted)]">
                  Default Room
                </th>
                <th className="text-left py-2 text-xs uppercase text-[var(--color-text-muted)]">
                  Term Room
                </th>
                <th className="text-left py-2 text-xs uppercase text-[var(--color-text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {divisions.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="py-2 font-medium text-[var(--color-text-primary)]">
                    {d.name}
                  </td>
                  <td className="py-2 text-[var(--color-text-secondary)]">
                    {d.batch?.name || "—"}
                  </td>
                  <td className="py-2 text-[var(--color-text-secondary)]">
                    {d._count?.students || 0}
                  </td>
                  <td className="py-2">
                    <Select
                      value={pendingDefaultRoom[d.id] !== undefined ? (pendingDefaultRoom[d.id] ?? "__none__") : (d.defaultRoomId || "__none__")}
                      onValueChange={(v) =>
                        setPendingDefaultRoom((prev) => ({ ...prev, [d.id]: v === "__none__" ? null : v }))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-[140px] bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {rooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2">
                    {getBatchTerms(d.batchId).length === 0 ? (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        No terms
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select
                          value={
                            selectedTermByDivision[d.id] ||
                            getBatchTerms(d.batchId)[0].id
                          }
                          onValueChange={(termId) =>
                            setSelectedTermByDivision((prev) => ({
                              ...prev,
                              [d.id]: termId,
                            }))
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-[120px] bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                            <SelectValue placeholder="Term" />
                          </SelectTrigger>
                          <SelectContent>
                            {getBatchTerms(d.batchId).map((term) => (
                              <SelectItem key={term.id} value={term.id}>
                                {term.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={
                            pendingTermRoom[d.id]?.termId === (selectedTermByDivision[d.id] || getBatchTerms(d.batchId)[0].id)
                              ? (pendingTermRoom[d.id]?.roomId ?? "__none__")
                              : getTermRoomValue(d, selectedTermByDivision[d.id] || getBatchTerms(d.batchId)[0].id)
                          }
                          onValueChange={(v) =>
                            setPendingTermRoom((prev) => ({
                              ...prev,
                              [d.id]: {
                                termId: selectedTermByDivision[d.id] || getBatchTerms(d.batchId)[0].id,
                                roomId: v === "__none__" ? null : v,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-[140px] bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {rooms.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </td>
                  <td className="py-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => saveDivisionRooms(d.id)}
                    >
                      Save
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Specialisations Tab ──────────────────────────────── */
function SpecialisationsTab() {
  const [specs, setSpecs] = useState<Specialisation[]>([]);
  const [form, setForm] = useState({ name: "", code: "" });
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const fetch_ = useCallback(async () => {
    try {
      setSpecs(await (await fetch("/api/admin/specialisations")).json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetch_();
  }, [fetch_]);
  const addSpec = async () => {
    const res = await fetch("/api/admin/specialisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", code: "" });
      fetch_();
      toast.success("Specialisation created");
    } else {
      toast.error((await res.json()).error || "Failed to create");
    }
  };
  const regenerateGroups = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/admin/specialisations/regenerate", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Regeneration failed");
        return;
      }
      toast.success(
        `Groups regenerated: ${data.deletedDuplicateGroups} merged, ${data.createdAllowedBatchLinks} batch links, ${data.linkedCourseGroups} course mappings.`,
      );
      fetch_();
    } finally {
      setRegenerating(false);
    }
  };
  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Specialisations
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={regenerateGroups}
          disabled={regenerating}
        >
          {regenerating ? "Regenerating..." : "Regenerate Shared Groups"}
        </Button>
      </div>
      <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]">
        <CardContent className="p-4">
          <FieldLabel text="Add Specialisation" />
          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <FieldLabel text="Code" />
              <Input
                style={{ width: 100 }}
                placeholder="FIN"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
              />
            </div>
            <div>
              <FieldLabel text="Name" />
              <Input
                style={{ width: 240 }}
                placeholder="Finance"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
              />
            </div>
            <Button size="sm" onClick={addSpec} className="mb-0.5">
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {specs.map((s) => (
          <Card
            key={s.id}
            className="bg-[var(--color-bg-card)] border-[var(--color-border)]"
          >
            <CardContent className="p-3">
              <div className="font-semibold text-[var(--color-text-primary)]">
                {s.name}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {s.code} · {s._count?.students ?? 0} students
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Toggle Chip (shared multi-select helper) ─────────── */
function ToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer transition-all whitespace-nowrap ${
        selected
          ? "bg-[#531f75] text-white border-[#531f75]"
          : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[#531f75]/60 hover:text-[#531f75]"
      }`}
    >
      {label}
    </button>
  );
}

type MultiSelectOption = {
  id: string;
  label: string;
};

function SearchableMultiSelect({
  label,
  placeholder,
  options,
  selectedIds,
  onChange,
  disabled,
  emptyText = "No options available",
}: {
  label: string;
  placeholder: string;
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const selectedOptions = options.filter((option) =>
    selectedIds.includes(option.id),
  );
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );
  const summary =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length <= 2
        ? selectedOptions.map((option) => option.label).join(", ")
        : `${selectedOptions[0]?.label}, ${selectedOptions[1]?.label} +${selectedOptions.length - 2}`;

  return (
    <div className="min-w-0">
      <FieldLabel text={label} />
      <Popover>
        <PopoverTrigger
          disabled={disabled}
          className={`flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors ${
            disabled
              ? "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 text-[var(--color-text-muted)] opacity-60"
              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[#531f75]/60"
          }`}
        >
          <span className="min-w-0 flex-1 truncate text-left">{summary}</span>
          <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : "Select"}
          </span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[360px] max-w-[calc(100vw-3rem)] p-3"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
          />
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const selected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      onChange(
                        selected
                          ? selectedIds.filter((id) => id !== option.id)
                          : [...selectedIds, option.id],
                      )
                    }
                    className={`flex w-full items-start justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "border-[#531f75] bg-[#531f75]/10 text-[var(--color-text-primary)]"
                        : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                    }`}
                  >
                    <span className="min-w-0 pr-3 break-words">
                      {option.label}
                    </span>
                    <span className="shrink-0 text-xs">
                      {selected ? "Selected" : ""}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="py-3 text-center text-xs text-[var(--color-text-muted)]">
                {emptyText}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const CREDIT_SESSION_MAP: Record<number, number> = {
  1: 9,
  2: 18,
  3: 26,
  4: 35,
};
const TYPE_COLORS: Record<string, string> = {
  core: "text-[#531f75] border-[#531f75]/30 bg-[#531f75]/10",
  specialisation: "text-[#f58220] border-[#f58220]/30 bg-[#f58220]/10",
  minor: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  elective: "text-green-600 border-green-600/30 bg-green-600/10",
};

/* ─── Courses Tab ──────────────────────────────────────── */
function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<BatchFull[]>([]);
  const [allDivisions, setAllDivisions] = useState<Division[]>([]);
  const [specs, setSpecs] = useState<Specialisation[]>([]);
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [allTerms, setAllTerms] = useState<Term[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const emptyForm = {
    code: "",
    name: "",
    totalSessions: "26",
    credits: "3",
    type: "core",
    specialisationId: "",
    sheetsTabName: "",
    selectedBatchIds: [] as string[],
    termIds: [] as string[],
    divisionIds: [] as string[],
    groupIds: [] as string[],
    facultyIds: [] as string[],
  };
  const [form, setForm] = useState(emptyForm);

  const closeCourseForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setError("");
  };

  const fetchAll = useCallback(async () => {
    const [cR, bR, dR, sR, fR, gR, tR] = await Promise.all([
      fetch("/api/admin/courses"),
      fetch("/api/admin/batches"),
      fetch("/api/admin/divisions"),
      fetch("/api/admin/specialisations"),
      fetch("/api/admin/faculty"),
      fetch("/api/admin/groups"),
      fetch("/api/admin/terms"),
    ]);
    setCourses(await cR.json());
    setBatches(await bR.json());
    setAllDivisions(await dR.json());
    setSpecs(await sR.json());
    setAllFaculty(await fR.json());
    setAllGroups(await gR.json());
    setAllTerms(await tR.json());
    setLoading(false);
  }, []);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async () => {
    setError("");
    const payload = {
      code: form.code,
      name: form.name,
      totalSessions: parseInt(form.totalSessions) || 26,
      credits: parseInt(form.credits) || 3,
      type: form.type,
      specialisationId:
        form.type === "specialisation" && form.specialisationId
          ? form.specialisationId
          : null,
      sheetsTabName: form.sheetsTabName.trim() || null,
      termIds: form.termIds,
      divisionIds: form.divisionIds,
      groupIds: form.groupIds,
      facultyIds: form.facultyIds,
    };
    const res = editingId
      ? await fetch("/api/admin/courses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
      : await fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (res.ok) {
      closeCourseForm();
      fetchAll();
      toast.success(editingId ? "Course updated" : "Course created");
    } else {
      const msg = (await res.json()).error || "Failed";
      setError(msg);
      toast.error(msg);
    }
  };

  const startEdit = (c: Course) => {
    setEditingId(c.id);
    const existingTermIds = c.courseTerms?.map((ct) => ct.term.id) ?? [];
    const existingBatchIds = [
      ...new Set(
        c.courseTerms
          ?.map((ct) => ct.term.batch?.id)
          .filter(Boolean) as string[],
      ),
    ];
    setForm({
      code: c.code,
      name: c.name,
      totalSessions: String(c.totalSessions),
      credits: String(c.credits),
      type: c.type,
      specialisationId: c.specialisationId || "",
      sheetsTabName: c.sheetsTabName ?? "",
      selectedBatchIds: existingBatchIds,
      termIds: existingTermIds,
      divisionIds: c.courseDivisions?.map((cd) => cd.division.id) ?? [],
      groupIds: c.courseGroups?.map((cg) => cg.group.id) ?? [],
      facultyIds: c.facultyCourses?.map((fc) => fc.faculty.id) ?? [],
    });
    setShowForm(true);
    setError("");
  };

  const toggleId = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  // Batches/terms visible in form
  const visibleTerms = allTerms.filter((t) =>
    form.selectedBatchIds.includes(t.batchId),
  );
  const visibleDivisions = allDivisions.filter((d) =>
    form.selectedBatchIds.includes(d.batchId),
  );
  const batchOptions = batches.map((batch) => ({
    id: batch.id,
    label: batch.name,
  }));
  const termOptions = visibleTerms.map((term) => ({
    id: term.id,
    label: `${batches.find((b) => b.id === term.batchId)?.name} - ${term.name}`,
  }));
  const facultyOptions = allFaculty.map((faculty) => ({
    id: faculty.id,
    label: faculty.name,
  }));
  // When a batch is deselected, remove its terms and groups too
  const handleBatchToggle = (batchId: string) => {
    const newBatchIds = toggleId(form.selectedBatchIds, batchId);
    const removedBatch = !newBatchIds.includes(batchId);
    if (removedBatch) {
      const batchTermIds = allTerms
        .filter((t) => t.batchId === batchId)
        .map((t) => t.id);
      const batchDivisionIds = allDivisions
        .filter((d) => d.batchId === batchId)
        .map((d) => d.id);
      setForm((f) => ({
        ...f,
        selectedBatchIds: newBatchIds,
        termIds: f.termIds.filter((id) => !batchTermIds.includes(id)),
        divisionIds: f.divisionIds.filter(
          (id) => !batchDivisionIds.includes(id),
        ),
        groupIds: f.groupIds.filter((id) => {
          const group = allGroups.find((g) => g.id === id);
          const allowedBatchIds =
            group?.allowedBatchIds ?? (group?.batchId ? [group.batchId] : []);
          return allowedBatchIds.some((allowedBatchId) =>
            newBatchIds.includes(allowedBatchId),
          );
        }),
      }));
    } else {
      setForm((f) => ({ ...f, selectedBatchIds: newBatchIds }));
    }
  };

  // Groups filtered by selected batches (and type for specialisation courses)
  const visibleGroups = allGroups.filter((g) => {
    const allowedBatchIds = g.allowedBatchIds ?? [g.batchId];
    if (
      !allowedBatchIds.some((batchId) =>
        form.selectedBatchIds.includes(batchId),
      )
    )
      return false;
    if (form.type === "specialisation") return g.type === "specialisation";
    if (form.type === "elective" || form.type === "minor")
      return g.type !== "specialisation";
    return false;
  });
  const groupOptions = visibleGroups.map((group) => ({
    id: group.id,
    label: group.name,
  }));

  const columns: ColumnDef<Course>[] = [
    {
      accessorKey: "code",
      header: "Code",
      size: 120,
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-text-primary)]">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-primary)]">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 110,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={TYPE_COLORS[row.original.type] ?? TYPE_COLORS.core}
        >
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "credits",
      header: "Cr",
      size: 60,
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.credits}
        </span>
      ),
    },
    {
      accessorKey: "totalSessions",
      header: "Sess",
      size: 70,
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.totalSessions}
        </span>
      ),
    },
    {
      header: "Batches",
      size: 220,
      cell: ({ row }) => {
        const batchNames = [
          ...new Set(
            row.original.courseTerms
              ?.map((ct) => ct.term.batch?.name)
              .filter(Boolean) as string[],
          ),
        ];
        return (
          <span className="block max-w-[220px] whitespace-normal break-words text-xs leading-5 text-[var(--color-text-muted)]">
            {batchNames.join(", ") || "—"}
          </span>
        );
      },
    },
    {
      header: "Terms",
      cell: ({ row }) => {
        const terms = row.original.courseTerms?.map((ct) => ct.term.name) ?? [];
        return (
          <span className="text-xs text-[var(--color-text-muted)]">
            {terms.join(", ") || "—"}
          </span>
        );
      },
    },
    {
      header: "Divisions",
      cell: ({ row }) => {
        const divisions =
          row.original.courseDivisions?.map((cd) => cd.division.name) ?? [];
        return (
          <span className="text-xs text-[var(--color-text-muted)]">
            {divisions.join(", ") || "—"}
          </span>
        );
      },
    },
    {
      header: "Groups",
      cell: ({ row }) => {
        const grps =
          row.original.courseGroups?.map((cg) => cg.group.name) ?? [];
        return (
          <span className="text-xs text-[var(--color-text-muted)]">
            {grps.join(", ") || "—"}
          </span>
        );
      },
    },
    {
      header: "Faculty",
      size: 220,
      cell: ({ row }) => {
        const facs =
          row.original.facultyCourses?.map((fc) => fc.faculty.name) ?? [];
        return (
          <span className="block max-w-[220px] whitespace-normal break-words text-xs leading-5 text-[var(--color-text-muted)]">
            {facs.join(", ") || "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-[#531f75]"
          onClick={() => startEdit(row.original)}
        >
          <PencilSquareIcon className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const sectionLabel =
    "text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2 mt-4 first:mt-0";

  const courseFormContent = (
    <>
      <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">
        {editingId ? "Edit Course" : "Add Course"}
      </h3>
      <Err msg={error} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="min-w-0">
          <FieldLabel text="Code" />
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
          />
        </div>
        <div className="min-w-0">
          <FieldLabel text="Name" />
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="min-w-0">
          <FieldLabel text="Sheets Tab Name" />
          <Input
            value={form.sheetsTabName}
            onChange={(e) => setForm({ ...form, sheetsTabName: e.target.value })}
            placeholder='e.g. "HRM", "MM-1", "BP&S-II"'
            className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
          />
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
            Tab name in the Google Sheets workbook for this course (Sheets Sync)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
        <div className="min-w-0">
          <FieldLabel text="Type" />
          <Select
            value={form.type}
            onValueChange={(v: string) =>
              setForm({
                ...form,
                type: v,
                specialisationId: "",
                divisionIds: v === "core" ? form.divisionIds : [],
                groupIds: v === "core" ? [] : form.groupIds,
              })
            }
          >
            <SelectTrigger className="w-full bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="core">Core</SelectItem>
              <SelectItem value="specialisation">Specialisation</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="elective">Elective</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <FieldLabel text="Credits" />
          <Input
            type="number"
            min={1}
            max={6}
            value={form.credits}
            onChange={(e) => {
              const cr = e.target.value;
              const autoSess = CREDIT_SESSION_MAP[parseInt(cr)];
              setForm({
                ...form,
                credits: cr,
                totalSessions: autoSess ? String(autoSess) : form.totalSessions,
              });
            }}
            className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
          />
        </div>
        <div className="min-w-0">
          <FieldLabel text="Sessions (auto)" />
          <Input
            type="number"
            value={form.totalSessions}
            onChange={(e) =>
              setForm({ ...form, totalSessions: e.target.value })
            }
            className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
          />
        </div>
        {form.type === "specialisation" && (
          <div className="min-w-0">
            <FieldLabel text="Specialisation" />
            <Select
              value={form.specialisationId}
              onValueChange={(v: string) =>
                setForm({ ...form, specialisationId: v })
              }
            >
              <SelectTrigger className="w-full bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                <SelectValue placeholder="Select spec" />
              </SelectTrigger>
              <SelectContent>
                {specs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <SearchableMultiSelect
          label="Batches"
          placeholder="Select batches"
          options={batchOptions}
          selectedIds={form.selectedBatchIds}
          onChange={(ids) => {
            const nextIds = [...ids];
            const removedBatchId = form.selectedBatchIds.find(
              (batchId) => !nextIds.includes(batchId),
            );
            if (removedBatchId) {
              handleBatchToggle(removedBatchId);
              return;
            }
            const addedBatchId = nextIds.find(
              (batchId) => !form.selectedBatchIds.includes(batchId),
            );
            if (addedBatchId) {
              handleBatchToggle(addedBatchId);
            }
          }}
          emptyText="No batches available"
        />

        <SearchableMultiSelect
          label="Terms"
          placeholder="Select terms"
          options={termOptions}
          selectedIds={form.termIds}
          onChange={(ids) => setForm((f) => ({ ...f, termIds: ids }))}
          disabled={form.selectedBatchIds.length === 0}
          emptyText="Select batches first"
        />
      </div>

      {form.type === "core" && form.selectedBatchIds.length > 0 && (
        <>
          <p className={sectionLabel}>Enrolled Divisions</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-2">
            Core courses are mandatory for all divisions in the selected
            batches.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {visibleDivisions.map((d) => (
              <Badge key={d.id} variant="outline" className="text-xs">
                {`${batches.find((b) => b.id === d.batchId)?.name} - ${d.name}`}
              </Badge>
            ))}
          </div>
        </>
      )}

      {form.type !== "core" && (
        <div className="grid grid-cols-1 gap-3 mb-3">
          <SearchableMultiSelect
            label="Enrolled Groups"
            placeholder="Select groups"
            options={groupOptions}
            selectedIds={form.groupIds}
            onChange={(ids) => setForm((f) => ({ ...f, groupIds: ids }))}
            disabled={form.selectedBatchIds.length === 0}
            emptyText="No groups available"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 mb-4">
        <SearchableMultiSelect
          label="Faculty"
          placeholder="Select faculty"
          options={facultyOptions}
          selectedIds={form.facultyIds}
          onChange={(ids) => setForm((f) => ({ ...f, facultyIds: ids }))}
          emptyText="No faculty available"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave}>
          {editingId ? "Save Changes" : "Add Course"}
        </Button>
        <Button variant="outline" onClick={closeCourseForm}>
          Cancel
        </Button>
      </div>
    </>
  );

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Courses ({courses.length})
        </h2>
        <Button
          size="sm"
          onClick={() => {
            closeCourseForm();
            setShowForm(true);
          }}
          className="gap-1.5"
        >
          <PlusIcon className="w-4 h-4" /> Add Course
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/40 p-4">
          <div className="mx-auto my-6 w-full max-w-4xl overflow-hidden bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <div className="font-semibold text-[var(--color-text-primary)]">
                {editingId ? "Edit Course" : "Add Course"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={closeCourseForm}
              >
                ✕
              </Button>
            </div>
            <div className="p-4 md:p-5 overflow-x-hidden">
              {courseFormContent}
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={courses}
        searchPlaceholder="Search by code or name..."
      />
    </div>
  );
}

/* ─── Groups Tab ───────────────────────────────────────── */
interface GroupWithMembers extends Group {
  members?: { student: Student }[];
}

function GroupsTab() {
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [specs, setSpecs] = useState<Specialisation[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const emptyForm = {
    name: "",
    allowedBatchIds: [] as string[],
    type: "specialisation",
    specialisationId: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Member management state
  const [managingGroup, setManagingGroup] = useState<GroupWithMembers | null>(
    null,
  );
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);
  const [stagedIds, setStagedIds] = useState<string[]>([]); // current draft membership
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  // Edit group state
  const [editingGroup, setEditingGroup] = useState<GroupWithMembers | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    name: "",
    allowedBatchIds: [] as string[],
    defaultRoomId: "__none__",
    termRoomAssignments: [] as Array<{ termId: string; roomId: string }>,
  });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [undoAutoClean, setUndoAutoClean] = useState<{
    previousAllowedBatchIds: string[];
    previousMemberIds: string[];
    removedCount: number;
  } | null>(null);

  const fetchAll = useCallback(async () => {
    const [gR, bR, sR, tR, rR] = await Promise.all([
      fetch("/api/admin/groups"),
      fetch("/api/admin/batches"),
      fetch("/api/admin/specialisations"),
      fetch("/api/admin/terms"),
      fetch("/api/admin/rooms"),
    ]);
    setGroups(await gR.json());
    setBatches(await bR.json());
    setSpecs(await sR.json());
    setTerms(await tR.json());
    setRooms(await rR.json());
    setLoading(false);
  }, []);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAdd = async () => {
    setError("");
    const batchId = form.allowedBatchIds[0];
    if (!batchId) {
      setError("Select at least one allowed batch");
      return;
    }
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        batchId,
        allowedBatchIds: form.allowedBatchIds,
        specialisationId: form.specialisationId || null,
      }),
    });
    if (res.ok) {
      setForm(emptyForm);
      setShowForm(false);
      fetchAll();
      toast.success("Group created");
    } else {
      const msg = (await res.json()).error || "Failed";
      setError(msg);
      toast.error(msg);
    }
  };

  const openManage = async (g: GroupWithMembers) => {
    setManagingGroup(g);
    setMemberSearch("");
    const allowedBatchIds = g.allowedBatchIds ?? [g.batchId];
    const params = new URLSearchParams({
      batchIds: allowedBatchIds.join(","),
    });
    if (g.type === "specialisation" && g.specialisationId) {
      params.set("specialisationId", g.specialisationId);
    }
    const sRes = await fetch(`/api/admin/students?${params.toString()}`);
    const students: Student[] = sRes.ok ? await sRes.json() : [];
    setBatchStudents(students);
    const currentMemberIds = students
      .filter((s) => s.groups?.some((sg) => sg.groupId === g.id))
      .map((s) => s.id);
    setStagedIds(currentMemberIds);
  };

  const saveMembers = async () => {
    if (!managingGroup) return;
    setMemberSaving(true);
    const res = await fetch("/api/admin/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: managingGroup.id, studentIds: stagedIds }),
    });
    setMemberSaving(false);
    if (res.ok) {
      setManagingGroup(null);
      fetchAll();
      toast.success("Members saved");
    } else {
      toast.error((await res.json()).error || "Failed to save members");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this group? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/groups?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchAll();
      toast.success("Group deleted");
    } else {
      toast.error((await res.json()).error || "Cannot delete group");
    }
  };

  const openEdit = (g: GroupWithMembers) => {
    setEditingGroup(g);
    setEditForm({
      name: g.name,
      allowedBatchIds: g.allowedBatchIds ?? [],
      defaultRoomId: g.defaultRoomId ?? "__none__",
      termRoomAssignments: (g.termRoomAssignments ?? []).map((item) => ({
        termId: item.termId,
        roomId: item.roomId,
      })),
    });
    setEditError("");
    setUndoAutoClean(null);
  };

  const sameBatchSelection = (left: string[], right: string[]) => {
    if (left.length !== right.length) return false;
    const leftSet = new Set(left);
    return right.every((id) => leftSet.has(id));
  };

  const getCurrentMemberIds = async (
    groupId: string,
    batchIds: string[],
    specialisationId?: string | null,
  ) => {
    if (batchIds.length === 0) return [] as string[];
    const params = new URLSearchParams({ batchIds: batchIds.join(",") });
    if (specialisationId) {
      params.set("specialisationId", specialisationId);
    }
    const sRes = await fetch(`/api/admin/students?${params.toString()}`);
    const students: Student[] = sRes.ok ? await sRes.json() : [];
    return students
      .filter((s) => s.groups?.some((sg) => sg.groupId === groupId))
      .map((s) => s.id);
  };

  const handleUndoAutoClean = async () => {
    if (!editingGroup || !undoAutoClean) return;
    setEditSaving(true);
    setEditError("");
    const res = await fetch("/api/admin/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingGroup.id,
        name: editForm.name,
        allowedBatchIds: undoAutoClean.previousAllowedBatchIds,
        defaultRoomId:
          editForm.defaultRoomId === "__none__" ? null : editForm.defaultRoomId,
        termRoomAssignments: editForm.termRoomAssignments,
        studentIds: undoAutoClean.previousMemberIds,
      }),
    });
    const payload = await res.json().catch(() => null);
    setEditSaving(false);
    if (!res.ok) {
      setEditError(payload?.error || "Failed to undo");
      toast.error(payload?.error || "Failed to undo");
      return;
    }
    setEditForm((current) => ({
      ...current,
      allowedBatchIds: undoAutoClean.previousAllowedBatchIds,
    }));
    setUndoAutoClean(null);
    fetchAll();
    toast.success("Membership reverted");
  };

  const handleEdit = async () => {
    if (!editingGroup) return;
    setEditError("");
    if (editForm.allowedBatchIds.length === 0) {
      setEditError("Select at least one allowed batch");
      return;
    }

    const previousAllowedBatchIds = editingGroup.allowedBatchIds ?? [];
    const allowedBatchesChanged = !sameBatchSelection(
      previousAllowedBatchIds,
      editForm.allowedBatchIds,
    );
    const previousMemberIds = allowedBatchesChanged
      ? await getCurrentMemberIds(
          editingGroup.id,
          previousAllowedBatchIds,
          editingGroup.specialisationId,
        )
      : [];

    setEditSaving(true);
    const res = await fetch("/api/admin/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingGroup.id,
        name: editForm.name,
        allowedBatchIds: editForm.allowedBatchIds,
        defaultRoomId:
          editForm.defaultRoomId === "__none__" ? null : editForm.defaultRoomId,
        termRoomAssignments: editForm.termRoomAssignments,
      }),
    });

    const payload = await res.json().catch(() => null);
    setEditSaving(false);
    if (res.ok) {
      if ((payload?.autoRemovedMembersCount ?? 0) > 0) {
        setUndoAutoClean({
          previousAllowedBatchIds,
          previousMemberIds,
          removedCount: payload.autoRemovedMembersCount,
        });
        setEditingGroup((current) =>
          current
            ? {
                ...current,
                name: editForm.name,
                allowedBatchIds: editForm.allowedBatchIds,
              }
            : current,
        );
        fetchAll();
        toast.info(`${payload.autoRemovedMembersCount} member(s) removed — batch changed`);
        return;
      }
      setEditingGroup(null);
      setUndoAutoClean(null);
      fetchAll();
      toast.success("Group updated");
    } else {
      const msg = payload?.error || "Failed";
      setEditError(msg);
      toast.error(msg);
    }
  };

  // Filtered students for the "add members" list
  const filteredBatchStudents = batchStudents.filter((s) => {
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      return (
        s.user.name.toLowerCase().includes(q) ||
        (s.rollNumber || "").toLowerCase().includes(q)
      );
    }
    return true;
  });
  const inGroup = filteredBatchStudents.filter((s) => stagedIds.includes(s.id));
  const notInGroup = filteredBatchStudents.filter(
    (s) => !stagedIds.includes(s.id),
  );

  const typeLabel: Record<string, string> = {
    specialisation: "Spec",
    common_elective: "Common Elec",
    open_elective: "Open Elec",
  };

  const columns: ColumnDef<GroupWithMembers>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-text-primary)]">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 130,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {typeLabel[row.original.type] ?? row.original.type}
        </Badge>
      ),
    },
    {
      header: "Allowed Batches",
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {(
            row.original.allowedBatches?.map((batch) => batch.name) ??
            [row.original.batch?.name].filter(Boolean)
          ).join(", ") || "—"}
        </span>
      ),
    },
    {
      header: "Specialisation/Group",
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {row.original.type === "specialisation"
            ? row.original.specialisation?.name || "—"
            : (typeLabel[row.original.type] ?? row.original.type)}
        </span>
      ),
    },
    {
      header: "Members",
      size: 90,
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original._count?.members ?? 0}
        </span>
      ),
    },
    {
      id: "actions",
      size: 160,
      cell: ({ row }) => (
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-[#531f75]"
            title="Edit group"
            onClick={() => openEdit(row.original)}
          >
            <PencilSquareIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-[var(--color-text-muted)] hover:text-[#531f75]"
            onClick={() => openManage(row.original)}
          >
            Members
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-red-500"
            onClick={() => handleDelete(row.original.id)}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const groupedTermsForEdit = useMemo(() => {
    const bucket = new Map<
      number,
      { number: number; name: string; termIds: string[] }
    >();
    terms
      .filter((term) => editForm.allowedBatchIds.includes(term.batchId))
      .forEach((term) => {
        const existing = bucket.get(term.number);
        if (!existing) {
          bucket.set(term.number, {
            number: term.number,
            name: term.name,
            termIds: [term.id],
          });
          return;
        }
        existing.termIds.push(term.id);
      });

    return Array.from(bucket.values()).sort((a, b) => a.number - b.number);
  }, [terms, editForm.allowedBatchIds]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Groups ({groups.length})
        </h2>
        <Button
          size="sm"
          onClick={() => {
            setForm(emptyForm);
            setError("");
            setShowForm(!showForm);
          }}
          className="gap-1.5"
        >
          <PlusIcon className="w-4 h-4" /> Add Group
        </Button>
      </div>

      {showForm && (
        <Card className="mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)]">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">
              Add Group
            </h3>
            <Err msg={error} />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <FieldLabel text="Type" />
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: v, specialisationId: "" })
                  }
                >
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specialisation">
                      Specialisation
                    </SelectItem>
                    <SelectItem value="common_elective">
                      Common Elective
                    </SelectItem>
                    <SelectItem value="open_elective">Open Elective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.type === "specialisation" && (
                <div>
                  <FieldLabel text="Specialisation" />
                  <Select
                    value={form.specialisationId}
                    onValueChange={(v) =>
                      setForm({ ...form, specialisationId: v })
                    }
                  >
                    <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]">
                      <SelectValue placeholder="Select spec" />
                    </SelectTrigger>
                    <SelectContent>
                      {specs.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <FieldLabel
                  text={
                    form.type === "specialisation"
                      ? "Group Suffix (e.g. A, B)"
                      : "Group Name"
                  }
                />
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={
                    form.type === "specialisation" ? "A" : "COMMON_ELEC_1"
                  }
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              Allowed Batches
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {batches.map((batch) => (
                <ToggleChip
                  key={batch.id}
                  label={batch.name}
                  selected={form.allowedBatchIds.includes(batch.id)}
                  onToggle={() =>
                    setForm((current) => ({
                      ...current,
                      allowedBatchIds: current.allowedBatchIds.includes(
                        batch.id,
                      )
                        ? current.allowedBatchIds.filter(
                            (id) => id !== batch.id,
                          )
                        : [...current.allowedBatchIds, batch.id],
                    }))
                  }
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                Add Group
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={groups}
        searchPlaceholder="Search groups..."
      />

      {/* ── Edit Group Panel ─────────────────── */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <div className="font-semibold text-[var(--color-text-primary)]">
                Edit Group — {editingGroup.name}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setEditingGroup(null)}
              >
                ✕
              </Button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {editError && <p className="text-xs text-red-500">{editError}</p>}
              {undoAutoClean && (
                <div className="rounded-md border border-amber-300/40 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs text-amber-200">
                    {undoAutoClean.removedCount} member(s) were auto-removed
                    after changing allowed batches.
                  </p>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUndoAutoClean}
                      disabled={editSaving}
                    >
                      Undo
                    </Button>
                  </div>
                </div>
              )}
              <div>
                <FieldLabel text="Group Name" />
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  Allowed Batches
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {batches.map((batch) => (
                    <ToggleChip
                      key={batch.id}
                      label={batch.name}
                      selected={editForm.allowedBatchIds.includes(batch.id)}
                      onToggle={() =>
                        setEditForm((current) => ({
                          ...current,
                          allowedBatchIds: current.allowedBatchIds.includes(
                            batch.id,
                          )
                            ? current.allowedBatchIds.filter(
                                (id) => id !== batch.id,
                              )
                            : [...current.allowedBatchIds, batch.id],
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel text="Default Room" />
                <Select
                  value={editForm.defaultRoomId}
                  onValueChange={(value) =>
                    setEditForm((current) => ({
                      ...current,
                      defaultRoomId: value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  Term-wise Fixed Rooms
                </p>
                <div className="space-y-2">
                  {groupedTermsForEdit.map((termGroup) => {
                    const assignedRoomId =
                      editForm.termRoomAssignments.find((item) =>
                        termGroup.termIds.includes(item.termId),
                      )?.roomId ?? "__none__";
                    return (
                      <div
                        key={termGroup.number}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-xs text-[var(--color-text-secondary)] min-w-[150px]">
                          {termGroup.name}
                        </span>
                        <Select
                          value={assignedRoomId}
                          onValueChange={(value) =>
                            setEditForm((current) => {
                              const filtered =
                                current.termRoomAssignments.filter(
                                  (item) =>
                                    !termGroup.termIds.includes(item.termId),
                                );
                              if (value !== "__none__") {
                                termGroup.termIds.forEach((termId) => {
                                  filtered.push({ termId, roomId: value });
                                });
                              }
                              return {
                                ...current,
                                termRoomAssignments: filtered,
                              };
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs w-[180px] bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingGroup(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={editSaving}
                className="bg-[#531f75] hover:bg-[#531f75]/90"
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Members Panel ─────────────── */}
      {managingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <div>
                <div className="font-semibold text-[var(--color-text-primary)]">
                  Manage Members — {managingGroup.name}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {(
                    managingGroup.allowedBatches?.map((batch) => batch.name) ??
                    [managingGroup.batch?.name].filter(Boolean)
                  ).join(", ")}{" "}
                  · {stagedIds.length} selected
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setManagingGroup(null)}
              >
                ✕
              </Button>
            </div>
            <div className="px-4 pt-3 pb-2">
              <Input
                placeholder="Search by name or roll..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-2 grid grid-cols-2 gap-2 min-h-0">
              {/* In group */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2 sticky top-0 bg-[var(--color-bg-card)] py-1">
                  In Group ({inGroup.length})
                </p>
                {inGroup.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0"
                  >
                    <div>
                      <div className="text-sm text-[var(--color-text-primary)]">
                        {s.user.name}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {s.rollNumber || "—"}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setStagedIds((ids) => ids.filter((id) => id !== s.id))
                      }
                      className="text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10 cursor-pointer"
                    >
                      × Remove
                    </button>
                  </div>
                ))}
                {inGroup.length === 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] py-2">
                    No members in group
                  </p>
                )}
              </div>
              {/* Not in group */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2 sticky top-0 bg-[var(--color-bg-card)] py-1">
                  Eligible Students ({notInGroup.length})
                </p>
                {notInGroup.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0"
                  >
                    <div>
                      <div className="text-sm text-[var(--color-text-primary)]">
                        {s.user.name}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {s.rollNumber || "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => setStagedIds((ids) => [...ids, s.id])}
                      className="text-[#531f75] hover:text-[#531f75]/80 text-xs px-1.5 py-0.5 rounded hover:bg-[#531f75]/10 cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                ))}
                {notInGroup.length === 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] py-2">
                    All eligible students added
                  </p>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setManagingGroup(null)}>
                Cancel
              </Button>
              <Button
                onClick={saveMembers}
                disabled={memberSaving}
                className="bg-[#531f75] hover:bg-[#531f75]/90"
              >
                {memberSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Faculty Tab ──────────────────────────────────────── */
function FacultyTab() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const empty = { name: "", email: "", teachingArea: "" };
  const [form, setForm] = useState(empty);
  const fetchAll = useCallback(async () => {
    try {
      setFaculty(await (await fetch("/api/admin/faculty")).json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  const save = async () => {
    setError("");
    const res = editingId
      ? await fetch("/api/admin/faculty", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        })
      : await fetch("/api/admin/faculty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
    if (res.ok) {
      setForm(empty);
      setShowForm(false);
      setEditingId(null);
      fetchAll();
      toast.success(editingId ? "Faculty updated" : "Faculty created");
    } else {
      const msg = (await res.json()).error || "Failed";
      setError(msg);
      toast.error(msg);
    }
  };
  const startEdit = (f: Faculty) => {
    setEditingId(f.id);
    setForm({
      name: f.name,
      email: f.email,
      teachingArea: f.teachingArea || "",
    });
    setShowForm(true);
  };
  const columns: ColumnDef<Faculty>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-text-primary)]">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "teachingArea",
      header: "Teaching Area",
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {row.original.teachingArea || "—"}
        </span>
      ),
    },
    {
      accessorFn: (r) => r._count?.courses,
      header: "Courses",
      size: 80,
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original._count?.courses || 0}
        </span>
      ),
    },
    {
      accessorFn: (r) => r._count?.timetable,
      header: "Slots",
      size: 80,
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original._count?.timetable || 0}
        </span>
      ),
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-[#531f75]"
          onClick={() => startEdit(row.original)}
        >
          <PencilSquareIcon className="w-4 h-4" />
        </Button>
      ),
    },
  ];
  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Faculty ({faculty.length})
        </h2>
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setForm(empty);
            setShowForm(!showForm);
          }}
          className="gap-1.5"
        >
          <PlusIcon className="w-4 h-4" /> Add Faculty
        </Button>
      </div>
      {showForm && (
        <Card
          className={`mb-5 bg-[var(--color-bg-card)] border-[var(--color-border)] ${editingId ? "border-[#531f75]" : ""}`}
        >
          <CardContent className="p-4">
            <Err msg={error} />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <FieldLabel text="Name" />
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
              <div>
                <FieldLabel text="Email" />
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
              <div>
                <FieldLabel text="Teaching Area" />
                <Input
                  value={form.teachingArea}
                  onChange={(e) =>
                    setForm({ ...form, teachingArea: e.target.value })
                  }
                  className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} className="">
                {editingId ? "Save Changes" : "Add Faculty"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm(empty);
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <DataTable
        columns={columns}
        data={faculty}
        searchPlaceholder="Search faculty..."
      />
    </div>
  );
}

/* ─── ERP Settings Tab ──────────────────────────────────── */

interface ErpFaculty {
  id: string;
  name: string;
  erpCode: string | null;
}
interface ErpRoom {
  id: string;
  name: string;
  erpCode: string | null;
}
interface ErpDivision {
  id: string;
  name: string;
  erpClassCode: string | null;
}
interface ErpGroup {
  id: string;
  name: string;
  type: string;
  erpGroupCode: string | null;
  specialisation?: { name: string; code: string } | null;
}
interface ErpCourse {
  id: string;
  code: string;
  name: string;
  erpSubjectCode: string | null;
}
interface ErpSlot {
  slotNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  erpPeriodNumber: number | null;
}

function ErpSettingsTab() {
  const [faculty, setFaculty] = useState<ErpFaculty[]>([]);
  const [rooms, setRooms] = useState<ErpRoom[]>([]);
  const [divisions, setDivisions] = useState<ErpDivision[]>([]);
  const [groups, setGroups] = useState<ErpGroup[]>([]);
  const [courses, setCourses] = useState<ErpCourse[]>([]);
  const [slots, setSlots] = useState<ErpSlot[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/erp-codes")
      .then((r) => r.json())
      .then((data) => {
        setFaculty(data.faculty ?? []);
        setRooms(data.rooms ?? []);
        setDivisions(data.divisions ?? []);
        setGroups(data.groups ?? []);
        setCourses(data.courses ?? []);
        setSlots(data.slots ?? []);
      });
  }, []);

  async function patchErp(
    type: string,
    id: string | number,
    fields: Record<string, unknown>,
  ) {
    const key = `${type}-${id}`;
    setSaving(key);
    try {
      await fetch("/api/admin/erp-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, ...fields }),
      });
    } finally {
      setSaving(null);
    }
  }

  const inputCls =
    "w-full px-2 py-1 text-sm rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] focus:outline-none focus:border-[#531f75]";
  const thCls =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]";
  const tdCls = "px-3 py-2 text-sm border-b border-[var(--color-border)]";

  return (
    <div className="space-y-8">
      {/* Slot period mapping */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
          Slot → ERP Period Mapping
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-3">
          Enter the ERP period number for each app slot (ERP counts breaks too,
          so period numbers may skip).
        </p>
        <table className="w-full border border-[var(--color-border)] rounded-lg overflow-hidden text-sm">
          <thead>
            <tr>
              <th className={thCls}>App Slot</th>
              <th className={thCls}>Time</th>
              <th className={thCls}>ERP Period #</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.slotNumber}>
                <td className={tdCls}>Slot {s.slotNumber}</td>
                <td className={tdCls + " text-[var(--color-text-muted)]"}>
                  {s.startTime} – {s.endTime}
                </td>
                <td className={tdCls}>
                  <input
                    type="number"
                    min={1}
                    defaultValue={s.erpPeriodNumber ?? ""}
                    placeholder="e.g. 3"
                    className={inputCls}
                    style={{ width: 80 }}
                    onBlur={(e) => {
                      const v = e.target.value
                        ? parseInt(e.target.value)
                        : null;
                      patchErp("slot", s.slotNumber, { erpPeriodNumber: v });
                    }}
                  />
                  {saving === `slot-${s.slotNumber}` && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      Saving…
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Faculty codes */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
          Faculty ERP Codes
        </h2>
        <table className="w-full border border-[var(--color-border)] rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>ERP Code</th>
            </tr>
          </thead>
          <tbody>
            {faculty.map((f) => (
              <tr key={f.id}>
                <td className={tdCls}>{f.name}</td>
                <td className={tdCls}>
                  <input
                    type="text"
                    defaultValue={f.erpCode ?? ""}
                    placeholder="e.g. 305"
                    className={inputCls}
                    style={{ width: 120 }}
                    onBlur={(e) =>
                      patchErp("faculty", f.id, {
                        erpCode: e.target.value || null,
                      })
                    }
                  />
                  {saving === `faculty-${f.id}` && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      Saving…
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Room codes */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
          Room ERP Codes
        </h2>
        <table className="w-full border border-[var(--color-border)] rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className={thCls}>Room</th>
              <th className={thCls}>ERP Code</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td className={tdCls}>{r.name}</td>
                <td className={tdCls}>
                  <input
                    type="text"
                    defaultValue={r.erpCode ?? ""}
                    placeholder="e.g. RES0704"
                    className={inputCls}
                    style={{ width: 140 }}
                    onBlur={(e) =>
                      patchErp("room", r.id, {
                        erpCode: e.target.value || null,
                      })
                    }
                  />
                  {saving === `room-${r.id}` && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      Saving…
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Division codes (core class codes) */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
          Division ERP Class Codes
        </h2>
        <table className="w-full border border-[var(--color-border)] rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className={thCls}>Division</th>
              <th className={thCls}>ERP Class Code</th>
            </tr>
          </thead>
          <tbody>
            {divisions.map((d) => (
              <tr key={d.id}>
                <td className={tdCls}>{d.name}</td>
                <td className={tdCls}>
                  <input
                    type="text"
                    defaultValue={d.erpClassCode ?? ""}
                    placeholder="e.g. CL007330"
                    className={inputCls}
                    style={{ width: 140 }}
                    onBlur={(e) =>
                      patchErp("division", d.id, {
                        erpClassCode: e.target.value || null,
                      })
                    }
                  />
                  {saving === `division-${d.id}` && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      Saving…
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Group codes (specialisation/elective group codes) */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
          Group ERP Codes
        </h2>
        <table className="w-full border border-[var(--color-border)] rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className={thCls}>Group</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>ERP Group Code</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td className={tdCls}>
                  {g.name}
                  {g.specialisation ? ` (${g.specialisation.code})` : ""}
                </td>
                <td className={tdCls}>
                  <Badge variant="secondary" className="text-[10px]">
                    {g.type}
                  </Badge>
                </td>
                <td className={tdCls}>
                  <input
                    type="text"
                    defaultValue={g.erpGroupCode ?? ""}
                    placeholder="e.g. GTYPE0318"
                    className={inputCls}
                    style={{ width: 140 }}
                    onBlur={(e) =>
                      patchErp("group", g.id, {
                        erpGroupCode: e.target.value || null,
                      })
                    }
                  />
                  {saving === `group-${g.id}` && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      Saving…
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Course ERP subject codes */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
          Course ERP Subject Codes
        </h2>
        <table className="w-full border border-[var(--color-border)] rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className={thCls}>Code</th>
              <th className={thCls}>Name</th>
              <th className={thCls}>ERP Subject Code</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td className={tdCls + " text-xs"}>{c.code}</td>
                <td className={tdCls + " text-[var(--color-text-muted)]"}>
                  {c.name}
                </td>
                <td className={tdCls}>
                  <input
                    type="text"
                    defaultValue={c.erpSubjectCode ?? ""}
                    placeholder="e.g. ABH (NCL503-PDM)"
                    className={inputCls}
                    style={{ width: 200 }}
                    onBlur={(e) =>
                      patchErp("course", c.id, {
                        erpSubjectCode: e.target.value || null,
                      })
                    }
                  />
                  {saving === `course-${c.id}` && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      Saving…
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Sheets Sync Tab ──────────────────────────────────── */

interface SheetsConfig {
  id: string;
  divisionId: string | null;
  groupId: string | null;
  termId: string;
  spreadsheetId: string;
  isActive: boolean;
  division: { id: string; name: string } | null;
  group: { id: string; name: string } | null;
  term: { id: string; name: string; batchId: string };
}

interface SyncStatus {
  pending: number;
  failed: number;
  synced: number;
  skipped: number;
  recentFailures: Array<{
    attendanceId: string;
    studentRollNumber: string;
    courseName: string;
    sessionDate: string;
    error: string;
    lastAttemptAt: string | null;
    attempts: number;
  }>;
}

function SheetsSyncTab() {
  const [configs, setConfigs] = useState<SheetsConfig[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<BatchFull[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [cohortType, setCohortType] = useState<"division" | "group">("division");
  const [newBatchId, setNewBatchId] = useState("");
  const [newTermId, setNewTermId] = useState("");
  const [newDivisionId, setNewDivisionId] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newSpreadsheetId, setNewSpreadsheetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [includeSkipped, setIncludeSkipped] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSpreadsheetId, setEditSpreadsheetId] = useState("");
  const [editTermId, setEditTermId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, statusRes, divRes, grpRes, crsRes, batchRes, termRes] = await Promise.all([
        fetch("/api/admin/sheets-config"),
        fetch("/api/admin/sheets-sync/status"),
        fetch("/api/admin/divisions"),
        fetch("/api/admin/groups"),
        fetch("/api/admin/courses"),
        fetch("/api/admin/batches"),
        fetch("/api/admin/terms"),
      ]);
      if (cfgRes.ok) setConfigs(await cfgRes.json());
      if (statusRes.ok) setSyncStatus(await statusRes.json());
      if (divRes.ok) setDivisions(await divRes.json());
      if (grpRes.ok) setGroups(await grpRes.json());
      if (crsRes.ok) setCourses(await crsRes.json());
      if (batchRes.ok) setBatches(await batchRes.json());
      if (termRes.ok) setTerms(await termRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetAddForm() {
    setNewBatchId(""); setNewTermId(""); setNewDivisionId(""); setNewGroupId(""); setNewSpreadsheetId("");
  }

  async function handleAdd() {
    if (!newBatchId) { toast.error("Select a batch"); return; }
    if (!newTermId) { toast.error("Select a term"); return; }
    if (!newSpreadsheetId) { toast.error("Enter a Spreadsheet ID"); return; }
    if (cohortType === "division" && !newDivisionId) { toast.error("Select a division"); return; }
    if (cohortType === "group" && !newGroupId) { toast.error("Select a group"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sheets-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divisionId: cohortType === "division" ? newDivisionId : undefined,
          groupId: cohortType === "group" ? newGroupId : undefined,
          termId: newTermId,
          spreadsheetId: newSpreadsheetId,
        }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "Failed"); return; }
      toast.success("Workbook mapping added");
      setShowAdd(false);
      resetAddForm();
      await load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this mapping?")) return;
    const res = await fetch(`/api/admin/sheets-config?id=${id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "Failed"); return; }
    toast.success("Deleted");
    await load();
  }

  async function handleSaveEdit(id: string) {
    const res = await fetch("/api/admin/sheets-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, spreadsheetId: editSpreadsheetId, termId: editTermId }),
    });
    if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "Failed"); return; }
    toast.success("Saved");
    setEditingId(null);
    setEditTermId("");
    await load();
  }

  async function handleToggleActive(cfg: SheetsConfig) {
    await fetch("/api/admin/sheets-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cfg.id, isActive: !cfg.isActive }),
    });
    await load();
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/sheets-config/test?id=${id}`);
      const data = await res.json();
      if (data.ok) toast.success("Connection OK — service account can read this workbook");
      else toast.error(`Connection failed: ${data.error}`);
    } finally { setTestingId(null); }
  }

  async function handleForceSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sheets-sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeSkipped }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "Sync failed"); return; }
      const result = await res.json();
      toast.success(`Sync complete — ${result.synced} synced, ${result.failed} failed, ${result.skipped} skipped`);
      await load();
    } finally { setSyncing(false); }
  }

  const statusBadge = (count: number, label: string, colorCls: string) => (
    <div className={`flex flex-col items-center px-4 py-3 rounded-lg border ${colorCls}`}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs font-medium mt-0.5">{label}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Section A: Sync Status ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-[var(--color-text-primary)]">Sync Status</h2>
        {syncStatus ? (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              {statusBadge(syncStatus.pending, "Pending", "border-yellow-300 text-yellow-700 bg-yellow-50")}
              {statusBadge(syncStatus.failed, "Failed", "border-red-300 text-red-700 bg-red-50")}
              {statusBadge(syncStatus.synced, "Synced", "border-green-300 text-green-700 bg-green-50")}
              {statusBadge(syncStatus.skipped, "Skipped", "border-gray-300 text-gray-600 bg-gray-50")}
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleForceSync}
                disabled={syncing}
                className="bg-[#531f75] hover:bg-[#6b2a97] text-white"
              >
                {syncing ? "Syncing…" : "Force Sync All"}
              </Button>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSkipped}
                  onChange={(e) => setIncludeSkipped(e.target.checked)}
                  className="rounded"
                />
                Include skipped records
              </label>
            </div>
            {syncStatus.recentFailures.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Recent Failures
                </h3>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-bg-secondary)]">
                        <th className="text-left p-2 border border-[var(--color-border)]">Roll No.</th>
                        <th className="text-left p-2 border border-[var(--color-border)]">Course</th>
                        <th className="text-left p-2 border border-[var(--color-border)]">Session Date</th>
                        <th className="text-left p-2 border border-[var(--color-border)]">Error</th>
                        <th className="text-left p-2 border border-[var(--color-border)]">Attempts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncStatus.recentFailures.map((f) => (
                        <tr key={f.attendanceId} className="hover:bg-[var(--color-bg-secondary)]">
                          <td className="p-2 border border-[var(--color-border)]">{f.studentRollNumber}</td>
                          <td className="p-2 border border-[var(--color-border)]">{f.courseName}</td>
                          <td className="p-2 border border-[var(--color-border)]">{f.sessionDate}</td>
                          <td className="p-2 border border-[var(--color-border)] text-red-600 max-w-xs truncate" title={f.error}>{f.error}</td>
                          <td className="p-2 border border-[var(--color-border)] text-center">{f.attempts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        )}
      </div>

      {/* ── Section B: Workbook Mappings ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Workbook Mappings</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              One Google Sheets workbook per division or group. All courses for that cohort live as tabs in the same workbook.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAdd(!showAdd)}
            className="bg-[#531f75] hover:bg-[#6b2a97] text-white flex items-center gap-1"
          >
            <PlusIcon className="w-4 h-4" />
            Add Mapping
          </Button>
        </div>

        {showAdd && (
          <Card className="mb-4 border border-[var(--color-border)]">
            <CardContent className="p-4 space-y-3">
              {/* Row 1: Batch + Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Batch</label>
                  <Select value={newBatchId} onValueChange={(v) => { setNewBatchId(v); setNewTermId(""); setNewDivisionId(""); setNewGroupId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>
                      {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Term</label>
                  <Select value={newTermId} onValueChange={setNewTermId} disabled={!newBatchId}>
                    <SelectTrigger><SelectValue placeholder={newBatchId ? "Select term" : "Select batch first"} /></SelectTrigger>
                    <SelectContent>
                      {terms.filter((t) => t.batchId === newBatchId).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Cohort type + Division/Group + Spreadsheet ID */}
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer shrink-0">
                  <input type="radio" checked={cohortType === "division"} onChange={() => { setCohortType("division"); setNewGroupId(""); }} />
                  Division
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer shrink-0">
                  <input type="radio" checked={cohortType === "group"} onChange={() => { setCohortType("group"); setNewDivisionId(""); }} />
                  Group
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {cohortType === "division" ? (
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Division</label>
                    <Select value={newDivisionId} onValueChange={setNewDivisionId} disabled={!newBatchId}>
                      <SelectTrigger><SelectValue placeholder={newBatchId ? "Select division" : "Select batch first"} /></SelectTrigger>
                      <SelectContent>
                        {divisions.filter((d) => !newBatchId || d.batchId === newBatchId).map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Group</label>
                    <Select value={newGroupId} onValueChange={setNewGroupId} disabled={!newBatchId}>
                      <SelectTrigger><SelectValue placeholder={newBatchId ? "Select group" : "Select batch first"} /></SelectTrigger>
                      <SelectContent>
                        {groups.filter((g) => !newBatchId || (g.allowedBatchIds ?? [g.batchId]).includes(newBatchId)).map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                    Spreadsheet ID <span className="text-[10px] text-gray-400">(from URL: /d/[ID]/edit)</span>
                  </label>
                  <Input
                    value={newSpreadsheetId}
                    onChange={(e) => setNewSpreadsheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={saving} size="sm" className="bg-[#531f75] hover:bg-[#6b2a97] text-white">
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); resetAddForm(); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="overflow-x-auto">
          <table className="text-sm w-full border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                <th className="text-left p-2 border border-[var(--color-border)]">Division / Group</th>
                <th className="text-left p-2 border border-[var(--color-border)]">Spreadsheet ID</th>
                <th className="text-left p-2 border border-[var(--color-border)]">Term</th>
                <th className="text-center p-2 border border-[var(--color-border)]">Active</th>
                <th className="text-center p-2 border border-[var(--color-border)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-[var(--color-text-muted)]">
                    No mappings yet. Add one above.
                  </td>
                </tr>
              )}
              {configs.map((cfg) => {
                // Derive batch(es) for this config
                const cfgDivision = cfg.divisionId ? divisions.find(d => d.id === cfg.divisionId) : null;
                const cfgGroup    = cfg.groupId    ? groups.find(g => g.id === cfg.groupId)       : null;

                // For divisions: single batch. For groups: all allowed batches.
                const cfgBatchId  = cfgDivision?.batchId ?? cfgGroup?.batchId ?? "";
                const cfgBatch    = batches.find(b => b.id === cfgBatchId);
                const cfgGroupAllowedBatchIds = cfgGroup
                  ? (cfgGroup.allowedBatchIds?.length ? cfgGroup.allowedBatchIds : [cfgGroup.batchId])
                  : null;
                const cfgGroupBatches = cfgGroupAllowedBatchIds
                  ? cfgGroupAllowedBatchIds.map(id => batches.find(b => b.id === id)).filter(Boolean)
                  : null;

                // For edit term dropdown: terms from the primary batch
                const cfgTermsForBatch = terms.filter(t => t.batchId === cfgBatchId);

                return (
                  <React.Fragment key={cfg.id}>
                    <tr className="hover:bg-[var(--color-bg-secondary)]">
                      <td className="p-2 border border-[var(--color-border)]">
                        <div className="font-medium text-sm">
                          {cfg.division?.name ?? cfg.group?.name ?? "—"}
                          <span className="ml-1 text-[10px] text-[var(--color-text-muted)]">
                            {cfg.division ? "(div)" : "(group)"}
                          </span>
                        </div>
                        {cfg.division && cfgBatch && (
                          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{cfgBatch.name}</div>
                        )}
                        {cfg.group && cfgGroup && (
                          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 space-y-0.5">
                            {cfgGroup.specialisation?.name && (
                              <span className="inline-block bg-[#531f75]/15 text-[#531f75] px-1.5 py-px rounded text-[9px] font-medium mr-1">
                                {cfgGroup.specialisation.name}
                              </span>
                            )}
                            {cfgGroupBatches?.map(b => b?.name).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="p-2 border border-[var(--color-border)] text-xs">
                        <span className="truncate block max-w-[240px]" title={cfg.spreadsheetId}>{cfg.spreadsheetId}</span>
                      </td>
                      <td className="p-2 border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
                        {cfg.term.name}
                      </td>
                      <td className="p-2 border border-[var(--color-border)] text-center">
                        <button onClick={() => handleToggleActive(cfg)} title={cfg.isActive ? "Active — click to deactivate" : "Inactive — click to activate"}>
                          {cfg.isActive
                            ? <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                            : <XCircleIcon className="w-5 h-5 text-gray-400 mx-auto" />}
                        </button>
                      </td>
                      <td className="p-2 border border-[var(--color-border)]">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => {
                              if (editingId === cfg.id) { setEditingId(null); setEditTermId(""); return; }
                              setEditingId(cfg.id);
                              setEditSpreadsheetId(cfg.spreadsheetId);
                              setEditTermId(cfg.termId);
                            }}
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs"
                            disabled={testingId === cfg.id}
                            onClick={() => handleTest(cfg.id)}
                            title="Test connection"
                          >
                            {testingId === cfg.id
                              ? <ClockIcon className="w-3.5 h-3.5 animate-spin" />
                              : <CheckCircleIcon className="w-3.5 h-3.5 text-blue-500" />}
                          </Button>
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(cfg.id)}
                            title="Delete"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {editingId === cfg.id && (
                      <tr>
                        <td colSpan={5} className="p-0 border border-[var(--color-border)]">
                          <div className="p-3 bg-[var(--color-bg-secondary)] space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              {/* Batch — read-only, derived from division/group */}
                              <div>
                                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                                  {cfgGroupBatches && cfgGroupBatches.length > 1 ? "Batches (group spans multiple)" : "Batch"}
                                </label>
                                <Input
                                  value={cfgGroupBatches
                                    ? cfgGroupBatches.map(b => b?.name).filter(Boolean).join(", ")
                                    : (cfgBatch?.name ?? "—")}
                                  disabled
                                  className="h-8 text-xs bg-[var(--color-bg-card)]"
                                />
                              </div>
                              {/* Term — editable */}
                              <div>
                                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Term</label>
                                <Select value={editTermId} onValueChange={setEditTermId}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select term" /></SelectTrigger>
                                  <SelectContent>
                                    {cfgTermsForBatch.map(t => (
                                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {/* Spreadsheet ID — editable */}
                              <div>
                                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Spreadsheet ID</label>
                                <Input
                                  value={editSpreadsheetId}
                                  onChange={e => setEditSpreadsheetId(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs bg-[#531f75] text-white" onClick={() => handleSaveEdit(cfg.id)}>Save</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingId(null); setEditTermId(""); }}>Cancel</Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          <strong>Setup:</strong> Share each workbook with the service account email
          (from <code>GOOGLE_SERVICE_ACCOUNT_JSON</code>) as <strong>Editor</strong>.
          Set <code>GOOGLE_SHEETS_SYNC_ENABLED=true</code> to activate sync.
        </p>
      </div>

      {/* ── Section C: Course Tab Names ── */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Course Tab Names</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Each course must have a tab name matching the sheet tab in the workbook (e.g., &ldquo;HRM&rdquo;, &ldquo;MM-1&rdquo;).
            This is configured once per course in the <strong>Courses</strong> tab.
            Courses without a tab name will be skipped during sync.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                <th className="text-left p-2 border border-[var(--color-border)] font-medium">Course Code</th>
                <th className="text-left p-2 border border-[var(--color-border)] font-medium">Course Name</th>
                <th className="text-left p-2 border border-[var(--color-border)] font-medium">Sheet Tab Name</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const tabName = c.sheetsTabName;
                return (
                  <tr key={c.id} className="hover:bg-[var(--color-bg-secondary)]">
                    <td className="p-2 border border-[var(--color-border)] text-[var(--color-text-primary)]">{c.code}</td>
                    <td className="p-2 border border-[var(--color-border)] text-[var(--color-text-primary)]">{c.name}</td>
                    <td className="p-2 border border-[var(--color-border)]">
                      {tabName ? (
                        <span className="text-xs text-green-500">{tabName}</span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)] italic">not set — go to Courses tab to configure</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
