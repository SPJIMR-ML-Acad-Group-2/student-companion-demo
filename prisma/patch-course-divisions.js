/**
 * patch-course-divisions.js
 *
 * One-time patch: adds missing CourseDivision rows for all core courses
 * that were seeded without them. Safe to run multiple times — skips
 * courses that already have divisions and uses skipDuplicates.
 *
 * Run: node prisma/patch-course-divisions.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Fetch all core courses with their terms and existing divisions
  const coreCourses = await prisma.course.findMany({
    where: { type: "core" },
    include: {
      courseTerms: { select: { termId: true } },
      courseDivisions: { select: { divisionId: true } },
    },
  });

  console.log(`Found ${coreCourses.length} core courses.`);

  let skipped = 0;
  let patched = 0;

  for (const course of coreCourses) {
    // Already has divisions — skip
    if (course.courseDivisions.length > 0) {
      skipped++;
      continue;
    }

    const termIds = course.courseTerms.map((ct) => ct.termId);
    if (termIds.length === 0) {
      console.warn(`  ⚠️  ${course.code} has no terms — skipping`);
      skipped++;
      continue;
    }

    // Derive batch IDs from terms
    const terms = await prisma.term.findMany({
      where: { id: { in: termIds } },
      select: { batchId: true },
    });
    const batchIds = [...new Set(terms.map((t) => t.batchId))];

    // Find all divisions for those batches
    const divisions = await prisma.division.findMany({
      where: { batchId: { in: batchIds } },
      select: { id: true },
    });

    if (divisions.length === 0) {
      console.warn(`  ⚠️  ${course.code} — no divisions found for batches — skipping`);
      skipped++;
      continue;
    }

    // Insert CourseDivision rows
    await prisma.courseDivision.createMany({
      data: divisions.map((d) => ({ courseId: course.id, divisionId: d.id })),
      skipDuplicates: true,
    });

    console.log(`  ✅  ${course.code}  →  added divisions: [${divisions.map((d) => d.id.slice(0, 8)).join(", ")}...]`);
    patched++;
  }

  console.log(`\n✅ patch-course-divisions complete!`);
  console.log(`  Patched : ${patched}`);
  console.log(`  Skipped : ${skipped} (already had divisions or no terms)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
