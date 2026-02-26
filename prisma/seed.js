const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

const SLOTS = [
  { slot: 1, start: "08:15", end: "09:00" },
  { slot: 2, start: "09:00", end: "10:10" },
  { slot: 3, start: "10:40", end: "11:50" },
  { slot: 4, start: "12:10", end: "13:20" },
  { slot: 5, start: "14:30", end: "15:40" },
  { slot: 6, start: "16:00", end: "17:10" },
  { slot: 7, start: "17:30", end: "18:40" },
  { slot: 8, start: "19:00", end: "20:10" },
];

function slotTime(n) { return { startTime: SLOTS[n - 1].start, endTime: SLOTS[n - 1].end }; }

// ─── Indian Names ─────────────────────────────────────
const FIRST_NAMES = [
  "Aarav","Aditya","Akash","Amit","Ananya","Arjun","Arnav","Aryan","Bhavya","Chirag",
  "Deepak","Diya","Divya","Gaurav","Harsh","Ishaan","Jatin","Kavya","Karan","Kriti",
  "Lakshmi","Madhav","Manisha","Meera","Mohit","Nandini","Neha","Nikhil","Pallavi","Pranav",
  "Priya","Rahul","Rajesh","Riya","Rohan","Rohit","Sakshi","Sahil","Sandeep","Sanya",
  "Shivam","Shreya","Siddharth","Simran","Sneha","Suresh","Tanvi","Varun","Vikram","Zara",
  "Abhinav","Aditi","Ankita","Anurag","Ayesha","Chetan","Damini","Dev","Ekta","Farah",
  "Gaurangi","Hemant","Isha","Jayant","Komal","Lavanya","Lokesh","Mahesh","Naveen","Ojas",
  "Pankaj","Pooja","Raghav","Ritika","Samar","Shekhar","Surbhi","Tanya","Uday","Vivek",
  "Aman","Anjali","Bharat","Chandni","Dhruv","Eshaan","Fatima","Gauri","Himanshu","Ishan",
  "Jaya","Kartik","Lata","Manan","Nisha","Om","Payal","Qadir","Rekha","Soham",
];
const LAST_NAMES = [
  "Sharma","Patel","Gupta","Singh","Kumar","Iyer","Rao","Joshi","Nair","Kulkarni",
  "Menon","Reddy","Agarwal","Desai","Chauhan","Verma","Malhotra","Bhat","Pillai","Saxena",
  "Mehta","Shah","Chopra","Banerjee","Mukherjee","Das","Sinha","Mishra","Tiwari","Pandey",
  "Thakur","Yadav","Dubey","Rathore","Kapoor","Khanna","Bhatt","Deshpande","Goyal","Jain",
];

