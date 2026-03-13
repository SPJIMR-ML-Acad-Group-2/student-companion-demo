import { NextResponse } from "next/server";
import { regenerateSpecialisationGroups } from "@/lib/regenerateSpecialisationGroups";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await regenerateSpecialisationGroups();
  return NextResponse.json(result);
}
