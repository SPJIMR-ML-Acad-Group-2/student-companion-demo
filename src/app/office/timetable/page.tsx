"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  name: string;
  defaultRoomId?: string | null;
  defaultRoom?: Room | null;
  termRoomAssignments?: {
    termId: string;
    roomId: string;
    term?: { id: string; batchId: string; number: number; name: string };
    room?: Room;
  }[];
  batch?: { id: string; name: string; programme?: { name: string } } | null;
}
interface Group {
  id: string;
  name: string;
  type: string;
  specialisationId?: string | null;
  batchId?: string;
  defaultRoomId?: string | null;
  defaultRoom?: Room | null;
  termRoomAssignments?: {
    termId: string;
    roomId: string;
    term?: { id: string; batchId: string; number: number; name: string };
    room?: Room;
  }[];
  allowedBatchIds?: string[];
  allowedBatches?: { id: string; name: string }[];
  batch?: { id: string; name: string; programme?: { name: string } } | null;
  specialisation?: { name: string; code: string } | null;
}
interface Course {
  id: string;
  code: string;
  name: string;
  type: string;
  specialisationId?: string | null;
  courseTerms?: {
    term: { id: string; batchId: string; name: string; number: number };
  }[];
  courseDivisions?: { division: { id: string } }[];
  courseGroups?: { group: { id: string } }[];
  facultyCourses?: { faculty: { id: string; name: string; email: string } }[];
}
interface Faculty {
  id: string;
  name: string;
  email: string;
}
interface Room {
  id: string;
  name: string;
}
interface Batch {
  id: string;
  name: string;
  programme?: { name: string } | null;
  activeTermId?: string | null;
  activeTerm?: { id: string; number: number } | null;
}
interface Term {
  id: string;
  name: string;
  number: number;
  batchId: string;
  startDate?: string | null;
  endDate?: string | null;
}
interface DraftEntry {
  id: string;
  divisionId: string | null;
  groupId: string | null;
  termId?: string | null;
  courseId: string;
  facultyId: string | null;
  roomId: string | null;
  date: string;
  slotNumber: number;
  activityType: string;
  isPublished?: boolean;
  division?: Division | null;
  group?: (Group & { batch?: { id: string; name: string } | null }) | null;
  course: Course;
  faculty?: Faculty | null;
  room?: Room | null;
}

interface LiveEntry {
  id: string;
  divisionId: string | null;
  groupId: string | null;
  termId?: string | null;
  courseId: string;
  facultyId: string | null;
  roomId: string | null;
  date: string;
  slotNumber: number;
  activityType: string;
  division?: Division | null;
  group?: Group | null;
  course?: Course | null;
  faculty?: Faculty | null;
  room?: Room | null;
}

const FIXED_SLOTS = [
  { slot: 1, label: "8:15–9:00" },
  { slot: 2, label: "9:00–10:10" },
  { slot: 3, label: "10:40–11:50" },
  { slot: 4, label: "12:10–1:20" },
  { slot: 5, label: "2:30–3:40" },
  { slot: 6, label: "4:00–5:10" },
  { slot: 7, label: "5:30–6:40" },
  { slot: 8, label: "7:00–8:10" },
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── ToggleChip Component ─────────────────────────────────────────────────────

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
          : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[#531f75]/60"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getWeekDates(ref: Date): string[] {
  const day = ref.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const mon = new Date(ref);
  mon.setDate(ref.getDate() + offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return localDate(d);
  });
}

