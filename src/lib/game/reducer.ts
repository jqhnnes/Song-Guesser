import { getPlaylist, getSong } from "./songs";
import { betweenLabel, chooseBotClaim, chooseBotSlot, insertCard, insertionIndex, maxGuessingRounds } from "./rules";
import { awardCard } from "./scoring";
import type { GameState, RoundResult, Song, TimelineCard } from "./types";

const IDLE_PLAYBACK = { status: "idle" as const, startedAt: null, elapsedMs: 0 };

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function cardFromSong(song: Song, order: number): TimelineCard {
  return {
    songId: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    year: song.year,
    accent: song.accent,
    image: song.image ?? null,
    order,
  };
}

function resolveSongs(state: GameState): Song[] {
  if (state.songs && state.songs.length > 0) return state.songs;
  const playlist = getPlaylist(state.playlistId);
  if (!playlist) return [];
  return playlist.songIds.flatMap((id) => {
    try {
      return [getSong(id)];
    } catch {
      return [];
    }
  });
}

function draw(state: GameState, used: string[]) {
  const pool = resolveSongs(state);
  if (pool.length === 0) return { song: null as Song | null, used, skipped: false };
  const ordered = shuffle(pool.filter((song) => !used.includes(song.id)));
  let skipped = false;
  const nextUsed = [...used];
  for (const song of ordered) {
    nextUsed.push(song.id);
    if (song.unavailable) {
      skipped = true;
      continue;
    }
    return { song, used: nextUsed, skipped };
  }
  return { song: null, used: nextUsed, skipped };
}

function activePlayer(state: GameState) {
  return state.players.find((player) => player.id === state.activePlayerId) ?? null;
}

function localPlayer(state: GameState) {
  return state.players.find((player) => player.isLocal) ?? null;
}

function freshTurn(state: GameState, roundNumber: number, secret: Song, used: string[], notice: string | null): GameState {
  const active = state.players[(roundNumber - 1) % state.players.length];
  return {
    ...state,
    phase: "turn_start",
    roundNumber,
    activePlayerId: active?.id ?? null,
    placementSlot: null,
    placementLocked: false,
    claims: [],
    passedIds: [],
    usedSongIds: used,
    secret,
    playback: IDLE_PLAYBACK,
    lastResult: null,
    notice,
  };
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START":
      return startGame(state);
    case "PLAY": {
      if (state.phase === "turn_start") {
        return {
          ...state,
          phase: "deciding",
          playback: { status: "playing", startedAt: Date.now(), elapsedMs: 0 },
        };
      }
      if (state.playback.status === "paused") {
        return {
          ...state,
          playback: {
            status: "playing",
            startedAt: Date.now(),
            elapsedMs: state.playback.elapsedMs,
          },
        };
      }
      return state;
    }
    case "PAUSE": {
      if (state.playback.status !== "playing" || state.playback.startedAt === null) return state;
      return {
        ...state,
        playback: {
          status: "paused",
          startedAt: null,
          elapsedMs: state.playback.elapsedMs + (Date.now() - state.playback.startedAt),
        },
      };
    }
    case "PLACE": {
      if (state.phase !== "deciding" || state.placementLocked) return state;
      const local = localPlayer(state);
      const active = activePlayer(state);
      if (!local || !active || local.id !== active.id) return state;
      if (action.slot < 0 || action.slot > active.timeline.length) return state;
      return { ...state, placementSlot: action.slot };
    }
    case "LOCK": {
      const local = localPlayer(state);
      const active = activePlayer(state);
      const withSlot =
        state.placementSlot === null && active && local?.id === active.id && active.timeline.length === 0
          ? { ...state, placementSlot: 0 }
          : state;
      return lockPlacement(withSlot, local?.id ?? "");
    }
    case "BOT_PLACE":
      return botPlace(state, action.playerId);
    case "CLAIM":
      return claimGap(state, localPlayer(state)?.id ?? "", action.slot);
    case "PASS":
      return passTurn(state, localPlayer(state)?.id ?? "");
    case "BOT_ACT":
      return botAct(state, action.playerId);
    case "REVEAL":
      return reveal(state);
    case "NEXT":
      return nextRound(state);
    case "AGAIN":
      return playAgain(state);
    case "DISMISS":
      return { ...state, notice: null };
    case "PLAYBACK_FAILED":
      return {
        ...state,
        notice: action.message || state.notice,
        playback:
          state.playback.status === "playing"
            ? {
                status: "paused",
                startedAt: null,
                elapsedMs:
                  state.playback.elapsedMs +
                  (state.playback.startedAt ? Date.now() - state.playback.startedAt : 0),
              }
            : state.playback,
      };
    default:
      return state;
  }
}

