/**
 * seed-timetable-t12.js
 *
 * Creates Timetable entries for Terms 1 and 2 (both PGDM and PGDM-BM batches).
 *
 * Rules:
 *  - Mon–Sat working days only (Sundays skipped)
 *  - Up to 5 sessions per day per division (slots 2–6: 9:00 AM – 5:10 PM)
 *  - Sessions spread evenly across each term's date range
 *  - Faculty: 1st half of sessions → faculty[0], 2nd half → faculty[1]
 *    (faculty sorted alphabetically for determinism; if only 1, all sessions go to that faculty)
 *  - No faculty double-booking (same faculty at same date+slot for two divisions)
 *  - No division double-booking (same slot twice in one day for a division)
 *  - visibility = "confirmed", activityType = "session", isConducted = true
 *  - Room = division's defaultRoom
 *  - Idempotent: skipDuplicates = true on createMany
 *
 * Run: node prisma/seed-timetable-t12.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const AVAILABLE_SLOTS = [2, 3, 4, 5, 6]; // 9:00 AM → 5:10 PM
const MAX_PER_DAY = 5; // max sessions per day per division

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns all Mon–Sat dates (YYYY-MM-DD strings) between start and end inclusive. */
function getWorkingDates(startDate, endDate) {
  const dates = [];
  const cur = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDate + "T12:00:00Z");
  while (cur <= end) {
    if (cur.getUTCDay() !== 0) {
      // 0 = Sunday → skip
      dates.push(cur.toISOString().slice(0, 10));
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Target date index for session s of n total sessions across D working days.
 * Spreads sessions as evenly as possible (uniform distribution).
 */
function targetDateIndex(s, n, D) {
  return Math.floor(((s - 1) * D) / n);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🗓️  Seeding timetable for Terms 1 & 2 (both batches)…\n");

  // ── 1. Load terms 1 & 2 with batch → divisions (incl. defaultRoom) ────────
  const terms = await prisma.term.findMany({
    where: { number: { in: [1, 2] } },
    include: {
      batch: {
        include: {
          divisions: {
            orderBy: { name: "asc" },
            include: { defaultRoom: true },
          },
        },
      },
    },
    orderBy: [{ number: "asc" }],
  });

  // ── 2. Conflict trackers (global across all terms so T1 informs T2 etc.) ──
  // Key format:  `${id}:${date}:${slot}`
  const facultyBusy = new Set(); // faculty can't teach two classes simultaneously
  const divSlotUsed = new Set(); // division can't have two classes in same slot/day
  const divDayCount = new Map(); // `${divId}:${date}` → number of sessions that day

  const allEntries = []; // accumulated Timetable row objects

  // ── 3. Processing order: PGDM-T1, BM-T1, PGDM-T2, BM-T2 ─────────────────
  //    Processing PGDM before BM within the same term ensures that shared faculty
  //    slots are already marked when we schedule BM, avoiding double-booking.
  const termOrder = [
    { batchPattern: /^PGDM 2/, number: 1 },
    { batchPattern: /BM/, number: 1 },
    { batchPattern: /^PGDM 2/, number: 2 },
    { batchPattern: /BM/, number: 2 },
  ];

  for (const { batchPattern, number } of termOrder) {
    const term = terms.find(
      (t) => batchPattern.test(t.batch.name) && t.number === number
    );
    if (!term) {
      console.warn(`⚠️  No term ${number} matching ${batchPattern} — skipped`);
      continue;
    }
    if (!term.startDate || !term.endDate) {
      console.warn(
        `⚠️  Term ${number} for ${term.batch.name} has no dates — skipped`
      );
      continue;
    }

    const workingDates = getWorkingDates(term.startDate, term.endDate);
    console.log(
      `📅  ${term.batch.name} — Term ${number}` +
        `  [${term.startDate} → ${term.endDate}]  ${workingDates.length} working days`
    );

    // ── 4. Load courses for this term with their division assignments + faculty ──
    const courseTerms = await prisma.courseTerm.findMany({
      where: { termId: term.id },
      include: {
        course: {
          include: {
            courseDivisions: true,
            facultyCourses: {
              include: { faculty: true },
              orderBy: { faculty: { name: "asc" } }, // deterministic
            },
          },
        },
      },
    });

    // ── 5. Schedule per division ───────────────────────────────────────────────
    for (const division of term.batch.divisions) {
      const courses = courseTerms
        .filter((ct) =>
          ct.course.courseDivisions.some((cd) => cd.divisionId === division.id)
        )
        .map((ct) => ct.course)
        .sort((a, b) => a.code.localeCompare(b.code)); // stable order

      const totalSessions = courses.reduce((s, c) => s + c.totalSessions, 0);
      console.log(
        `   📚 Div ${division.name}: ${courses.length} courses, ${totalSessions} sessions`
      );

      let failures = 0;

      for (const course of courses) {
        const faculty = course.facultyCourses.map((fc) => fc.faculty); // sorted by name
        const half = Math.ceil(course.totalSessions / 2);
        const D = workingDates.length;

        // searchFrom prevents a later session of the same course being placed
        // *before* an earlier session (maintains chronological order per course).
        let searchFrom = 0;

        for (let s = 1; s <= course.totalSessions; s++) {
          // Which faculty teaches this session?
          const fac =
            faculty.length === 0
              ? null
              : s <= half
              ? faculty[0]
              : faculty[1] ?? faculty[0];

          const targetDi = targetDateIndex(s, course.totalSessions, D);
          const startDi = Math.max(searchFrom, targetDi);

          let placed = false;

          for (let di = startDi; di < D && !placed; di++) {
            const date = workingDates[di];
            const dcKey = `${division.id}:${date}`;

            if ((divDayCount.get(dcKey) ?? 0) >= MAX_PER_DAY) continue;

            for (const slot of AVAILABLE_SLOTS) {
              // Check division slot conflict
              if (divSlotUsed.has(`${division.id}:${date}:${slot}`)) continue;
              // Check faculty conflict
              if (fac && facultyBusy.has(`${fac.id}:${date}:${slot}`)) continue;

              // ✅ Slot is free — book it
              allEntries.push({
                divisionId: division.id,
                groupId: null,
                termId: term.id,
                courseId: course.id,
                facultyId: fac?.id ?? null,
                roomId: division.defaultRoom?.id ?? null,
                date,
                slotNumber: slot,
                sessionNumber: s,
                isConducted: true,
                visibility: "confirmed",
                activityType: "session",
              });

              divSlotUsed.add(`${division.id}:${date}:${slot}`);
              if (fac) facultyBusy.add(`${fac.id}:${date}:${slot}`);
              divDayCount.set(dcKey, (divDayCount.get(dcKey) ?? 0) + 1);
              searchFrom = di; // don't go back — preserve chronological order
              placed = true;
              break;
            }
          }

          if (!placed) {
            console.error(
              `   ❌  Could NOT schedule ${course.code} session ${s} for Div ${division.name}`
            );
            failures++;
          }
        }
      }

      if (failures === 0) {
        console.log(`      ✓ All sessions scheduled`);
      }
    }

    console.log();
  }

  // ── 6. Batch insert ──────────────────────────────────────────────────────────
  console.log(`\n📊  Total entries to insert: ${allEntries.length}`);

  const CHUNK = 200;
  let created = 0;

  for (let i = 0; i < allEntries.length; i += CHUNK) {
    const chunk = allEntries.slice(i, i + CHUNK);
    const result = await prisma.timetable.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    created += result.count;
    process.stdout.write(
      `\r   Inserted ${Math.min(i + CHUNK, allEntries.length)} / ${allEntries.length}…`
    );
  }

  console.log(`\n\n✅  Done!  Created ${created} timetable entries.`);

  // ── 7. Summary ──────────────────────────────────────────────────────────────
  const total = await prisma.timetable.count();
  console.log(`   Total Timetable rows in DB: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
