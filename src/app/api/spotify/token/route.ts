import { NextResponse } from "next/server";
import { readAccessToken } from "@/lib/spotify/session";

/** The Web Playback SDK has to receive the access token in the browser. The secret stays on the server. */
export async function GET() {
  const token = await readAccessToken();
  if (!token.ok) return NextResponse.json({ ok: false }, { status: token.status });
  return NextResponse.json({ accessToken: token.accessToken });
}
