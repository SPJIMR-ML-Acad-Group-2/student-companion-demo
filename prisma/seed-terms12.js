/**
 * seed-terms12.js — Additive seed for Term 1 & Term 2 core courses
 *
 * SAFE TO RUN on an existing database — does NOT clear any data.
 * Looks up existing batches, terms, and faculty by name.
 * Uses upsert/skipDuplicates where possible to stay idempotent.
 *
 * Run: node prisma/seed-terms12.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Session count by credit value ──────────────────────────────────────────
const SESSIONS_BY_CREDITS = { 1: 9, 2: 18, 3: 26 };

// ─── Course definitions ──────────────────────────────────────────────────────
const TERM1_COURSES = [
  { name: "Business Communication I",                sheetsTabName: "BC-I",    credits: 1, pdmCode: "COM501-PDM-46", pbmCode: "COM501-PBM-04" },
  { name: "Business Policy and Strategy I",          sheetsTabName: "BP&S-I",  credits: 1, pdmCode: "STR501-PDM-46", pbmCode: "STR501-PBM-04" },
  { name: "Decision Analysis Simulation",            sheetsTabName: "DAS",     credits: 2, pdmCode: "QTM503-PDM-46", pbmCode: "QTM503-PBM-04" },
  { name: "Financial Accounting & Statement Analysis", sheetsTabName: "FA&SA", credits: 2, pdmCode: "ACC501-PDM-46", pbmCode: "ACC501-PBM-04" },
  { name: "Managerial Economics I",                  sheetsTabName: "ME-I",    credits: 2, pdmCode: "ECO501-PDM-46", pbmCode: "ECO501-PBM-04" },
  { name: "Marketing Management I",                  sheetsTabName: "MM-I",    credits: 2, pdmCode: "MKT601-PDM-46", pbmCode: "MKT601-PBM-04" },
  { name: "Operations Management I",                 sheetsTabName: "OM-I",    credits: 2, pdmCode: "OPS601-PDM-46", pbmCode: "OPS601-PBM-04" },
  { name: "Organisational Behaviour",                sheetsTabName: "OB",      credits: 1, pdmCode: "OLS501-PDM-46", pbmCode: "OLS501-PBM-04" },
  { name: "Quantitative Methods-I",                  sheetsTabName: "QM-I",    credits: 1, pdmCode: "QTM504-PDM-46", pbmCode: "QTM504-PBM-04" },
  { name: "Science of Spirituality I",               sheetsTabName: "SS-I",    credits: 1, pdmCode: "HUM501-PDM-46", pbmCode: "HUM501-PBM-04" },
  { name: "Wise Innovation Foundation",              sheetsTabName: "WIF",     credits: 1, pdmCode: "HUM502-PDM-46", pbmCode: "HUM502-PBM-04" },
];

const TERM2_COURSES = [
  { name: "Business Communication II",               sheetsTabName: "BC-II",   credits: 2, pdmCode: "COM502-PDM-46", pbmCode: "COM502-PBM-04" },
  { name: "Corporate Finance",                       sheetsTabName: "CF",      credits: 2, pdmCode: "FIN601-PDM-46", pbmCode: "FIN601-PBM-04" },
  { name: "Data Visualisation for Decision Making",  sheetsTabName: "DVDM",    credits: 1, pdmCode: "INF601-PDM-46", pbmCode: "INF601-PBM-04" },
  { name: "Business in Digital Age",                 sheetsTabName: "BDA",     credits: 2, pdmCode: "INF602-PDM-46", pbmCode: "INF602-PBM-04" },
  { name: "Managerial Economics II",                 sheetsTabName: "ME-II",   credits: 3, pdmCode: "ECO502-PDM-46", pbmCode: "ECO502-PBM-04" },
  { name: "Marketing Management II",                 sheetsTabName: "MM-II",   credits: 2, pdmCode: "MKT602-PDM-46", pbmCode: "MKT602-PBM-04" },
  { name: "Operations Management II",                sheetsTabName: "OM-II",   credits: 1, pdmCode: "OPS602-PDM-46", pbmCode: "OPS602-PBM-04" },
  { name: "Organisational Dynamics",                 sheetsTabName: "OD",      credits: 2, pdmCode: "OLS502-PDM-46", pbmCode: "OLS502-PBM-04" },
  { name: "Quantitative Methods-II",                 sheetsTabName: "QM-II",   credits: 3, pdmCode: "QTM505-PDM-46", pbmCode: "QTM505-PBM-04" },
];

// ─── Faculty assignments by teaching area ────────────────────────────────────
// Organisation & Leadership Studies : nandini.shah, ashok.malhotra
// Strategy                          : vinod.chopra, lakshmi.thakur
// Operations/QM                     : sanjay.kulkarni, rekha.joshi, manoj.reddy
// Finance and Accounting            : rajesh.iyer, meena.kapoor, sunil.verma
// Economics & Policy                : kavita.banerjee, rahul.saxena
// Marketing                         : priya.sharma, vikram.mehta, anjali.desai
// Information Management & Analytics: arun.nair, deepa.pillai, karthik.rao
const FACULTY_ASSIGNMENTS = {
  // ── Term 1 ──
  "BC-I":   ["nandini.shah@spjimr.org",   "ashok.malhotra@spjimr.org"],  // OLS
  "BP&S-I": ["vinod.chopra@spjimr.org",   "lakshmi.thakur@spjimr.org"],  // Strategy
  "DAS":    ["sanjay.kulkarni@spjimr.org","manoj.reddy@spjimr.org"],     // Ops/QM
  "FA&SA":  ["rajesh.iyer@spjimr.org",    "meena.kapoor@spjimr.org"],    // Finance
  "ME-I":   ["kavita.banerjee@spjimr.org","rahul.saxena@spjimr.org"],    // Economics
  "MM-I":   ["priya.sharma@spjimr.org",   "vikram.mehta@spjimr.org"],    // Marketing
  "OM-I":   ["rekha.joshi@spjimr.org",    "manoj.reddy@spjimr.org"],     // Ops
  "OB":     ["nandini.shah@spjimr.org",   "ashok.malhotra@spjimr.org"],  // OLS
  "QM-I":   ["sanjay.kulkarni@spjimr.org","rekha.joshi@spjimr.org"],     // QM
  "SS-I":   ["nandini.shah@spjimr.org"],                                   // OLS
  "WIF":    ["lakshmi.thakur@spjimr.org"],                                // Strategy
  // ── Term 2 ──
  "BC-II":  ["nandini.shah@spjimr.org",   "ashok.malhotra@spjimr.org"],  // OLS
  "CF":     ["rajesh.iyer@spjimr.org",    "sunil.verma@spjimr.org"],     // Finance
  "DVDM":   ["arun.nair@spjimr.org",      "deepa.pillai@spjimr.org"],    // IM&A
  "BDA":    ["deepa.pillai@spjimr.org",   "karthik.rao@spjimr.org"],     // IM&A
  "ME-II":  ["kavita.banerjee@spjimr.org","rahul.saxena@spjimr.org"],    // Economics
  "MM-II":  ["vikram.mehta@spjimr.org",   "anjali.desai@spjimr.org"],    // Marketing
  "OM-II":  ["sanjay.kulkarni@spjimr.org","rekha.joshi@spjimr.org"],     // Ops
  "OD":     ["nandini.shah@spjimr.org",   "ashok.malhotra@spjimr.org"],  // OLS
  "QM-II":  ["sanjay.kulkarni@spjimr.org","manoj.reddy@spjimr.org"],     // QM
};

async function main() {
  // ─── Look up existing batches ──────────────────────────
  console.log("🔍 Looking up batches...");
  const pgdmBatch = await prisma.batch.findFirstOrThrow({
    where: { name: "PGDM 2025-27" },
    include: { terms: { orderBy: { number: "asc" } } },
  });
  const pbmBatch = await prisma.batch.findFirstOrThrow({
    where: { name: "PGDM (BM) 2025-27" },
    include: { terms: { orderBy: { number: "asc" } } },
  });

  const t1pgdm = pgdmBatch.terms.find((t) => t.number === 1);
  const t2pgdm = pgdmBatch.terms.find((t) => t.number === 2);
  const t1bm   = pbmBatch.terms.find((t) => t.number === 1);
  const t2bm   = pbmBatch.terms.find((t) => t.number === 2);

  if (!t1pgdm || !t2pgdm || !t1bm || !t2bm) {
    throw new Error("Could not find Term 1 or Term 2 for one of the batches. Run the main seed first.");
  }

  // ─── Look up divisions per batch ───────────────────────
  const pgdmDivisionIds = (
    await prisma.division.findMany({
      where: { batchId: pgdmBatch.id },
      select: { id: true },
    })
  ).map((d) => d.id);

  const pbmDivisionIds = (
    await prisma.division.findMany({
      where: { batchId: pbmBatch.id },
      select: { id: true },
    })
  ).map((d) => d.id);

  // ─── Look up faculty by email ──────────────────────────
  console.log("🔍 Looking up faculty...");
  const allEmails = [...new Set(Object.values(FACULTY_ASSIGNMENTS).flat())];
  const facultyRecords = await prisma.faculty.findMany({
    where: { email: { in: allEmails } },
  });
  const facultyByEmail = new Map(facultyRecords.map((f) => [f.email, f]));

  // ─── Helper: create one course + courseTerms + courseDivisions ────────────
  async function createCourse({ name, sheetsTabName, credits, code, termId, divisionIds }) {
    return prisma.course.create({
      data: {
        code,
        name,
        sheetsTabName,
        totalSessions: SESSIONS_BY_CREDITS[credits],
        credits,
        type: "core",
        courseTerms: { create: [{ termId }] },
        courseDivisions: {
          create: divisionIds.map((dId) => ({ divisionId: dId })),
        },
      },
    });
  }

  // ─── Helper: assign faculty to a course ───────────────
  async function assignFaculty(course, sheetsTabName) {
    const emails = FACULTY_ASSIGNMENTS[sheetsTabName] ?? [];
    for (const email of emails) {
      const fac = facultyByEmail.get(email);
      if (!fac) {
        console.warn(`  ⚠️  Faculty not found: ${email}`);
        continue;
      }
      await prisma.facultyCourse.upsert({
        where: { facultyId_courseId: { facultyId: fac.id, courseId: course.id } },
        update: {},
        create: { facultyId: fac.id, courseId: course.id },
      });
    }
  }

  // ─── Term 1 ────────────────────────────────────────────
  console.log("📘 Creating Term 1 courses...");
  for (const def of TERM1_COURSES) {
    // PGDM
    const pdm = await createCourse({ ...def, code: def.pdmCode, termId: t1pgdm.id, divisionIds: pgdmDivisionIds });
    await assignFaculty(pdm, def.sheetsTabName);
    await prisma.course.update({
      where: { id: pdm.id },
      data: { erpSubjectCode: `ABH (${def.pdmCode.replace(/-46$/, "")})` },
    });

    // PGDM (BM)
    const pbm = await createCourse({ ...def, code: def.pbmCode, termId: t1bm.id, divisionIds: pbmDivisionIds });
    await assignFaculty(pbm, def.sheetsTabName);
    await prisma.course.update({
      where: { id: pbm.id },
      data: { erpSubjectCode: `ABH (${def.pbmCode.replace(/-04$/, "")})` },
    });

    console.log(`  ✅  ${def.name} (${def.sheetsTabName})`);
  }

  // ─── Term 2 ────────────────────────────────────────────
  console.log("📘 Creating Term 2 courses...");
  for (const def of TERM2_COURSES) {
    // PGDM
    const pdm = await createCourse({ ...def, code: def.pdmCode, termId: t2pgdm.id, divisionIds: pgdmDivisionIds });
    await assignFaculty(pdm, def.sheetsTabName);
    await prisma.course.update({
      where: { id: pdm.id },
      data: { erpSubjectCode: `ABH (${def.pdmCode.replace(/-46$/, "")})` },
    });

    // PGDM (BM)
    const pbm = await createCourse({ ...def, code: def.pbmCode, termId: t2bm.id, divisionIds: pbmDivisionIds });
    await assignFaculty(pbm, def.sheetsTabName);
    await prisma.course.update({
      where: { id: pbm.id },
      data: { erpSubjectCode: `ABH (${def.pbmCode.replace(/-04$/, "")})` },
    });

    console.log(`  ✅  ${def.name} (${def.sheetsTabName})`);
  }

  // ─── Summary ───────────────────────────────────────────
  const totalCourses = await prisma.course.count();
  const totalFacultyCourses = await prisma.facultyCourse.count();
  console.log("\n✅ seed-terms12 complete!");
  console.log(`  Total courses in DB : ${totalCourses}`);
  console.log(`  Total faculty-course: ${totalFacultyCourses}`);
  console.log(`  New courses added   : ${(TERM1_COURSES.length + TERM2_COURSES.length) * 2} (${TERM1_COURSES.length} T1 + ${TERM2_COURSES.length} T2, ×2 batches)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
