import { NextResponse } from "next/server";
import { readSongs } from "@/lib/spotify/catalog";
import { spotifyFetch } from "@/lib/spotify/session";
import type { Song } from "@/lib/game/types";

const PAGE = 50;
const MAX_SONGS = 100;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ songs: [], reason: "spotify" }, { status: 400 });
  }

  const songs: Song[] = [];
  let path = `/playlists/${id}/items?limit=${PAGE}`;
  let truncated = false;

  for (let page = 0; page < 2 && songs.length < MAX_SONGS; page += 1) {
    let result = await spotifyFetch(path);
    if (!result.ok && page === 0 && result.status === 404) {
      result = await spotifyFetch(`/playlists/${id}/tracks?limit=${PAGE}`);
    }
    if (!result.ok) {
      return NextResponse.json({ songs: [], reason: result.reason }, { status: result.status });
    }
    const parsed = readSongs(result.data);
    songs.push(...parsed.songs.filter((song) => !songs.some((existing) => existing.id === song.id)));
    if (!parsed.next) break;
    if (page === 1) {
      truncated = true;
      break;
    }
    path = parsed.next.replace("https://api.spotify.com/v1", "");
  }

  return NextResponse.json({
    songs: songs.slice(0, MAX_SONGS),
    truncated: truncated || songs.length > MAX_SONGS,
  });
}
