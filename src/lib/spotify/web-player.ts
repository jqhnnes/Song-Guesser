"use client";

type SdkPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  activateElement: () => Promise<void>;
  addListener: (event: string, callback: (payload: { device_id?: string; message?: string }) => void) => void;
};

type SpotifySdk = {
  Player: new (options: {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume: number;
  }) => SdkPlayer;
};

declare global {
  interface Window {
    Spotify?: SpotifySdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export class PlaybackError extends Error {
  reason: "premium" | "unauthorized" | "device" | "scope" | "spotify";

  constructor(reason: PlaybackError["reason"]) {
    super(reason);
    this.reason = reason;
  }
}

let player: SdkPlayer | null = null;
let deviceId: string | null = null;
let connecting: Promise<string> | null = null;

/** Call from the Play click so the browser allows sound. */
export function primePlayback() {
  if (!player) return;
  void player.activateElement().catch(() => undefined);
}

export function ensureDevice() {
  if (deviceId) return Promise.resolve(deviceId);
  if (!connecting) {
    connecting = connect().catch((error: unknown) => {
      connecting = null;
      throw error;
    });
  }
  return connecting;
}

export async function playSpotifyTrack(trackId: string) {
  primePlayback();
  const id = await ensureDevice();
  primePlayback();
  return command({ action: "play", deviceId: id, trackId });
}

export async function resumeSpotify() {
  if (!deviceId) throw new PlaybackError("device");
  primePlayback();
  return command({ action: "resume", deviceId });
}

export async function pauseSpotify() {
  if (!deviceId) return;
  await command({ action: "pause", deviceId }).catch(() => undefined);
}

async function connect() {
  await loadSdk();
  const sdk = window.Spotify;
  if (!sdk) throw new PlaybackError("device");

  const next = new sdk.Player({
    name: "Music Timeline",
    volume: 0.8,
    getOAuthToken: (callback) => {
      void accessToken()
        .then(callback)
        .catch(() => callback(""));
    },
  });

  const id = await new Promise<string>((resolve, reject) => {
    let settled = false;
    let timer = 0;
    const done = (error?: PlaybackError, value?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (error || !value) {
        next.disconnect();
        reject(error ?? new PlaybackError("device"));
        return;
      }
      resolve(value);
    };
    timer = window.setTimeout(() => done(new PlaybackError("device")), 12000);
    next.addListener("ready", ({ device_id }) => done(undefined, device_id));
    next.addListener("authentication_error", () => done(new PlaybackError("unauthorized")));
    next.addListener("account_error", () => done(new PlaybackError("premium")));
    next.addListener("initialization_error", () => done(new PlaybackError("device")));
    void next.connect().then((connected) => {
      if (!connected) done(new PlaybackError("device"));
    });
  });

  player = next;
  deviceId = id;
  return id;
}

function loadSdk() {
  if (window.Spotify) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const previous = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      previous?.();
      resolve();
    };
    if (document.querySelector("script[data-spotify-sdk]")) return;
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.dataset.spotifySdk = "true";
    script.onerror = () => reject(new PlaybackError("device"));
    document.head.appendChild(script);
  });
}

async function accessToken() {
  const response = await fetch("/api/spotify/token", { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as { accessToken?: string } | null;
  if (!response.ok || !body?.accessToken) throw new PlaybackError("unauthorized");
  return body.accessToken;
}

async function command(payload: { action: "play" | "pause" | "resume"; deviceId: string; trackId?: string }) {
  const response = await fetch("/api/spotify/playback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
  if (!response.ok || !body?.ok) {
    throw new PlaybackError(knownReason(body?.reason));
  }
  return { ok: true as const };
}

function knownReason(reason: string | undefined): PlaybackError["reason"] {
  if (reason === "premium" || reason === "unauthorized" || reason === "scope" || reason === "device" || reason === "spotify") {
    return reason;
  }
  return "spotify";
}
