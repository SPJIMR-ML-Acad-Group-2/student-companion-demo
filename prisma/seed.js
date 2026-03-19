const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ─── Indian Names ─────────────────────────────────────
const FIRST_NAMES = [
  "Aarav",
  "Aditya",
  "Akash",
  "Amit",
  "Ananya",
  "Arjun",
  "Arnav",
  "Aryan",
  "Bhavya",
  "Chirag",
  "Deepak",
  "Diya",
  "Divya",
  "Gaurav",
  "Harsh",
  "Ishaan",
  "Jatin",
  "Kavya",
  "Karan",
  "Kriti",
  "Lakshmi",
  "Madhav",
  "Manisha",
  "Meera",
  "Mohit",
  "Nandini",
  "Neha",
  "Nikhil",
  "Pallavi",
  "Pranav",
  "Priya",
  "Rahul",
  "Rajesh",
  "Riya",
  "Rohan",
  "Rohit",
  "Sakshi",
  "Sahil",
  "Sandeep",
  "Sanya",
  "Shivam",
  "Shreya",
  "Siddharth",
  "Simran",
  "Sneha",
  "Suresh",
  "Tanvi",
  "Varun",
  "Vikram",
  "Zara",
];
const LAST_NAMES = [
  "Sharma",
  "Patel",
  "Gupta",
  "Singh",
  "Kumar",
  "Iyer",
  "Rao",
  "Joshi",
  "Nair",
  "Kulkarni",
  "Menon",
  "Reddy",
  "Agarwal",
  "Desai",
  "Chauhan",
  "Verma",
  "Malhotra",
  "Bhat",
  "Pillai",
  "Saxena",
  "Mehta",
  "Shah",
  "Chopra",
  "Banerjee",
  "Mukherjee",
  "Das",
  "Sinha",
  "Mishra",
  "Tiwari",
  "Pandey",
];

