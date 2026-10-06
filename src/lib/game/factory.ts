import { getPlaylist, playlistSongs } from "./songs";
import { makeCode } from "./rules";
import type { GameState, Player, Song } from "./types";

const IDLE_PLAYBACK = { status: "idle" as const, startedAt: null, elapsedMs: 0 };

function cleanName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 16);
}

function uniqueName(name: string, taken: string[]) {
  if (!taken.some((item) => item.toLowerCase() === name.toLowerCase())) return name;
  return `${name} 2`.slice(0, 16);
}

const GUESTS = ["Sarah", "Tom", "Emma", "Noah", "Mia", "Leo", "Ava"];

function makePlayer(input: Omit<Player, "connected" | "timeline" | "cardsWonAsActive">): Player {
  return { ...input, connected: true, timeline: [], cardsWonAsActive: 0 };
}

export function createParty(input: {
  nickname: string;
  playlistId: string;
  playlistName: string;
  songs: Song[];
  winMode?: "target" | "rounds";
  targetCards?: number;
  maxRounds: number;
  playerCount?: number;
  playlistSource?: "sample" | "spotify";
}): GameState {
  const you = cleanName(input.nickname) || "You";
  const seats = Math.min(8, Math.max(2, input.playerCount ?? 4));
  const guests = GUESTS.slice(0, seats - 1).map((name) => uniqueName(name, [you]));
  return {
    version: 4,
    code: makeCode(),
    phase: "lobby",
    playlistId: input.playlistId,
    playlistName: input.playlistName,
    playlistSource: input.playlistSource ?? "sample",
    songs: input.songs,
    songIds: input.songs.map((song) => song.id),
    hostIsSimulated: false,
    roundNumber: 0,
    winMode: input.winMode ?? "target",
    targetCards: input.targetCards ?? 10,
    maxRounds: input.maxRounds,
    discarded: 0,
    hardMode: false,
    players: [
      makePlayer({ id: "you", nickname: you, isHost: true, isLocal: true }),
      ...guests.map((nickname, index) =>
        makePlayer({
          id: `guest-${index}`,
          nickname,
          isHost: false,
          isLocal: false,
        }),
      ),
    ],
    activePlayerId: null,
    placementSlot: null,
    placementLocked: false,
    claims: [],
    passedIds: [],
    usedSongIds: [],
    secret: null,
    playback: IDLE_PLAYBACK,
    lastResult: null,
    notice: null,
  };
}

export function createDemo(nickname: string): GameState {
  const playlist = getPlaylist("decades");
  if (!playlist) throw new Error("Missing demo playlist");
  const you = cleanName(nickname) || "You";
  const names = ["Riley", "Sarah", "Tom", "Emma"].map((name) => uniqueName(name, [you]));
  return {
    version: 4,
    code: "DEMO",
    phase: "lobby",
    playlistId: playlist.id,
    playlistName: playlist.name,
    playlistSource: "sample",
    songs: playlistSongs(playlist),
    songIds: playlist.songIds,
    hostIsSimulated: true,
    roundNumber: 0,
    winMode: "target",
    targetCards: 5,
    maxRounds: 0,
    discarded: 0,
    hardMode: false,
    players: [
      makePlayer({ id: "host", nickname: names[0], isHost: true, isLocal: false }),
      makePlayer({ id: "you", nickname: you, isHost: false, isLocal: true }),
      ...names.slice(1).map((nickname, index) =>
        makePlayer({
          id: `guest-${index}`,
          nickname,
          isHost: false,
          isLocal: false,
        }),
      ),
    ],
    activePlayerId: null,
    placementSlot: null,
    placementLocked: false,
    claims: [],
    passedIds: [],
    usedSongIds: [],
    secret: null,
    playback: IDLE_PLAYBACK,
    lastResult: null,
    notice: null,
  };
}
