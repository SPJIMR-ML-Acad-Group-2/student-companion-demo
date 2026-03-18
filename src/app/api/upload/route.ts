import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { parseUploadFile } from "@/lib/parseUpload";
import { processUploadJob } from "@/lib/uploadProcessor";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(session.value);
    if (user.role !== "programme_office") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse uploaded file
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Parse swipe records from file (fast — just CSV/XLSX parsing, no DB)
    let swipes;
    try {
      swipes = await parseUploadFile(file);
    } catch (err) {
      return NextResponse.json(
        { error: `Parse error: ${err}` },
        { status: 400 },
      );
    }

    if (swipes.length === 0) {
      return NextResponse.json(
        { error: "No valid records found in file" },
        { status: 400 },
      );
    }

    // Create job record immediately — client can start polling right away
    const job = await prisma.uploadJob.create({
      data: {
        status: "queued",
        fileName: file.name,
        totalSwipes: swipes.length,
      },
    });

    // Schedule the heavy DB work to run AFTER the response is sent.
    // `after()` keeps the Vercel function alive until the callback resolves.
    after(async () => {
      await processUploadJob(job.id, swipes);
    });

    // Return immediately — client polls /api/upload/status?jobId=<id>
    return NextResponse.json({
      jobId: job.id,
      totalSwipes: swipes.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
