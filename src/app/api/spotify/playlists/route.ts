import { NextResponse } from "next/server";
import { readPlaylists } from "@/lib/spotify/catalog";
import { spotifyFetch } from "@/lib/spotify/session";

export async function GET() {
  const first = await spotifyFetch("/me/playlists?limit=50");
  if (!first.ok) {
    return NextResponse.json({ playlists: [], reason: first.reason }, { status: first.status });
  }

  const playlists = readPlaylists(first.data);
  const next = typeof (first.data as { next?: unknown }).next === "string" ? (first.data as { next: string }).next : null;
  if (next) {
    const path = next.replace("https://api.spotify.com/v1", "");
    const second = await spotifyFetch(path);
    if (second.ok) playlists.push(...readPlaylists(second.data));
  }

  return NextResponse.json({ playlists });
}
