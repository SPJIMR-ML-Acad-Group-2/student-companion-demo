/**
 * patch-terms12.js — Fixes Term 1 & Term 2 courses already in the DB:
 *   1. Corrects totalSessions (1cr→9, 2cr→18, 3cr→26)
 *   2. Replaces faculty assignments with correct teaching-area mappings
 *
 * Safe to run on the existing DB — only touches T1/T2 course records.
 * Run: node prisma/patch-terms12.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SESSIONS_BY_CREDITS = { 1: 9, 2: 18, 3: 26 };

// All T1 + T2 course codes (both PDM and PBM), with their credit count
const ALL_COURSES = [
  // ── Term 1 ──
  { code: "COM501-PDM-46", credits: 1, tab: "BC-I"   },
  { code: "COM501-PBM-04", credits: 1, tab: "BC-I"   },
  { code: "STR501-PDM-46", credits: 1, tab: "BP&S-I" },
  { code: "STR501-PBM-04", credits: 1, tab: "BP&S-I" },
  { code: "QTM503-PDM-46", credits: 2, tab: "DAS"    },
  { code: "QTM503-PBM-04", credits: 2, tab: "DAS"    },
  { code: "ACC501-PDM-46", credits: 2, tab: "FA&SA"  },
  { code: "ACC501-PBM-04", credits: 2, tab: "FA&SA"  },
  { code: "ECO501-PDM-46", credits: 2, tab: "ME-I"   },
  { code: "ECO501-PBM-04", credits: 2, tab: "ME-I"   },
  { code: "MKT601-PDM-46", credits: 2, tab: "MM-I"   },
  { code: "MKT601-PBM-04", credits: 2, tab: "MM-I"   },
  { code: "OPS601-PDM-46", credits: 2, tab: "OM-I"   },
  { code: "OPS601-PBM-04", credits: 2, tab: "OM-I"   },
  { code: "OLS501-PDM-46", credits: 1, tab: "OB"     },
  { code: "OLS501-PBM-04", credits: 1, tab: "OB"     },
  { code: "QTM504-PDM-46", credits: 1, tab: "QM-I"   },
  { code: "QTM504-PBM-04", credits: 1, tab: "QM-I"   },
  { code: "HUM501-PDM-46", credits: 1, tab: "SS-I"   },
  { code: "HUM501-PBM-04", credits: 1, tab: "SS-I"   },
  { code: "HUM502-PDM-46", credits: 1, tab: "WIF"    },
  { code: "HUM502-PBM-04", credits: 1, tab: "WIF"    },
  // ── Term 2 ──
  { code: "COM502-PDM-46", credits: 2, tab: "BC-II"  },
  { code: "COM502-PBM-04", credits: 2, tab: "BC-II"  },
  { code: "FIN601-PDM-46", credits: 2, tab: "CF"     },
  { code: "FIN601-PBM-04", credits: 2, tab: "CF"     },
  { code: "INF601-PDM-46", credits: 1, tab: "DVDM"   },
  { code: "INF601-PBM-04", credits: 1, tab: "DVDM"   },
  { code: "INF602-PDM-46", credits: 2, tab: "BDA"    },
  { code: "INF602-PBM-04", credits: 2, tab: "BDA"    },
  { code: "ECO502-PDM-46", credits: 3, tab: "ME-II"  },
  { code: "ECO502-PBM-04", credits: 3, tab: "ME-II"  },
  { code: "MKT602-PDM-46", credits: 2, tab: "MM-II"  },
  { code: "MKT602-PBM-04", credits: 2, tab: "MM-II"  },
  { code: "OPS602-PDM-46", credits: 1, tab: "OM-II"  },
  { code: "OPS602-PBM-04", credits: 1, tab: "OM-II"  },
  { code: "OLS502-PDM-46", credits: 2, tab: "OD"     },
  { code: "OLS502-PBM-04", credits: 2, tab: "OD"     },
  { code: "QTM505-PDM-46", credits: 3, tab: "QM-II"  },
  { code: "QTM505-PBM-04", credits: 3, tab: "QM-II"  },
];

// Correct faculty assignments by teaching area
const FACULTY_ASSIGNMENTS = {
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
  // Load faculty lookup once
  const allEmails = [...new Set(Object.values(FACULTY_ASSIGNMENTS).flat())];
  const facultyRecords = await prisma.faculty.findMany({
    where: { email: { in: allEmails } },
  });
  const facultyByEmail = new Map(facultyRecords.map((f) => [f.email, f]));

  let fixed = 0;

  for (const { code, credits, tab } of ALL_COURSES) {
    const course = await prisma.course.findUnique({ where: { code } });
    if (!course) {
      console.warn(`  ⚠️  Course not found: ${code} — skipping`);
      continue;
    }

    const correctSessions = SESSIONS_BY_CREDITS[credits];

    // 1. Fix totalSessions
    await prisma.course.update({
      where: { id: course.id },
      data: { totalSessions: correctSessions },
    });

    // 2. Replace faculty assignments: delete old, insert new
    await prisma.facultyCourse.deleteMany({ where: { courseId: course.id } });
    const emails = FACULTY_ASSIGNMENTS[tab] ?? [];
    for (const email of emails) {
      const fac = facultyByEmail.get(email);
      if (!fac) { console.warn(`  ⚠️  Faculty not found: ${email}`); continue; }
      await prisma.facultyCourse.create({
        data: { facultyId: fac.id, courseId: course.id },
      });
    }

    console.log(`  ✅  ${code}  sessions: ${course.totalSessions} → ${correctSessions}  faculty: [${emails.map(e => e.split("@")[0]).join(", ")}]`);
    fixed++;
  }

  console.log(`\n✅ patch-terms12 complete! Fixed ${fixed}/${ALL_COURSES.length} courses.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
