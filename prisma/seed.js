const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.attendance.deleteMany();
  await prisma.session.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.term.deleteMany();
  await prisma.division.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.specialisation.deleteMany();
  await prisma.programme.deleteMany();

  // ─── Programmes ──────────────────────────────────────
  const pgdm = await prisma.programme.create({ data: { code: "PGP", name: "PGDM", fullName: "Post Graduate Diploma in Management" } });
  const pgdmBm = await prisma.programme.create({ data: { code: "PGPBM", name: "PGDM (BM)", fullName: "Post Graduate Diploma in Management (Business Management)" } });

  // ─── Batches ─────────────────────────────────────────
  const pgdmBatch = await prisma.batch.create({ data: { programmeId: pgdm.id, name: "PGDM 2025-27", startYear: 2025, endYear: 2027, isActive: true } });
  const pgdmBmBatch = await prisma.batch.create({ data: { programmeId: pgdmBm.id, name: "PGDM (BM) 2025-27", startYear: 2025, endYear: 2027, isActive: true } });

  // ─── Terms ───────────────────────────────────────────
  await prisma.term.create({ data: { batchId: pgdmBatch.id, number: 1, name: "Term 1", startDate: "2025-06-15", isActive: false } });
  await prisma.term.create({ data: { batchId: pgdmBatch.id, number: 2, name: "Term 2", startDate: "2025-10-01", isActive: false } });
  const pgdmTerm3 = await prisma.term.create({ data: { batchId: pgdmBatch.id, number: 3, name: "Term 3", startDate: "2026-02-01", isActive: true } });

  await prisma.term.create({ data: { batchId: pgdmBmBatch.id, number: 1, name: "Term 1", startDate: "2025-06-15", isActive: false } });
  await prisma.term.create({ data: { batchId: pgdmBmBatch.id, number: 2, name: "Term 2", startDate: "2025-10-01", isActive: false } });
  const bmTerm3 = await prisma.term.create({ data: { batchId: pgdmBmBatch.id, number: 3, name: "Term 3", startDate: "2026-02-01", isActive: true } });

  // ─── Core Divisions (linked to batch, not programme) ──
  const pgdmDivA = await prisma.division.create({ data: { name: "A", type: "core", batchId: pgdmBatch.id } });
  const pgdmDivB = await prisma.division.create({ data: { name: "B", type: "core", batchId: pgdmBatch.id } });
  const bmDivC = await prisma.division.create({ data: { name: "C", type: "core", batchId: pgdmBmBatch.id } });

  // ─── Specialisations ────────────────────────────────
  const mktSpec = await prisma.specialisation.create({ data: { name: "Marketing", code: "MKT" } });
  const imSpec = await prisma.specialisation.create({ data: { name: "Information Management & Analytics", code: "IM" } });

  // ─── Specialisation Divisions (unique, cross-programme) ──
  const mktDivA = await prisma.division.create({ data: { name: "MKT-A", type: "specialisation", specialisationId: mktSpec.id } });
  const mktDivB = await prisma.division.create({ data: { name: "MKT-B", type: "specialisation", specialisationId: mktSpec.id } });
  const imDivA = await prisma.division.create({ data: { name: "IM-A", type: "specialisation", specialisationId: imSpec.id } });
  const imDivB = await prisma.division.create({ data: { name: "IM-B", type: "specialisation", specialisationId: imSpec.id } });

  // ─── Core Courses ────────────────────────────────────
  const stratMgmt = await prisma.course.create({ data: { code: "SM301", name: "Strategic Management", totalSessions: 26, credits: 3, termId: pgdmTerm3.id, type: "core" } });
  const bizAnalytics = await prisma.course.create({ data: { code: "BA302", name: "Business Analytics", totalSessions: 18, credits: 2, termId: pgdmTerm3.id, type: "core" } });
  const intlBiz = await prisma.course.create({ data: { code: "IB303", name: "International Business", totalSessions: 9, credits: 1, termId: pgdmTerm3.id, type: "core" } });
  const bmLeadership = await prisma.course.create({ data: { code: "BL301", name: "Business Leadership", totalSessions: 26, credits: 3, termId: bmTerm3.id, type: "core" } });
  const bmOps = await prisma.course.create({ data: { code: "BO302", name: "Operations Excellence", totalSessions: 18, credits: 2, termId: bmTerm3.id, type: "core" } });

  // ─── Specialisation Courses ──────────────────────────
  const digMkt = await prisma.course.create({ data: { code: "MK301", name: "Digital Marketing", totalSessions: 18, credits: 2, termId: pgdmTerm3.id, type: "specialisation", specialisationId: mktSpec.id } });
  const consumerBeh = await prisma.course.create({ data: { code: "MK302", name: "Consumer Behaviour", totalSessions: 9, credits: 1, termId: pgdmTerm3.id, type: "specialisation", specialisationId: mktSpec.id } });
  const mlAnalytics = await prisma.course.create({ data: { code: "IM301", name: "ML for Analytics", totalSessions: 18, credits: 2, termId: pgdmTerm3.id, type: "specialisation", specialisationId: imSpec.id } });
  const dataViz = await prisma.course.create({ data: { code: "IM302", name: "Data Visualization", totalSessions: 9, credits: 1, termId: pgdmTerm3.id, type: "specialisation", specialisationId: imSpec.id } });

  // ─── Timetable ───────────────────────────────────────
  // PGDM Div A: Mon
  await prisma.timetable.create({ data: { divisionId: pgdmDivA.id, courseId: stratMgmt.id, dayOfWeek: 1, slotNumber: 1, startTime: "09:00", endTime: "10:30" } });
  await prisma.timetable.create({ data: { divisionId: pgdmDivA.id, courseId: bizAnalytics.id, dayOfWeek: 1, slotNumber: 2, startTime: "11:00", endTime: "12:30" } });
  await prisma.timetable.create({ data: { divisionId: pgdmDivA.id, courseId: intlBiz.id, dayOfWeek: 1, slotNumber: 3, startTime: "14:00", endTime: "15:30" } });
  // PGDM Div A: Tue
  await prisma.timetable.create({ data: { divisionId: pgdmDivA.id, courseId: bizAnalytics.id, dayOfWeek: 2, slotNumber: 1, startTime: "09:00", endTime: "10:30" } });
  await prisma.timetable.create({ data: { divisionId: pgdmDivA.id, courseId: intlBiz.id, dayOfWeek: 2, slotNumber: 2, startTime: "11:00", endTime: "12:30" } });
  await prisma.timetable.create({ data: { divisionId: pgdmDivA.id, courseId: stratMgmt.id, dayOfWeek: 2, slotNumber: 3, startTime: "14:00", endTime: "15:30" } });
  // PGDM Div B: Mon
  await prisma.timetable.create({ data: { divisionId: pgdmDivB.id, courseId: intlBiz.id, dayOfWeek: 1, slotNumber: 1, startTime: "09:00", endTime: "10:30" } });
  await prisma.timetable.create({ data: { divisionId: pgdmDivB.id, courseId: stratMgmt.id, dayOfWeek: 1, slotNumber: 2, startTime: "11:00", endTime: "12:30" } });
  await prisma.timetable.create({ data: { divisionId: pgdmDivB.id, courseId: bizAnalytics.id, dayOfWeek: 1, slotNumber: 3, startTime: "14:00", endTime: "15:30" } });
  // BM Div C: Mon
  await prisma.timetable.create({ data: { divisionId: bmDivC.id, courseId: bmLeadership.id, dayOfWeek: 1, slotNumber: 1, startTime: "09:00", endTime: "10:30" } });
  await prisma.timetable.create({ data: { divisionId: bmDivC.id, courseId: bmOps.id, dayOfWeek: 1, slotNumber: 2, startTime: "11:00", endTime: "12:30" } });
  // MKT-A: Thu
  await prisma.timetable.create({ data: { divisionId: mktDivA.id, courseId: digMkt.id, dayOfWeek: 4, slotNumber: 1, startTime: "09:00", endTime: "10:30" } });
  await prisma.timetable.create({ data: { divisionId: mktDivA.id, courseId: consumerBeh.id, dayOfWeek: 4, slotNumber: 2, startTime: "11:00", endTime: "12:30" } });
  // MKT-B: Thu
  await prisma.timetable.create({ data: { divisionId: mktDivB.id, courseId: digMkt.id, dayOfWeek: 4, slotNumber: 3, startTime: "14:00", endTime: "15:30" } });
  await prisma.timetable.create({ data: { divisionId: mktDivB.id, courseId: consumerBeh.id, dayOfWeek: 4, slotNumber: 4, startTime: "16:00", endTime: "17:30" } });
  // IM-A: Fri
  await prisma.timetable.create({ data: { divisionId: imDivA.id, courseId: mlAnalytics.id, dayOfWeek: 5, slotNumber: 1, startTime: "09:00", endTime: "10:30" } });
  await prisma.timetable.create({ data: { divisionId: imDivA.id, courseId: dataViz.id, dayOfWeek: 5, slotNumber: 2, startTime: "11:00", endTime: "12:30" } });
  // IM-B: Fri
  await prisma.timetable.create({ data: { divisionId: imDivB.id, courseId: mlAnalytics.id, dayOfWeek: 5, slotNumber: 3, startTime: "14:00", endTime: "15:30" } });
  await prisma.timetable.create({ data: { divisionId: imDivB.id, courseId: dataViz.id, dayOfWeek: 5, slotNumber: 4, startTime: "16:00", endTime: "17:30" } });

  // ─── Students ────────────────────────────────────────
  const students = [
    // PGDM Div A
    { name: "Aarav Sharma", email: "aarav@spjimr.org", rollNumber: "PGP-25-001", batchId: pgdmBatch.id, coreId: pgdmDivA.id, specId: mktSpec.id, specDivId: mktDivA.id },
    { name: "Priya Patel", email: "priya@spjimr.org", rollNumber: "PGP-25-002", batchId: pgdmBatch.id, coreId: pgdmDivA.id, specId: mktSpec.id, specDivId: mktDivA.id },
    { name: "Rohan Gupta", email: "rohan@spjimr.org", rollNumber: "PGP-25-003", batchId: pgdmBatch.id, coreId: pgdmDivA.id, specId: imSpec.id, specDivId: imDivA.id },
    { name: "Sneha Iyer", email: "sneha@spjimr.org", rollNumber: "PGP-25-004", batchId: pgdmBatch.id, coreId: pgdmDivA.id, specId: imSpec.id, specDivId: imDivA.id },
    { name: "Vikram Rao", email: "vikram@spjimr.org", rollNumber: "PGP-25-005", batchId: pgdmBatch.id, coreId: pgdmDivA.id, specId: mktSpec.id, specDivId: mktDivB.id },
    // PGDM Div B
    { name: "Ananya Desai", email: "ananya@spjimr.org", rollNumber: "PGP-25-006", batchId: pgdmBatch.id, coreId: pgdmDivB.id, specId: mktSpec.id, specDivId: mktDivB.id },
    { name: "Karan Singh", email: "karan@spjimr.org", rollNumber: "PGP-25-007", batchId: pgdmBatch.id, coreId: pgdmDivB.id, specId: imSpec.id, specDivId: imDivB.id },
    { name: "Meera Nair", email: "meera@spjimr.org", rollNumber: "PGP-25-008", batchId: pgdmBatch.id, coreId: pgdmDivB.id, specId: imSpec.id, specDivId: imDivB.id },
    { name: "Siddharth Joshi", email: "sid@spjimr.org", rollNumber: "PGP-25-009", batchId: pgdmBatch.id, coreId: pgdmDivB.id, specId: mktSpec.id, specDivId: mktDivA.id },
    { name: "Tanvi Kulkarni", email: "tanvi@spjimr.org", rollNumber: "PGP-25-010", batchId: pgdmBatch.id, coreId: pgdmDivB.id, specId: mktSpec.id, specDivId: mktDivB.id },
    // BM Div C
    { name: "Aditya Menon", email: "aditya@spjimr.org", rollNumber: "PGPBM-25-001", batchId: pgdmBmBatch.id, coreId: bmDivC.id, specId: mktSpec.id, specDivId: mktDivA.id },
    { name: "Divya Reddy", email: "divya@spjimr.org", rollNumber: "PGPBM-25-002", batchId: pgdmBmBatch.id, coreId: bmDivC.id, specId: imSpec.id, specDivId: imDivA.id },
    { name: "Harsh Agarwal", email: "harsh@spjimr.org", rollNumber: "PGPBM-25-003", batchId: pgdmBmBatch.id, coreId: bmDivC.id, specId: mktSpec.id, specDivId: mktDivB.id },
  ];

  for (const s of students) {
    await prisma.user.create({
      data: { name: s.name, email: s.email, rollNumber: s.rollNumber, role: "student", batchId: s.batchId, coreDivisionId: s.coreId, specialisationId: s.specId, specDivisionId: s.specDivId },
    });
  }

  await prisma.user.create({ data: { name: "Admin Office", email: "admin@spjimr.org", role: "programme_office" } });

  console.log("Seed complete: 2 programmes, 2 batches, 6 terms, 3 core divs, 4 spec divs, 9 courses, 13 students + 1 admin");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