function lockPlacement(state: GameState, playerId: string): GameState {
  if (state.phase !== "deciding" || state.placementLocked || state.placementSlot === null) return state;
  if (playerId !== state.activePlayerId) return state;
  const active = activePlayer(state);
  if (!active || state.placementSlot > active.timeline.length) return state;
  return { ...state, phase: "challenge", placementLocked: true };
}

function botPlace(state: GameState, playerId: string): GameState {
  if (state.phase !== "deciding" || state.placementLocked || !state.secret) return state;
  const player = state.players.find((item) => item.id === playerId);
  if (!player || player.isLocal || player.id !== state.activePlayerId || player.timeline.length === 0) return state;
  const slot = chooseBotSlot(
    player.timeline.map((card) => card.year),
    state.secret.year,
  );
  return lockPlacement({ ...state, placementSlot: slot }, player.id);
}

function alreadyAnswered(state: GameState, playerId: string) {
  return state.passedIds.includes(playerId) || state.claims.some((claim) => claim.playerId === playerId);
}

function claimGap(state: GameState, playerId: string, slot: number): GameState {
  if (state.phase !== "challenge" || !state.placementLocked || state.placementSlot === null) return state;
  const active = activePlayer(state);
  const player = state.players.find((item) => item.id === playerId);
  if (!active || !player || player.id === active.id || alreadyAnswered(state, player.id)) return state;
  if (slot === state.placementSlot || slot < 0 || slot > active.timeline.length) return state;
  if (state.claims.some((claim) => claim.slot === slot)) return state;
  return { ...state, claims: [...state.claims, { playerId: player.id, slot }] };
}

function passTurn(state: GameState, playerId: string): GameState {
  if (state.phase !== "challenge") return state;
  const player = state.players.find((item) => item.id === playerId);
  if (!player || player.id === state.activePlayerId || alreadyAnswered(state, player.id)) return state;
  return { ...state, passedIds: [...state.passedIds, player.id] };
}

function botAct(state: GameState, playerId: string): GameState {
  if (state.phase !== "challenge" || !state.secret || state.placementSlot === null) return state;
  const active = activePlayer(state);
  const player = state.players.find((item) => item.id === playerId);
  if (!active || !player || player.isLocal || player.id === active.id) return state;
  const choice = chooseBotClaim(
    active.timeline.map((card) => card.year),
    state.secret.year,
    state.placementSlot,
    state.claims.map((claim) => claim.slot),
  );
  if (choice === "pass") return passTurn(state, player.id);
  return claimGap(state, player.id, choice);
}

function startGame(state: GameState): GameState {
  if (state.phase !== "lobby") return state;
  const songs = resolveSongs(state);
  if (songs.length === 0) return { ...state, notice: "That playlist disappeared." };
  const available = songs.filter((song) => !song.unavailable).length;
  const needed = state.winMode === "rounds" ? state.maxRounds : state.targetCards;
  if (available < needed) {
    return {
      ...state,
      notice: `This crate only has ${maxGuessingRounds(available)} songs.`,
    };
  }
  if (state.players.length < 2) {
    return { ...state, notice: "Wait for at least one more player." };
  }

  const secretDraw = draw(state, []);
  if (!secretDraw.song) return { ...state, notice: "No playable songs in this crate." };
  const players = state.players.map((player) => ({ ...player, timeline: [], cardsWonAsActive: 0 }));

  return freshTurn(
    { ...state, players, discarded: 0 },
    1,
    secretDraw.song,
    secretDraw.used,
    secretDraw.skipped ? "An unavailable song was skipped." : null,
  );
}

