import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier } = body; // roll number or email

    if (!identifier) {
      return NextResponse.json({ error: "Identifier required" }, { status: 400 });
    }

    // Try email lookup (works for office staff and students)
    let user = await prisma.user.findFirst({
      where: { email: identifier },
      include: {
        student: {
          include: {
            division: true,
            batch: { include: { programme: true } },
            specialisation: true,
            groups: { include: { group: true } },
          },
        },
      },
    });

    // Fall back to roll number (students only)
    if (!user) {
      const student = await prisma.student.findUnique({
        where: { rollNumber: identifier },
        include: {
          user: true,
          division: true,
          batch: { include: { programme: true } },
          specialisation: true,
          groups: { include: { group: true } },
        },
      });
      if (student) {
        user = {
          ...student.user,
          student,
        } as unknown as typeof user;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const student = user.student;
    const groupIds = student?.groups.map((sg) => sg.groupId) ?? [];

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify({
      userId:     user.id,
      studentId:  student?.id ?? null,
      role:       user.role,
      name:       user.name,
      rollNumber: student?.rollNumber ?? null,
      divisionId: student?.divisionId ?? null,
      batchId:    student?.batchId ?? null,
      groupIds,
    }), {
      httpOnly: true,
      secure: false,
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id:             user.id,
        name:           user.name,
        role:           user.role,
        rollNumber:     student?.rollNumber ?? null,
        programme:      student?.batch?.programme?.name ?? null,
        batch:          student?.batch?.name ?? null,
        division:       student?.division?.name ?? null,
        specialisation: student?.specialisation?.name ?? null,
        groups:         student?.groups.map((sg) => sg.group.name) ?? [],
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
