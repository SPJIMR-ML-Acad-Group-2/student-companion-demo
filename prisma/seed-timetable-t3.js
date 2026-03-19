/**
 * seed-timetable-t3.js
 *
 * Creates Term 3 timetable entries (2026-01-01 → 2026-03-31) for all cohorts.
 *
 * Time-slot logic (reduces core ↔ spec conflicts):
 *   January    : core → morning slots [2,3,4]   spec → evening slots [5,6,7,8]
 *   Feb & March: core → evening slots [5,6,7,8]  spec → morning slots [2,3,4]
 *
 * Output:
 *   Timetable      (published)   — dates 2026-01-01 → 2026-03-18  isConducted:true  visibility:"confirmed"
 *   DraftTimetable (reference)   — same dates                      isPublished:true
 *   DraftTimetable (unpublished) — dates 2026-03-19 → 2026-03-31  isPublished:false
 *
 * Spec courses appear in both T3-PGDM and T3-BM courseTerms (BM students
 * are group members too). We deduplicate by (courseId, groupId) to avoid
 * double-scheduling.
 *
 * Run: node prisma/seed-timetable-t3.js
 * Idempotent: skipDuplicates=true on all inserts.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PUBLISH_CUTOFF = "2026-03-18"; // dates ≤ this go into Timetable + Draft(published)
const TERM_START     = "2026-01-01";
const TERM_END       = "2026-03-31";

// ── Slot windows by month + course type ───────────────────────────────────────
function slotsFor(dateStr, courseType) {
  const month = parseInt(dateStr.slice(5, 7), 10);
  if (month === 1) return courseType === "core" ? [2, 3, 4] : [5, 6, 7, 8];
  return courseType === "core" ? [5, 6, 7, 8] : [2, 3, 4];
}

// ── Working dates (Mon–Sat, no Sundays) ───────────────────────────────────────
function workingDates(start, end) {
  const dates = [];
  const cur = new Date(start + "T12:00:00Z");
  const fin = new Date(end   + "T12:00:00Z");
  while (cur <= fin) {
    if (cur.getUTCDay() !== 0) dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("📅  Seeding Term 3 timetable…\n");

  // ── 1. Load T3 terms ───────────────────────────────────────────────────────
  const t3Terms = await prisma.term.findMany({
    where: { number: 3 },
    include: { batch: { include: { divisions: { include: { defaultRoom: true } } } } },
    orderBy: { batch: { name: "asc" } },
  });
  console.log(`  T3 terms found: ${t3Terms.map(t => t.batch.name).join(", ")}\n`);

  const divById = Object.fromEntries(
    t3Terms.flatMap(t => t.batch.divisions).map(d => [d.id, d])
  );

  // Map batchId → T3 term, so group jobs use the term matching the group's own batch
  const termByBatch = Object.fromEntries(t3Terms.map(t => [t.batchId, t]));

  // Load all groups with their batchId so we can assign the correct termId
  const allGroups = await prisma.group.findMany({ select: { id: true, batchId: true } });
  const groupBatch = Object.fromEntries(allGroups.map(g => [g.id, g.batchId]));

  // ── 2. Collect all schedule jobs ───────────────────────────────────────────
  // Each job = { cohortId, cohortType, roomId, course, faculty[], termId, courseType }
  const jobs = [];
  const seenGroupCourse = new Set(); // dedup spec courses (appear in both T3 terms)

  for (const term of t3Terms) {
    const cts = await prisma.courseTerm.findMany({
      where: { termId: term.id },
      include: {
        course: {
          include: {
            courseDivisions: true,
            courseGroups:    true,
            facultyCourses:  { include: { faculty: true }, orderBy: { faculty: { name: "asc" } } },
          },
        },
      },
    });

    for (const ct of cts) {
      const c   = ct.course;
      const fac = c.facultyCourses.map(fc => fc.faculty);

      if (c.type === "core") {
        // Use CourseDivision links if they exist; otherwise fall back to
        // all divisions of this term's batch (handles missing CD records).
        let divs = c.courseDivisions.map(cd => divById[cd.divisionId]).filter(Boolean);
        if (divs.length === 0) {
          divs = term.batch.divisions;
          console.warn(`  ⚠️  ${c.code} has no CourseDivision rows — falling back to all ${term.batch.name} divisions (${divs.map(d=>d.name).join(",")})`);
        }
        for (const div of divs) {
          jobs.push({
            cohortId:   div.id,
            cohortType: "division",
            roomId:     div.defaultRoom?.id ?? null,
            course: c, faculty: fac,
            termId: term.id,
            courseType: "core",
          });
        }
      } else if (c.type === "specialisation" && c.courseGroups.length > 0) {
        for (const cg of c.courseGroups) {
          const key = `${c.id}:${cg.groupId}`;
          if (seenGroupCourse.has(key)) continue; // already added from other T3 term
          seenGroupCourse.add(key);
          // Use the T3 term belonging to the group's own batch, so spec entries
          // appear under the correct batch when filtering in the timetable UI.
          const batchId   = groupBatch[cg.groupId] ?? term.batchId;
          const groupTerm = termByBatch[batchId] ?? term;
          jobs.push({
            cohortId:   cg.groupId,
            cohortType: "group",
            roomId:     null,
            course: c, faculty: fac,
            termId: groupTerm.id,
            courseType: "specialisation",
          });
        }
      }
    }
  }
  console.log(`  Schedule jobs: ${jobs.length} (cohort × course pairs)\n`);

  // ── 3. Generate schedule entries ───────────────────────────────────────────
  const allDates   = workingDates(TERM_START, TERM_END);
  const totalDates = allDates.length;
  console.log(`  Working days ${TERM_START} → ${TERM_END}: ${totalDates}\n`);

  // Conflict/occupancy trackers (shared across all cohorts for faculty checks)
  const facultyBusy    = new Set(); // `${facultyId}:${date}:${slot}`
  const cohortSlotUsed = new Set(); // `${cohortId}:${date}:${slot}`

  const ttDivRows   = [];  // → Timetable, division-based
  const ttGrpRows   = [];  // → Timetable, group-based
  const dtDivRows   = [];  // → DraftTimetable, division-based
  const dtGrpRows   = [];  // → DraftTimetable, group-based
  let skipped = 0;

  for (const job of jobs) {
    const { cohortId, cohortType, roomId, course, faculty, termId, courseType } = job;
    const n    = course.totalSessions;
    const half = Math.ceil(n / 2);

    let searchFrom = 0;

    for (let s = 1; s <= n; s++) {
      const targetDi = Math.floor((s - 1) * totalDates / n);
      const startDi  = Math.max(searchFrom, targetDi);

      // Faculty for this session: 1st half → faculty[0], 2nd half → faculty[1] (if exists)
      const fac = faculty.length === 0 ? null
        : s <= half ? faculty[0] : (faculty[1] ?? faculty[0]);

      let placed = false;

      for (let di = startDi; di < totalDates && !placed; di++) {
        const date     = allDates[di];
        const slots    = slotsFor(date, courseType);
        const cohortKey = `${cohortId}:${date}`;

        for (const slot of slots) {
          const csKey  = `${cohortId}:${date}:${slot}`;
          const facKey = fac ? `${fac.id}:${date}:${slot}` : null;

          if (cohortSlotUsed.has(csKey))              continue;
          if (facKey && facultyBusy.has(facKey))       continue;

          // ✅ Book it
          cohortSlotUsed.add(csKey);
          if (facKey) facultyBusy.add(facKey);

          const isPublished = date <= PUBLISH_CUTOFF;
          // Build cohort field without explicit null for the other side
          // (Prisma rejects explicit null on @@unique nullable fields in createMany)
          const cohortField = cohortType === "division"
            ? { divisionId: cohortId }
            : { groupId:    cohortId };
          const base = {
            ...cohortField,
            termId,
            courseId:     course.id,
            facultyId:    fac?.id ?? null,
            roomId,
            date,
            slotNumber:   slot,
            activityType: "session",
          };

          const isDivision = cohortType === "division";

          // Published Timetable entry
          if (isPublished) {
            const pub = { ...base, sessionNumber: s, isConducted: true, visibility: "confirmed" };
            if (isDivision) ttDivRows.push(pub); else ttGrpRows.push(pub);
          }

          // DraftTimetable entry (all dates)
          const dft = { ...base, isPublished };
          if (isDivision) dtDivRows.push(dft); else dtGrpRows.push(dft);

          searchFrom = di;
          placed = true;
          break;
        }
      }

      if (!placed) {
        console.error(`  ❌ Could not place ${course.code} session ${s} for ${cohortType} ${cohortId}`);
        skipped++;
      }
    }
  }

  if (skipped > 0) console.warn(`\n  ⚠️  ${skipped} sessions could not be placed!\n`);

  // ── 4. Stats ───────────────────────────────────────────────────────────────
  const pubTT    = ttDivRows.length + ttGrpRows.length;
  const totalDT  = dtDivRows.length + dtGrpRows.length;
  const draftPub = [...dtDivRows, ...dtGrpRows].filter(r => r.isPublished).length;
  const draftNew = totalDT - draftPub;
  console.log("📊  Generated:");
  console.log(`    Timetable rows (published, ≤ ${PUBLISH_CUTOFF}):  ${pubTT.toLocaleString()}  (div: ${ttDivRows.length}, grp: ${ttGrpRows.length})`);
  console.log(`    DraftTimetable — published reference:              ${draftPub.toLocaleString()}`);
  console.log(`    DraftTimetable — unpublished draft (> ${PUBLISH_CUTOFF.slice(5)}):  ${draftNew.toLocaleString()}`);
  console.log(`    Total DraftTimetable rows:                         ${totalDT.toLocaleString()}\n`);

  // ── 5. Insert Timetable (split by cohort type to keep row shapes consistent) ─
  const CHUNK = 300;

  async function insertMany(model, rows, label) {
    let created = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const r = await model.createMany({ data: rows.slice(i, i + CHUNK) });
      created += r.count;
      process.stdout.write(`\r    ${label}: ${Math.min(i + CHUNK, rows.length).toLocaleString()} / ${rows.length.toLocaleString()}…`);
    }
    if (rows.length > 0) process.stdout.write("\n");
    return created;
  }

  let ttCreated = 0;
  console.log("  Inserting Timetable (published)…");
  ttCreated += await insertMany(prisma.timetable, ttDivRows, "  div");
  ttCreated += await insertMany(prisma.timetable, ttGrpRows, "  grp");
  console.log(`    ✓ Inserted ${ttCreated.toLocaleString()}`);

  // ── 6. Insert DraftTimetable ───────────────────────────────────────────────
  let dtCreated = 0;
  console.log("  Inserting DraftTimetable (all dates)…");
  dtCreated += await insertMany(prisma.draftTimetable, dtDivRows, "  div");
  dtCreated += await insertMany(prisma.draftTimetable, dtGrpRows, "  grp");
  console.log(`    ✓ Inserted ${dtCreated.toLocaleString()}`);

  // ── 7. Final DB counts ─────────────────────────────────────────────────────
  const dbTT = await prisma.timetable.count();
  const dbDT = await prisma.draftTimetable.count();
  console.log(`\n✅  Done!`);
  console.log(`    DB Timetable total:      ${dbTT.toLocaleString()}`);
  console.log(`    DB DraftTimetable total: ${dbDT.toLocaleString()}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