function genName(i) {
  return `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
}

// ─── Main ─────────────────────────────────────────────
async function main() {
  console.log("🗑️  Clearing database...");
  await prisma.attendance.deleteMany();
  await prisma.draftTimetable.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.room.deleteMany();
  await prisma.facultyCourse.deleteMany();
  await prisma.courseGroup.deleteMany();
  await prisma.courseDivision.deleteMany();
  await prisma.courseTerm.deleteMany();
  await prisma.course.deleteMany();
  await prisma.groupBatch.deleteMany();
  await prisma.studentGroup.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.term.deleteMany();
  await prisma.group.deleteMany();
  await prisma.division.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.specialisation.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.faculty.deleteMany();

  // ─── Programmes ─────────────────────────────────────
  console.log("🏫 Creating programmes...");
  const pgdm = await prisma.programme.create({
    data: {
      code: "PGP",
      name: "PGDM",
      fullName: "Post Graduate Diploma in Management",
    },
  });
  const pgdmBm = await prisma.programme.create({
    data: {
      code: "PGPBM",
      name: "PGDM (BM)",
      fullName: "Post Graduate Diploma in Management (Business Management)",
    },
  });

  // ─── Batches (without activeTermId — set after terms are created) ─
  console.log("📦 Creating batches...");
  const pgdm2527 = await prisma.batch.create({
    data: {
      programmeId: pgdm.id,
      name: "PGDM 2025-27",
      startYear: 2025,
      endYear: 2027,
    },
  });
  const pgdmBm2527 = await prisma.batch.create({
    data: {
      programmeId: pgdmBm.id,
      name: "PGDM (BM) 2025-27",
      startYear: 2025,
      endYear: 2027,
    },
  });

  // ─── Terms (linked to Batch, not Programme) ──────────
  console.log("📅 Creating terms...");
  const TERM_DATES = [
    { startDate: "2025-06-23", endDate: "2025-09-12" },
    { startDate: "2025-09-15", endDate: "2025-12-31" },
    { startDate: "2026-01-01", endDate: "2026-03-31" },
  ];
  const pgdmTerms = [];
  for (let t = 1; t <= 3; t++) {
    pgdmTerms.push(
      await prisma.term.create({
        data: {
          batchId: pgdm2527.id,
          number: t,
          name: `Term ${t}`,
          startDate: TERM_DATES[t - 1].startDate,
          endDate: TERM_DATES[t - 1].endDate,
        },
      }),
    );
  }
  const bmTerms = [];
  for (let t = 1; t <= 3; t++) {
    bmTerms.push(
      await prisma.term.create({
        data: {
          batchId: pgdmBm2527.id,
          number: t,
          name: `Term ${t}`,
          startDate: TERM_DATES[t - 1].startDate,
          endDate: TERM_DATES[t - 1].endDate,
        },
      }),
    );
  }

  // Set active term (Term 3) on each batch
  await prisma.batch.update({
    where: { id: pgdm2527.id },
    data: { activeTermId: pgdmTerms[2].id },
  });
  await prisma.batch.update({
    where: { id: pgdmBm2527.id },
    data: { activeTermId: bmTerms[2].id },
  });

  const t3pgdm = pgdmTerms[2];
  const t3bm = bmTerms[2];

  // ─── Rooms ─────────────────────────────────────────
  console.log("🏠 Creating rooms...");
  const roomNames = [
    "NCR1",
    "NCR2",
    "NCR4",
    "NCR5",
    "NCR6",
    "NCR7",
    "NCR8",
    "NCR9",
    "NCR10",
    "Dome 1",
    "Dome 2",
    "Dome 3",
    "D2-04",
    "D3-04",
    "D4-04",
    "Gyan Auditorium",
    "ML Shrikant Auditorium",
    "C1-08 Group Works Room",
    "C5-08 Simulation Lab",
    "C2-08",
    "C2-11",
  ];
  const roomMap = {};
  for (const name of roomNames) {
    const room = await prisma.room.create({ data: { name } });
    roomMap[name] = room;
  }

  // ─── Specialisations ────────────────────────────────
  console.log("⭐ Creating specialisations...");
  const fin = await prisma.specialisation.create({
    data: { name: "Finance", code: "FIN" },
  });
  const mkt = await prisma.specialisation.create({
    data: { name: "Marketing", code: "MKT" },
  });
  const ops = await prisma.specialisation.create({
    data: { name: "Operations & Supply Chain", code: "OPS" },
  });
  const im = await prisma.specialisation.create({
    data: { name: "Information Management & Analytics", code: "IM" },
  });

  // ─── Core Divisions ─────────────────────────────────
  console.log("🏷️  Creating divisions...");
  // PGDM 2025-27: A, B, C (10 each = 30 total)
  const divA = await prisma.division.create({
    data: { name: "A", batchId: pgdm2527.id, defaultRoomId: roomMap["NCR1"].id },
  });
  const divB = await prisma.division.create({
    data: { name: "B", batchId: pgdm2527.id, defaultRoomId: roomMap["NCR2"].id },
  });
  const divC = await prisma.division.create({
    data: { name: "C", batchId: pgdm2527.id, defaultRoomId: roomMap["NCR4"].id },
  });

  // PGDM(BM) 2025-27: D, E (10 each = 20 total)
  const divD = await prisma.division.create({
    data: { name: "D", batchId: pgdmBm2527.id, defaultRoomId: roomMap["NCR5"].id },
  });
  const divE = await prisma.division.create({
    data: { name: "E", batchId: pgdmBm2527.id, defaultRoomId: roomMap["NCR6"].id },
  });

  // ─── Specialisation Groups (replace spec divisions) ───
  console.log("👥 Creating groups...");
  async function createSharedSpecGroup(name, specialisationId) {
    return prisma.group.create({
      data: {
        name,
        batchId: pgdm2527.id,
        type: "specialisation",
        specialisationId,
        allowedBatches: {
          create: [{ batchId: pgdm2527.id }, { batchId: pgdmBm2527.id }],
        },
      },
    });
  }

  const finA = await createSharedSpecGroup("FIN-A", fin.id);
  const finB = await createSharedSpecGroup("FIN-B", fin.id);
  const mktA = await createSharedSpecGroup("MKT-A", mkt.id);
  const mktB = await createSharedSpecGroup("MKT-B", mkt.id);
  const opsA = await createSharedSpecGroup("OPS-A", ops.id);
  const opsB = await createSharedSpecGroup("OPS-B", ops.id);
  const imA = await createSharedSpecGroup("IM-A", im.id);
  const imB = await createSharedSpecGroup("IM-B", im.id);

  // ─── Office User ────────────────────────────────────
  console.log("👤 Creating office user...");
  await prisma.user.create({
    data: {
      name: "Programme Office",
      email: "office@spjimr.org",
      role: "programme_office",
    },
  });

  // ─── Students ───────────────────────────────────────
  console.log("🎓 Creating students...");

  async function createStudents(
    batch,
    programme,
    coreDivisions,
    studentsPerDiv,
    specAllocations,
  ) {
    const yearSuffix = String(batch.startYear).slice(2);
    let studentIndex = 0;

    // Build all (user, student) pairs
    const pairs = [];
    for (const div of coreDivisions) {
      for (let i = 0; i < studentsPerDiv; i++) {
        studentIndex++;
        const rollNum = `${programme.code}-${yearSuffix}-${String(studentIndex).padStart(3, "0")}`;
        const nameSeed = studentIndex + batch.id.charCodeAt(0) * 100;
        const name = genName(nameSeed);
        const email = `${rollNum.toLowerCase().replace(/-/g, "")}@spjimr.org`;
        pairs.push({ name, email, rollNum, divisionId: div.id });
      }
    }

    // Create User records
    await prisma.user.createMany({
      data: pairs.map((p) => ({
        name: p.name,
        email: p.email,
        role: "student",
      })),
    });
    const createdUsers = await prisma.user.findMany({
      where: { email: { in: pairs.map((p) => p.email) } },
    });
    const userByEmail = new Map(createdUsers.map((u) => [u.email, u]));

    // Create Student records
    for (const p of pairs) {
      const user = userByEmail.get(p.email);
      await prisma.student.create({
        data: {
          userId: user.id,
          rollNumber: p.rollNum,
          batchId: batch.id,
          divisionId: p.divisionId,
        },
      });
    }

    // Fetch all students ordered by rollNumber for spec assignment
    const allStudents = await prisma.student.findMany({
      where: { batchId: batch.id },
      orderBy: { rollNumber: "asc" },
    });

    // Assign specialisation groups (M:N via StudentGroup)
    let offset = 0;
    for (const { specId, count, groups } of specAllocations) {
      const studentsForSpec = allStudents.slice(offset, offset + count);
      const perGroup = Math.ceil(count / groups.length);

      for (let i = 0; i < groups.length; i++) {
        const groupStudents = studentsForSpec.slice(
          i * perGroup,
          (i + 1) * perGroup,
        );
        for (const student of groupStudents) {
          // Update specialisationId on student
          await prisma.student.update({
            where: { id: student.id },
            data: { specialisationId: specId },
          });
          // Create StudentGroup junction
          await prisma.studentGroup.create({
            data: { studentId: student.id, groupId: groups[i].id },
          });
        }
      }
      offset += count;
    }
  }

  // PGDM 2025-27: 3 divs × 10 = 30 students
  await createStudents(pgdm2527, pgdm, [divA, divB, divC], 10, [
    { specId: fin.id, count: 8, groups: [finA, finB] },
    { specId: mkt.id, count: 7, groups: [mktA, mktB] },
    { specId: ops.id, count: 7, groups: [opsA, opsB] },
    { specId: im.id, count: 8, groups: [imA, imB] },
  ]);

  // PGDM(BM) 2025-27: 2 divs × 10 = 20 students
  await createStudents(pgdmBm2527, pgdmBm, [divD, divE], 10, [
    { specId: fin.id, count: 5, groups: [finA, finB] },
    { specId: mkt.id, count: 7, groups: [mktA, mktB] },
    { specId: ops.id, count: 4, groups: [opsA, opsB] },
    { specId: im.id, count: 4, groups: [imA, imB] },
  ]);

  // ─── Faculty ────────────────────────────────────────
  console.log("👨‍🏫 Creating faculty...");
  const facultyData = [
    {
      name: "Dr. Rajesh Iyer",
      email: "rajesh.iyer@spjimr.org",
      teachingArea: "Finance and Accounting",
    },
    {
      name: "Dr. Meena Kapoor",
      email: "meena.kapoor@spjimr.org",
      teachingArea: "Finance and Accounting",
    },
    {
      name: "Dr. Sunil Verma",
      email: "sunil.verma@spjimr.org",
      teachingArea: "Finance and Accounting",
    },
    {
      name: "Dr. Priya Sharma",
      email: "priya.sharma@spjimr.org",
      teachingArea: "Marketing",
    },
    {
      name: "Dr. Vikram Mehta",
      email: "vikram.mehta@spjimr.org",
      teachingArea: "Marketing",
    },
    {
      name: "Dr. Anjali Desai",
      email: "anjali.desai@spjimr.org",
      teachingArea: "Marketing",
    },
    {
      name: "Dr. Arun Nair",
      email: "arun.nair@spjimr.org",
      teachingArea: "Information Management and Analytics",
    },
    {
      name: "Dr. Deepa Pillai",
      email: "deepa.pillai@spjimr.org",
      teachingArea: "Information Management and Analytics",
    },
    {
      name: "Dr. Karthik Rao",
      email: "karthik.rao@spjimr.org",
      teachingArea: "Information Management and Analytics",
    },
    {
      name: "Dr. Sanjay Kulkarni",
      email: "sanjay.kulkarni@spjimr.org",
      teachingArea: "Operations Supply Chain Management & Quantitative Methods",
    },
    {
      name: "Dr. Rekha Joshi",
      email: "rekha.joshi@spjimr.org",
      teachingArea: "Operations Supply Chain Management & Quantitative Methods",
    },
    {
      name: "Dr. Manoj Reddy",
      email: "manoj.reddy@spjimr.org",
      teachingArea: "Operations Supply Chain Management & Quantitative Methods",
    },
    {
      name: "Dr. Kavita Banerjee",
      email: "kavita.banerjee@spjimr.org",
      teachingArea: "Economics & Policy",
    },
    {
      name: "Dr. Rahul Saxena",
      email: "rahul.saxena@spjimr.org",
      teachingArea: "Economics & Policy",
    },
    {
      name: "Dr. Nandini Shah",
      email: "nandini.shah@spjimr.org",
      teachingArea: "Organisation & Leadership Studies",
    },
    {
      name: "Dr. Ashok Malhotra",
      email: "ashok.malhotra@spjimr.org",
      teachingArea: "Organisation & Leadership Studies",
    },
    {
      name: "Dr. Vinod Chopra",
      email: "vinod.chopra@spjimr.org",
      teachingArea: "Strategy",
    },
    {
      name: "Dr. Lakshmi Thakur",
      email: "lakshmi.thakur@spjimr.org",
      teachingArea: "Strategy",
    },
  ];

  const facultyMap = {};
  for (const fd of facultyData) {
    const f = await prisma.faculty.create({ data: fd });
    if (!facultyMap[fd.teachingArea]) facultyMap[fd.teachingArea] = [];
    facultyMap[fd.teachingArea].push(f);
  }

  // ─── Courses (Term 3 for each batch) ────────────────
  console.log("📘 Creating courses...");

  const hrm_pdm = await prisma.course.create({
    data: {
      code: "OLS515-PDM-46",
      name: "Human Resource Management",
      sheetsTabName: "HRM",
      totalSessions: 26,
      credits: 3,
      type: "core",
      courseTerms: { create: [{ termId: t3pgdm.id }] },
      courseDivisions: { create: [{ divisionId: divA.id }, { divisionId: divB.id }, { divisionId: divC.id }] },
    },
  });
  const bps_pdm = await prisma.course.create({
    data: {
      code: "STR507-PDM-46",
      name: "Business Policy and Strategy II",
      sheetsTabName: "BP&S-II",
      totalSessions: 26,
      credits: 3,
      type: "core",
      courseTerms: { create: [{ termId: t3pgdm.id }] },
      courseDivisions: { create: [{ divisionId: divA.id }, { divisionId: divB.id }, { divisionId: divC.id }] },
    },
  });
  const ds_pdm = await prisma.course.create({
    data: {
      code: "QTM522-PDM-46",
      name: "Decision Science",
      sheetsTabName: "DS",
      totalSessions: 26,
      credits: 3,
      type: "core",
      courseTerms: { create: [{ termId: t3pgdm.id }] },
      courseDivisions: { create: [{ divisionId: divA.id }, { divisionId: divB.id }, { divisionId: divC.id }] },
    },
  });
  const ma_pdm = await prisma.course.create({
    data: {
      code: "ACC506-PDM-46",
      name: "Management Accounting",
      sheetsTabName: "MA",
      totalSessions: 26,
      credits: 3,
      type: "core",
      courseTerms: { create: [{ termId: t3pgdm.id }] },
      courseDivisions: { create: [{ divisionId: divA.id }, { divisionId: divB.id }, { divisionId: divC.id }] },
    },
  });

  const hrm_bm = await prisma.course.create({
    data: {
      code: "OLS515-PBM-04",
      name: "Human Resource Management",
      sheetsTabName: "HRM",
      totalSessions: 26,
      credits: 3,
      type: "core",
      courseTerms: { create: [{ termId: t3bm.id }] },
      courseDivisions: { create: [{ divisionId: divD.id }, { divisionId: divE.id }] },
    },
  });
  const bps_bm = await prisma.course.create({
    data: {
      code: "STR507-PBM-04",
      name: "Business Policy and Strategy II",
      sheetsTabName: "BP&S-II",
      totalSessions: 26,
      credits: 3,
      type: "core",
      courseTerms: { create: [{ termId: t3bm.id }] },
      courseDivisions: { create: [{ divisionId: divD.id }, { divisionId: divE.id }] },
    },
  });
  const ds_bm = await prisma.course.create({
    data: {
      code: "QTM522-PBM-04",
      name: "Decision Science",
      sheetsTabName: "DS",
      totalSessions: 26,
      credits: 3,
      type: "core",
      courseTerms: { create: [{ termId: t3bm.id }] },
      courseDivisions: { create: [{ divisionId: divD.id }, { divisionId: divE.id }] },
    },
  });
  const ma_bm = await prisma.course.create({
    data: {
      code: "ACC506-PBM-04",
      name: "Management Accounting",
      sheetsTabName: "MA",
      totalSessions: 26,
      credits: 3,
      type: "core",
      courseTerms: { create: [{ termId: t3bm.id }] },
      courseDivisions: { create: [{ divisionId: divD.id }, { divisionId: divE.id }] },
    },
  });

  const dpm = await prisma.course.create({
    data: {
      code: "INF522-PDM-46",
      name: "Digital Product Management",
      sheetsTabName: "DPM",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: im.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const bia = await prisma.course.create({
    data: {
      code: "ANA522-PDM-46",
      name: "Business Intelligence and Analytics",
      sheetsTabName: "BIA",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: im.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const eit = await prisma.course.create({
    data: {
      code: "INF524-PDM-46",
      name: "Enterprise IT",
      sheetsTabName: "EIT",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: im.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const mlab = await prisma.course.create({
    data: {
      code: "INF530-PDM-46",
      name: "Maker Lab",
      sheetsTabName: "ML",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: im.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });

  const cb = await prisma.course.create({
    data: {
      code: "MKT501-PDM-46",
      name: "Consumer Behaviour",
      sheetsTabName: "CB",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: mkt.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const mr = await prisma.course.create({
    data: {
      code: "MKT502-PDM-46",
      name: "Marketing Research",
      sheetsTabName: "MR",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: mkt.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const sdm = await prisma.course.create({
    data: {
      code: "MKT503-PDM-46",
      name: "Sales and Distribution Management",
      sheetsTabName: "SDM",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: mkt.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const sbm = await prisma.course.create({
    data: {
      code: "MKT504-PDM-46",
      name: "Strategic Brand Management",
      sheetsTabName: "SBM",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: mkt.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });

  const cv = await prisma.course.create({
    data: {
      code: "FIN501-PDM-46",
      name: "Corporate Valuation",
      sheetsTabName: "CV",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: fin.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const sapm = await prisma.course.create({
    data: {
      code: "FIN502-PDM-46",
      name: "Security Analysis & Portfolio Mgmt",
      sheetsTabName: "SA&PM",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: fin.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const fl = await prisma.course.create({
    data: {
      code: "FIN503-PDM-46",
      name: "Financial Laws",
      sheetsTabName: "FL",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: fin.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const fm = await prisma.course.create({
    data: {
      code: "FIN504-PDM-46",
      name: "Financial Modelling",
      sheetsTabName: "FM",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: fin.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });

  const som = await prisma.course.create({
    data: {
      code: "OPS501-PDM-46",
      name: "Service Operations Management",
      sheetsTabName: "SOM",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: ops.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const lm = await prisma.course.create({
    data: {
      code: "OPS502-PDM-46",
      name: "Logistics Management",
      sheetsTabName: "LM",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: ops.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const pss = await prisma.course.create({
    data: {
      code: "OPS503-PDM-46",
      name: "Procurement and Strategic Sourcing",
      sheetsTabName: "PSS",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: ops.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });
  const scpc = await prisma.course.create({
    data: {
      code: "OPS504-PDM-46",
      name: "Supply Chain Planning & Coordination",
      sheetsTabName: "SCP&C",
      totalSessions: 26,
      credits: 3,
      type: "specialisation",
      specialisationId: ops.id,
      courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] },
    },
  });

  await prisma.courseGroup.createMany({
    data: [dpm, bia, eit, mlab].flatMap((course) =>
      [imA.id, imB.id].map((groupId) => ({ courseId: course.id, groupId })),
    ),
  });
  await prisma.courseGroup.createMany({
    data: [cb, mr, sdm, sbm].flatMap((course) =>
      [mktA.id, mktB.id].map((groupId) => ({ courseId: course.id, groupId })),
    ),
  });
  await prisma.courseGroup.createMany({
    data: [cv, sapm, fl, fm].flatMap((course) =>
      [finA.id, finB.id].map((groupId) => ({ courseId: course.id, groupId })),
    ),
  });
  await prisma.courseGroup.createMany({
    data: [som, lm, pss, scpc].flatMap((course) =>
      [opsA.id, opsB.id].map((groupId) => ({ courseId: course.id, groupId })),
    ),
  });

  // ─── Faculty-Course Mappings ─────────────────────────
  console.log("🔗 Mapping faculty to courses...");
  const olsFac = facultyMap["Organisation & Leadership Studies"];
  const strFac = facultyMap["Strategy"];
  const qtmFac =
    facultyMap["Operations Supply Chain Management & Quantitative Methods"];
  const finFac = facultyMap["Finance and Accounting"];
  const imFac = facultyMap["Information Management and Analytics"];
  const mktFac = facultyMap["Marketing"];

  const fcMappings = [
    { faculty: olsFac[0], courses: [hrm_pdm, hrm_bm] },
    { faculty: olsFac[1], courses: [hrm_pdm, hrm_bm] },
    { faculty: strFac[0], courses: [bps_pdm, bps_bm] },
    { faculty: strFac[1], courses: [bps_pdm, bps_bm] },
    { faculty: qtmFac[0], courses: [ds_pdm, ds_bm] },
    { faculty: qtmFac[1], courses: [ds_pdm, ds_bm] },
    { faculty: finFac[0], courses: [ma_pdm, ma_bm] },
    { faculty: finFac[1], courses: [ma_pdm, ma_bm] },
    { faculty: imFac[0], courses: [dpm, bia] },
    { faculty: imFac[1], courses: [eit, mlab] },
    { faculty: imFac[2], courses: [dpm, bia, eit] },
    { faculty: mktFac[0], courses: [cb, mr] },
    { faculty: mktFac[1], courses: [sdm, sbm] },
    { faculty: mktFac[2], courses: [cb, mr, sdm] },
    { faculty: finFac[0], courses: [cv, sapm] },
    { faculty: finFac[1], courses: [fl, fm] },
    { faculty: finFac[2], courses: [cv, fl, fm] },
    { faculty: qtmFac[0], courses: [som, lm] },
    { faculty: qtmFac[1], courses: [pss, scpc] },
    { faculty: qtmFac[2], courses: [som, lm, pss, scpc] },
  ];
  for (const { faculty: fac, courses: crsList } of fcMappings) {
    for (const crs of crsList) {
      await prisma.facultyCourse.upsert({
        where: { facultyId_courseId: { facultyId: fac.id, courseId: crs.id } },
        update: {},
        create: { facultyId: fac.id, courseId: crs.id },
      });
    }
  }

  // ─── Slots ──────────────────────────────────────────
  console.log("🕐 Seeding slots...");
  const slotDefs = [
    {
      slotNumber: 1,
      startTime: "08:15",
      endTime: "09:00",
      label: "8:15 – 9:00",
      erpPeriodNumber: 3,
    },
    {
      slotNumber: 2,
      startTime: "09:00",
      endTime: "10:10",
      label: "9:00 – 10:10",
      erpPeriodNumber: 4,
    },
    {
      slotNumber: 3,
      startTime: "10:40",
      endTime: "11:50",
      label: "10:40 – 11:50",
      erpPeriodNumber: 6,
    },
    {
      slotNumber: 4,
      startTime: "12:10",
      endTime: "13:20",
      label: "12:10 – 1:20",
      erpPeriodNumber: 8,
    },
    {
      slotNumber: 5,
      startTime: "14:30",
      endTime: "15:40",
      label: "2:30 – 3:40",
      erpPeriodNumber: 10,
    },
    {
      slotNumber: 6,
      startTime: "16:00",
      endTime: "17:10",
      label: "4:00 – 5:10",
      erpPeriodNumber: 12,
    },
    {
      slotNumber: 7,
      startTime: "17:30",
      endTime: "18:40",
      label: "5:30 – 6:40",
      erpPeriodNumber: 14,
    },
    {
      slotNumber: 8,
      startTime: "19:00",
      endTime: "20:10",
      label: "7:00 – 8:10",
      erpPeriodNumber: 16,
    },
  ];
  for (const s of slotDefs) {
    await prisma.slot.upsert({
      where: { slotNumber: s.slotNumber },
      update: { erpPeriodNumber: s.erpPeriodNumber },
      create: s,
    });
  }

  // ─── Dummy ERP Codes ────────────────────────────────
  console.log("🔧 Setting dummy ERP codes...");

  // Rooms
  const allRooms = await prisma.room.findMany({ orderBy: { name: "asc" } });
  const roomErpMap = {
    "C1-08 Group Works Room": "RES0701",
    "C2-08": "RES0702",
    "C2-11": "RES0703",
    "C5-08 Simulation Lab": "RES0704",
    "D2-04": "RES0705",
    "D3-04": "RES0706",
    "D4-04": "RES0707",
    "Dome 1": "RES0708",
    "Dome 2": "RES0709",
    "Dome 3": "RES0710",
    "Gyan Auditorium": "RES0711",
    "ML Shrikant Auditorium": "RES0712",
    NCR1: "RES0713",
    NCR10: "RES0714",
    NCR2: "RES0715",
    NCR4: "RES0716",
    NCR5: "RES0717",
    NCR6: "RES0718",
    NCR7: "RES0719",
    NCR8: "RES0720",
    NCR9: "RES0721",
  };
  for (const room of allRooms) {
    if (roomErpMap[room.name]) {
      await prisma.room.update({
        where: { id: room.id },
        data: { erpCode: roomErpMap[room.name] },
      });
    }
  }

  // Core divisions: erpClassCode
  await prisma.division.update({
    where: { id: divA.id },
    data: { erpClassCode: "CL007330" },
  });
  await prisma.division.update({
    where: { id: divB.id },
    data: { erpClassCode: "CL007331" },
  });
  await prisma.division.update({
    where: { id: divC.id },
    data: { erpClassCode: "CL007332" },
  });
  await prisma.division.update({
    where: { id: divD.id },
    data: { erpClassCode: "CL007333" },
  });
  await prisma.division.update({
    where: { id: divE.id },
    data: { erpClassCode: "CL007334" },
  });

  // Groups: erpGroupCode
  await prisma.group.update({
    where: { id: finA.id },
    data: { erpGroupCode: "GTYPE0318" },
  });
  await prisma.group.update({
    where: { id: finB.id },
    data: { erpGroupCode: "GTYPE0319" },
  });
  await prisma.group.update({
    where: { id: imA.id },
    data: { erpGroupCode: "GTYPE0320" },
  });
  await prisma.group.update({
    where: { id: imB.id },
    data: { erpGroupCode: "GTYPE0321" },
  });
  await prisma.group.update({
    where: { id: mktA.id },
    data: { erpGroupCode: "GTYPE0322" },
  });
  await prisma.group.update({
    where: { id: mktB.id },
    data: { erpGroupCode: "GTYPE0323" },
  });
  await prisma.group.update({
    where: { id: opsA.id },
    data: { erpGroupCode: "GTYPE0324" },
  });
  await prisma.group.update({
    where: { id: opsB.id },
    data: { erpGroupCode: "GTYPE0325" },
  });

  // Faculty: sequential numeric ERP codes
  const allFaculty = await prisma.faculty.findMany({
    orderBy: { name: "asc" },
  });
  for (let i = 0; i < allFaculty.length; i++) {
    await prisma.faculty.update({
      where: { id: allFaculty[i].id },
      data: { erpCode: String(301 + i) },
    });
  }

  // Courses: ABH (CODE) format
  const courseErpCodes = {
    "OLS515-PDM-46": "ABH (OLS515-PDM)",
    "STR507-PDM-46": "ABH (STR507-PDM)",
    "QTM522-PDM-46": "ABH (QTM522-PDM)",
    "ACC506-PDM-46": "ABH (ACC506-PDM)",
    "OLS515-PBM-04": "ABH (OLS515-PBM)",
    "STR507-PBM-04": "ABH (STR507-PBM)",
    "QTM522-PBM-04": "ABH (QTM522-PBM)",
    "ACC506-PBM-04": "ABH (ACC506-PBM)",
    "INF522-PDM-46": "ABH (INF522-PDM)",
    "ANA522-PDM-46": "ABH (ANA522-PDM)",
    "INF524-PDM-46": "ABH (INF524-PDM)",
    "INF530-PDM-46": "ABH (INF530-PDM)",
    "MKT501-PDM-46": "ABH (MKT501-PDM)",
    "MKT502-PDM-46": "ABH (MKT502-PDM)",
    "MKT503-PDM-46": "ABH (MKT503-PDM)",
    "MKT504-PDM-46": "ABH (MKT504-PDM)",
    "FIN501-PDM-46": "ABH (FIN501-PDM)",
    "FIN502-PDM-46": "ABH (FIN502-PDM)",
    "FIN503-PDM-46": "ABH (FIN503-PDM)",
    "FIN504-PDM-46": "ABH (FIN504-PDM)",
    "OPS501-PDM-46": "ABH (OPS501-PDM)",
    "OPS502-PDM-46": "ABH (OPS502-PDM)",
    "OPS503-PDM-46": "ABH (OPS503-PDM)",
    "OPS504-PDM-46": "ABH (OPS504-PDM)",
  };
  const allCourses = await prisma.course.findMany();
  for (const c of allCourses) {
    if (courseErpCodes[c.code]) {
      await prisma.course.update({
        where: { id: c.id },
        data: { erpSubjectCode: courseErpCodes[c.code] },
      });
    }
  }

  // ─── Summary ────────────────────────────────────────
  const stats = {
    programmes: await prisma.programme.count(),
    batches: await prisma.batch.count(),
    terms: await prisma.term.count(),
    specialisations: await prisma.specialisation.count(),
    divisions: await prisma.division.count(),
    groups: await prisma.group.count(),
    users: await prisma.user.count(),
    students: await prisma.student.count(),
    studentGroups: await prisma.studentGroup.count(),
    faculty: await prisma.faculty.count(),
    courses: await prisma.course.count(),
    facultyCourses: await prisma.facultyCourse.count(),
    slots: await prisma.slot.count(),
  };
  console.log("\n✅ Seed complete!");
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