function genName(i) {
  return `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
}

// ─── Teaching Areas ───────────────────────────────────
const TEACHING_AREAS = [
  "Finance and Accounting",
  "Marketing",
  "Information Management and Analytics",
  "Operations Supply Chain Management & Quantitative Methods",
  "Economics & Policy",
  "Organisation & Leadership Studies",
  "Strategy",
];

// ─── Main ─────────────────────────────────────────────
async function main() {
  console.log("🗑️  Clearing database...");
  await prisma.attendance.deleteMany();
  await prisma.session.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.facultyCourse.deleteMany();
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

  // ─── Batches ────────────────────────────────────────
  console.log("📦 Creating batches...");
  const pgdm2426 = await prisma.batch.create({ data: { programmeId: pgdm.id, name: "PGDM 2024-26", startYear: 2024, endYear: 2026 } });
  const pgdmBm2426 = await prisma.batch.create({ data: { programmeId: pgdmBm.id, name: "PGDM (BM) 2024-26", startYear: 2024, endYear: 2026 } });
  const pgdm2527 = await prisma.batch.create({ data: { programmeId: pgdm.id, name: "PGDM 2025-27", startYear: 2025, endYear: 2027 } });
  const pgdmBm2527 = await prisma.batch.create({ data: { programmeId: pgdmBm.id, name: "PGDM (BM) 2025-27", startYear: 2025, endYear: 2027 } });

  // ─── Terms ──────────────────────────────────────────
  console.log("📅 Creating terms...");
  // 2024-26 batches: Terms 1-4 (Term 4 active)
  for (const b of [pgdm2426, pgdmBm2426]) {
    for (let t = 1; t <= 4; t++) {
      await prisma.term.create({ data: { batchId: b.id, number: t, name: `Term ${t}`, isActive: t === 4 } });
    }
  }
  // 2025-27 batches: Terms 1-3 (Term 3 active)
  const term3Pgdm = await prisma.term.create({ data: { batchId: pgdm2527.id, number: 1, name: "Term 1" } });
  await prisma.term.create({ data: { batchId: pgdm2527.id, number: 2, name: "Term 2" } });
  const t3pgdm = await prisma.term.create({ data: { batchId: pgdm2527.id, number: 3, name: "Term 3", isActive: true, startDate: "2026-01-15" } });

  await prisma.term.create({ data: { batchId: pgdmBm2527.id, number: 1, name: "Term 1" } });
  await prisma.term.create({ data: { batchId: pgdmBm2527.id, number: 2, name: "Term 2" } });
  const t3bm = await prisma.term.create({ data: { batchId: pgdmBm2527.id, number: 3, name: "Term 3", isActive: true, startDate: "2026-01-15" } });

  // ─── Specialisations ────────────────────────────────
  console.log("⭐ Creating specialisations...");
  const fin = await prisma.specialisation.create({ data: { name: "Finance", code: "FIN" } });
  const mkt = await prisma.specialisation.create({ data: { name: "Marketing", code: "MKT" } });
  const ops = await prisma.specialisation.create({ data: { name: "Operations & Supply Chain", code: "OPS" } });
  const im = await prisma.specialisation.create({ data: { name: "Information Management & Analytics", code: "IM" } });

  // ─── Core Divisions ─────────────────────────────────
  console.log("🏷️  Creating divisions...");
  // PGDM 2025-27: A, B, C (80 each)
  const divA_2527 = await prisma.division.create({ data: { name: "A", type: "core", batchId: pgdm2527.id } });
  const divB_2527 = await prisma.division.create({ data: { name: "B", type: "core", batchId: pgdm2527.id } });
  const divC_2527 = await prisma.division.create({ data: { name: "C", type: "core", batchId: pgdm2527.id } });

  // PGDM(BM) 2025-27: D, E (60 each)
  const divD_2527 = await prisma.division.create({ data: { name: "D", type: "core", batchId: pgdmBm2527.id } });
  const divE_2527 = await prisma.division.create({ data: { name: "E", type: "core", batchId: pgdmBm2527.id } });

  // PGDM 2024-26
  const divA_2426 = await prisma.division.create({ data: { name: "A", type: "core", batchId: pgdm2426.id } });
  const divB_2426 = await prisma.division.create({ data: { name: "B", type: "core", batchId: pgdm2426.id } });
  const divC_2426 = await prisma.division.create({ data: { name: "C", type: "core", batchId: pgdm2426.id } });

  // PGDM(BM) 2024-26
  const divD_2426 = await prisma.division.create({ data: { name: "D", type: "core", batchId: pgdmBm2426.id } });
  const divE_2426 = await prisma.division.create({ data: { name: "E", type: "core", batchId: pgdmBm2426.id } });

  // ─── Specialisation Divisions ───────────────────────
  // 2025-27
  const finA_27 = await prisma.division.create({ data: { name: "FIN-A", type: "specialisation", batchId: pgdm2527.id, specialisationId: fin.id } });
  const finB_27 = await prisma.division.create({ data: { name: "FIN-B", type: "specialisation", batchId: pgdm2527.id, specialisationId: fin.id } });
  const mktA_27 = await prisma.division.create({ data: { name: "MKT-A", type: "specialisation", batchId: pgdm2527.id, specialisationId: mkt.id } });
  const mktB_27 = await prisma.division.create({ data: { name: "MKT-B", type: "specialisation", batchId: pgdm2527.id, specialisationId: mkt.id } });
  const imA_27 = await prisma.division.create({ data: { name: "IM-A", type: "specialisation", batchId: pgdm2527.id, specialisationId: im.id } });
  const imB_27 = await prisma.division.create({ data: { name: "IM-B", type: "specialisation", batchId: pgdm2527.id, specialisationId: im.id } });
  const opsA_27 = await prisma.division.create({ data: { name: "OPS-A", type: "specialisation", batchId: pgdm2527.id, specialisationId: ops.id } });

  // 2024-26
  const finA_26 = await prisma.division.create({ data: { name: "FIN-A", type: "specialisation", batchId: pgdm2426.id, specialisationId: fin.id } });
  const finB_26 = await prisma.division.create({ data: { name: "FIN-B", type: "specialisation", batchId: pgdm2426.id, specialisationId: fin.id } });
  const mktA_26 = await prisma.division.create({ data: { name: "MKT-A", type: "specialisation", batchId: pgdm2426.id, specialisationId: mkt.id } });
  const mktB_26 = await prisma.division.create({ data: { name: "MKT-B", type: "specialisation", batchId: pgdm2426.id, specialisationId: mkt.id } });
  const imA_26 = await prisma.division.create({ data: { name: "IM-A", type: "specialisation", batchId: pgdm2426.id, specialisationId: im.id } });
  const imB_26 = await prisma.division.create({ data: { name: "IM-B", type: "specialisation", batchId: pgdm2426.id, specialisationId: im.id } });
  const opsA_26 = await prisma.division.create({ data: { name: "OPS-A", type: "specialisation", batchId: pgdm2426.id, specialisationId: ops.id } });
  const opsB_26 = await prisma.division.create({ data: { name: "OPS-B", type: "specialisation", batchId: pgdm2426.id, specialisationId: ops.id } });

  // ─── Office User ────────────────────────────────────
  console.log("👤 Creating office user...");
  await prisma.user.create({
    data: { name: "Programme Office", email: "office@spjimr.org", role: "programme_office" },
  });

  // ─── Students ───────────────────────────────────────
  console.log("🎓 Creating students...");

  // Helper to allocate students to spec divisions and specialisations
  async function createStudents(batch, programme, coreDivisions, studentsPerDiv, specAllocations, specDivisions) {
    const yearSuffix = String(batch.startYear).slice(2);
    let studentIndex = 0;
    let allStudents = [];

    const studentData = [];
    // Create core students data
    for (const div of coreDivisions) {
      for (let i = 0; i < studentsPerDiv; i++) {
        studentIndex++;
        const rollNum = `${programme.code}-${yearSuffix}-${String(studentIndex).padStart(3, "0")}`;
        const name = genName(studentIndex + batch.id * 100);
        const email = `${rollNum.toLowerCase().replace(/-/g, "")}@spjimr.org`;

        studentData.push({
          name, email, role: "student", rollNumber: rollNum,
          batchId: batch.id, coreDivisionId: div.id,
        });
      }
    }
    await prisma.user.createMany({ data: studentData });

    // Fetch the created students back to get their IDs
    allStudents = await prisma.user.findMany({
      where: { batchId: batch.id, role: "student" },
      orderBy: { rollNumber: "asc" },
    });

    // Allocate specialisations
    let offset = 0;
    for (const { specId, count, divs } of specAllocations) {
      const studentsForSpec = allStudents.slice(offset, offset + count);
      const perDiv = Math.ceil(count / divs.length);

      for (let i = 0; i < divs.length; i++) {
        const specDivStudents = studentsForSpec.slice(i * perDiv, (i + 1) * perDiv);
        const idsToUpdate = specDivStudents.map(s => s.id);
        if (idsToUpdate.length > 0) {
          await prisma.user.updateMany({
            where: { id: { in: idsToUpdate } },
            data: { specialisationId: specId, specDivisionId: divs[i].id },
          });
        }
      }
      offset += count;
    }

    return allStudents;
  }

  // ─── 2025-27 Students ───────────────────────────────
  // PGDM: 240 students (3 divs × 80), PGDM(BM): 120 students (2 divs × 60) = 360 total
  // Spec allocations: FIN 95, MKT 92, OPS 70, IM 103 = 360
  // Proportional: PGDM gets 2/3, BM gets 1/3
  // PGDM: FIN ~63, MKT ~61, OPS ~47, IM ~69 = 240
  // BM: FIN ~32, MKT ~31, OPS ~23, IM ~34 = 120

  const pgdmStudents2527 = await createStudents(pgdm2527, pgdm, [divA_2527, divB_2527, divC_2527], 80, [
    { specId: fin.id, count: 63, divs: [finA_27, finB_27] },
    { specId: mkt.id, count: 61, divs: [mktA_27, mktB_27] },
    { specId: ops.id, count: 47, divs: [opsA_27] },
    { specId: im.id, count: 69, divs: [imA_27, imB_27] },
  ], []);

  const bmStudents2527 = await createStudents(pgdmBm2527, pgdmBm, [divD_2527, divE_2527], 60, [
    { specId: fin.id, count: 32, divs: [finA_27, finB_27] },
    { specId: mkt.id, count: 31, divs: [mktA_27, mktB_27] },
    { specId: ops.id, count: 23, divs: [opsA_27] },
    { specId: im.id, count: 34, divs: [imA_27, imB_27] },
  ], []);

  // ─── 2024-26 Students ───────────────────────────────
  // PGDM: 240, BM: 120 = 360. Spec: FIN 90, MKT 95, OPS 80, IM 95 = 360
  // PGDM: FIN 60, MKT 63, OPS 53, IM 64 = 240
  // BM: FIN 30, MKT 32, OPS 27, IM 31 = 120

  await createStudents(pgdm2426, pgdm, [divA_2426, divB_2426, divC_2426], 80, [
    { specId: fin.id, count: 60, divs: [finA_26, finB_26] },
    { specId: mkt.id, count: 63, divs: [mktA_26, mktB_26] },
    { specId: ops.id, count: 53, divs: [opsA_26, opsB_26] },
    { specId: im.id, count: 64, divs: [imA_26, imB_26] },
  ], []);

  await createStudents(pgdmBm2426, pgdmBm, [divD_2426, divE_2426], 60, [
    { specId: fin.id, count: 30, divs: [finA_26, finB_26] },
    { specId: mkt.id, count: 32, divs: [mktA_26, mktB_26] },
    { specId: ops.id, count: 27, divs: [opsA_26, opsB_26] },
    { specId: im.id, count: 31, divs: [imA_26, imB_26] },
  ], []);

  // ─── Faculty ────────────────────────────────────────
  console.log("👨‍🏫 Creating faculty...");
  const facultyData = [
    { name: "Dr. Rajesh Iyer", email: "rajesh.iyer@spjimr.org", teachingArea: "Finance and Accounting" },
    { name: "Dr. Meena Kapoor", email: "meena.kapoor@spjimr.org", teachingArea: "Finance and Accounting" },
    { name: "Dr. Sunil Verma", email: "sunil.verma@spjimr.org", teachingArea: "Finance and Accounting" },
    { name: "Dr. Priya Sharma", email: "priya.sharma@spjimr.org", teachingArea: "Marketing" },
    { name: "Dr. Vikram Mehta", email: "vikram.mehta@spjimr.org", teachingArea: "Marketing" },
    { name: "Dr. Anjali Desai", email: "anjali.desai@spjimr.org", teachingArea: "Marketing" },
    { name: "Dr. Arun Nair", email: "arun.nair@spjimr.org", teachingArea: "Information Management and Analytics" },
    { name: "Dr. Deepa Pillai", email: "deepa.pillai@spjimr.org", teachingArea: "Information Management and Analytics" },
    { name: "Dr. Karthik Rao", email: "karthik.rao@spjimr.org", teachingArea: "Information Management and Analytics" },
    { name: "Dr. Sanjay Kulkarni", email: "sanjay.kulkarni@spjimr.org", teachingArea: "Operations Supply Chain Management & Quantitative Methods" },
    { name: "Dr. Rekha Joshi", email: "rekha.joshi@spjimr.org", teachingArea: "Operations Supply Chain Management & Quantitative Methods" },
    { name: "Dr. Manoj Reddy", email: "manoj.reddy@spjimr.org", teachingArea: "Operations Supply Chain Management & Quantitative Methods" },
    { name: "Dr. Kavita Banerjee", email: "kavita.banerjee@spjimr.org", teachingArea: "Economics & Policy" },
    { name: "Dr. Rahul Saxena", email: "rahul.saxena@spjimr.org", teachingArea: "Economics & Policy" },
    { name: "Dr. Nandini Shah", email: "nandini.shah@spjimr.org", teachingArea: "Organisation & Leadership Studies" },
    { name: "Dr. Ashok Malhotra", email: "ashok.malhotra@spjimr.org", teachingArea: "Organisation & Leadership Studies" },
    { name: "Dr. Smita Patel", email: "smita.patel@spjimr.org", teachingArea: "Organisation & Leadership Studies" },
    { name: "Dr. Vinod Chopra", email: "vinod.chopra@spjimr.org", teachingArea: "Strategy" },
    { name: "Dr. Lakshmi Thakur", email: "lakshmi.thakur@spjimr.org", teachingArea: "Strategy" },
    { name: "Dr. Harish Bhatt", email: "harish.bhatt@spjimr.org", teachingArea: "Strategy" },
  ];

  const facultyMap = {};
  for (const fd of facultyData) {
    const f = await prisma.faculty.create({ data: fd });
    if (!facultyMap[fd.teachingArea]) facultyMap[fd.teachingArea] = [];
    facultyMap[fd.teachingArea].push(f);
  }

  // ─── Courses (Term 3 only for 2025-27) ──────────────
  console.log("📘 Creating courses...");

  // Core courses — PGDM 2025-27
  const hrm_pdm = await prisma.course.create({ data: { code: "OLS515-PDM-46", name: "Human Resource Management", totalSessions: 26, credits: 3, type: "core", termId: t3pgdm.id } });
  const bps_pdm = await prisma.course.create({ data: { code: "STR507-PDM-46", name: "Business Policy and Strategy II", totalSessions: 26, credits: 3, type: "core", termId: t3pgdm.id } });
  const ds_pdm = await prisma.course.create({ data: { code: "QTM522-PDM-46", name: "Decision Science", totalSessions: 26, credits: 3, type: "core", termId: t3pgdm.id } });
  const ma_pdm = await prisma.course.create({ data: { code: "ACC506-PDM-46", name: "Management Accounting", totalSessions: 26, credits: 3, type: "core", termId: t3pgdm.id } });

  // Core courses — PGDM(BM) 2025-27
  const hrm_bm = await prisma.course.create({ data: { code: "OLS515-PBM-04", name: "Human Resource Management", totalSessions: 26, credits: 3, type: "core", termId: t3bm.id } });
  const bps_bm = await prisma.course.create({ data: { code: "STR507-PBM-04", name: "Business Policy and Strategy II", totalSessions: 26, credits: 3, type: "core", termId: t3bm.id } });
  const ds_bm = await prisma.course.create({ data: { code: "QTM522-PBM-04", name: "Decision Science", totalSessions: 26, credits: 3, type: "core", termId: t3bm.id } });
  const ma_bm = await prisma.course.create({ data: { code: "ACC506-PBM-04", name: "Management Accounting", totalSessions: 26, credits: 3, type: "core", termId: t3bm.id } });

  // Spec courses — IM (common code for all)
  const dpm = await prisma.course.create({ data: { code: "INF522-PDM-46", name: "Digital Product Management", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: im.id } });
  const bia = await prisma.course.create({ data: { code: "ANA522-PDM-46", name: "Business Intelligence and Analytics", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: im.id } });
  const eit = await prisma.course.create({ data: { code: "INF524-PDM-46", name: "Enterprise IT", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: im.id } });
  const mlab = await prisma.course.create({ data: { code: "INF530-PDM-46", name: "Maker Lab", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: im.id } });

  // Spec courses — Marketing
  const cb = await prisma.course.create({ data: { code: "MKT501-PDM-46", name: "Consumer Behaviour", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: mkt.id } });
  const mr = await prisma.course.create({ data: { code: "MKT502-PDM-46", name: "Marketing Research", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: mkt.id } });
  const sdm = await prisma.course.create({ data: { code: "MKT503-PDM-46", name: "Sales and Distribution Management", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: mkt.id } });
  const sbm = await prisma.course.create({ data: { code: "MKT504-PDM-46", name: "Strategic Brand Management", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: mkt.id } });

  // Spec courses — Finance
  const cv = await prisma.course.create({ data: { code: "FIN501-PDM-46", name: "Corporate Valuation", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: fin.id } });
  const sapm = await prisma.course.create({ data: { code: "FIN502-PDM-46", name: "Security Analysis & Portfolio Management", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: fin.id } });
  const fl = await prisma.course.create({ data: { code: "FIN503-PDM-46", name: "Financial Laws", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: fin.id } });
  const fm = await prisma.course.create({ data: { code: "FIN504-PDM-46", name: "Financial Modelling", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: fin.id } });

  // Spec courses — Operations
  const som = await prisma.course.create({ data: { code: "OPS501-PDM-46", name: "Service Operations Management", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: ops.id } });
  const lm = await prisma.course.create({ data: { code: "OPS502-PDM-46", name: "Logistics Management", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: ops.id } });
  const pss = await prisma.course.create({ data: { code: "OPS503-PDM-46", name: "Procurement and Strategic Sourcing", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: ops.id } });
  const scpc = await prisma.course.create({ data: { code: "OPS504-PDM-46", name: "Supply Chain Planning and Coordination", totalSessions: 26, credits: 3, type: "specialisation", termId: t3pgdm.id, specialisationId: ops.id } });

  // ─── Faculty-Course Mapping ─────────────────────────
  console.log("🔗 Mapping faculty to courses...");
  const fcMappings = [
    // OLS faculty → HRM
    { faculty: facultyMap["Organisation & Leadership Studies"][0], courses: [hrm_pdm, hrm_bm] },
    { faculty: facultyMap["Organisation & Leadership Studies"][1], courses: [hrm_pdm, hrm_bm] },
    // Strategy faculty → BPS
    { faculty: facultyMap["Strategy"][0], courses: [bps_pdm, bps_bm] },
    { faculty: facultyMap["Strategy"][1], courses: [bps_pdm, bps_bm] },
    // QTM faculty → DS
    { faculty: facultyMap["Operations Supply Chain Management & Quantitative Methods"][0], courses: [ds_pdm, ds_bm] },
    { faculty: facultyMap["Operations Supply Chain Management & Quantitative Methods"][1], courses: [ds_pdm, ds_bm] },
    // Finance faculty → MA
    { faculty: facultyMap["Finance and Accounting"][0], courses: [ma_pdm, ma_bm] },
    { faculty: facultyMap["Finance and Accounting"][1], courses: [ma_pdm, ma_bm] },
    // IM faculty → IM courses
    { faculty: facultyMap["Information Management and Analytics"][0], courses: [dpm, bia] },
    { faculty: facultyMap["Information Management and Analytics"][1], courses: [eit, mlab] },
    { faculty: facultyMap["Information Management and Analytics"][2], courses: [dpm, bia, eit] },
    // Marketing faculty → MKT courses
    { faculty: facultyMap["Marketing"][0], courses: [cb, mr] },
    { faculty: facultyMap["Marketing"][1], courses: [sdm, sbm] },
    { faculty: facultyMap["Marketing"][2], courses: [cb, mr, sdm] },
    // Finance faculty → FIN spec courses
    { faculty: facultyMap["Finance and Accounting"][0], courses: [cv, sapm] },
    { faculty: facultyMap["Finance and Accounting"][1], courses: [fl, fm] },
    { faculty: facultyMap["Finance and Accounting"][2], courses: [cv, fl, fm] },
    // OPS faculty → OPS courses
    { faculty: facultyMap["Operations Supply Chain Management & Quantitative Methods"][0], courses: [som, lm] },
    { faculty: facultyMap["Operations Supply Chain Management & Quantitative Methods"][1], courses: [pss, scpc] },
    { faculty: facultyMap["Operations Supply Chain Management & Quantitative Methods"][2], courses: [som, lm, pss, scpc] },
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

  // ─── Timetable (Week of 2026-02-23 to 2026-03-01) ──
  console.log("📅 Creating timetable for week 2026-02-23...");
  const weekDates = ["2026-02-23", "2026-02-24", "2026-02-25", "2026-02-26", "2026-02-27", "2026-02-28"];
  // Mon, Tue, Wed, Thu, Fri, Sat

  const olsFac = facultyMap["Organisation & Leadership Studies"];
  const strFac = facultyMap["Strategy"];
  const qtmFac = facultyMap["Operations Supply Chain Management & Quantitative Methods"];
  const finFac = facultyMap["Finance and Accounting"];
  const imFac = facultyMap["Information Management and Analytics"];
  const mktFac = facultyMap["Marketing"];

  const ttEntries = [
    // Monday — Core courses for all divisions
    { date: weekDates[0], divId: divA_2527.id, courseId: hrm_pdm.id, facId: olsFac[0].id, slot: 2 },
    { date: weekDates[0], divId: divB_2527.id, courseId: hrm_pdm.id, facId: olsFac[1].id, slot: 2 },
    { date: weekDates[0], divId: divC_2527.id, courseId: bps_pdm.id, facId: strFac[0].id, slot: 2 },
    { date: weekDates[0], divId: divD_2527.id, courseId: hrm_bm.id, facId: olsFac[0].id, slot: 3 },
    { date: weekDates[0], divId: divE_2527.id, courseId: hrm_bm.id, facId: olsFac[1].id, slot: 3 },
    { date: weekDates[0], divId: divA_2527.id, courseId: ds_pdm.id, facId: qtmFac[0].id, slot: 3 },
    { date: weekDates[0], divId: divB_2527.id, courseId: ds_pdm.id, facId: qtmFac[1].id, slot: 3 },
    { date: weekDates[0], divId: divC_2527.id, courseId: ds_pdm.id, facId: qtmFac[2].id, slot: 3 },
    // Monday — Spec courses afternoon
    { date: weekDates[0], divId: finA_27.id, courseId: cv.id, facId: finFac[0].id, slot: 5 },
    { date: weekDates[0], divId: finB_27.id, courseId: sapm.id, facId: finFac[1].id, slot: 5 },
    { date: weekDates[0], divId: mktA_27.id, courseId: cb.id, facId: mktFac[0].id, slot: 5 },
    { date: weekDates[0], divId: mktB_27.id, courseId: mr.id, facId: mktFac[1].id, slot: 5 },
    { date: weekDates[0], divId: imA_27.id, courseId: dpm.id, facId: imFac[0].id, slot: 5 },
    { date: weekDates[0], divId: imB_27.id, courseId: bia.id, facId: imFac[1].id, slot: 5 },
    { date: weekDates[0], divId: opsA_27.id, courseId: som.id, facId: qtmFac[0].id, slot: 5 },

    // Tuesday — Core
    { date: weekDates[1], divId: divA_2527.id, courseId: ma_pdm.id, facId: finFac[0].id, slot: 2 },
    { date: weekDates[1], divId: divB_2527.id, courseId: ma_pdm.id, facId: finFac[1].id, slot: 2 },
    { date: weekDates[1], divId: divC_2527.id, courseId: ma_pdm.id, facId: finFac[2].id, slot: 2 },
    { date: weekDates[1], divId: divD_2527.id, courseId: ma_bm.id, facId: finFac[0].id, slot: 3 },
    { date: weekDates[1], divId: divE_2527.id, courseId: ma_bm.id, facId: finFac[1].id, slot: 3 },
    { date: weekDates[1], divId: divA_2527.id, courseId: bps_pdm.id, facId: strFac[0].id, slot: 3 },
    { date: weekDates[1], divId: divB_2527.id, courseId: bps_pdm.id, facId: strFac[1].id, slot: 3 },
    // Tuesday — Spec afternoon
    { date: weekDates[1], divId: finA_27.id, courseId: fl.id, facId: finFac[1].id, slot: 5 },
    { date: weekDates[1], divId: finB_27.id, courseId: fm.id, facId: finFac[2].id, slot: 5 },
    { date: weekDates[1], divId: mktA_27.id, courseId: sdm.id, facId: mktFac[1].id, slot: 5 },
    { date: weekDates[1], divId: mktB_27.id, courseId: sbm.id, facId: mktFac[2].id, slot: 5 },
    { date: weekDates[1], divId: imA_27.id, courseId: eit.id, facId: imFac[1].id, slot: 5 },
    { date: weekDates[1], divId: imB_27.id, courseId: mlab.id, facId: imFac[2].id, slot: 5 },
    { date: weekDates[1], divId: opsA_27.id, courseId: lm.id, facId: qtmFac[1].id, slot: 5 },

    // Wednesday — Core
    { date: weekDates[2], divId: divA_2527.id, courseId: hrm_pdm.id, facId: olsFac[0].id, slot: 2 },
    { date: weekDates[2], divId: divB_2527.id, courseId: hrm_pdm.id, facId: olsFac[1].id, slot: 2 },
    { date: weekDates[2], divId: divC_2527.id, courseId: hrm_pdm.id, facId: olsFac[2].id, slot: 2 },
    { date: weekDates[2], divId: divD_2527.id, courseId: ds_bm.id, facId: qtmFac[0].id, slot: 2 },
    { date: weekDates[2], divId: divE_2527.id, courseId: ds_bm.id, facId: qtmFac[1].id, slot: 2 },
    { date: weekDates[2], divId: divA_2527.id, courseId: ma_pdm.id, facId: finFac[0].id, slot: 3 },
    { date: weekDates[2], divId: divB_2527.id, courseId: ma_pdm.id, facId: finFac[1].id, slot: 3 },
    { date: weekDates[2], divId: divC_2527.id, courseId: ma_pdm.id, facId: finFac[2].id, slot: 3 },
    // Wed — Spec
    { date: weekDates[2], divId: finA_27.id, courseId: cv.id, facId: finFac[0].id, slot: 5 },
    { date: weekDates[2], divId: mktA_27.id, courseId: cb.id, facId: mktFac[0].id, slot: 5 },
    { date: weekDates[2], divId: imA_27.id, courseId: dpm.id, facId: imFac[0].id, slot: 5 },
    { date: weekDates[2], divId: opsA_27.id, courseId: pss.id, facId: qtmFac[2].id, slot: 5 },

    // Thursday — Core
    { date: weekDates[3], divId: divA_2527.id, courseId: ds_pdm.id, facId: qtmFac[0].id, slot: 2 },
    { date: weekDates[3], divId: divB_2527.id, courseId: ds_pdm.id, facId: qtmFac[1].id, slot: 2 },
    { date: weekDates[3], divId: divC_2527.id, courseId: bps_pdm.id, facId: strFac[0].id, slot: 2 },
    { date: weekDates[3], divId: divD_2527.id, courseId: bps_bm.id, facId: strFac[1].id, slot: 2 },
    { date: weekDates[3], divId: divE_2527.id, courseId: bps_bm.id, facId: strFac[2].id, slot: 2 },
    // Thu — Spec
    { date: weekDates[3], divId: finB_27.id, courseId: sapm.id, facId: finFac[1].id, slot: 5 },
    { date: weekDates[3], divId: mktB_27.id, courseId: mr.id, facId: mktFac[0].id, slot: 5 },
    { date: weekDates[3], divId: imB_27.id, courseId: bia.id, facId: imFac[1].id, slot: 5 },
    { date: weekDates[3], divId: opsA_27.id, courseId: scpc.id, facId: qtmFac[2].id, slot: 5 },

    // Friday — Core
    { date: weekDates[4], divId: divA_2527.id, courseId: bps_pdm.id, facId: strFac[0].id, slot: 2 },
    { date: weekDates[4], divId: divB_2527.id, courseId: bps_pdm.id, facId: strFac[1].id, slot: 2 },
    { date: weekDates[4], divId: divC_2527.id, courseId: ds_pdm.id, facId: qtmFac[2].id, slot: 2 },
    { date: weekDates[4], divId: divD_2527.id, courseId: ma_bm.id, facId: finFac[0].id, slot: 2 },
    { date: weekDates[4], divId: divE_2527.id, courseId: ma_bm.id, facId: finFac[1].id, slot: 2 },
    // Fri — Spec
    { date: weekDates[4], divId: finA_27.id, courseId: fm.id, facId: finFac[2].id, slot: 5 },
    { date: weekDates[4], divId: mktA_27.id, courseId: sdm.id, facId: mktFac[1].id, slot: 5 },
    { date: weekDates[4], divId: imA_27.id, courseId: eit.id, facId: imFac[1].id, slot: 5 },

    // Saturday — Light
    { date: weekDates[5], divId: divA_2527.id, courseId: hrm_pdm.id, facId: olsFac[0].id, slot: 2 },
    { date: weekDates[5], divId: divB_2527.id, courseId: hrm_pdm.id, facId: olsFac[1].id, slot: 2 },
    { date: weekDates[5], divId: divD_2527.id, courseId: hrm_bm.id, facId: olsFac[0].id, slot: 3 },
  ];

  for (const entry of ttEntries) {
    const st = slotTime(entry.slot);
    await prisma.timetable.create({
      data: {
        divisionId: entry.divId, courseId: entry.courseId, facultyId: entry.facId,
        date: entry.date, slotNumber: entry.slot, startTime: st.startTime, endTime: st.endTime,
      },
    });
  }

  // ─── Biometric Logs CSV (one file per day) ───────────
  console.log("📝 Generating biometric log CSVs...");
  const header = "Site | Location Name | Name | Card Id | Batch | Roll No | Provisional Roll No | Swipe TIme | Swipe Type | Error Code | Pull Time | Geo Location | Controller Name";
  const feb23Rows = [header];
  const feb24Rows = [header];
  const feb25Rows = [header];

  // Get students for core Div A (2025-27) — 80 students
  const divAStudents = await prisma.user.findMany({
    where: { coreDivisionId: divA_2527.id },
    orderBy: { rollNumber: "asc" },
  });
  // Get students for core Div D (2025-27) — 60 students
  const divDStudents = await prisma.user.findMany({
    where: { coreDivisionId: divD_2527.id },
    orderBy: { rollNumber: "asc" },
  });

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")} ${d.getFullYear()}`;
  }

  function addSwipe(rows, student, dateStr, time, batchName) {
    const fd = formatDate(dateStr);
    rows.push(`S.P. Jain Institute of Management & Research - Mumbai | LOC_SPJMUM | ${student.name} | ${1000 + student.id} | ${batchName} | ${student.rollNumber} | | ${fd} ${time} | In | Success | ${fd} 03:15 PM | SPJIMR Campus | Con1`);
  }

  // ─── Feb 23 (Monday) — Slot 2 (09:00-10:10), Slot 3 (10:40-11:50), Slot 5 (14:30-15:40)
  // Case 1: Most students arrive on time for Slot 2
  for (let i = 0; i < 70; i++) {
    const mins = String(Math.floor(Math.random() * 8)).padStart(2, "0");
    addSwipe(feb23Rows, divAStudents[i], "2026-02-23", `09:${mins} AM`, "PGDM 2025-27");
  }
  // Case 2: 5 students arrive late (after 09:10)
  for (let i = 70; i < 75; i++) {
    const mins = String(11 + Math.floor(Math.random() * 10)).padStart(2, "0");
    addSwipe(feb23Rows, divAStudents[i], "2026-02-23", `09:${mins} AM`, "PGDM 2025-27");
  }
  // Case 3: 5 students don't swipe at all (absent — no row)

  // Slot 3 — Most show up
  for (let i = 0; i < 72; i++) {
    const mins = String(40 + Math.floor(Math.random() * 8)).padStart(2, "0");
    addSwipe(feb23Rows, divAStudents[i], "2026-02-23", `10:${mins} AM`, "PGDM 2025-27");
  }
  // Slot 3 — some have duplicate punches
  for (let i = 0; i < 5; i++) {
    addSwipe(feb23Rows, divAStudents[i], "2026-02-23", `10:53 AM`, "PGDM 2025-27");
  }

  // Div D students for BM slot 3
  for (let i = 0; i < 50; i++) {
    const mins = String(40 + Math.floor(Math.random() * 8)).padStart(2, "0");
    addSwipe(feb23Rows, divDStudents[i], "2026-02-23", `10:${mins} AM`, "PGDM (BM) 2025-27");
  }

  // ─── Feb 24 (Tuesday) — Slot 2 (09:00-10:10), Slot 3 (10:40-11:50)
  // Case: Normal attendance
  for (let i = 0; i < 65; i++) {
    const mins = String(Math.floor(Math.random() * 7)).padStart(2, "0");
    addSwipe(feb24Rows, divAStudents[i], "2026-02-24", `09:${mins} AM`, "PGDM 2025-27");
  }
  // Late arrivals
  for (let i = 65; i < 72; i++) {
    const mins = String(12 + Math.floor(Math.random() * 15)).padStart(2, "0");
    addSwipe(feb24Rows, divAStudents[i], "2026-02-24", `09:${mins} AM`, "PGDM 2025-27");
  }

  // Slot 3
  for (let i = 0; i < 75; i++) {
    const mins = String(40 + Math.floor(Math.random() * 9)).padStart(2, "0");
    addSwipe(feb24Rows, divAStudents[i], "2026-02-24", `10:${mins} AM`, "PGDM 2025-27");
  }

  // BM Div D+E for Slot 3
  for (let i = 0; i < 55; i++) {
    const mins = String(40 + Math.floor(Math.random() * 8)).padStart(2, "0");
    addSwipe(feb24Rows, divDStudents[i], "2026-02-24", `10:${mins} AM`, "PGDM (BM) 2025-27");
  }

  // ─── Feb 25 (Wednesday) — Slot 2 (09:00), Slot 3 (10:40)
  // Case: Very high attendance
  for (let i = 0; i < 78; i++) {
    const mins = String(Math.floor(Math.random() * 9)).padStart(2, "0");
    addSwipe(feb25Rows, divAStudents[i], "2026-02-25", `09:${mins} AM`, "PGDM 2025-27");
  }
  // 2 students late
  for (let i = 78; i < 80; i++) {
    addSwipe(feb25Rows, divAStudents[i], "2026-02-25", `09:15 AM`, "PGDM 2025-27");
  }

  // Slot 3
  for (let i = 0; i < 77; i++) {
    const mins = String(40 + Math.floor(Math.random() * 8)).padStart(2, "0");
    addSwipe(feb25Rows, divAStudents[i], "2026-02-25", `10:${mins} AM`, "PGDM 2025-27");
  }

  // BM
  for (let i = 0; i < 58; i++) {
    const mins = String(Math.floor(Math.random() * 9)).padStart(2, "0");
    addSwipe(feb25Rows, divDStudents[i], "2026-02-25", `09:${mins} AM`, "PGDM (BM) 2025-27");
  }

  // Write per-day CSVs
  fs.writeFileSync("test-data/biometric-log-2026-02-23.csv", feb23Rows.join("\n") + "\n");
  fs.writeFileSync("test-data/biometric-log-2026-02-24.csv", feb24Rows.join("\n") + "\n");
  fs.writeFileSync("test-data/biometric-log-2026-02-25.csv", feb25Rows.join("\n") + "\n");
  console.log(`📄 Generated 3 biometric logs: Feb 23 (${feb23Rows.length - 1} swipes), Feb 24 (${feb24Rows.length - 1} swipes), Feb 25 (${feb25Rows.length - 1} swipes)`);

  // ─── Summary ────────────────────────────────────────
  const stats = {
    programmes: await prisma.programme.count(),
    batches: await prisma.batch.count(),
    terms: await prisma.term.count(),
    specialisations: await prisma.specialisation.count(),
    divisions: await prisma.division.count(),
    students: await prisma.user.count({ where: { role: "student" } }),
    faculty: await prisma.faculty.count(),
    courses: await prisma.course.count(),
    facultyCourses: await prisma.facultyCourse.count(),
    timetableEntries: await prisma.timetable.count(),
  };
  console.log("\n✅ Seed complete!");
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
