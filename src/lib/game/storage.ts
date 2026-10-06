import { PHASES, type GameState } from "./types";

const KEY = "music-timeline-game-v4";

export function loadGame(): GameState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    if (!data || data.version !== 4 || !PHASES.includes(data.phase) || !data.code) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState | null) {
  try {
    if (!state) {
      sessionStorage.removeItem(KEY);
      return;
    }
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode can refuse storage. The table still runs for this visit.
  }
}
