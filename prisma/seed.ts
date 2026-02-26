// @ts-nocheck
// Use dynamic import for Prisma Client (ESM compatibility with Prisma v7)
async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // Clean existing data
    await prisma.attendance.deleteMany();
    await prisma.session.deleteMany();
    await prisma.timetable.deleteMany();
    await prisma.user.deleteMany();
    await prisma.course.deleteMany();
    await prisma.division.deleteMany();
    await prisma.programme.deleteMany();

    // Programme
    const programme = await prisma.programme.create({
      data: { name: "MBA - Communications Management" },
    });

    // Divisions
    const divA = await prisma.division.create({
      data: { name: "Division A", programmeId: programme.id },
    });
    const divB = await prisma.division.create({
      data: { name: "Division B", programmeId: programme.id },
    });

    // Courses
    const courses = await Promise.all([
      prisma.course.create({
        data: { code: "MKT601", name: "Marketing Management", totalSessions: 30 },
      }),
      prisma.course.create({
        data: { code: "FIN602", name: "Financial Accounting", totalSessions: 30 },
      }),
      prisma.course.create({
        data: { code: "OPS603", name: "Operations Research", totalSessions: 30 },
      }),
    ]);

    // Timetable slot times
    const slotTimes = [
      { slot: 1, start: "09:00", end: "10:30" },
      { slot: 2, start: "11:00", end: "12:30" },
      { slot: 3, start: "14:00", end: "15:30" },
    ];

    // Division A schedule
    const divATimetable = [
      { day: 1, courses: [courses[0], courses[1], courses[2]] }, // Mon
      { day: 2, courses: [courses[1], courses[2], courses[0]] }, // Tue
      { day: 3, courses: [courses[2], courses[0], courses[1]] }, // Wed
      { day: 4, courses: [courses[0], courses[1], courses[2]] }, // Thu
      { day: 5, courses: [courses[1], courses[2], courses[0]] }, // Fri
    ];

    // Division B schedule
    const divBTimetable = [
      { day: 1, courses: [courses[2], courses[0], courses[1]] }, // Mon
      { day: 2, courses: [courses[0], courses[1], courses[2]] }, // Tue
      { day: 3, courses: [courses[1], courses[2], courses[0]] }, // Wed
      { day: 4, courses: [courses[2], courses[0], courses[1]] }, // Thu
      { day: 5, courses: [courses[0], courses[1], courses[2]] }, // Fri
    ];

    for (const entry of divATimetable) {
      for (let i = 0; i < 3; i++) {
        await prisma.timetable.create({
          data: {
            divisionId: divA.id,
            courseId: entry.courses[i].id,
            dayOfWeek: entry.day,
            slotNumber: slotTimes[i].slot,
            startTime: slotTimes[i].start,
            endTime: slotTimes[i].end,
          },
        });
      }
    }

    for (const entry of divBTimetable) {
      for (let i = 0; i < 3; i++) {
        await prisma.timetable.create({
          data: {
            divisionId: divB.id,
            courseId: entry.courses[i].id,
            dayOfWeek: entry.day,
            slotNumber: slotTimes[i].slot,
            startTime: slotTimes[i].start,
            endTime: slotTimes[i].end,
          },
        });
      }
    }

    // Students – Division A
    const studentsA = [
      { name: "Aarav Sharma", email: "aarav@spjimr.org", rollNumber: "2024A001" },
      { name: "Priya Patel", email: "priya@spjimr.org", rollNumber: "2024A002" },
      { name: "Rohan Gupta", email: "rohan@spjimr.org", rollNumber: "2024A003" },
      { name: "Sneha Iyer", email: "sneha@spjimr.org", rollNumber: "2024A004" },
      { name: "Vikram Rao", email: "vikram@spjimr.org", rollNumber: "2024A005" },
    ];

    // Students – Division B
    const studentsB = [
      { name: "Ananya Desai", email: "ananya@spjimr.org", rollNumber: "2024B001" },
      { name: "Karan Singh", email: "karan@spjimr.org", rollNumber: "2024B002" },
      { name: "Meera Nair", email: "meera@spjimr.org", rollNumber: "2024B003" },
      { name: "Siddharth Joshi", email: "sid@spjimr.org", rollNumber: "2024B004" },
      { name: "Tanvi Kulkarni", email: "tanvi@spjimr.org", rollNumber: "2024B005" },
    ];

    for (const s of studentsA) {
      await prisma.user.create({
        data: { ...s, role: "student", divisionId: divA.id },
      });
    }

    for (const s of studentsB) {
      await prisma.user.create({
        data: { ...s, role: "student", divisionId: divB.id },
      });
    }

    // Programme Office user
    await prisma.user.create({
      data: {
        name: "Admin Office",
        email: "admin@spjimr.org",
        role: "programme_office",
        rollNumber: null,
        divisionId: null,
      },
    });

    console.log("✅ Seed data created successfully!");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
