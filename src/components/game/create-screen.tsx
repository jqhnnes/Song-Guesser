"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useGame } from "@/components/game/provider";
import { Button, Cover, Screen } from "@/components/ui";
import { getPlaylist, PLAYLISTS, playableSongs, playlistSongs, yearSpan } from "@/lib/game/songs";
import { clampRounds, maxGuessingRounds } from "@/lib/game/rules";
import type { Song } from "@/lib/game/types";
import { cn } from "@/lib/cn";

const ROUND_CHOICES = [5, 10, 15, 20];

type Library = "sample" | "spotify";

type Session = {
  configured: boolean;
  connected: boolean;
  displayName?: string;
  product?: string;
  redirectUri?: string;
  reason?: string;
};

type RemotePlaylist = {
  id: string;
  name: string;
  description: string;
  trackCount: number | null;
  image: string | null;
};

export function CreateScreen({
  spotifyStatus,
  returnedName,
}: {
  spotifyStatus: string;
  returnedName: string;
}) {
  const router = useRouter();
  const { createGame } = useGame();
  const [step, setStep] = useState(spotifyStatus ? 1 : 0);
  const [name, setName] = useState(returnedName);
  const [library, setLibrary] = useState<Library>(spotifyStatus === "connected" ? "spotify" : "sample");
  const [playlistId, setPlaylistId] = useState(PLAYLISTS[0].id);
  const [rounds, setRounds] = useState(10);
  const [custom, setCustom] = useState(false);
  const [winMode, setWinMode] = useState<"target" | "rounds">("target");
  const [playerCount, setPlayerCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [remotePlaylists, setRemotePlaylists] = useState<RemotePlaylist[]>([]);
  const [spotifySongs, setSpotifySongs] = useState<Song[] | null>(null);
  const [spotifyPlaylistName, setSpotifyPlaylistName] = useState("");
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [spotifyError, setSpotifyError] = useState(initialSpotifyError(spotifyStatus));
  const [crateNote, setCrateNote] = useState("");

  const samplePlaylist = getPlaylist(playlistId) ?? PLAYLISTS[0];
  const activeSongs =
    library === "spotify"
      ? (spotifySongs ?? []).filter((song) => !song.unavailable)
      : playableSongs(samplePlaylist);
  const roundCap = maxGuessingRounds(activeSongs.length);
  const nickname = name.trim();
  const spotifyReady = library === "spotify" && (spotifySongs?.length ?? 0) > 0;

  const canContinue =
    (step === 0 && nickname.length > 0) ||
    step === 1 ||
    (step === 2 && (library === "sample" || spotifyReady)) ||
    (step === 3 && nickname.length > 0 && rounds >= 1 && rounds <= roundCap && (library === "sample" || spotifyReady));

  useEffect(() => {
    if (!spotifyStatus) return;
    window.history.replaceState({}, "", "/create");
  }, [spotifyStatus]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = (await fetch("/api/spotify/session", { cache: "no-store" }).then((response) =>
        response.json(),
      )) as Session;
      if (cancelled) return;
      setSession(next);
      if (!next.connected) return;
      const payload = (await fetch("/api/spotify/playlists", { cache: "no-store" }).then((response) =>
        response.json(),
      )) as { playlists?: RemotePlaylist[]; reason?: string };
      if (cancelled) return;
      if (payload.reason === "forbidden") {
        setSpotifyError("forbidden");
        return;
      }
      setRemotePlaylists(payload.playlists ?? []);
      if (spotifyStatus === "connected") setStep(2);
    })();
    return () => {
      cancelled = true;
    };
  }, [spotifyStatus]);

  function connectSpotify(fresh = false) {
    const port = window.location.port || "3000";
    const freshQuery = fresh ? "&fresh=1" : "";
    window.location.href = `http://127.0.0.1:${port}/api/spotify/login?name=${encodeURIComponent(nickname)}${freshQuery}`;
  }

  async function chooseRemote(playlist: RemotePlaylist) {
    setPlaylistId(playlist.id);
    setSpotifyPlaylistName(playlist.name);
    setLoadingSongs(true);
    setSpotifyError("");
    setCrateNote("");
    const response = await fetch(`/api/spotify/playlists/${playlist.id}`, { cache: "no-store" });
    const body = (await response.json()) as { songs?: Song[]; truncated?: boolean; reason?: string };
    setLoadingSongs(false);
    if (!response.ok || !body.songs) {
      setSpotifySongs(null);
      setSpotifyError(body.reason === "forbidden" ? "forbidden" : "Couldn't read that playlist.");
      return;
    }
    setSpotifySongs(body.songs);
    if (body.truncated) setCrateNote("Using the first 100 songs that have a release year.");
    const cap = maxGuessingRounds(body.songs.filter((song) => !song.unavailable).length);
    if (rounds > cap) {
      setRounds(Math.min(10, Math.max(cap, 1)));
      setCustom(false);
    }
  }

  async function disconnect() {
    await fetch("/api/spotify/logout", { method: "POST" });
    setSession((current) => (current ? { ...current, connected: false } : current));
    setLibrary("sample");
    setSpotifySongs(null);
    setRemotePlaylists([]);
  }

  async function finish() {
    if (!nickname) {
      setStep(0);
      return;
    }
    const songs = library === "spotify" ? (spotifySongs ?? []) : playlistSongs(samplePlaylist);
    if (rounds > maxGuessingRounds(songs.filter((song) => !song.unavailable).length)) return;
    setBusy(true);
    await wait(400);
    const code = createGame({
      nickname,
      playlistId,
      playlistName: library === "spotify" ? spotifyPlaylistName : samplePlaylist.name,
      songs,
      winMode,
      targetCards: winMode === "target" ? rounds : 10,
      maxRounds: winMode === "rounds" ? rounds : 0,
      playerCount,
      playlistSource: library,
    });
    router.push(`/g/${code}`);
  }

  function next() {
    if (step === 1) {
      setLibrary(session?.connected ? "spotify" : "sample");
      setStep(2);
      return;
    }
    if (step < 3) setStep(step + 1);
    else void finish();
  }

  const continueLabel =
    busy
      ? "Setting the table…"
      : step === 3
        ? "Create game"
        : step === 1 && session?.connected
          ? "Use my playlists"
          : step === 1
            ? "Use sample crates"
            : "Continue";

  return (
    <div className="relative h-full">
      <Screen
        header={
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm font-semibold text-mute"
              onClick={() => (step === 0 ? router.push("/") : setStep(step - 1))}
            >
              Back
            </button>
            <p className="text-sm font-semibold text-mute">Step {step + 1} of 4</p>
          </div>
        }
        footer={
          <div className="pb-2">
            <Button onClick={next} disabled={!canContinue || busy || loadingSongs}>
              {loadingSongs && step === 2 ? "Reading the playlist…" : continueLabel}
            </Button>
          </div>
        }
      >
        <div className="rise pt-4" key={step}>
          {step === 0 ? (
            <>
              <h1 className="font-display text-4xl font-extrabold tracking-tight">What should we call you?</h1>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 16))}
                placeholder="Alex"
                className="mt-8 w-full rounded-3xl bg-panel px-5 py-5 text-2xl font-semibold outline-none ring-coral focus:ring-2"
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h1 className="font-display text-4xl font-extrabold tracking-tight">Where do the songs come from?</h1>
              <p className="mt-3 text-mute">
                Connect Spotify to use one of your playlists. The song plays in this browser, and the title stays hidden until the reveal.
              </p>
              {session?.connected ? (
                <div className="mt-6 rounded-3xl bg-panel p-4">
                  <p className="text-lg font-semibold">Connected as {session.displayName}</p>
                  <p className="mt-1 text-sm text-mute">
                    {session.product === "premium" ? "Spotify Premium" : "Spotify account"} · playlists are ready
                  </p>
                  <button type="button" onClick={() => void disconnect()} className="mt-3 text-sm font-semibold text-mute">
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => connectSpotify(false)}
                  className="mt-6 w-full rounded-3xl bg-panel p-4 text-left"
                >
                  <p className="text-lg font-semibold">Connect Spotify</p>
                  <p className="mt-1 text-sm text-mute">Opens Spotify&apos;s own login page.</p>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setLibrary("sample");
                  setStep(2);
                }}
                className="mt-3 w-full rounded-3xl border border-white/10 p-4 text-left"
              >
                <p className="text-lg font-semibold">Sample crates</p>
                <p className="mt-1 text-sm text-mute">Stand-in songs, if you want to skip login.</p>
              </button>
            </>
          ) : null}

          {step === 2 && library === "sample" ? (
            <>
              <h1 className="font-display text-4xl font-extrabold tracking-tight">Pick a crate</h1>
              <div className="mt-6 grid gap-3">
                {PLAYLISTS.map((item) => {
                  const songs = playableSongs(item);
                  const selected = item.id === playlistId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPlaylistId(item.id);
                        const cap = maxGuessingRounds(songs.length);
                        if (rounds > cap) {
                          setRounds(Math.min(10, cap));
                          setCustom(false);
                        }
                      }}
                      className={cn(
                        "rounded-3xl bg-panel p-4 text-left ring-2 ring-transparent",
                        selected && "ring-coral",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Cover label={item.name} accent={songs[0]?.accent} size={64} />
                        <div>
                          <p className="text-lg font-semibold">{item.name}</p>
                          <p className="text-sm text-mute">
                            {songs.length} songs · {yearSpan(item)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-mute">{item.description}</p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 2 && library === "spotify" ? (
            <>
              <h1 className="font-display text-4xl font-extrabold tracking-tight">Pick a playlist</h1>
              <p className="mt-3 text-mute">Release years come from the album date Spotify stores.</p>
              {crateNote ? <p className="mt-3 text-sm text-amber">{crateNote}</p> : null}
              {spotifySongs && spotifySongs.length === 0 ? (
                <p className="mt-3 text-sm text-rose">That playlist has no songs with a release year.</p>
              ) : null}
              <div className="mt-6 grid gap-3">
                {remotePlaylists.length === 0 ? (
                  <p className="rounded-3xl bg-panel p-4 text-mute">No playlists on this account yet.</p>
                ) : (
                  remotePlaylists.map((playlist) => {
                    const selected = playlist.id === playlistId && spotifySongs !== null;
                    return (
                      <button
                        key={playlist.id}
                        type="button"
                        onClick={() => void chooseRemote(playlist)}
                        className={cn(
                          "rounded-3xl bg-panel p-4 text-left ring-2 ring-transparent",
                          selected && "ring-coral",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {playlist.image ? (
                            <Image
                              src={playlist.image}
                              alt=""
                              width={64}
                              height={64}
                              className="h-16 w-16 rounded-2xl object-cover"
                            />
                          ) : (
                            <Cover label={playlist.name} size={64} />
                          )}
                          <div>
                            <p className="text-lg font-semibold">{playlist.name}</p>
                            <p className="text-sm text-mute">
                              {playlist.trackCount === null ? "Playlist" : `${playlist.trackCount} songs`}
                              {selected ? ` · ${spotifySongs?.length ?? 0} with a year` : ""}
                            </p>
                          </div>
                        </div>
                        {playlist.description ? (
                          <p className="mt-3 text-sm text-mute">{playlist.description}</p>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <Rounds
              cap={roundCap}
              rounds={rounds}
              custom={custom}
              winMode={winMode}
              playerCount={playerCount}
              onRounds={setRounds}
              onCustom={setCustom}
              onMode={setWinMode}
              onPlayers={setPlayerCount}
            />
          ) : null}
        </div>
      </Screen>

      {spotifyError ? (
        <div className="absolute inset-0 z-20 grid items-end bg-black/60 p-4">
          <div className="rise rounded-3xl bg-panel p-5">
            <h2 className="font-display text-3xl font-bold">
              {spotifyError === "setup"
                ? "Spotify app needed"
                : spotifyError === "forbidden"
                  ? "Account not allowed"
                  : "Spotify didn't connect"}
            </h2>
            <p className="mt-2 text-mute">{errorCopy(spotifyError, session?.redirectUri)}</p>
            {session?.redirectUri && spotifyError === "setup" ? (
              <p className="mt-3 break-all rounded-2xl bg-ink px-3 py-3 text-sm">{session.redirectUri}</p>
            ) : null}
            <div className="mt-5 grid gap-2">
              <Button
                onClick={() => {
                  setSpotifyError("");
                  setLibrary("sample");
                  setStep(2);
                }}
              >
                Use sample crates
              </Button>
              {spotifyError !== "setup" ? (
                <Button variant="ghost" onClick={() => connectSpotify(true)}>
                  Try again
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Rounds({
  cap,
  rounds,
  custom,
  winMode,
  playerCount,
  onRounds,
  onCustom,
  onMode,
  onPlayers,
}: {
  cap: number;
  rounds: number;
  custom: boolean;
  winMode: "target" | "rounds";
  playerCount: number;
  onRounds: (value: number) => void;
  onCustom: (value: boolean) => void;
  onMode: (mode: "target" | "rounds") => void;
  onPlayers: (count: number) => void;
}) {
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {winMode === "target" ? "First to how many cards?" : "How many rounds?"}
      </h1>
      <p className="mt-3 text-mute">
        This crate has {cap} songs.{" "}
        {winMode === "target"
          ? "The game ends when a collection hits the target."
          : "The biggest collection at the end wins."}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onMode("target")}
          className={cn("rounded-3xl bg-panel px-3 py-4 text-left", winMode === "target" && "ring-2 ring-coral")}
        >
          <p className="font-semibold">First to target</p>
          <p className="text-sm text-mute">Ends when a collection is full.</p>
        </button>
        <button
          type="button"
          onClick={() => onMode("rounds")}
          className={cn("rounded-3xl bg-panel px-3 py-4 text-left", winMode === "rounds" && "ring-2 ring-coral")}
        >
          <p className="font-semibold">Fixed rounds</p>
          <p className="text-sm text-mute">Most cards at the end wins.</p>
        </button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {ROUND_CHOICES.map((choice) => {
          const disabled = choice > cap;
          const selected = !custom && rounds === choice;
          return (
            <button
              key={choice}
              type="button"
              disabled={disabled}
              onClick={() => {
                onCustom(false);
                onRounds(choice);
              }}
              className={cn(
                "h-24 rounded-3xl bg-panel text-2xl font-bold disabled:opacity-35",
                selected && "ring-2 ring-coral",
              )}
            >
              {choice}
              {disabled ? <span className="mt-1 block text-xs font-medium text-mute">Need more songs</span> : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onCustom(true)}
          className={cn("h-24 rounded-3xl bg-panel text-2xl font-bold", custom && "ring-2 ring-coral")}
        >
          Custom
        </button>
      </div>
      {custom ? (
        <label className="mt-4 block">
          <span className="text-sm text-mute">{winMode === "target" ? "Cards" : "Rounds"}</span>
          <input
            inputMode="numeric"
            value={rounds}
            onChange={(event) => onRounds(clampRounds(Number(event.target.value)))}
            className="mt-2 w-full rounded-3xl bg-panel px-5 py-4 text-2xl font-semibold outline-none ring-coral focus:ring-2"
          />
          {rounds > cap ? (
            <span className="mt-2 block text-sm text-rose">This crate only has {cap} songs in it.</span>
          ) : null}
        </label>
      ) : null}
      <div className="mt-5 flex items-center justify-between rounded-3xl bg-panel px-4 py-4">
        <div>
          <p className="font-semibold">Players</p>
          <p className="text-sm text-mute">You, plus friends at the table.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="h-10 w-10 rounded-full bg-ink text-xl" onClick={() => onPlayers(Math.max(2, playerCount - 1))}>
            −
          </button>
          <span className="w-6 text-center text-xl font-bold">{playerCount}</span>
          <button type="button" className="h-10 w-10 rounded-full bg-ink text-xl" onClick={() => onPlayers(Math.min(8, playerCount + 1))}>
            +
          </button>
        </div>
      </div>
    </>
  );
}

function initialSpotifyError(status: string) {
  if (status === "denied") return "Spotify login was cancelled.";
  if (status === "error") return "Spotify couldn't finish signing in.";
  if (status === "setup") return "setup";
  return "";
}

function errorCopy(error: string, redirectUri?: string) {
  if (error === "setup") {
    return `Create an app at the Spotify developer dashboard, put the Client ID and Client Secret in .env.local, and add this exact redirect URI. Then restart the dev server. Open the site at 127.0.0.1, not localhost.`;
  }
  if (error === "forbidden") {
    return "Spotify refused this account. In Development Mode, open the app's User Management and add the account. Five users is the cap.";
  }
  if (error === "Spotify login was cancelled.") return "You can try again, or play with the sample crates.";
  if (redirectUri) return error;
  return error;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
