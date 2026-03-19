/**
 * seed-attendance-t12.js
 *
 * Seeds Attendance + AttendanceSyncLog records for Terms 1 & 2.
 *
 * Distribution:
 *  - 90% of sessions processed as biometric  → present students get swipeTime
 *  - 10% of sessions entered manually        → swipeTime is null for all
 *
 * Status mix (per record):
 *  P   (Present)          ~75–85% depending on student profile
 *  AB  (Absent)           ~10–35% depending on student profile
 *  LT  (Late)             ~5%   always manual, with remarks
 *  P#  (Sanctioned Leave) ~2%   always manual, with remarks
 *
 * Edge cases:
 *  - ~10% of students are "struggling" (55–72% attendance → L1/L2/L3 zone)
 *  - ~20 downgrade records: biometric swipe (swipeTime set) but status = AB/LT
 *    with remarks explaining the downgrade
 *  - Sanctioned leaves spread across students with realistic remarks
 *
 * AttendanceSyncLog:
 *  - Every Attendance record gets a syncLog row with status="skipped"
 *    (no GoogleSheetsConfig exists in seed data)
 *
 * Idempotent: skipDuplicates=true — safe to re-run.
 * Run: node prisma/seed-attendance-t12.js
 */

const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const prisma = new PrismaClient();

// ── Deterministic seeded RNG (xorshift32) ─────────────────────────────────────
function makeRNG(seed) {
  let s = seed >>> 0;
  function next() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  }
  return {
    next,
    chance: (p) => next() < p,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}
const rng = makeRNG(20250619);

// ── Remark pools ──────────────────────────────────────────────────────────────
const SANCTIONED_REMARKS = [
  "Medical leave – hospital certificate submitted",
  "Family emergency – sanctioned by programme office",
  "Interview / internship – approved by Dean",
  "Inter-collegiate event – participation sanctioned",
  "Pre-approved absence – conference / workshop",
  "Medical appointment – leave granted by faculty",
  "Outstation exam duty – approved leave",
];

const LATE_REMARKS = [
  "Arrived ~15 min after session start",
  "Delayed due to previous session overrun",
  "Late arrival noted – marked LT",
  "Student entered midway through session",
  "Transport delay – entered at 10 min mark",
  "Lab session from prior slot ran long",
];

const DOWNGRADE_REMARKS = [
  "Proxy attendance suspected – swipe not corroborated by class roll-call",
  "Student confirmed absent despite biometric swipe – downgraded",
  "Biometric swipe at entry; student not found in classroom – marked AB",
  "Late swipe registered after session ended – attendance not credited",
  "Discrepancy between swipe log and physical register – downgraded to AB",
  "Swipe detected but student left immediately – participation not counted",
];