function reveal(state: GameState): GameState {
  const active = activePlayer(state);
  const firstCard = state.phase === "deciding" && active !== null && active.timeline.length === 0;
  if (firstCard) {
    state = { ...state, placementSlot: 0, placementLocked: true };
  }
  if ((!firstCard && state.phase !== "challenge") || !state.secret || !state.placementLocked || state.placementSlot === null) {
    return state;
  }
  if (!active) return state;
  const years = active.timeline.map((card) => card.year);
  const song = state.secret;
  const decision = awardCard({
    players: state.players,
    activePlayerId: active.id,
    years,
    slot: state.placementSlot,
    year: song.year,
    claims: state.claims,
  });
  const ownerId = decision.award.type === "discarded" ? null : decision.award.playerId;
  const owner = state.players.find((player) => player.id === ownerId) ?? null;
  const card = cardFromSong(song, state.roundNumber);
  const insertedAt = insertionIndex(active.timeline, song.year, state.roundNumber);

  return {
    ...state,
    phase: "round_results",
    secret: null,
    discarded: state.discarded + (ownerId ? 0 : 1),
    playback: IDLE_PLAYBACK,
    players: state.players.map((player) => {
      const wonActive = decision.award.type === "active" && player.id === active.id;
      const next = {
        ...player,
        cardsWonAsActive: player.cardsWonAsActive + (wonActive ? 1 : 0),
      };
      if (player.id !== ownerId) return next;
      return { ...next, timeline: insertCard(player.timeline, card) };
    }),
    lastResult: {
      song: {
        title: song.title,
        artist: song.artist,
        album: song.album,
        year: song.year,
        accent: song.accent,
        image: song.image ?? null,
      },
      correctLabel: years.length === 0 ? "First card" : betweenLabel(active.timeline, insertedAt),
      placement: insertCard(active.timeline, card),
      placedSongId: card.songId,
      timelineName: active.nickname,
      rows: decision.rows,
      award: decision.award.type,
      ownerId,
      ownerName: owner?.nickname ?? null,
    } satisfies RoundResult,
  };
}

function targetReached(state: GameState) {
  return state.winMode === "target" && state.players.some((player) => player.timeline.length >= state.targetCards);
}

function nextRound(state: GameState): GameState {
  if (state.phase !== "round_results") return state;
  if (targetReached(state) || (state.winMode === "rounds" && state.roundNumber >= state.maxRounds)) {
    return { ...state, phase: "game_over", secret: null, playback: IDLE_PLAYBACK };
  }
  const drawn = draw(state, state.usedSongIds);
  if (!drawn.song) {
    return {
      ...state,
      phase: "game_over",
      secret: null,
      notice: "The crate ran out of songs.",
    };
  }
  return freshTurn(
    state,
    state.roundNumber + 1,
    drawn.song,
    drawn.used,
    drawn.skipped ? "An unavailable song was skipped." : null,
  );
}

function playAgain(state: GameState): GameState {
  const reset: GameState = {
    ...state,
    phase: "lobby",
    roundNumber: 0,
    players: state.players.map((player) => ({ ...player, timeline: [], cardsWonAsActive: 0 })),
    discarded: 0,
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
  return state.hostIsSimulated ? startGame(reset) : reset;
}

export type GameAction =
  | { type: "START" }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "PLACE"; slot: number }
  | { type: "LOCK" }
  | { type: "BOT_PLACE"; playerId: string }
  | { type: "CLAIM"; slot: number }
  | { type: "PASS" }
  | { type: "BOT_ACT"; playerId: string }
  | { type: "REVEAL" }
  | { type: "NEXT" }
  | { type: "AGAIN" }
  | { type: "DISMISS" }
  | { type: "PLAYBACK_FAILED"; message: string };
