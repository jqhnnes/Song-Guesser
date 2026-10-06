import type { GameState, PlayerView, SideClaim } from "./types";

export function toPlayerView(state: GameState): PlayerView {
  const you = state.players.find((player) => player.isLocal) ?? state.players[0];
  const active = state.players.find((player) => player.id === state.activePlayerId) ?? null;
  const placement =
    state.placementLocked && state.placementSlot !== null && active
      ? {
          slot: state.placementSlot,
          claims: state.claims.flatMap((claim) => {
            const named = namedClaim(state, claim.playerId);
            return named ? [{ ...named, slot: claim.slot }] : [];
          }),
        }
      : null;
  const yourClaim = state.claims.find((claim) => claim.playerId === you.id)?.slot ?? null;

  return {
    code: state.code,
    phase: state.phase,
    playlistName: state.playlistName,
    playlistSource: state.playlistSource ?? "sample",
    playlistSongCount: state.songs?.length || state.songIds.length,
    roundNumber: state.roundNumber,
    winMode: state.winMode,
    targetCards: state.targetCards,
    maxRounds: state.maxRounds,
    discarded: state.discarded,
    hostIsSimulated: state.hostIsSimulated,
    active: active
      ? {
          id: active.id,
          nickname: active.nickname,
          isYou: active.id === you.id,
          timeline: active.timeline,
        }
      : null,
    you: {
      id: you.id,
      nickname: you.nickname,
      isHost: you.isHost,
      cards: you.timeline.length,
      isActive: you.id === state.activePlayerId,
      slot: you.id === state.activePlayerId && state.phase === "deciding" ? state.placementSlot : null,
      passed: state.passedIds.includes(you.id),
      claim: yourClaim,
    },
    placement,
    pending:
      state.phase === "challenge"
        ? state.players
            .filter(
              (player) =>
                player.id !== state.activePlayerId &&
                !state.passedIds.includes(player.id) &&
                !state.claims.some((claim) => claim.playerId === player.id),
            )
            .map((player) => player.nickname)
        : [],
    players: state.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      isHost: player.isHost,
      isLocal: player.isLocal,
      cards: player.timeline.length,
      activeWins: player.cardsWonAsActive,
      connected: player.connected,
      timeline: player.timeline,
    })),
    playback: state.playback,
    result: state.phase === "round_results" ? state.lastResult : null,
    notice: state.notice,
    canControl: you.isHost && !state.hostIsSimulated,
  };
}

function namedClaim(state: GameState, playerId: string): SideClaim | null {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return null;
  return { playerId: player.id, nickname: player.nickname };
}
