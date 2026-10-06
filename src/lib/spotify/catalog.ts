import "server-only";

import { accentFor } from "@/lib/game/songs";
import type { Song } from "@/lib/game/types";

export type RemotePlaylist = {
  id: string;
  name: string;
  description: string;
  trackCount: number | null;
  image: string | null;
};

const IMAGE_HOSTS = new Set([
  "i.scdn.co",
  "mosaic.scdn.co",
  "image-cdn-ak.spotifycdn.com",
  "image-cdn-fa.spotifycdn.com",
]);

export function readPlaylists(payload: unknown): RemotePlaylist[] {
  const items = arrayAt(payload, "items");
  return items.flatMap((entry) => {
    const row = record(entry);
    const id = text(row?.id);
    const name = text(row?.name);
    if (!row || !id || !name || !/^[A-Za-z0-9]+$/.test(id)) return [];
    const tracks = record(row.tracks);
    const nestedItems = record(row.items);
    const total = numberAt(tracks, "total") ?? numberAt(nestedItems, "total");
    return [
      {
        id,
        name: name.slice(0, 80),
        description: cleanText(text(row.description) ?? "").slice(0, 140),
        trackCount: total,
        image: imageUrl(row.images),
      },
    ];
  });
}

export function readSongs(payload: unknown): { songs: Song[]; next: string | null } {
  const items = arrayAt(payload, "items");
  const songs = items.flatMap((entry) => {
    const track = readTrack(entry);
    if (!track || text(track.type) !== "track") return [];
    const id = text(track.id);
    const title = text(track.name);
    const year = yearFrom(text(record(track.album)?.release_date));
    if (!id || !title || year === null) return [];
    const artists = arrayAt(track, "artists")
      .map((artist) => text(record(artist)?.name))
      .filter((name): name is string => Boolean(name));
    return [
      {
        id,
        title: title.slice(0, 120),
        artist: (artists.join(", ") || "Unknown artist").slice(0, 120),
        album: (text(record(track.album)?.name) ?? "Single").slice(0, 120),
        year,
        accent: accentFor(id),
        image: imageUrl(record(track.album)?.images),
        unavailable: track.is_playable === false,
      } satisfies Song,
    ];
  });
  const next = text(record(payload)?.next);
  return { songs, next };
}

function readTrack(entry: unknown) {
  const row = record(entry);
  if (!row) return null;
  return record(row.item) ?? record(row.track) ?? (row.type === "track" ? row : null);
}

function yearFrom(releaseDate: string | null) {
  const year = Number(releaseDate?.slice(0, 4));
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  return year;
}

function imageUrl(value: unknown) {
  const images = Array.isArray(value) ? value : [];
  for (const image of images) {
    const url = text(record(image)?.url);
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" && IMAGE_HOSTS.has(parsed.hostname)) return url;
    } catch {
      // Ignore artwork that is not a Spotify CDN URL.
    }
  }
  return null;
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function arrayAt(value: unknown, key: string) {
  const row = record(value);
  const items = row?.[key];
  return Array.isArray(items) ? items : [];
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberAt(value: Record<string, unknown> | null, key: string) {
  const number = value?.[key];
  return typeof number === "number" ? number : null;
}