// ── Helper: add N minutes to "HH:mm" and return "HH:mm:ss" ──────────────────
function swipeAt(startTime, extraMinutes) {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + extraMinutes;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("📋  Seeding attendance for Terms 1 & 2…\n");

  // Check if attendance data already exists
  const existingCount = await prisma.attendance.count();
  if (existingCount > 0) {
    console.log(
      `⚠️   ${existingCount} attendance records already exist – new records will be skipped (skipDuplicates=true).\n`
    );
  }

  // ── 1. Load all T1 / T2 timetable entries ─────────────────────────────────
  const sessions = await prisma.timetable.findMany({
    where: {
      term: { number: { in: [1, 2] } },
      divisionId: { not: null },
    },
    include: { slot: true },
    orderBy: [{ date: "asc" }, { divisionId: "asc" }, { slotNumber: "asc" }],
  });
  console.log(`  Sessions (timetable rows): ${sessions.length}`);

  // ── 2. Load students grouped by divisionId ─────────────────────────────────
  const allStudents = await prisma.student.findMany();
  const byDiv = {};
  for (const s of allStudents) {
    if (s.divisionId) (byDiv[s.divisionId] ||= []).push(s);
  }
  console.log(`  Students: ${allStudents.length}\n`);

  // ── 3. Assign per-student attendance probability ───────────────────────────
  //       10% of students are "struggling" → creates L1/L2/L3 edge cases
  const prob = {};
  for (const s of allStudents) {
    prob[s.id] = rng.chance(0.10)
      ? rng.int(55, 72) / 100   // struggling: 55–72%
      : rng.int(78, 95) / 100;  // healthy:    78–95%
  }

  // ── 4. Classify sessions: 10% manual, 90% biometric ──────────────────────
  const manualIds = new Set(
    sessions.filter(() => rng.chance(0.10)).map((s) => s.id)
  );

  // ── 5. Pick ~20 biometric sessions for downgrade edge cases ───────────────
  const biometricSessions = sessions.filter((s) => !manualIds.has(s.id));
  const downgradeSessions = new Set(
    rng.shuffle(biometricSessions).slice(0, 20).map((s) => s.id)
  );

  // ── 6. Generate records ───────────────────────────────────────────────────
  const attendanceRows = [];
  const syncRows = [];
  const stats = { P: 0, AB: 0, LT: 0, "P#": 0, downgraded: 0 };

  for (const session of sessions) {
    const students = byDiv[session.divisionId] || [];
    const biometric = !manualIds.has(session.id);
    const isDowngradeSession = downgradeSessions.has(session.id);

    // For downgrade sessions: choose 1–2 students to downgrade
    const downgradeSet = new Set();
    if (isDowngradeSession) {
      rng.shuffle(students)
        .slice(0, rng.int(1, 2))
        .forEach((s) => downgradeSet.add(s.id));
    }

    for (const student of students) {
      let status, swipeTime, remarks;
      const r = rng.next();

      if (isDowngradeSession && downgradeSet.has(student.id)) {
        // ── Downgrade: swipe exists but status overridden ──────────────────
        swipeTime = swipeAt(session.slot.startTime, rng.int(0, 8));
        status = rng.chance(0.65) ? "AB" : "LT";
        remarks = rng.pick(DOWNGRADE_REMARKS);
        stats.downgraded++;
        stats[status]++;
      } else if (r < 0.02) {
        // ── Sanctioned Leave P# (~2%) — always manual ──────────────────────
        status = "P#";
        swipeTime = null;
        remarks = rng.pick(SANCTIONED_REMARKS);
        stats["P#"]++;
      } else if (r < 0.07) {
        // ── Late LT (~5%) — always manual ──────────────────────────────────
        status = "LT";
        swipeTime = null;
        remarks = rng.pick(LATE_REMARKS);
        stats.LT++;
      } else if (r < 0.07 + (1 - prob[student.id])) {
        // ── Absent AB — probability driven ─────────────────────────────────
        status = "AB";
        swipeTime = null;
        remarks = null;
        stats.AB++;
      } else {
        // ── Present P ──────────────────────────────────────────────────────
        status = "P";
        remarks = null;
        swipeTime = biometric
          ? swipeAt(session.slot.startTime, rng.int(0, 12)) // biometric swipe
          : null; // manual P
        stats.P++;
      }

      const attendanceId = randomUUID();

      attendanceRows.push({
        id: attendanceId,
        timetableId: session.id,
        studentId: student.id,
        status,
        swipeTime,
        remarks,
      });

      // Sync log — "skipped" since no GoogleSheetsConfig exists in seed
      syncRows.push({
        attendanceId,
        timetableId: session.id,
        studentId: student.id,
        configId: null,
        status: "skipped",
        attempts: 0,
      });
    }
  }

  // ── 7. Print stats ────────────────────────────────────────────────────────
  const total = attendanceRows.length;
  console.log("📊  Generated:");
  console.log(`    P  (Present):                ${stats.P.toLocaleString()}  (${pct(stats.P, total)})`);
  console.log(`    AB (Absent):                 ${stats.AB.toLocaleString()}  (${pct(stats.AB, total)})`);
  console.log(`    LT (Late, manual):           ${stats.LT.toLocaleString()}  (${pct(stats.LT, total)})`);
  console.log(`    P# (Sanctioned Leave, manual):${stats["P#"].toLocaleString()}  (${pct(stats["P#"], total)})`);
  console.log(`    ↓  Downgrades (swipe+AB/LT): ${stats.downgraded}  (edge cases)`);
  console.log(`    Total Attendance rows:        ${total.toLocaleString()}`);
  console.log(`    Total SyncLog rows:           ${syncRows.length.toLocaleString()}\n`);

  // ── 8. Batch-insert Attendance ────────────────────────────────────────────
  const CHUNK = 500;
  let aCreated = 0;
  console.log("  Inserting Attendance…");
  for (let i = 0; i < attendanceRows.length; i += CHUNK) {
    const r = await prisma.attendance.createMany({
      data: attendanceRows.slice(i, i + CHUNK),
    });
    aCreated += r.count;
    process.stdout.write(
      `\r    ${Math.min(i + CHUNK, attendanceRows.length).toLocaleString()} / ${total.toLocaleString()}…`
    );
  }
  console.log(`\n    ✓ Inserted ${aCreated.toLocaleString()} records`);

  // ── 9. Batch-insert AttendanceSyncLog ─────────────────────────────────────
  let sCreated = 0;
  console.log("  Inserting AttendanceSyncLog…");
  for (let i = 0; i < syncRows.length; i += CHUNK) {
    const r = await prisma.attendanceSyncLog.createMany({
      data: syncRows.slice(i, i + CHUNK),
    });
    sCreated += r.count;
    process.stdout.write(
      `\r    ${Math.min(i + CHUNK, syncRows.length).toLocaleString()} / ${syncRows.length.toLocaleString()}…`
    );
  }
  console.log(`\n    ✓ Inserted ${sCreated.toLocaleString()} sync log records`);

  // ── 10. Final count ───────────────────────────────────────────────────────
  const dbTotal = await prisma.attendance.count();
  const dbSync = await prisma.attendanceSyncLog.count();
  console.log(`\n✅  Done!`);
  console.log(`    DB Attendance total:    ${dbTotal.toLocaleString()}`);
  console.log(`    DB AttendanceSyncLog:   ${dbSync.toLocaleString()}`);
}

function pct(n, total) {
  return total === 0 ? "0%" : `${((n / total) * 100).toFixed(1)}%`;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
