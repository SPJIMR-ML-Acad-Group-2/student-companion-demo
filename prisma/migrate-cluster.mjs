/**
 * Cluster migration script
 * Reads all data from OLD Supabase cluster → writes to NEW Supabase cluster
 * Run AFTER prisma db push has been applied to the new cluster.
 *
 * Usage: node prisma/migrate-cluster.mjs
 */

import { PrismaClient } from '@prisma/client';

const OLD_URL = 'postgresql://postgres.oaxhylwycuaqtqdqymel:zSjxOSA9h1ggtdmC@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';
const NEW_URL = process.env.DIRECT_URL;

if (!NEW_URL) {
  console.error('❌  DIRECT_URL env var not set. Load your .env first.');
  process.exit(1);
}

const src = new PrismaClient({ datasources: { db: { url: OLD_URL } } });
const dst = new PrismaClient({ datasources: { db: { url: NEW_URL } } });

async function migrate() {
  console.log('🔌  Connecting to both clusters…');
  await src.$connect();
  await dst.$connect();

  // ── 1. Wipe destination (reverse FK order) ─────────────────────────────
  console.log('\n🗑️   Clearing destination…');
  await dst.attendance.deleteMany();
  await dst.draftTimetable.deleteMany();
  await dst.timetable.deleteMany();
  await dst.groupTermRoom.deleteMany();
  await dst.divisionTermRoom.deleteMany();
  await dst.facultyCourse.deleteMany();
  await dst.courseGroup.deleteMany();
  await dst.courseDivision.deleteMany();
  await dst.courseTerm.deleteMany();
  await dst.studentGroup.deleteMany();
  await dst.groupBatch.deleteMany();
  await dst.student.deleteMany();
  await dst.user.deleteMany();
  await dst.faculty.deleteMany();
  await dst.course.deleteMany();
  await dst.slot.deleteMany();
  await dst.group.deleteMany();
  await dst.division.deleteMany();
  await dst.room.deleteMany();
  await dst.term.deleteMany();
  await dst.batch.deleteMany();
  await dst.specialisation.deleteMany();
  await dst.programme.deleteMany();

  // ── 2. Read all data from source ───────────────────────────────────────
  console.log('\n📤  Reading from source cluster…');
  const [
    programmes, batches, specialisations, terms, rooms,
    divisions, groups, groupBatches,
    users, students, studentGroups,
    faculty, courses, courseTerms, courseDivisions, courseGroups, facultyCourses,
    divisionTermRooms, groupTermRooms,
    slots, timetables, draftTimetables, attendances,
  ] = await Promise.all([
    src.programme.findMany(),
    src.batch.findMany(),
    src.specialisation.findMany(),
    src.term.findMany(),
    src.room.findMany(),
    src.division.findMany(),
    src.group.findMany(),
    src.groupBatch.findMany(),
    src.user.findMany(),
    src.student.findMany(),
    src.studentGroup.findMany(),
    src.faculty.findMany(),
    src.course.findMany(),
    src.courseTerm.findMany(),
    src.courseDivision.findMany(),
    src.courseGroup.findMany(),
    src.facultyCourse.findMany(),
    src.divisionTermRoom.findMany(),
    src.groupTermRoom.findMany(),
    src.slot.findMany(),
    src.timetable.findMany(),
    src.draftTimetable.findMany(),
    src.attendance.findMany(),
  ]);

  console.log(`   programmes:${programmes.length}  batches:${batches.length}  terms:${terms.length}`);
  console.log(`   specialisations:${specialisations.length}  divisions:${divisions.length}  groups:${groups.length}`);
  console.log(`   users:${users.length}  students:${students.length}  faculty:${faculty.length}`);
  console.log(`   courses:${courses.length}  slots:${slots.length}`);
  console.log(`   timetables:${timetables.length}  draftTimetables:${draftTimetables.length}  attendance:${attendances.length}`);

  // ── 3. Insert in FK order ──────────────────────────────────────────────
  console.log('\n📥  Writing to destination cluster…');

  const ins = (label, fn) => fn().then(r => console.log(`   ✓ ${label}: ${Array.isArray(r) ? r.count ?? r.length : (r?.count ?? '?')}`));

  // Batch has a self-ref (activeTermId → Term), seed with null first, fix after
  const batchesNullActive = batches.map(b => ({ ...b, activeTermId: null }));

  await ins('programmes',       () => dst.programme.createMany({ data: programmes }));
  await ins('batches (staged)', () => dst.batch.createMany({ data: batchesNullActive }));
  await ins('specialisations',  () => dst.specialisation.createMany({ data: specialisations }));
  await ins('terms',            () => dst.term.createMany({ data: terms }));
  await ins('rooms',            () => dst.room.createMany({ data: rooms }));
  await ins('divisions',        () => dst.division.createMany({ data: divisions }));
  await ins('groups',           () => dst.group.createMany({ data: groups }));
  await ins('groupBatches',     () => dst.groupBatch.createMany({ data: groupBatches }));
  await ins('users',            () => dst.user.createMany({ data: users }));
  await ins('students',         () => dst.student.createMany({ data: students }));
  await ins('studentGroups',    () => dst.studentGroup.createMany({ data: studentGroups }));
  await ins('faculty',          () => dst.faculty.createMany({ data: faculty }));
  await ins('courses',          () => dst.course.createMany({ data: courses }));
  await ins('courseTerms',      () => dst.courseTerm.createMany({ data: courseTerms }));
  await ins('courseDivisions',  () => dst.courseDivision.createMany({ data: courseDivisions }));
  await ins('courseGroups',     () => dst.courseGroup.createMany({ data: courseGroups }));
  await ins('facultyCourses',   () => dst.facultyCourse.createMany({ data: facultyCourses }));
  await ins('divisionTermRooms',() => dst.divisionTermRoom.createMany({ data: divisionTermRooms }));
  await ins('groupTermRooms',   () => dst.groupTermRoom.createMany({ data: groupTermRooms }));
  await ins('slots',            () => dst.slot.createMany({ data: slots }));
  await ins('timetables',       () => dst.timetable.createMany({ data: timetables }));
  await ins('draftTimetables',  () => dst.draftTimetable.createMany({ data: draftTimetables }));
  await ins('attendance',       () => dst.attendance.createMany({ data: attendances }));

  // Fix batch activeTermId now that terms exist
  console.log('   Restoring batch activeTermId…');
  for (const b of batches.filter(b => b.activeTermId)) {
    await dst.batch.update({ where: { id: b.id }, data: { activeTermId: b.activeTermId } });
  }
  console.log(`   ✓ batch activeTermId patched for ${batches.filter(b => b.activeTermId).length} batches`);

  console.log('\n✅  Migration complete!');
}

migrate()
  .catch(e => { console.error('❌  Migration failed:', e); process.exit(1); })
  .finally(async () => { await src.$disconnect(); await dst.$disconnect(); });
