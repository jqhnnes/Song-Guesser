import type { TimelineCard } from "./types";

/** The one gap a year belongs in: before the first card that is the same year or newer. */
export function canonicalSlot(years: number[], year: number) {
  const index = years.findIndex((value) => value >= year);
  return index === -1 ? years.length : index;
}

/** Inclusive years a gap accepts. The first gap has no older neighbor. The last has no newer one. */
export function gapBounds(years: number[], slot: number) {
  return {
    lo: slot <= 0 ? Number.NEGATIVE_INFINITY : years[slot - 1],
    hi: slot >= years.length ? Number.POSITIVE_INFINITY : years[slot],
  };
}

export function yearInGap(years: number[], slot: number, year: number) {
  if (slot < 0 || slot > years.length) return false;
  const { lo, hi } = gapBounds(years, slot);
  return year >= lo && year <= hi;
}

export function gapLabel(years: number[], slot: number) {
  const prev = slot > 0 ? years[slot - 1] : null;
  const next = slot < years.length ? years[slot] : null;
  if (prev !== null && next !== null) return `Between ${prev} and ${next}`;
  if (next !== null) return `Before ${next}`;
  if (prev !== null) return `After ${prev}`;
  return "First card";
}

export function everyoneHasAnswered(input: {
  playerIds: string[];
  activePlayerId: string;
  passedIds: string[];
  claimPlayerIds: string[];
}) {
  return input.playerIds
    .filter((id) => id !== input.activePlayerId)
    .every((id) => input.passedIds.includes(id) || input.claimPlayerIds.includes(id));
}

/** A bot claims one open gap, or leaves the active player's guess alone. */
export function chooseBotClaim(
  years: number[],
  year: number,
  activeSlot: number,
  takenSlots: number[],
): number | "pass" {
  const open: number[] = [];
  for (let slot = 0; slot <= years.length; slot += 1) {
    if (slot === activeSlot || takenSlots.includes(slot)) continue;
    open.push(slot);
  }
  if (open.length === 0 || Math.random() < 0.42) return "pass";
  const fitting = open.filter((slot) => yearInGap(years, slot, year) && !yearInGap(years, activeSlot, year));
  const pool = Math.random() < 0.58 && fitting.length > 0 ? fitting : open;
  return pool[Math.floor(Math.random() * pool.length)] ?? "pass";
}

export function placementIsCorrect(years: number[], slot: number, year: number) {
  if (years.length === 0) return slot === 0;
  return yearInGap(years, slot, year);
}

export function correctSlots(years: number[], year: number) {
  const slots: number[] = [];
  for (let slot = 0; slot <= years.length; slot += 1) {
    if (placementIsCorrect(years, slot, year)) slots.push(slot);
  }
  return slots;
}

export function insertionIndex(
  timeline: Array<Pick<TimelineCard, "year" | "order">>,
  year: number,
  order: number,
) {
  const next = [...timeline, { year, order }].sort(
    (a, b) => a.year - b.year || a.order - b.order,
  );
  return next.findIndex((card) => card.year === year && card.order === order);
}

export function insertCard(timeline: TimelineCard[], card: TimelineCard) {
  return [...timeline, card].sort((a, b) => a.year - b.year || a.order - b.order);
}

export function placementRelation(
  years: number[],
  slot: number | null,
  year: number,
): "correct" | "early" | "late" | "missed" {
  if (slot === null) return "missed";
  const slots = correctSlots(years, year);
  if (slots.length === 0) return "missed";
  if (slots.includes(slot)) return "correct";
  if (slot < slots[0]) return "early";
  return "late";
}

export function betweenLabel(
  timeline: TimelineCard[],
  slot: number,
) {
  const prev = timeline[slot - 1];
  const next = timeline[slot];
  if (prev && next) return `Between ${prev.year} and ${next.year}`;
  if (next) return `Before ${next.year}`;
  if (prev) return `After ${prev.year}`;
  return "First card on the timeline";
}

export function chooseBotSlot(years: number[], year: number) {
  const slots = correctSlots(years, year);
  const all = Array.from({ length: years.length + 1 }, (_, index) => index);
  const wrong = all.filter((slot) => !slots.includes(slot));
  const hit = Math.random() < 0.62 || wrong.length === 0;
  const pool = hit ? slots : wrong;
  return pool[Math.floor(Math.random() * pool.length)] ?? 0;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCode() {
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]).join("");
}

export function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export function isCode(value: string) {
  return /^[A-Z0-9]{4}$/.test(value);
}

export function clampRounds(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(30, Math.max(1, Math.round(value)));
}

/** Every song can become a card. Nothing is reserved for a starting hand. */
export function maxGuessingRounds(songCount: number) {
  return Math.max(0, songCount);
}