function fmtWeekRange(dates: string[]) {
  if (!dates.length) return "";
  const parse = (s: string) => new Date(s + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${parse(dates[0]).toLocaleDateString("en-IN", opts)} – ${parse(dates[dates.length - 1]).toLocaleDateString("en-IN", opts)}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TimetableDraftPage() {
  const [weekDates, setWeekDates] = useState<string[]>(() =>
    getWeekDates(new Date()),
  );
  const [allDrafts, setAllDrafts] = useState<DraftEntry[]>([]);
  const [allLiveEntries, setAllLiveEntries] = useState<LiveEntry[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("__all__");
  const [selectedTermId, setSelectedTermId] = useState<string>("__all__");
  const [filterFacultyId, setFilterFacultyId] = useState<string>("__all__");
  const [filterDivisionId, setFilterDivisionId] = useState<string>("__all__");
  const [filterGroupId, setFilterGroupId] = useState<string>("__all__");
  const [filterCourseId, setFilterCourseId] = useState<string>("__all__");
  const [showPublished, setShowPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [mobileDay, setMobileDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // Sun→6, Mon→0, ..., Sat→5
  });
  const [modal, setModal] = useState<{
    open: boolean;
    date: string;
    slotNumber: number;
    editing: DraftEntry | null;
  }>({ open: false, date: "", slotNumber: 0, editing: null });
  const [form, setForm] = useState({
    targetType: "division" as "division" | "group",
    divisionIds: [] as string[],
    groupId: "",
    courseId: "",
    facultyId: "",
    roomId: "",
    activityType: "session",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [erpTermStart, setErpTermStart] = useState("");
  const [erpTermEnd, setErpTermEnd] = useState("");
  const [exporting, setExporting] = useState(false);

  const exportERP = async () => {
    if (!erpTermStart || !erpTermEnd) {
      alert("Please enter term start and end dates.");
      return;
    }
    setExporting(true);
    try {
      const res = await fetch(
        `/api/admin/timetable/export?termStart=${erpTermStart}&termEnd=${erpTermEnd}`,
      );
      if (!res.ok) {
        const e = await res.json();
        alert(e.error ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ERP_Timetable_Export.zip";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // ─── Fetch static data ───────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/divisions").then((r) => r.json()),
      fetch("/api/admin/faculty").then((r) => r.json()),
      fetch("/api/admin/rooms").then((r) => r.json()),
      fetch("/api/admin/groups").then((r) => r.json()),
      fetch("/api/admin/batches?activeOnly=true").then((r) => r.json()),
      fetch("/api/admin/terms").then((r) => r.json()),
    ]).then(([divs, fac, rms, grps, btchs, trms]) => {
      const parsedBatches = Array.isArray(btchs)
        ? btchs
        : (btchs.batches ?? []);
      const parsedTerms = Array.isArray(trms) ? trms : (trms.terms ?? []);

      setDivisions(Array.isArray(divs) ? divs : (divs.divisions ?? []));
      setFaculty(Array.isArray(fac) ? fac : (fac.faculty ?? []));
      setRooms(Array.isArray(rms) ? rms : (rms.rooms ?? []));
      setGroups(Array.isArray(grps) ? grps : (grps.groups ?? []));
      setBatches(parsedBatches);
      setTerms(parsedTerms);

      const defaultBatch =
        parsedBatches.find((batch: Batch) => !!batch.activeTermId) ??
        parsedBatches[0] ??
        null;
      if (defaultBatch) {
        setSelectedBatchId(defaultBatch.id);
        const defaultTermId =
          defaultBatch.activeTermId ??
          parsedTerms.find((term: Term) => term.batchId === defaultBatch.id)
            ?.id ??
          "__all__";
        setSelectedTermId(defaultTermId);
      }
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTermId !== "__all__") {
      params.set("termId", selectedTermId);
    } else if (selectedBatchId !== "__all__") {
      params.set("batchId", selectedBatchId);
    }
    const query = params.toString();

    fetch(`/api/admin/courses${query ? `?${query}` : ""}`)
      .then((r) => r.json())
      .then((crs) => {
        setCourses(Array.isArray(crs) ? crs : (crs.courses ?? []));
      });
  }, [selectedTermId, selectedBatchId]);

  // ─── Fetch ALL drafts for current week (no server-side filtering) ──────

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ weekOf: weekDates[0] });
      if (selectedTermId !== "__all__") params.set("termId", selectedTermId);
      const res = await fetch(
        `/api/admin/timetable/draft?${params.toString()}`,
      );
      const data = await res.json();
      setAllDrafts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [weekDates, selectedTermId]);

  const fetchLiveTimetable = useCallback(async () => {
    const params = new URLSearchParams({ weekOf: weekDates[0] });
    if (selectedTermId !== "__all__") params.set("termId", selectedTermId);
    const res = await fetch(`/api/admin/timetable?${params.toString()}`);
    const data = await res.json();
    setAllLiveEntries(Array.isArray(data) ? data : []);
  }, [weekDates, selectedTermId]);

  useEffect(() => {
    fetchDrafts();
    fetchLiveTimetable();
  }, [fetchDrafts, fetchLiveTimetable]);

  const getEntryKey = useCallback(
    (entry: {
      divisionId: string | null;
      groupId: string | null;
      date: string;
      slotNumber: number;
    }) => {
      if (entry.divisionId) {
        return `division:${entry.divisionId}:${entry.date}:${entry.slotNumber}`;
      }
      return `group:${entry.groupId}:${entry.date}:${entry.slotNumber}`;
    },
    [],
  );

  const syncPreview = useMemo(() => {
    const liveByKey = new Map<string, LiveEntry>();
    allLiveEntries.forEach((entry) => liveByKey.set(getEntryKey(entry), entry));

    const draftByKey = new Map<string, DraftEntry>();
    allDrafts.forEach((entry) => draftByKey.set(getEntryKey(entry), entry));

    const toAdd: DraftEntry[] = [];
    const toUpdate: Array<{ draft: DraftEntry; live: LiveEntry }> = [];
    const toRemove: LiveEntry[] = [];

    for (const draft of allDrafts) {
      const key = getEntryKey(draft);
      const live = liveByKey.get(key);
      if (!live) {
        toAdd.push(draft);
        continue;
      }
      const changed =
        live.termId !== (draft.termId ?? null) ||
        live.courseId !== draft.courseId ||
        live.facultyId !== draft.facultyId ||
        live.roomId !== draft.roomId ||
        live.activityType !== draft.activityType;
      if (changed) {
        toUpdate.push({ draft, live });
      }
    }

    for (const live of allLiveEntries) {
      const key = getEntryKey(live);
      if (!draftByKey.has(key)) {
        toRemove.push(live);
      }
    }

    return {
      toAdd,
      toUpdate,
      toRemove,
      totals: {
        add: toAdd.length,
        update: toUpdate.length,
        remove: toRemove.length,
      },
    };
  }, [allDrafts, allLiveEntries, getEntryKey]);

  const describeEntry = useCallback(
    (entry: {
      date: string;
      slotNumber: number;
      courseId: string;
      divisionId: string | null;
      groupId: string | null;
      course?: Course | null;
      division?: Division | null;
      group?: Group | null;
    }) => {
      const target = entry.division?.name ?? entry.group?.name ?? "Cohort";
      const courseCode =
        entry.course?.code ??
        courses.find((course) => course.id === entry.courseId)?.code ??
        "Course";
      return `${entry.date} S${entry.slotNumber} - ${target} - ${courseCode}`;
    },
    [courses],
  );

  // ─── Cascading derived filters ────────────────────────────────────────────

  // Terms visible for selected batch — active term onward only
  const visibleTerms = useMemo(() => {
    const forBatch =
      selectedBatchId === "__all__"
        ? terms
        : terms.filter((t) => t.batchId === selectedBatchId);
    // Keep only active and future terms (skip completed past terms)
    return forBatch.filter((t) => {
      const batch = batches.find((b) => b.id === t.batchId);
      if (!batch?.activeTerm) return true; // no active term set → show all
      return t.number >= batch.activeTerm.number;
    });
  }, [terms, selectedBatchId, batches]);

  // Divisions filtered by selected batches
  const visibleDivisions = useMemo(
    () =>
      selectedBatchId === "__all__"
        ? divisions
        : divisions.filter((d) => d.batch?.id === selectedBatchId),
    [divisions, selectedBatchId],
  );

  // Groups filtered by selected batches
  const visibleGroups = useMemo(() => {
    const selectedTerm =
      selectedTermId !== "__all__"
        ? terms.find((term) => term.id === selectedTermId)
        : null;
    const contextBatchId =
      selectedBatchId !== "__all__"
        ? selectedBatchId
        : (selectedTerm?.batchId ?? null);

    if (!contextBatchId) return groups;
    return groups.filter((g) =>
      (g.allowedBatchIds ?? (g.batchId ? [g.batchId] : [])).some(
        (batchId) => batchId === contextBatchId,
      ),
    );
  }, [groups, selectedBatchId, selectedTermId, terms]);

  const termById = useMemo(() => {
    const map = new Map<string, Term>();
    terms.forEach((term) => map.set(term.id, term));
    return map;
  }, [terms]);

  const getGroupDisplayLabel = useCallback((group: Group) => {
    const allowedBatchNames =
      group.allowedBatches?.map((batch) => batch.name) ??
      (group.batch?.name ? [group.batch.name] : []);
    const batchesSuffix = allowedBatchNames.length
      ? ` • ${allowedBatchNames.join(" + ")}`
      : "";
    return `${group.name}${batchesSuffix}`;
  }, []);

  const getPreferredTermIdForBatch = useCallback(
    (batchId?: string | null) => {
      if (!batchId) return null;
      const selectedForBatch =
        selectedTermId !== "__all__" ? selectedTermId : null;
      const selectedTerm = selectedForBatch
        ? termById.get(selectedForBatch)
        : null;
      if (selectedTerm && selectedTerm.batchId !== batchId) return null;
      if (selectedForBatch) return selectedForBatch;
      const batch = batches.find((item) => item.id === batchId);
      return batch?.activeTermId ?? null;
    },
    [selectedTermId, termById, batches],
  );

  const getDivisionDefaultRoomForTerm = useCallback(
    (division: Division | undefined) => {
      if (!division) return "";
      const batchId = division.batch?.id;
      const preferredTermId = getPreferredTermIdForBatch(batchId);
      if (!preferredTermId) return division.defaultRoomId ?? "";
      return (
        division.termRoomAssignments?.find(
          (assignment) => assignment.termId === preferredTermId,
        )?.roomId ??
        division.defaultRoomId ??
        ""
      );
    },
    [getPreferredTermIdForBatch],
  );

  const getGroupDefaultRoomForTerm = useCallback(
    (group: Group | undefined) => {
      if (!group) return "";
      const allowedBatchIds =
        group.allowedBatchIds ?? (group.batchId ? [group.batchId] : []);
      const preferredTermId = allowedBatchIds
        .map((batchId) => getPreferredTermIdForBatch(batchId))
        .find(Boolean);
      if (!preferredTermId) return group.defaultRoomId ?? "";
      return (
        group.termRoomAssignments?.find(
          (assignment) => assignment.termId === preferredTermId,
        )?.roomId ??
        group.defaultRoomId ??
        ""
      );
    },
    [getPreferredTermIdForBatch],
  );

  // Courses filtered by selected terms
  const visibleCourses = useMemo(() => {
    if (selectedTermId === "__all__") return courses;
    return courses.filter((c) =>
      c.courseTerms?.some((ct) => ct.term.id === selectedTermId),
    );
  }, [courses, selectedTermId]);

  // Courses filtered by target type + batch context
  const coursesForTarget = useMemo(() => {
    // Derive batch IDs from whatever is selected in the modal
    const contextBatchIds: string[] = [];
    if (form.targetType === "division") {
      form.divisionIds.forEach((divId) => {
        const div = divisions.find((d) => d.id === divId);
        if (div?.batch?.id) contextBatchIds.push(div.batch.id);
      });
    } else if (form.groupId) {
      const grp = groups.find((g) => g.id === form.groupId);
      contextBatchIds.push(
        ...(grp?.allowedBatchIds ?? (grp?.batchId ? [grp.batchId] : [])),
      );
    }

    // Narrow to the batch's courses when context is known
    const batchFiltered =
      contextBatchIds.length > 0
        ? visibleCourses.filter((c) =>
            c.courseTerms?.some((ct) =>
              contextBatchIds.includes(ct.term.batchId),
            ),
          )
        : visibleCourses;

    if (form.targetType === "division") {
      if (form.divisionIds.length === 0) {
        return batchFiltered.filter((c) => c.type === "core");
      }
      return batchFiltered.filter((c) => {
        if (c.type !== "core") return false;
        const mappedDivisionIds =
          c.courseDivisions?.map((cd) => cd.division.id) ?? [];
        return (
          mappedDivisionIds.length === 0 ||
          mappedDivisionIds.some((divisionId) =>
            form.divisionIds.includes(divisionId),
          )
        );
      });
    }

    // Group target
    if (!form.groupId) return batchFiltered;
    const selectedGroup = groups.find((g) => g.id === form.groupId);
    if (!selectedGroup) return batchFiltered;

    if (selectedGroup.type === "specialisation") {
      const mappedCourses = batchFiltered.filter(
        (c) =>
          c.type === "specialisation" &&
          c.courseGroups?.some((cg) => cg.group.id === form.groupId),
      );
      if (mappedCourses.length > 0) {
        return mappedCourses;
      }

      // Fallback for legacy data that has spec courses but no explicit course-group mappings yet.
      return batchFiltered.filter(
        (c) =>
          c.type === "specialisation" &&
          !!selectedGroup.specialisationId &&
          c.specialisationId === selectedGroup.specialisationId,
      );
    }
    // common_elective / open_elective → elective and minor courses
    return batchFiltered.filter(
      (c) => c.type === "elective" || c.type === "minor",
    );
  }, [
    form.targetType,
    form.groupId,
    form.divisionIds,
    visibleCourses,
    groups,
    divisions,
  ]);

  // Faculty filtered by selected course (in modal)
  const facultyForCourse = useMemo(() => {
    if (!form.courseId) return faculty;
    const course = courses.find((c) => c.id === form.courseId);
    if (!course?.facultyCourses?.length) return faculty; // fallback to all
    return course.facultyCourses.map((fc) => fc.faculty);
  }, [form.courseId, courses, faculty]);

  // Cascade reset when batch filter changes
  useEffect(() => {
    if (
      selectedTermId !== "__all__" &&
      !visibleTerms.some((term) => term.id === selectedTermId)
    ) {
      setSelectedTermId("__all__");
    }
    if (
      filterDivisionId !== "__all__" &&
      !visibleDivisions.some((d) => d.id === filterDivisionId)
    ) {
      setFilterDivisionId("__all__");
    }
    if (
      filterGroupId !== "__all__" &&
      !visibleGroups.some((g) => g.id === filterGroupId)
    ) {
      setFilterGroupId("__all__");
    }
  }, [
    selectedBatchId,
    selectedTermId,
    visibleTerms,
    visibleDivisions,
    visibleGroups,
    filterDivisionId,
    filterGroupId,
  ]);

  // Auto-populate room when division/group changes
  useEffect(() => {
    if (form.targetType === "division" && form.divisionIds.length > 0) {
      const firstDiv = divisions.find((d) => d.id === form.divisionIds[0]);
      const roomId = getDivisionDefaultRoomForTerm(firstDiv);
      if (roomId && !form.roomId) {
        setForm((f) => ({ ...f, roomId }));
      }
    } else if (form.targetType === "group" && form.groupId) {
      const grp = groups.find((g) => g.id === form.groupId);
      const roomId = getGroupDefaultRoomForTerm(grp);
      if (roomId && !form.roomId) {
        setForm((f) => ({ ...f, roomId }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.divisionIds,
    form.groupId,
    form.targetType,
    selectedTermId,
    batches,
    divisions,
    groups,
  ]);

  // ─── Client-side filtering ─────────────────────────────────────────────

  const filteredDrafts = useMemo(
    () =>
      allDrafts.filter((d) => {
        if (!showPublished && d.isPublished) return false;
        if (filterFacultyId !== "__all__" && d.facultyId !== filterFacultyId)
          return false;
        if (filterDivisionId !== "__all__" && d.divisionId !== filterDivisionId)
          return false;
        if (filterGroupId !== "__all__" && d.groupId !== filterGroupId)
          return false;
        if (filterCourseId !== "__all__" && d.courseId !== filterCourseId)
          return false;
        return true;
      }),
    [
      allDrafts,
      filterFacultyId,
      filterDivisionId,
      filterGroupId,
      filterCourseId,
      showPublished,
    ],
  );

  // ─── Week navigation ──────────────────────────────────────────────────────

  const navigate = (dir: -1 | 1) => {
    const ref = new Date(weekDates[0] + "T00:00:00");
    ref.setDate(ref.getDate() + dir * 7);
    setWeekDates(getWeekDates(ref));
  };

  // ─── Cell click handlers ──────────────────────────────────────────────────

  const openAdd = (date: string, slotNumber: number) => {
    if (selectedTermId === "__all__") {
      alert("Select a term before adding draft slots.");
      return;
    }

    const isGroupFiltered = filterGroupId !== "__all__";
    setForm({
      targetType: isGroupFiltered ? "group" : "division",
      divisionIds:
        !isGroupFiltered && filterDivisionId !== "__all__"
          ? [filterDivisionId]
          : [],
      groupId: isGroupFiltered ? filterGroupId : "",
      courseId: "",
      facultyId: filterFacultyId !== "__all__" ? filterFacultyId : "",
      roomId: "",
      activityType: "session",
    });
    setFormError("");
    setModal({ open: true, date, slotNumber, editing: null });
  };

  const openEdit = (entry: DraftEntry) => {
    const isGroup = !!entry.groupId && !entry.divisionId;
    setForm({
      targetType: isGroup ? "group" : "division",
      divisionIds: entry.divisionId ? [entry.divisionId] : [],
      groupId: entry.groupId ?? "",
      courseId: entry.courseId,
      facultyId: entry.facultyId ?? "",
      roomId: entry.roomId ?? "",
      activityType: entry.activityType,
    });
    setFormError("");
    setModal({
      open: true,
      date: entry.date,
      slotNumber: entry.slotNumber,
      editing: entry,
    });
  };

  // ─── Save draft ───────────────────────────────────────────────────────────

  const saveDraft = async () => {
    if (selectedTermId === "__all__") {
      setFormError("Select a term before saving draft slots.");
      return;
    }

    const selectedTerm = terms.find((term) => term.id === selectedTermId);
    if (selectedTerm?.startDate && modal.date < selectedTerm.startDate) {
      setFormError(
        `Date is before ${selectedTerm.name} start date (${selectedTerm.startDate}).`,
      );
      return;
    }
    if (selectedTerm?.endDate && modal.date > selectedTerm.endDate) {
      setFormError(
        `Date is after ${selectedTerm.name} end date (${selectedTerm.endDate}).`,
      );
      return;
    }

    const hasDivisions =
      form.targetType === "division" && form.divisionIds.length > 0;
    const hasGroup = form.targetType === "group" && form.groupId;
    if (!hasDivisions && !hasGroup) {
      setFormError(
        `${form.targetType === "division" ? "Division" : "Group"} and course are required.`,
      );
      return;
    }
    if (!form.courseId) {
      setFormError("Course is required.");
      return;
    }

    // Block if a selected division already has a course in this slot
    if (form.targetType === "division") {
      const clashingDivIds = form.divisionIds.filter((divId) =>
        allDrafts.some(
          (d) =>
            d.divisionId === divId &&
            d.date === modal.date &&
            d.slotNumber === modal.slotNumber &&
            d.id !== modal.editing?.id,
        ),
      );
      if (clashingDivIds.length > 0) {
        const names = clashingDivIds
          .map((id) => divisions.find((d) => d.id === id)?.name ?? id)
          .join(", ");
        setFormError(
          `${clashingDivIds.length > 1 ? "Divisions" : "Division"} ${names} already ${
            clashingDivIds.length > 1 ? "have" : "has"
          } a course in this slot. Edit the existing entry instead.`,
        );
        return;
      }
    }

    // Block if selected room is already taken in this slot
    if (form.roomId) {
      const roomClashEntry = otherEntries.find(
        (e) => e.roomId === form.roomId && e.id !== modal.editing?.id,
      );
      if (roomClashEntry) {
        const target =
          roomClashEntry.division?.name ??
          roomClashEntry.group?.name ??
          "another class";
        setFormError(
          `Room clash: this room is already booked for ${target} (${roomClashEntry.course.code}) in this slot. Choose a different room.`,
        );
        return;
      }
    }

    setSaving(true);
    setFormError("");
    try {
      if (form.targetType === "division") {
        // Loop POST per division for combined classes
        for (const divId of form.divisionIds) {
          const res = await fetch("/api/admin/timetable/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              divisionId: divId,
              groupId: null,
              termId: selectedTermId,
              courseId: form.courseId,
              facultyId: form.facultyId || null,
              roomId: form.roomId || null,
              date: modal.date,
              slotNumber: modal.slotNumber,
              activityType: form.activityType,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            setFormError(err.error ?? "Save failed.");
            fetchDrafts(); // refresh to show partial saves
            return;
          }
        }
      } else {
        // Single group save
        const res = await fetch("/api/admin/timetable/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            divisionId: null,
            groupId: form.groupId,
            termId: selectedTermId,
            courseId: form.courseId,
            facultyId: form.facultyId || null,
            roomId: form.roomId || null,
            date: modal.date,
            slotNumber: modal.slotNumber,
            activityType: form.activityType,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          setFormError(err.error ?? "Save failed.");
          return;
        }
      }
      setModal((m) => ({ ...m, open: false }));
      fetchDrafts();
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete draft ─────────────────────────────────────────────────────────

  const deleteDraft = async () => {
    if (!modal.editing) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/timetable/draft?id=${modal.editing.id}`, {
        method: "DELETE",
      });
      setModal((m) => ({ ...m, open: false }));
      fetchDrafts();
    } finally {
      setSaving(false);
    }
  };

  // ─── Publish week ─────────────────────────────────────────────────────────

  const publishWeek = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/timetable/draft/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekOf: weekDates[0],
          termId: selectedTermId !== "__all__" ? selectedTermId : undefined,
        }),
      });
      const data = await res.json();
      alert(
        `Synced week: ${data.published} published${data.skipped ? `, ${data.skipped} skipped` : ""}${data.removed ? `, ${data.removed} removed` : ""}.`,
      );
      setShowPublishDialog(false);
      fetchDrafts();
      fetchLiveTimetable();
    } finally {
      setPublishing(false);
    }
  };

  // ─── Grid data ────────────────────────────────────────────────────────────

  const getCellEntries = (date: string, slotNumber: number) =>
    filteredDrafts.filter(
      (d) => d.date === date && d.slotNumber === slotNumber,
    );

  const getAllCellEntries = (date: string, slotNumber: number) =>
    allDrafts.filter((d) => d.date === date && d.slotNumber === slotNumber);

  const pendingCount = allDrafts.filter((d) => !d.isPublished).length;

  const todayStr = localDate(new Date());

  // Conflict info for the open modal
  const otherEntries = useMemo(() => {
    if (!modal.open) return [];
    return allDrafts.filter(
      (d) =>
        d.date === modal.date &&
        d.slotNumber === modal.slotNumber &&
        d.id !== modal.editing?.id,
    );
  }, [allDrafts, modal.open, modal.date, modal.slotNumber, modal.editing]);

  // Student conflict detection helper
  const getStudentConflict = (entry: DraftEntry) => {
    const targetBatchIds =
      form.targetType === "division"
        ? form.divisionIds
            .map((id) => divisions.find((d) => d.id === id)?.batch?.id)
            .filter(Boolean)
        : (groups.find((g) => g.id === form.groupId)?.allowedBatchIds ??
          [groups.find((g) => g.id === form.groupId)?.batchId].filter(Boolean));

    const entryBatchIds = entry.division?.batch?.id
      ? [entry.division.batch.id]
      : (entry.group?.allowedBatchIds ??
        [entry.group?.batchId ?? entry.group?.batch?.id].filter(Boolean));

    return !!(
      (
        entryBatchIds.some((entryBatchId) =>
          targetBatchIds.includes(entryBatchId),
        ) &&
        ((form.targetType === "division" && entry.groupId) || // target=division, other=group
          (form.targetType === "group" && entry.divisionId))
      ) // target=group, other=division
    );
  };

  // Free count per day (for headers)
  const freeCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const date of weekDates) {
      let occupied = 0;
      for (const s of FIXED_SLOTS) {
        if (
          filteredDrafts.some((d) => d.date === date && d.slotNumber === s.slot)
        ) {
          occupied++;
        }
      }
      map[date] = 8 - occupied;
    }
    return map;
  }, [weekDates, filteredDrafts]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative z-[1]">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">
            Draft Timetable
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 hidden md:block">
            Build and publish the weekly timetable. Drafts are not visible to
            students.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {/* ERP Export — desktop only */}
          <div className="hidden md:flex items-end gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                Term Start
              </label>
              <input
                type="date"
                value={erpTermStart}
                onChange={(e) => setErpTermStart(e.target.value)}
                className="h-8 px-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] focus:outline-none focus:border-[#531f75]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                Term End
              </label>
              <input
                type="date"
                value={erpTermEnd}
                onChange={(e) => setErpTermEnd(e.target.value)}
                className="h-8 px-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] focus:outline-none focus:border-[#531f75]"
              />
            </div>
            <Button
              onClick={exportERP}
              disabled={exporting}
              variant="outline"
              className="h-8 text-xs border-[#531f75]/40 text-[#531f75] hover:bg-[#531f75]/10"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5 mr-1" />
              {exporting ? "Exporting…" : "Export ERP"}
            </Button>
          </div>
          <Button
            onClick={() => setShowPublishDialog(true)}
            disabled={publishing}
            className="bg-[#531f75] hover:bg-[#531f75]/90 text-white h-8"
          >
            Publish Sync ({pendingCount})
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2 md:gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-[var(--color-text-primary)] min-w-[140px] md:min-w-[160px] text-center">
          {fmtWeekRange(weekDates)}
        </span>
        <button
          onClick={() => navigate(1)}
          className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekDates(getWeekDates(new Date()))}
          className="ml-1 text-[#f58220] border-[#f58220]/40 hover:bg-[#f58220]/10"
        >
          Today
        </Button>
      </div>

      {/* Filter bar */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48 md:w-56">
            <Select
              value={selectedBatchId}
              onValueChange={(value) => {
                setSelectedBatchId(value);
                if (value === "__all__") {
                  setSelectedTermId("__all__");
                  return;
                }

                const selectedBatch = batches.find(
                  (batch) => batch.id === value,
                );
                const nextTermId =
                  selectedBatch?.activeTermId ??
                  terms.find((term) => term.batchId === value)?.id ??
                  "__all__";
                setSelectedTermId(nextTermId);
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Batches</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name} {b.programme ? `(${b.programme.name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 md:w-48">
            <Select value={selectedTermId} onValueChange={setSelectedTermId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Terms</SelectItem>
                {visibleTerms.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            Showing:{" "}
            {selectedBatchId === "__all__"
              ? "All Batches"
              : (batches.find((b) => b.id === selectedBatchId)?.name ??
                "Batch")}
            {" • "}
            {selectedTermId === "__all__"
              ? "All Terms"
              : (terms.find((t) => t.id === selectedTermId)?.name ?? "Term")}
          </span>
        </div>

        {/* Division / Faculty / Course dropdown filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40 md:w-44">
            <Select
              value={filterDivisionId}
              onValueChange={(value) => {
                setFilterDivisionId(value);
                if (value !== "__all__") setFilterGroupId("__all__");
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Divisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Divisions</SelectItem>
                {visibleDivisions.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name} {d.batch ? `(${d.batch.name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 md:w-44">
            <Select
              value={filterGroupId}
              onValueChange={(value) => {
                setFilterGroupId(value);
                if (value !== "__all__") setFilterDivisionId("__all__");
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Groups</SelectItem>
                {visibleGroups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {getGroupDisplayLabel(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 md:w-44">
            <Select value={filterFacultyId} onValueChange={setFilterFacultyId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Faculty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Faculty</SelectItem>
                {faculty.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 md:w-44">
            <Select value={filterCourseId} onValueChange={setFilterCourseId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Courses</SelectItem>
                {visibleCourses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPublished}
              onChange={(e) => setShowPublished(e.target.checked)}
              className="rounded border-[var(--color-border)] accent-[#531f75]"
            />
            Show published
          </label>
        </div>
      </div>

      {/* ─── Desktop: Timetable grid ─────────────────────────────────────── */}
      <div className="hidden md:block">
        <Card className="overflow-x-auto">
          <CardContent className="p-0">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="w-24 px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)] border-b border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    Slot
                  </th>
                  {weekDates.map((date, i) => {
                    const d = new Date(date + "T00:00:00");
                    const isToday = date === todayStr;
                    const freeCount = freeCountByDate[date] ?? 8;
                    return (
                      <th
                        key={date}
                        className={`px-2 py-2 text-center text-xs font-semibold border-b border-r border-[var(--color-border)] last:border-r-0 ${
                          isToday
                            ? "bg-[#f58220]/10 text-[#f58220]"
                            : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        <div>{DAY_NAMES[i]}</div>
                        <div
                          className={`text-[11px] font-normal ${isToday ? "text-[#f58220]" : "text-[var(--color-text-muted)]"}`}
                        >
                          {d.getDate()}/{d.getMonth() + 1}
                        </div>
                        <div className="text-[9px] font-normal text-green-600/70 mt-0.5">
                          {freeCount} free
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {FIXED_SLOTS.map((slot) => (
                  <tr key={slot.slot}>
                    <td className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-b border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] whitespace-nowrap font-medium">
                      <div className="font-semibold text-[var(--color-text-secondary)]">
                        S{slot.slot}
                      </div>
                      <div className="text-[10px]">{slot.label}</div>
                    </td>
                    {weekDates.map((date) => {
                      const entries = getCellEntries(date, slot.slot);
                      const isToday = date === todayStr;
                      return (
                        <td
                          key={date}
                          className={`px-1.5 py-1.5 border-b border-r border-[var(--color-border)] last:border-r-0 align-top ${
                            isToday ? "bg-[#f58220]/5" : ""
                          }`}
                          style={{ minWidth: "110px", verticalAlign: "top" }}
                        >
                          {entries.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {entries.map((entry) => (
                                <button
                                  key={entry.id}
                                  onClick={() => openEdit(entry)}
                                  className={`w-full text-left rounded-md px-2 py-1.5 text-[11px] leading-tight border transition-colors cursor-pointer ${
                                    entry.isPublished
                                      ? "border-green-500/30 bg-green-500/10 hover:bg-green-500/20"
                                      : "border-[#531f75]/30 bg-[#531f75]/10 hover:bg-[#531f75]/20"
                                  }`}
                                >
                                  <div
                                    className={`font-semibold truncate ${entry.isPublished ? "text-green-700" : "text-[#531f75]"}`}
                                  >
                                    {entry.course.code}
                                  </div>
                                  <div className="text-[var(--color-text-secondary)] truncate">
                                    {entry.division?.name ?? entry.group?.name}
                                  </div>
                                  {entry.faculty && (
                                    <div className="text-[var(--color-text-muted)] truncate">
                                      {entry.faculty.name}
                                    </div>
                                  )}
                                  {entry.room && (
                                    <div className="text-[var(--color-text-muted)] truncate">
                                      {entry.room.name}
                                    </div>
                                  )}
                                  {entry.isPublished && (
                                    <Badge
                                      variant="secondary"
                                      className="mt-0.5 text-[9px] px-1 py-0 h-auto bg-green-500/20 text-green-700 border-green-500/30"
                                    >
                                      Published
                                    </Badge>
                                  )}
                                  {entry.activityType !== "session" && (
                                    <Badge
                                      variant="secondary"
                                      className="mt-0.5 text-[9px] px-1 py-0 h-auto bg-[#f58220]/20 text-[#f58220] border-[#f58220]/30"
                                    >
                                      {entry.activityType}
                                    </Badge>
                                  )}
                                </button>
                              ))}
                              <button
                                onClick={() => openAdd(date, slot.slot)}
                                className="w-full flex items-center justify-center rounded-md px-1 py-1 text-[10px] text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                              >
                                <PlusIcon className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openAdd(date, slot.slot)}
                              className="w-full min-h-[48px] flex flex-col items-center justify-center rounded-md border border-dashed border-green-500/30 bg-green-500/5 text-green-600/50 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/50 transition-all cursor-pointer"
                            >
                              <PlusIcon className="w-3.5 h-3.5" />
                              <span className="text-[9px] mt-0.5">Free</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="flex items-center justify-center py-8 text-sm text-[var(--color-text-muted)]">
                Loading drafts…
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Mobile: Day-focused card view ────────────────────────────────── */}
      <div className="block md:hidden">
        {/* Day tab bar */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {weekDates.map((date, i) => {
            const isToday = date === todayStr;
            const isActive = i === mobileDay;
            const freeCount = freeCountByDate[date] ?? 8;
            return (
              <button
                key={date}
                onClick={() => setMobileDay(i)}
                className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? "bg-[#531f75] text-white"
                    : isToday
                      ? "bg-[#f58220]/10 text-[#f58220] border border-[#f58220]/30"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                }`}
              >
                <span className="font-semibold">{DAY_NAMES[i]}</span>
                <span
                  className={`text-[10px] ${isActive ? "text-white/70" : ""}`}
                >
                  {new Date(date + "T00:00:00").getDate()}/
                  {new Date(date + "T00:00:00").getMonth() + 1}
                </span>
                <span
                  className={`text-[9px] mt-0.5 ${isActive ? "text-green-300" : "text-green-600/70"}`}
                >
                  {freeCount} free
                </span>
              </button>
            );
          })}
        </div>

        {/* Slot cards for selected day */}
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-[var(--color-text-muted)]">
              Loading drafts…
            </div>
          )}
          {!loading &&
            FIXED_SLOTS.map((slot) => {
              const date = weekDates[mobileDay];
              if (!date) return null;
              const entries = getCellEntries(date, slot.slot);
              const allEntries = getAllCellEntries(date, slot.slot);
              const othersCount = allEntries.length - entries.length;
              const isFree = entries.length === 0;

              return (
                <div
                  key={slot.slot}
                  className={`rounded-xl border p-3 ${
                    isFree
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-[var(--color-border)] bg-[var(--color-bg-card)]"
                  }`}
                >
                  {/* Slot header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-[var(--color-text-secondary)]">
                      S{slot.slot}{" "}
                      <span className="font-normal text-[var(--color-text-muted)]">
                        {slot.label}
                      </span>
                    </div>
                    <button
                      onClick={() => openAdd(date, slot.slot)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <PlusIcon className="w-3 h-3" />
                      Add
                    </button>
                  </div>

                  {isFree ? (
                    <div className="text-sm text-green-600/70 font-medium py-1">
                      Free
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {entries.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => openEdit(entry)}
                          className={`w-full text-left rounded-lg px-3 py-2 text-xs leading-snug border transition-colors cursor-pointer ${
                            entry.isPublished
                              ? "border-green-500/30 bg-green-500/10 hover:bg-green-500/20"
                              : "border-[#531f75]/30 bg-[#531f75]/10 hover:bg-[#531f75]/20"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${entry.isPublished ? "text-green-700" : "text-[#531f75]"}`}
                            >
                              {entry.course.code}
                            </span>
                            <span className="text-[var(--color-text-secondary)]">
                              {entry.division?.name ?? entry.group?.name}
                            </span>
                            {entry.isPublished && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 h-auto bg-green-500/20 text-green-700 border-green-500/30"
                              >
                                Published
                              </Badge>
                            )}
                            {entry.activityType !== "session" && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 h-auto bg-[#f58220]/20 text-[#f58220] border-[#f58220]/30"
                              >
                                {entry.activityType}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[var(--color-text-muted)] mt-0.5">
                            {[entry.faculty?.name, entry.room?.name]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </button>
                      ))}
                      {othersCount > 0 && (
                        <div className="text-[10px] text-[var(--color-text-muted)] pl-1">
                          + {othersCount} other{othersCount !== 1 ? "s" : ""} in
                          this slot
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* ─── Add / Edit Modal ────────────────────────────────────────────── */}
      <Dialog
        open={modal.open}
        onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modal.editing ? "Edit Draft Slot" : "Add Draft Slot"}
              <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                {modal.date} · S{modal.slotNumber}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && <p className="text-sm text-red-500">{formError}</p>}

            {/* Target type toggle */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                Target *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={form.targetType === "division"}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        targetType: "division",
                        groupId: "",
                        courseId: "",
                      }))
                    }
                    className="accent-[#531f75]"
                  />
                  Division
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={form.targetType === "group"}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        targetType: "group",
                        divisionIds: [],
                        courseId: "",
                      }))
                    }
                    className="accent-[#531f75]"
                  />
                  Group
                </label>
              </div>
            </div>

            {form.targetType === "division" ? (
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                  Division *
                </label>
                {modal.editing ? (
                  // Edit mode: single division only (locked)
                  <Select
                    value={form.divisionIds[0] || ""}
                    onValueChange={() => {}}
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleDivisions.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name} {d.batch ? `(${d.batch.name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  // Add mode: multi-select with ToggleChip
                  <div className="flex flex-wrap gap-1.5 p-2 border border-[var(--color-border)] rounded-md min-h-[36px]">
                    {visibleDivisions.map((d) => (
                      <ToggleChip
                        key={d.id}
                        label={`${d.name}${d.batch ? ` (${d.batch.name})` : ""}`}
                        selected={form.divisionIds.includes(d.id)}
                        onToggle={() => {
                          setForm((f) => ({
                            ...f,
                            divisionIds: f.divisionIds.includes(d.id)
                              ? f.divisionIds.filter((id) => id !== d.id)
                              : [...f.divisionIds, d.id],
                          }));
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                  Group *
                </label>
                <Select
                  value={form.groupId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, groupId: v, courseId: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleGroups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {getGroupDisplayLabel(g)}{" "}
                        {g.specialisation
                          ? `(${g.specialisation.code})`
                          : `(${g.type})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                Course *
              </label>
              <Select
                value={form.courseId}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, courseId: v }));
                  // Clear faculty if not valid for new course
                  if (v) {
                    const course = courses.find((c) => c.id === v);
                    if (course?.facultyCourses?.length && form.facultyId) {
                      const isValidFaculty = course.facultyCourses.some(
                        (fc) => fc.faculty.id === form.facultyId,
                      );
                      if (!isValidFaculty) {
                        setForm((f) => ({ ...f, facultyId: "" }));
                      }
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {coursesForTarget.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                Faculty
              </label>
              <Select
                value={form.facultyId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    facultyId: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {facultyForCourse.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                Room
              </label>
              <Select
                value={form.roomId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, roomId: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                Activity Type
              </label>
              <Select
                value={form.activityType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, activityType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">Session</SelectItem>
                  <SelectItem value="evaluation">Evaluation / Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conflict info — other bookings in same slot */}
            {otherEntries.length > 0 && (
              <div className="pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  Other bookings — S{modal.slotNumber}
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {otherEntries.map((e) => {
                    const facultyClash = !!(
                      form.facultyId &&
                      e.facultyId === form.facultyId &&
                      e.id !== modal.editing?.id
                    );
                    const roomClash = !!(
                      form.roomId &&
                      e.roomId === form.roomId &&
                      e.id !== modal.editing?.id
                    );
                    const divisionClash = !!(
                      form.targetType === "division" &&
                      e.divisionId &&
                      form.divisionIds.includes(e.divisionId) &&
                      e.id !== modal.editing?.id
                    );
                    const isStudentConflict = getStudentConflict(e);
                    const hasAnyClash =
                      facultyClash || roomClash || divisionClash;
                    return (
                      <div
                        key={e.id}
                        className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs p-1.5 rounded ${hasAnyClash ? "bg-red-500/5 border border-red-500/20" : "bg-[var(--color-bg-secondary)]"}`}
                      >
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {e.course.code}
                        </span>
                        <span className="text-[var(--color-text-muted)]">
                          {e.division?.name ?? e.group?.name}
                        </span>
                        {e.faculty && (
                          <span className="text-[var(--color-text-muted)]">
                            · {e.faculty.name}
                          </span>
                        )}
                        {e.room && (
                          <span className="text-[var(--color-text-muted)]">
                            · {e.room.name}
                          </span>
                        )}
                        {divisionClash && (
                          <Badge className="text-[9px] px-1 py-0 h-auto bg-red-500/10 text-red-600 border-red-500/30">
                            Division already booked!
                          </Badge>
                        )}
                        {facultyClash && (
                          <Badge className="text-[9px] px-1 py-0 h-auto bg-red-500/10 text-red-500 border-red-500/30">
                            Faculty clash!
                          </Badge>
                        )}
                        {roomClash && (
                          <Badge className="text-[9px] px-1 py-0 h-auto bg-orange-500/10 text-orange-500 border-orange-500/30">
                            Room clash!
                          </Badge>
                        )}
                        {isStudentConflict && (
                          <Badge className="text-[9px] px-1 py-0 h-auto bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            Student conflict!
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <>
              {modal.editing && (
                <Button
                  variant="destructive"
                  onClick={deleteDraft}
                  disabled={saving}
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setModal((m) => ({ ...m, open: false }))}
              >
                Cancel
              </Button>
              <Button
                onClick={saveDraft}
                disabled={saving}
                className="bg-[#531f75] hover:bg-[#531f75]/90 text-white"
              >
                {saving ? "Saving…" : modal.editing ? "Update" : "Add"}
              </Button>
            </>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish Week</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            This sync will publish updates for{" "}
            <strong>{fmtWeekRange(weekDates)}</strong>. It will also remove live
            slots that no longer exist in drafts for this scope. Pending draft
            edits: <strong>{pendingCount}</strong>.
          </p>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 space-y-2">
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Change Summary
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                Add: {syncPreview.totals.add}
              </Badge>
              <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                Update: {syncPreview.totals.update}
              </Badge>
              <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/30">
                Remove: {syncPreview.totals.remove}
              </Badge>
            </div>
            <div className="space-y-1 text-xs text-[var(--color-text-secondary)]">
              {syncPreview.toAdd.slice(0, 3).map((entry) => (
                <div key={`add-${entry.id}`}>+ {describeEntry(entry)}</div>
              ))}
              {syncPreview.toUpdate.slice(0, 3).map(({ draft }) => (
                <div key={`update-${draft.id}`}>~ {describeEntry(draft)}</div>
              ))}
              {syncPreview.toRemove.slice(0, 3).map((entry) => (
                <div key={`remove-${entry.id}`}>- {describeEntry(entry)}</div>
              ))}
              {syncPreview.totals.add +
                syncPreview.totals.update +
                syncPreview.totals.remove ===
                0 && <div>No net changes detected for this scope.</div>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={publishWeek}
              disabled={publishing}
              className="bg-[#531f75] hover:bg-[#531f75]/90 text-white"
            >
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
