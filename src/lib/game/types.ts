export const PHASES = [
  "lobby",
  "turn_start",
  "deciding",
  "challenge",
  "round_results",
  "game_over",
] as const;

export type Phase = (typeof PHASES)[number];

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  accent: string;
  image?: string | null;
  unavailable?: boolean;
};

export type Playlist = {
  id: string;
  name: string;
  description: string;
  songIds: string[];
};

export type TimelineCard = {
  songId: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  accent: string;
  image: string | null;
  order: number;
};

export type Player = {
  id: string;
  nickname: string;
  isHost: boolean;
  isLocal: boolean;
  connected: boolean;
  timeline: TimelineCard[];
  /** Cards this player won on a turn where they were the one placing. Tie-break only. */
  cardsWonAsActive: number;
};

export type Playback = {
  status: "idle" | "playing" | "paused";
  startedAt: number | null;
  elapsedMs: number;
};

export type ResultRow = {
  playerId: string;
  nickname: string;
  isCorrect: boolean;
  relation: "placed" | "missed" | "challenge" | "off" | "agreed";
};

export type PublicSong = {
  title: string;
  artist: string;
  album: string;
  year: number;
  accent: string;
  image: string | null;
};

export type RoundResult = {
  song: PublicSong;
  correctLabel: string;
  /** The timeline everyone was placing on, with this song in its sorted spot. */
  placement: TimelineCard[];
  placedSongId: string;
  timelineName: string;
  rows: ResultRow[];
  award: "active" | "challenger" | "discarded";
  ownerId: string | null;
  ownerName: string | null;
};

export type GapClaim = {
  playerId: string;
  slot: number;
};

export type GameState = {
  version: 4;
  code: string;
  phase: Phase;
  playlistId: string;
  playlistName: string;
  playlistSource?: "sample" | "spotify";
  /** Resolved crate. Spotify playlists store their tracks here. Sample games can omit it. */
  songs?: Song[];
  songIds: string[];
  hostIsSimulated: boolean;
  roundNumber: number;
  /** "rounds" plays this many turns. "target" ignores it and ends when a collection is full. */
  winMode: "target" | "rounds";
  targetCards: number;
  maxRounds: number;
  discarded: number;
  hardMode: boolean;
  players: Player[];
  activePlayerId: string | null;
  /** Gap on the active timeline. Hidden from other players until placementLocked. */
  placementSlot: number | null;
  placementLocked: boolean;
  /** One player per gap. The active player's gap is never in this list. */
  claims: GapClaim[];
  passedIds: string[];
  usedSongIds: string[];
  /** Current answer. Stripped by toPlayerView until reveal copies it into lastResult. */
  secret: Song | null;
  playback: Playback;
  lastResult: RoundResult | null;
  notice: string | null;
};

export type PublicPlayer = {
  id: string;
  nickname: string;
  isHost: boolean;
  isLocal: boolean;
  cards: number;
  activeWins: number;
  connected: boolean;
  timeline: TimelineCard[];
};

export type SideClaim = {
  playerId: string;
  nickname: string;
};

export type PlayerView = {
  code: string;
  phase: Phase;
  playlistName: string;
  playlistSource: "sample" | "spotify";
  playlistSongCount: number;
  roundNumber: number;
  winMode: "target" | "rounds";
  targetCards: number;
  maxRounds: number;
  discarded: number;
  hostIsSimulated: boolean;
  active: {
    id: string;
    nickname: string;
    isYou: boolean;
    timeline: TimelineCard[];
  } | null;
  you: {
    id: string;
    nickname: string;
    isHost: boolean;
    cards: number;
    isActive: boolean;
    slot: number | null;
    passed: boolean;
    /** Gap this player claimed. Null when they have not challenged. */
    claim: number | null;
  };
  /** Present only after the active player locks. The song title is still absent. */
  placement: {
    slot: number;
    claims: Array<SideClaim & { slot: number }>;
  } | null;
  /** Nicknames still choosing a gap or agreeing, during the challenge phase. */
  pending: string[];
  players: PublicPlayer[];
  playback: Playback;
  result: RoundResult | null;
  notice: string | null;
  canControl: boolean;
};
