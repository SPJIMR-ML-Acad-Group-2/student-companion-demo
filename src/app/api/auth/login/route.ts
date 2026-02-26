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

    // Look up user by roll number or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { rollNumber: identifier },
          { email: identifier },
        ],
      },
      include: {
        coreDivision: true,
        specDivision: true,
        batch: { include: { programme: true } },
        specialisation: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify({
      userId: user.id,
      role: user.role,
      name: user.name,
      rollNumber: user.rollNumber,
      coreDivisionId: user.coreDivisionId,
      specDivisionId: user.specDivisionId,
      batchId: user.batchId,
    }), {
      httpOnly: true,
      secure: false,
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        rollNumber: user.rollNumber,
        programme: user.batch?.programme?.name || null,
        batch: user.batch?.name || null,
        coreDivision: user.coreDivision?.name || null,
        specialisation: user.specialisation?.name || null,
        specDivision: user.specDivision?.name || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
