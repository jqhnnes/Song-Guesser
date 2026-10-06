import { NextResponse } from "next/server";
import { clearSpotifyCookies } from "@/lib/spotify/session";

export async function POST() {
  await clearSpotifyCookies();
  return NextResponse.json({ connected: false });
}
