"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createDemo, createParty } from "@/lib/game/factory";
import { reduceGame, type GameAction } from "@/lib/game/reducer";
import { everyoneHasAnswered } from "@/lib/game/rules";
import { loadGame, saveGame } from "@/lib/game/storage";
import { toPlayerView } from "@/lib/game/view";
import type { GameState, PlayerView, Song } from "@/lib/game/types";
import { haptic, playLock, playReveal, playTap, unlockAudio } from "@/lib/feedback";
import { ensureDevice, pauseSpotify, PlaybackError, playSpotifyTrack, primePlayback, resumeSpotify } from "@/lib/spotify/web-player";
import { Splash } from "@/components/ui";

type Action = GameAction | { type: "SET"; state: GameState } | { type: "LEAVE" };

type GameApi = {
  ready: boolean;
  game: PlayerView | null;
  offline: boolean;
  createGame: (input: {
    nickname: string;
    playlistId: string;
    playlistName: string;
    songs: Song[];
    winMode?: "target" | "rounds";
    targetCards?: number;
    maxRounds: number;
    playerCount?: number;
    playlistSource?: "sample" | "spotify";
  }) => string;
  joinDemo: (nickname: string) => void;
  start: () => void;
  play: () => void;
  pause: () => void;
  place: (slot: number) => void;
  lock: () => void;
  claim: (slot: number) => void;
  pass: () => void;
  reveal: () => void;
  next: () => void;
  again: () => void;
  leave: () => void;
  dismiss: () => void;
};

const GameContext = createContext<GameApi | null>(null);

function reducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === "SET") return action.state;
  if (action.type === "LEAVE") return null;
  if (!state) return state;
  return reduceGame(state, action);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [needsPlayback, setNeedsPlayback] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const saved = loadGame();
    if (saved) dispatch({ type: "SET", state: saved });
    const timer = window.setTimeout(() => setReady(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveGame(state);
  }, [ready, state]);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!state?.notice) return;
    const timer = window.setTimeout(() => dispatch({ type: "DISMISS" }), 4200);
    return () => window.clearTimeout(timer);
  }, [state?.notice]);

  useEffect(() => {
    const current = stateRef.current;
    if (!current || current.phase !== "deciding" || current.placementLocked) return;
    const active = current.players.find((player) => player.id === current.activePlayerId);
    if (!active || active.isLocal) return;
    const timer = window.setTimeout(() => dispatch({ type: "BOT_PLACE", playerId: active.id }), 1400);
    return () => window.clearTimeout(timer);
  }, [state?.phase, state?.roundNumber, state?.code, state?.placementLocked]);

  useEffect(() => {
    const current = stateRef.current;
    if (!current || current.phase !== "challenge") return;
    const bots = current.players.filter((player) => !player.isLocal && player.id !== current.activePlayerId);
    const timers = bots.map((player, index) =>
      window.setTimeout(
        () => dispatch({ type: "BOT_ACT", playerId: player.id }),
        5000 + index * 2200,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [state?.phase, state?.roundNumber, state?.code]);

  const tableReady =
    state?.phase === "challenge" &&
    state.activePlayerId !== null &&
    everyoneHasAnswered({
      playerIds: state.players.map((player) => player.id),
      activePlayerId: state.activePlayerId,
      passedIds: state.passedIds,
      claimPlayerIds: state.claims.map((claim) => claim.playerId),
    });

  useEffect(() => {
    if (!tableReady) return;
    const timer = window.setTimeout(() => {
      playReveal();
      dispatch({ type: "REVEAL" });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [tableReady, state?.roundNumber]);

  const firstCard =
    state?.phase === "deciding" &&
    state.playback.status === "playing" &&
    (state.players.find((player) => player.id === state.activePlayerId)?.timeline.length ?? 1) === 0;

  useEffect(() => {
    if (!firstCard) return;
    const timer = window.setTimeout(() => {
      playReveal();
      dispatch({ type: "REVEAL" });
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [firstCard, state?.roundNumber]);

  useEffect(() => {
    const current = stateRef.current;
    if (!current?.hostIsSimulated) return;
    let delay = 0;
    let type: GameAction["type"] | null = null;
    if (current.phase === "lobby") {
      delay = 1800;
      type = "START";
    } else if (current.phase === "turn_start") {
      delay = 900;
      type = "PLAY";
    } else if (current.phase === "round_results") {
      delay = 4600;
      type = "NEXT";
    }
    if (!type) return;
    const timer = window.setTimeout(() => dispatch({ type }), delay);
    return () => window.clearTimeout(timer);
  }, [state?.hostIsSimulated, state?.phase, state?.roundNumber, state?.code]);

  const spotifyHost = state?.playlistSource === "spotify" && !state.hostIsSimulated;
  const gameCode = state?.code ?? "";
  useEffect(() => {
    if (!spotifyHost) return;
    let cancelled = false;
    void fetch("/api/spotify/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { connected?: boolean; playback?: boolean }) => {
        if (!cancelled) setNeedsPlayback(Boolean(data.connected) && data.playback !== true);
      })
      .catch(() => undefined);
    void ensureDevice().catch((error: unknown) => {
      if (cancelled) return;
      if (error instanceof PlaybackError && (error.reason === "scope" || error.reason === "unauthorized")) {
        setNeedsPlayback(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [spotifyHost, gameCode]);

  const game = useMemo(() => (state ? toPlayerView(state) : null), [state]);

  const createGame = useCallback((input: {
    nickname: string;
    playlistId: string;
    playlistName: string;
    songs: Song[];
    winMode?: "target" | "rounds";
    targetCards?: number;
    maxRounds: number;
    playerCount?: number;
    playlistSource?: "sample" | "spotify";
  }) => {
    const next = createParty(input);
    dispatch({ type: "SET", state: next });
    playTap();
    return next.code;
  }, []);

  const api = useMemo<GameApi>(
    () => ({
      ready,
      game,
      offline,
      createGame,
      joinDemo: (nickname) => {
        dispatch({ type: "SET", state: createDemo(nickname) });
        playTap();
      },
      start: () => {
        playTap();
        dispatch({ type: "START" });
      },
      play: () => {
        playTap();
        const current = stateRef.current;
        primePlayback();
        dispatch({ type: "PLAY" });
        if (!current || current.hostIsSimulated || current.playlistSource !== "spotify") return;
        const trackId = current.secret?.id;
        if (!trackId) return;
        const start =
          current.phase === "turn_start"
            ? playSpotifyTrack(trackId)
            : current.playback.status === "paused"
              ? resumeSpotify().catch(() => playSpotifyTrack(trackId))
              : null;
        if (start) void start.catch((error: unknown) => reportPlayback(error, dispatch, setNeedsPlayback));
      },
      pause: () => {
        if (stateRef.current?.playlistSource === "spotify") void pauseSpotify();
        dispatch({ type: "PAUSE" });
      },
      place: (slot) => {
        haptic(8);
        dispatch({ type: "PLACE", slot });
      },
      lock: () => {
        playLock();
        dispatch({ type: "LOCK" });
      },
      claim: (slot) => {
        playLock();
        dispatch({ type: "CLAIM", slot });
      },
      pass: () => dispatch({ type: "PASS" }),
      reveal: () => {
        playReveal();
        dispatch({ type: "REVEAL" });
      },
      next: () => {
        playTap();
        if (stateRef.current?.playlistSource === "spotify") void pauseSpotify();
        dispatch({ type: "NEXT" });
      },
      again: () => {
        playTap();
        if (stateRef.current?.playlistSource === "spotify") void pauseSpotify();
        dispatch({ type: "AGAIN" });
      },
      leave: () => {
        if (stateRef.current?.playlistSource === "spotify") void pauseSpotify();
        dispatch({ type: "LEAVE" });
      },
      dismiss: () => dispatch({ type: "DISMISS" }),
    }),
    [createGame, game, offline, ready],
  );

  return (
    <GameContext.Provider value={api}>
      <div className="relative h-full min-h-0">
        {ready ? children : <Splash />}
        {offline ? (
          <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-30 px-3">
            <p className="rounded-full bg-amber px-4 py-2 text-center text-sm font-semibold text-ink">
              You&apos;re offline. This preview keeps running.
            </p>
          </div>
        ) : null}
        {needsPlayback || state?.notice ? (
          <div className="safe-top absolute inset-x-0 top-0 z-30 grid gap-2 px-3">
            {needsPlayback && state ? (
              <a
                href={`/api/spotify/login?fresh=1&return=${encodeURIComponent(`/g/${state.code}`)}`}
                className="rounded-2xl bg-amber px-4 py-3 text-sm font-semibold text-ink"
              >
                Allow Spotify to play audio on this browser
              </a>
            ) : null}
            {state?.notice ? (
              <button
                type="button"
                onClick={() => dispatch({ type: "DISMISS" })}
                className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-left text-sm shadow-xl"
              >
                {state.notice}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </GameContext.Provider>
  );
}

function reportPlayback(
  error: unknown,
  dispatch: (action: { type: "PLAYBACK_FAILED"; message: string }) => void,
  allow: (value: boolean) => void,
) {
  const reason = error instanceof PlaybackError ? error.reason : "spotify";
  if (reason === "scope" || reason === "unauthorized") allow(true);
  dispatch({
    type: "PLAYBACK_FAILED",
    message:
      reason === "scope" || reason === "unauthorized"
        ? ""
        : reason === "premium"
          ? "Spotify Premium is required to play the song in this browser."
          : reason === "device"
            ? "This browser couldn't open the Spotify player. Use Chrome on this computer, then press Play again."
            : "Spotify couldn't start the song.",
  });
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGame must be used inside GameProvider");
  return value;
}
