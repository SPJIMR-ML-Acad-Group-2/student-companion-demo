const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ─── Indian Names ─────────────────────────────────────
const FIRST_NAMES = [
  "Aarav","Aditya","Akash","Amit","Ananya","Arjun","Arnav","Aryan","Bhavya","Chirag",
  "Deepak","Diya","Divya","Gaurav","Harsh","Ishaan","Jatin","Kavya","Karan","Kriti",
  "Lakshmi","Madhav","Manisha","Meera","Mohit","Nandini","Neha","Nikhil","Pallavi","Pranav",
  "Priya","Rahul","Rajesh","Riya","Rohan","Rohit","Sakshi","Sahil","Sandeep","Sanya",
  "Shivam","Shreya","Siddharth","Simran","Sneha","Suresh","Tanvi","Varun","Vikram","Zara",
];
const LAST_NAMES = [
  "Sharma","Patel","Gupta","Singh","Kumar","Iyer","Rao","Joshi","Nair","Kulkarni",
  "Menon","Reddy","Agarwal","Desai","Chauhan","Verma","Malhotra","Bhat","Pillai","Saxena",
  "Mehta","Shah","Chopra","Banerjee","Mukherjee","Das","Sinha","Mishra","Tiwari","Pandey",
];

function genName(i) {
  return `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
}

// ─── Main ─────────────────────────────────────────────
async function main() {
  console.log("🗑️  Clearing database...");
  await prisma.attendance.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.facultyCourse.deleteMany();
  await prisma.courseTerm.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.term.deleteMany();
  await prisma.division.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.specialisation.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.faculty.deleteMany();

  // ─── Programmes ─────────────────────────────────────
  console.log("🏫 Creating programmes...");
  const pgdm = await prisma.programme.create({ data: { code: "PGP", name: "PGDM", fullName: "Post Graduate Diploma in Management" } });
  const pgdmBm = await prisma.programme.create({ data: { code: "PGPBM", name: "PGDM (BM)", fullName: "Post Graduate Diploma in Management (Business Management)" } });

  // ─── Terms ──────────────────────────────────────────
  console.log("📅 Creating terms...");
  const pgdmTerms = [];
  for (let t = 1; t <= 6; t++) {
    pgdmTerms.push(await prisma.term.create({ data: { programmeId: pgdm.id, number: t, name: `Term ${t}` } }));
  }
  const bmTerms = [];
  for (let t = 1; t <= 6; t++) {
    bmTerms.push(await prisma.term.create({ data: { programmeId: pgdmBm.id, number: t, name: `Term ${t}` } }));
  }

  // ─── Batches (2025-27 only, Term 3) ─────────────────
  console.log("📦 Creating batches...");
  const pgdm2527 = await prisma.batch.create({ data: { programmeId: pgdm.id, name: "PGDM 2025-27", startYear: 2025, endYear: 2027, activeTermId: pgdmTerms[2].id } });
  const pgdmBm2527 = await prisma.batch.create({ data: { programmeId: pgdmBm.id, name: "PGDM (BM) 2025-27", startYear: 2025, endYear: 2027, activeTermId: bmTerms[2].id } });

  const t3pgdm = pgdmTerms[2];
  const t3bm = bmTerms[2];

  // ─── Specialisations ────────────────────────────────
  console.log("⭐ Creating specialisations...");
  const fin = await prisma.specialisation.create({ data: { name: "Finance", code: "FIN" } });
  const mkt = await prisma.specialisation.create({ data: { name: "Marketing", code: "MKT" } });
  const ops = await prisma.specialisation.create({ data: { name: "Operations & Supply Chain", code: "OPS" } });
  const im = await prisma.specialisation.create({ data: { name: "Information Management & Analytics", code: "IM" } });

  // ─── Core Divisions ─────────────────────────────────
  console.log("🏷️  Creating divisions...");
  // PGDM 2025-27: A, B, C (10 each = 30 total)
  const divA = await prisma.division.create({ data: { name: "A", type: "core", batchId: pgdm2527.id } });
  const divB = await prisma.division.create({ data: { name: "B", type: "core", batchId: pgdm2527.id } });
  const divC = await prisma.division.create({ data: { name: "C", type: "core", batchId: pgdm2527.id } });

  // PGDM(BM) 2025-27: D, E (10 each = 20 total)
  const divD = await prisma.division.create({ data: { name: "D", type: "core", batchId: pgdmBm2527.id } });
  const divE = await prisma.division.create({ data: { name: "E", type: "core", batchId: pgdmBm2527.id } });

  // ─── Specialisation Divisions (Mixed Cohorts) ─────────
  const finA = await prisma.division.create({ data: { name: "FIN-A", type: "specialisation", specialisationId: fin.id } });
  const mktA = await prisma.division.create({ data: { name: "MKT-A", type: "specialisation", specialisationId: mkt.id } });
  const imA  = await prisma.division.create({ data: { name: "IM-A",  type: "specialisation", specialisationId: im.id  } });
  const opsA = await prisma.division.create({ data: { name: "OPS-A", type: "specialisation", specialisationId: ops.id } });

  const finB = await prisma.division.create({ data: { name: "FIN-B", type: "specialisation", specialisationId: fin.id } });
  const mktB = await prisma.division.create({ data: { name: "MKT-B", type: "specialisation", specialisationId: mkt.id } });
  const imB  = await prisma.division.create({ data: { name: "IM-B",  type: "specialisation", specialisationId: im.id  } });
  const opsB = await prisma.division.create({ data: { name: "OPS-B", type: "specialisation", specialisationId: ops.id } });

  // ─── Office User ────────────────────────────────────
  console.log("👤 Creating office user...");
  await prisma.user.create({
    data: { name: "Programme Office", email: "office@spjimr.org", role: "programme_office" },
  });

  // ─── Students ───────────────────────────────────────
  console.log("🎓 Creating students...");

  async function createStudents(batch, programme, coreDivisions, studentsPerDiv, specAllocations) {
    const yearSuffix = String(batch.startYear).slice(2);
    let studentIndex = 0;
    const studentData = [];

    for (const div of coreDivisions) {
      for (let i = 0; i < studentsPerDiv; i++) {
        studentIndex++;
        const rollNum = `${programme.code}-${yearSuffix}-${String(studentIndex).padStart(3, "0")}`;
        const name = genName(studentIndex + batch.id * 100);
        const email = `${rollNum.toLowerCase().replace(/-/g, "")}@spjimr.org`;
        studentData.push({ name, email, role: "student", rollNumber: rollNum, batchId: batch.id, coreDivisionId: div.id });
      }
    }
    await prisma.user.createMany({ data: studentData });

    const allStudents = await prisma.user.findMany({
      where: { batchId: batch.id, role: "student" },
      orderBy: { rollNumber: "asc" },
    });

    let offset = 0;
    for (const { specId, count, divs } of specAllocations) {
      const studentsForSpec = allStudents.slice(offset, offset + count);
      const perDiv = Math.ceil(count / divs.length);
      for (let i = 0; i < divs.length; i++) {
        const idsToUpdate = studentsForSpec.slice(i * perDiv, (i + 1) * perDiv).map(s => s.id);
        if (idsToUpdate.length > 0) {
          await prisma.user.updateMany({
            where: { id: { in: idsToUpdate } },
            data: { specialisationId: specId, specDivisionId: divs[i].id },
          });
        }
      }
      offset += count;
    }
  }

  // PGDM 2025-27: 3 divs × 10 = 30 students. Spec: FIN 8, MKT 7, OPS 7, IM 8
  await createStudents(pgdm2527, pgdm, [divA, divB, divC], 10, [
    { specId: fin.id, count: 8, divs: [finA, finB] },
    { specId: mkt.id, count: 7, divs: [mktA, mktB] },
    { specId: ops.id, count: 7, divs: [opsA, opsB] },
    { specId: im.id,  count: 8, divs: [imA, imB] },
  ]);

  // PGDM(BM) 2025-27: 2 divs × 10 = 20 students. Spec: FIN 5, MKT 7, OPS 4, IM 4
  await createStudents(pgdmBm2527, pgdmBm, [divD, divE], 10, [
    { specId: fin.id, count: 5, divs: [finA, finB] },
    { specId: mkt.id, count: 7, divs: [mktA, mktB] },
    { specId: ops.id, count: 4, divs: [opsA, opsB] },
    { specId: im.id,  count: 4, divs: [imA, imB] },
  ]);

  // ─── Faculty ────────────────────────────────────────
  console.log("👨‍🏫 Creating faculty...");
  const facultyData = [
    // Finance & Accounting (3)
    { name: "Dr. Rajesh Iyer",     email: "rajesh.iyer@spjimr.org",     teachingArea: "Finance and Accounting" },
    { name: "Dr. Meena Kapoor",    email: "meena.kapoor@spjimr.org",    teachingArea: "Finance and Accounting" },
    { name: "Dr. Sunil Verma",     email: "sunil.verma@spjimr.org",     teachingArea: "Finance and Accounting" },
    // Marketing (3)
    { name: "Dr. Priya Sharma",    email: "priya.sharma@spjimr.org",    teachingArea: "Marketing" },
    { name: "Dr. Vikram Mehta",    email: "vikram.mehta@spjimr.org",    teachingArea: "Marketing" },
    { name: "Dr. Anjali Desai",    email: "anjali.desai@spjimr.org",    teachingArea: "Marketing" },
    // Information Management (3)
    { name: "Dr. Arun Nair",       email: "arun.nair@spjimr.org",       teachingArea: "Information Management and Analytics" },
    { name: "Dr. Deepa Pillai",    email: "deepa.pillai@spjimr.org",    teachingArea: "Information Management and Analytics" },
    { name: "Dr. Karthik Rao",     email: "karthik.rao@spjimr.org",     teachingArea: "Information Management and Analytics" },
    // Operations (3)
    { name: "Dr. Sanjay Kulkarni", email: "sanjay.kulkarni@spjimr.org", teachingArea: "Operations Supply Chain Management & Quantitative Methods" },
    { name: "Dr. Rekha Joshi",     email: "rekha.joshi@spjimr.org",     teachingArea: "Operations Supply Chain Management & Quantitative Methods" },
    { name: "Dr. Manoj Reddy",     email: "manoj.reddy@spjimr.org",     teachingArea: "Operations Supply Chain Management & Quantitative Methods" },
    // Economics (2)
    { name: "Dr. Kavita Banerjee", email: "kavita.banerjee@spjimr.org", teachingArea: "Economics & Policy" },
    { name: "Dr. Rahul Saxena",    email: "rahul.saxena@spjimr.org",    teachingArea: "Economics & Policy" },
    // OLS (2)
    { name: "Dr. Nandini Shah",    email: "nandini.shah@spjimr.org",    teachingArea: "Organisation & Leadership Studies" },
    { name: "Dr. Ashok Malhotra",  email: "ashok.malhotra@spjimr.org",  teachingArea: "Organisation & Leadership Studies" },
    // Strategy (2)
    { name: "Dr. Vinod Chopra",    email: "vinod.chopra@spjimr.org",    teachingArea: "Strategy" },
    { name: "Dr. Lakshmi Thakur",  email: "lakshmi.thakur@spjimr.org", teachingArea: "Strategy" },
  ];

  const facultyMap = {};
  for (const fd of facultyData) {
    const f = await prisma.faculty.create({ data: fd });
    if (!facultyMap[fd.teachingArea]) facultyMap[fd.teachingArea] = [];
    facultyMap[fd.teachingArea].push(f);
  }

  // ─── Courses (Term 3 for 2025-27) ───────────────────
  console.log("📘 Creating courses...");

  // Core — PGDM 2025-27
  const hrm_pdm = await prisma.course.create({ data: { code: "OLS515-PDM-46", name: "Human Resource Management",       totalSessions: 26, credits: 3, type: "core",           courseTerms: { create: [{ termId: t3pgdm.id }] } } });
  const bps_pdm = await prisma.course.create({ data: { code: "STR507-PDM-46", name: "Business Policy and Strategy II", totalSessions: 26, credits: 3, type: "core",           courseTerms: { create: [{ termId: t3pgdm.id }] } } });
  const ds_pdm  = await prisma.course.create({ data: { code: "QTM522-PDM-46", name: "Decision Science",                totalSessions: 26, credits: 3, type: "core",           courseTerms: { create: [{ termId: t3pgdm.id }] } } });
  const ma_pdm  = await prisma.course.create({ data: { code: "ACC506-PDM-46", name: "Management Accounting",           totalSessions: 26, credits: 3, type: "core",           courseTerms: { create: [{ termId: t3pgdm.id }] } } });

  // Core — PGDM(BM) 2025-27
  const hrm_bm  = await prisma.course.create({ data: { code: "OLS515-PBM-04", name: "Human Resource Management",       totalSessions: 26, credits: 3, type: "core",           courseTerms: { create: [{ termId: t3bm.id }] } } });
  const bps_bm  = await prisma.course.create({ data: { code: "STR507-PBM-04", name: "Business Policy and Strategy II", totalSessions: 26, credits: 3, type: "core",           courseTerms: { create: [{ termId: t3bm.id }] } } });
  const ds_bm   = await prisma.course.create({ data: { code: "QTM522-PBM-04", name: "Decision Science",                totalSessions: 26, credits: 3, type: "core",           courseTerms: { create: [{ termId: t3bm.id }] } } });
  const ma_bm   = await prisma.course.create({ data: { code: "ACC506-PBM-04", name: "Management Accounting",           totalSessions: 26, credits: 3, type: "core",           courseTerms: { create: [{ termId: t3bm.id }] } } });

  // Spec — IM
  const dpm  = await prisma.course.create({ data: { code: "INF522-PDM-46", name: "Digital Product Management",               totalSessions: 26, credits: 3, type: "specialisation", specialisationId: im.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] }  } });
  const bia  = await prisma.course.create({ data: { code: "ANA522-PDM-46", name: "Business Intelligence and Analytics",      totalSessions: 26, credits: 3, type: "specialisation", specialisationId: im.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] }  } });
  const eit  = await prisma.course.create({ data: { code: "INF524-PDM-46", name: "Enterprise IT",                            totalSessions: 26, credits: 3, type: "specialisation", specialisationId: im.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] }  } });
  const mlab = await prisma.course.create({ data: { code: "INF530-PDM-46", name: "Maker Lab",                                totalSessions: 26, credits: 3, type: "specialisation", specialisationId: im.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] }  } });

  // Spec — Marketing
  const cb  = await prisma.course.create({ data: { code: "MKT501-PDM-46", name: "Consumer Behaviour",                totalSessions: 26, credits: 3, type: "specialisation", specialisationId: mkt.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });
  const mr  = await prisma.course.create({ data: { code: "MKT502-PDM-46", name: "Marketing Research",                totalSessions: 26, credits: 3, type: "specialisation", specialisationId: mkt.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });
  const sdm = await prisma.course.create({ data: { code: "MKT503-PDM-46", name: "Sales and Distribution Management", totalSessions: 26, credits: 3, type: "specialisation", specialisationId: mkt.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });
  const sbm = await prisma.course.create({ data: { code: "MKT504-PDM-46", name: "Strategic Brand Management",        totalSessions: 26, credits: 3, type: "specialisation", specialisationId: mkt.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });

  // Spec — Finance
  const cv   = await prisma.course.create({ data: { code: "FIN501-PDM-46", name: "Corporate Valuation",                       totalSessions: 26, credits: 3, type: "specialisation", specialisationId: fin.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });
  const sapm = await prisma.course.create({ data: { code: "FIN502-PDM-46", name: "Security Analysis & Portfolio Management",   totalSessions: 26, credits: 3, type: "specialisation", specialisationId: fin.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });
  const fl   = await prisma.course.create({ data: { code: "FIN503-PDM-46", name: "Financial Laws",                            totalSessions: 26, credits: 3, type: "specialisation", specialisationId: fin.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });
  const fm   = await prisma.course.create({ data: { code: "FIN504-PDM-46", name: "Financial Modelling",                       totalSessions: 26, credits: 3, type: "specialisation", specialisationId: fin.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });

  // Spec — Operations
  const som  = await prisma.course.create({ data: { code: "OPS501-PDM-46", name: "Service Operations Management",        totalSessions: 26, credits: 3, type: "specialisation", specialisationId: ops.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });
  const lm   = await prisma.course.create({ data: { code: "OPS502-PDM-46", name: "Logistics Management",                 totalSessions: 26, credits: 3, type: "specialisation", specialisationId: ops.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });
  const pss  = await prisma.course.create({ data: { code: "OPS503-PDM-46", name: "Procurement and Strategic Sourcing",   totalSessions: 26, credits: 3, type: "specialisation", specialisationId: ops.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });
  const scpc = await prisma.course.create({ data: { code: "OPS504-PDM-46", name: "Supply Chain Planning and Coordination", totalSessions: 26, credits: 3, type: "specialisation", specialisationId: ops.id, courseTerms: { create: [{ termId: t3pgdm.id }, { termId: t3bm.id }] } } });

  // ─── Faculty-Course Mappings ─────────────────────────
  console.log("🔗 Mapping faculty to courses...");
  const olsFac = facultyMap["Organisation & Leadership Studies"];
  const strFac = facultyMap["Strategy"];
  const qtmFac = facultyMap["Operations Supply Chain Management & Quantitative Methods"];
  const finFac = facultyMap["Finance and Accounting"];
  const imFac  = facultyMap["Information Management and Analytics"];
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
    { faculty: imFac[0],  courses: [dpm, bia] },
    { faculty: imFac[1],  courses: [eit, mlab] },
    { faculty: imFac[2],  courses: [dpm, bia, eit] },
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

  // ─── Summary ────────────────────────────────────────
  const stats = {
    programmes:      await prisma.programme.count(),
    batches:         await prisma.batch.count(),
    terms:           await prisma.term.count(),
    specialisations: await prisma.specialisation.count(),
    divisions:       await prisma.division.count(),
    students:        await prisma.user.count({ where: { role: "student" } }),
    faculty:         await prisma.faculty.count(),
    courses:         await prisma.course.count(),
    facultyCourses:  await prisma.facultyCourse.count(),
    timetableEntries: await prisma.timetable.count(),
  };
  console.log("\n✅ Seed complete!");
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
