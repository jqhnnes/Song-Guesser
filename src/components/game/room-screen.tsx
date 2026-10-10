"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { newestSlots, SongOnLine, Timeline, TimelineTrack } from "@/components/game/timeline";
import { useGame } from "@/components/game/provider";
import {
  Avatar,
  Button,
  ChipStack,
  Cover,
  Equalizer,
  Modal,
  Screen,
  formatTime,
} from "@/components/ui";
import { playWin } from "@/lib/feedback";
import { cn } from "@/lib/cn";
import type { Playback, PlayerView, PublicPlayer, ResultRow, TimelineCard } from "@/lib/game/types";

export function RoomScreen({ code }: { code: string }) {
  const { ready, game } = useGame();
  if (!ready) return null;
  if (!game || game.code !== code) return <Missing code={code} />;
  if (game.phase === "lobby") return <Lobby game={game} />;
  if (game.phase === "game_over") return <GameOver game={game} />;
  if (game.phase === "round_results") return <Results game={game} />;
  if (game.phase === "turn_start") return <TurnStart game={game} />;
  if (game.phase === "deciding" && (game.active?.timeline.length ?? 0) === 0) return <FirstCard game={game} />;
  if (game.phase === "deciding" && game.you.isActive) return <ActiveTurn game={game} />;
  if (game.phase === "deciding") return <WatchTurn game={game} />;
  if (game.phase === "challenge" && !game.you.isActive) return <ChallengeTurn game={game} />;
  return <WatchChallenge game={game} />;
}

function Missing({ code }: { code: string }) {
  return (
    <Screen
      footer={
        <div className="grid gap-2 pb-2">
          <Button href="/join">Join with a code</Button>
          <Button href="/" variant="secondary">
            Home
          </Button>
        </div>
      }
    >
      <div className="rise pt-16">
        <p className="text-sm font-semibold tracking-[0.16em] text-amber">ROOM {code}</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold">This table isn&apos;t on this phone.</h1>
        <p className="mt-3 text-mute">
          Create a game here, or join DEMO to play the guest view.
        </p>
      </div>
    </Screen>
  );
}

function Lobby({ game }: { game: PlayerView }) {
  const router = useRouter();
  const { start, leave } = useGame();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  async function share() {
    const text = `Join my Timeline game: ${game.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Music Timeline", text });
        return;
      } catch {
        // The player dismissed the sheet. Fall through to copy.
      }
    }
    await navigator.clipboard?.writeText(game.code);
    setCopied(true);
  }

  return (
    <div className="relative h-full">
      <Screen
        header={
          <div className="flex items-center justify-between">
            <button type="button" className="text-sm font-semibold text-mute" onClick={() => setConfirmLeave(true)}>
              Leave
            </button>
            <p className="text-sm font-semibold tracking-[0.16em] text-mute">MUSIC TIMELINE</p>
          </div>
        }
        footer={
          <div className="pb-2">
            {game.canControl ? (
              <Button
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  window.setTimeout(() => {
                    start();
                    setBusy(false);
                  }, 550);
                }}
              >
                {busy ? "Shuffling the crate…" : "Start game"}
              </Button>
            ) : (
              <p className="py-3 text-center text-mute">
                {game.hostIsSimulated ? "The host is starting…" : "Waiting for the host to start"}
              </p>
            )}
          </div>
        }
      >
        <div className="rise pt-2">
          <p className="text-sm text-mute">Game</p>
          <div className="mt-2 flex gap-2">
            {game.code.split("").map((char, index) => (
              <div
                key={`${char}-${index}`}
                className="grid h-16 flex-1 place-items-center rounded-2xl bg-panel font-display text-3xl font-extrabold"
              >
                {char}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => void share()} className="mt-3 text-sm font-semibold text-amber">
            {copied ? "Code copied" : "Share code"}
          </button>

          <h2 className="mt-8 text-sm font-semibold tracking-[0.16em] text-mute">PLAYERS</h2>
          <ul className="mt-3 grid gap-2">
            {game.players.map((player, index) => (
              <li
                key={player.id}
                className="rise flex items-center gap-3 rounded-2xl bg-panel px-3 py-3"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <Avatar name={player.nickname} id={player.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {player.nickname}
                    {player.isLocal ? " · you" : ""}
                  </p>
                </div>
                {player.isHost ? (
                  <span className="rounded-full bg-coral/15 px-2 py-1 text-xs font-bold text-coral">HOST</span>
                ) : (
                  <span aria-hidden>🎧</span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-3xl bg-panel p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-mute">PLAYLIST</p>
            <p className="mt-1 text-xl font-semibold">{game.playlistName}</p>
            <p className="text-sm text-mute">
              {game.winMode === "target" ? `First to ${game.targetCards} cards` : `${game.maxRounds} rounds`} ·{" "}
              {game.playlistSource === "spotify" ? "Spotify playlist" : "sample crate"}
            </p>
          </div>
        </div>
      </Screen>
      {confirmLeave ? (
        <Modal
          title="Leave this table?"
          body={game.canControl ? "Ending it closes the game on this phone." : "You can join again with the code."}
          confirmLabel="Leave"
          onConfirm={() => {
            leave();
            router.push("/");
          }}
          onClose={() => setConfirmLeave(false)}
        />
      ) : null}
    </div>
  );
}

function TurnStart({ game }: { game: PlayerView }) {
  const { play } = useGame();
  const name = game.active?.nickname ?? "The active player";
  return (
    <div className="relative h-full">
      <Screen
        header={<RoundHeader game={game} />}
        footer={
          <div className="pb-2">
            {game.canControl ? (
              <Button onClick={play}>Play song</Button>
            ) : (
              <p className="py-3 text-center text-mute">Waiting for the song</p>
            )}
          </div>
        }
      >
        <div className="rise">
          <p className="text-sm font-semibold tracking-[0.16em] text-amber">
            {game.you.isActive ? "YOUR TURN" : `${name.toUpperCase()}'S TURN`}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-none">
            {(game.active?.timeline.length ?? 0) === 0
              ? "First card"
              : game.you.isActive
                ? "Listen, then place it"
                : `${name} places first`}
          </h1>
          <p className="mt-3 text-mute">
            {(game.active?.timeline.length ?? 0) === 0
              ? "This one starts the collection. It cannot be challenged."
              : `Everyone hears the song. Only ${game.you.isActive ? "you" : name} can choose the gap.`}
          </p>
          <NowPlaying game={game} />
          {(game.active?.timeline.length ?? 0) > 0 ? (
            <>
              <h2 className="mt-6 text-sm font-semibold tracking-[0.16em] text-mute">{`${name.toUpperCase()}'S TIMELINE`}</h2>
              <CardList cards={game.active?.timeline ?? []} />
            </>
          ) : null}
        </div>
      </Screen>
    </div>
  );
}

function FirstCard({ game }: { game: PlayerView }) {
  const { play, pause } = useGame();
  const playing = game.playback.status === "playing";
  const name = game.active?.nickname ?? "They";
  return (
    <div className="relative h-full">
      <Screen
        header={<RoundHeader game={game} />}
        footer={
          game.canControl ? (
            <div className="pb-2">
              <Button variant="ghost" onClick={playing ? pause : play}>
                {playing ? "Pause" : "Resume"}
              </Button>
            </div>
          ) : null
        }
      >
        <div className="rise">
          <p className="text-sm font-semibold tracking-[0.16em] text-amber">FIRST CARD</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-none">
            {game.you.isActive ? "This one is yours" : `Into ${name}'s collection`}
          </h1>
          <p className="mt-3 text-mute">The timeline is empty, so the song lands here. Nobody can challenge it.</p>
          <NowPlaying game={game} />
          {game.you.isActive ? <NameBet game={game} /> : null}
          <div className="mt-6 flex items-center gap-3 rounded-3xl border border-coral/40 bg-coral/10 px-4 py-4">
            <Cover mystery size={72} />
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-coral">NEW SONG</p>
              <p className="text-lg font-semibold">Going onto the timeline</p>
              <p className="text-sm text-mute">{game.you.isActive ? "Your first card" : `${name}'s first card`}</p>
            </div>
          </div>
        </div>
      </Screen>
    </div>
  );
}

function ActiveTurn({ game }: { game: PlayerView }) {
  const { lock, play, pause, place } = useGame();
  const playing = game.playback.status === "playing";
  const picked = game.you.slot !== null;
  return (
    <div className="relative h-full">
      <Screen
        header={<RoundHeader game={game} />}
        footer={
          <div className="grid gap-2 pb-2">
            <Button onClick={lock} disabled={!picked}>
              {picked ? (game.you.coins > 0 ? "Lock it here · 1 chip" : "Lock it here") : "Tap a gap first"}
            </Button>
            {game.canControl ? (
              <Button variant="ghost" onClick={playing ? pause : play}>
                {playing ? "Pause" : "Resume"}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="rise">
          <p className="text-sm font-semibold tracking-[0.16em] text-amber">YOUR TURN</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-none">Where does it belong?</h1>
          <p className="mt-3 text-mute">Tap a gap on your timeline. You can change it until you lock.</p>
          <NowPlaying game={game} />
          <NameBet game={game} />
          <CollectionMeter game={game} playerId={game.you.id} />
          <div className="mt-5">
            <Timeline cards={game.active?.timeline ?? []} selected={game.you.slot} canPlace onPlace={place} />
          </div>
        </div>
      </Screen>
    </div>
  );
}

function WatchTurn({ game }: { game: PlayerView }) {
  const name = game.active?.nickname ?? "They";
  return (
    <div className="relative h-full">
      <Screen header={<RoundHeader game={game} />} footer={<p className="py-3 text-center text-mute">Waiting for {name} to place the song</p>}>
        <div className="rise">
          <p className="text-sm font-semibold text-amber">{name} is choosing the gap.</p>
          <p className="mt-2 text-mute">You can hear the song and see the timeline. Challenges open after the placement is locked.</p>
          <NowPlaying game={game} />
          <h2 className="mt-6 text-sm font-semibold tracking-[0.16em] text-mute">{`${name.toUpperCase()}'S TIMELINE`}</h2>
          <CardList cards={game.active?.timeline ?? []} />
        </div>
      </Screen>
    </div>
  );
}

function ChallengeTurn({ game }: { game: PlayerView }) {
  const { claim, pass } = useGame();
  const name = game.active?.nickname ?? "They";
  const acted = game.you.passed || game.you.claim !== null;
  return (
    <div className="relative h-full">
      <Screen
        header={<RoundHeader game={game} />}
        footer={
          <div className="grid gap-2 pb-2">
            {acted ? (
              <p className="py-3 text-center font-semibold text-mint">
                {game.you.claim !== null ? "You picked a different gap" : `You're fine with ${name}'s spot`}
              </p>
            ) : (
              <Button variant="secondary" onClick={pass}>
                {`${name}'s spot is right`}
              </Button>
            )}
            <Pending game={game} />
          </div>
        }
      >
        <div className="rise">
          <p className="text-sm font-semibold tracking-[0.16em] text-amber">{`${name.toUpperCase()} PLACED IT`}</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-none">Move it, or leave it</h1>
          <p className="mt-3 text-mute">The arrow points toward older songs. A different gap costs 1 chip.</p>
          {game.you.coins < 1 && !acted ? (
            <p className="mt-3 text-sm font-semibold text-amber">No chip left. You can still leave their spot alone.</p>
          ) : null}
          <NameBet game={game} />
          <GapBoard game={game} onClaim={acted || game.you.coins < 1 ? undefined : claim} />
        </div>
      </Screen>
    </div>
  );
}

function WatchChallenge({ game }: { game: PlayerView }) {
  const name = game.active?.nickname ?? "They";
  return (
    <div className="relative h-full">
      <Screen
        header={<RoundHeader game={game} />}
        footer={
          <div className="grid gap-2 pb-2">
            <p className="py-1 text-center font-semibold text-mint">Your spot is locked</p>
            <Pending game={game} />
          </div>
        }
      >
        <div className="rise">
          <p className="text-sm font-semibold tracking-[0.16em] text-amber">WAITING ON THE TABLE</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-none">{`${name}, your card is in`}</h1>
          <p className="mt-3 text-mute">The others can move it to a different gap, or leave your guess alone.</p>
          <NameBet game={game} />
          <GapBoard game={game} />
        </div>
      </Screen>
    </div>
  );
}

function NameBet({ game }: { game: PlayerView }) {
  const { callSong } = useGame();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  if (game.you.called) {
    return <p className="mt-4 text-sm font-semibold text-mint">Your name chip is in the pot.</p>;
  }
  if (game.you.coins < 1) {
    return <p className="mt-4 text-sm text-mute">No chip left to call the song.</p>;
  }
  return (
    <form
      className="mt-4 rounded-3xl bg-panel px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        callSong(title, artist);
      }}
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-amber">CALL THE SONG · 1 CHIP</p>
      <p className="mt-1 text-sm text-mute">Title and artist. A close guess counts. A feature name is enough.</p>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value.slice(0, 80))}
        placeholder="Title"
        className="mt-3 w-full rounded-2xl bg-ink px-4 py-3 text-base font-semibold outline-none ring-coral focus:ring-2"
      />
      <input
        value={artist}
        onChange={(event) => setArtist(event.target.value.slice(0, 80))}
        placeholder="Artist"
        className="mt-2 w-full rounded-2xl bg-ink px-4 py-3 text-base font-semibold outline-none ring-coral focus:ring-2"
      />
      <Button className="mt-3" type="submit" variant="secondary" disabled={!title.trim() || !artist.trim()}>
        Bet the name
      </Button>
    </form>
  );
}

function Pending({ game }: { game: PlayerView }) {
  if (game.pending.length === 0) return <p className="text-center text-sm text-mute">Everyone has answered</p>;
  return <p className="text-center text-sm text-mute">Still choosing: {game.pending.join(", ")}</p>;
}

function NowPlaying({ game }: { game: PlayerView }) {
  const elapsed = useElapsed(game.playback);
  const playing = game.playback.status === "playing";
  return (
    <div className="mt-4 rounded-[28px] bg-panel px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Equalizer live={playing} />
          <p className="font-semibold">
            {playing ? (game.playlistSource === "spotify" ? "Playing" : "Song playing") : game.playback.status === "paused" ? "Paused" : "Ready"}
          </p>
        </div>
        <p className="font-display text-2xl font-bold tabular-nums">{formatTime(elapsed)}</p>
      </div>
    </div>
  );
}

function CardList({ cards }: { cards: TimelineCard[] }) {
  const ordered = cards.slice().reverse();
  return (
    <div className="mt-3">
      <TimelineTrack>
        {ordered.map((card) => (
          <li key={card.songId}>
            <SongOnLine card={card} />
          </li>
        ))}
      </TimelineTrack>
    </div>
  );
}

function HorizontalTimeline({ cards }: { cards: TimelineCard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
      {cards.map((card) => (
        <div key={card.songId} className="w-16 shrink-0">
          <Cover label={card.title} accent={card.accent} image={card.image} size={64} />
          <p className="mt-1 text-center text-xs font-semibold text-amber">{card.year}</p>
        </div>
      ))}
    </div>
  );
}

function GapBoard({
  game,
  onClaim,
}: {
  game: PlayerView;
  onClaim?: (slot: number) => void;
}) {
  const placement = game.placement;
  const timeline = game.active?.timeline ?? [];
  if (!placement || !game.active) return null;
  const name = game.active.nickname;
  return (
    <div className="mt-5">
      <TimelineTrack>
        {newestSlots(timeline.length).map((slot) => {
          const claim = placement.claims.find((item) => item.slot === slot);
          const taken = placement.slot === slot;
          return (
            <li key={`gap-${slot}`} className="grid gap-3">
              <div className="pl-8">
                {taken ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-coral bg-coral/15 px-4 py-3">
                    <Cover mystery size={36} />
                    <p className="font-semibold">{name}</p>
                  </div>
                ) : claim ? (
                  <div className="rounded-2xl bg-panel px-4 py-3 text-center font-semibold">{claim.nickname}</div>
                ) : onClaim ? (
                  <button
                    type="button"
                    onClick={() => onClaim(slot)}
                    aria-label={gapLabel(timeline, slot, name)}
                    className="w-full rounded-2xl border border-dashed border-white/30 bg-white/[0.03] px-4 py-3 text-center font-semibold"
                  >
                    Here
                  </button>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 px-4 py-3 text-center font-semibold text-mute">
                    Here
                  </div>
                )}
              </div>
              {timeline[slot - 1] ? <SongOnLine card={timeline[slot - 1]} /> : null}
            </li>
          );
        })}
      </TimelineTrack>
    </div>
  );
}

function gapLabel(cards: TimelineCard[], slot: number, name: string) {
  const older = cards[slot - 1];
  const newer = cards[slot];
  if (older && newer) return `Put the song here instead of ${name}, between ${older.year} and ${newer.year}`;
  if (newer) return `Put the song here instead of ${name}, before ${newer.year}`;
  if (older) return `Put the song here instead of ${name}, after ${older.year}`;
  return `Put the song here instead of ${name}`;
}

function Results({ game }: { game: PlayerView }) {
  const { next } = useGame();
  const result = game.result;
  const you = result?.rows.find((row) => row.playerId === game.you.id);
  const finished =
    (game.winMode === "target" && game.players.some((player) => player.cards >= game.targetCards)) ||
    (game.winMode === "rounds" && game.roundNumber >= game.maxRounds);

  if (!result) return null;

  return (
    <div className="relative h-full">
      <Screen
        header={
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold tracking-[0.16em] text-amber">ROUND RESULTS</p>
            <EndControl />
          </div>
        }
        footer={
          <div className="pb-2">
            {game.canControl ? (
              <Button onClick={next}>{finished ? "Final collection" : "Next turn"}</Button>
            ) : (
              <div>
                <p className="text-center text-sm text-mute">
                  {game.hostIsSimulated ? "Next round coming up" : "Waiting for the host"}
                </p>
                {game.hostIsSimulated ? <div className="countdown mt-3 h-1 rounded-full bg-coral" /> : null}
              </div>
            )}
          </div>
        }
      >
        <div className="rise">
          <div className="flex items-end gap-4">
            <Cover label={result.song.title} accent={result.song.accent} image={result.song.image} size={112} />
            <div>
              <p className="font-display text-6xl font-extrabold leading-none text-amber">{result.song.year}</p>
            </div>
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-none">{result.song.title}</h1>
          <p className="mt-2 text-lg text-mute">{result.song.artist}</p>
          {you ? (
            <p
              className={cn(
                "mt-3 font-display text-3xl font-extrabold leading-none",
                you.isCorrect ? "text-mint" : you.relation === "agreed" ? "text-mute" : "text-rose",
              )}
            >
              {relationCopy(you.relation)}
            </p>
          ) : null}
          {result.placement?.length ? (
            <div className="mt-5">
              <p className="text-sm font-semibold tracking-[0.16em] text-mute">IT BELONGS HERE</p>
              <p className="mt-1 text-sm text-cream">
                {result.correctLabel}
                {result.timelineName ? ` · ${result.timelineName}'s timeline` : ""}
              </p>
              <div className="mt-3">
                <TimelineTrack>
                  {result.placement
                    .slice()
                    .reverse()
                    .map((card) => (
                      <li key={card.songId}>
                        <SongOnLine card={card} marked={card.songId === result.placedSongId} />
                      </li>
                    ))}
                </TimelineTrack>
              </div>
            </div>
          ) : (
            <p className="mt-3 font-semibold">{result.correctLabel}</p>
          )}
          <div
            className={cn(
              "mt-4 rounded-3xl px-4 py-4",
              result.award === "discarded" ? "bg-panel" : "bg-coral text-white",
            )}
          >
            <p className={cn("text-xs font-semibold tracking-[0.16em]", result.award === "discarded" ? "text-mute" : "text-white/80")}>
              {result.award === "discarded" ? "CARD" : "WON BY"}
            </p>
            <p className="mt-1 font-display text-4xl font-extrabold leading-none">
              {result.award === "discarded" ? "Lost" : result.ownerName}
            </p>
            <p className={cn("mt-2 text-sm", result.award === "discarded" ? "text-mute" : "text-white/80")}>
              {result.award === "discarded" ? "Nobody claimed the right gap." : "Added to their collection."}
            </p>
            {result.ownerId ? (
              <HorizontalTimeline cards={game.players.find((player) => player.id === result.ownerId)?.timeline ?? []} />
            ) : null}
          </div>

          <ul className="mt-6 grid gap-2">
            {result.rows.map((row) => (
              <li key={row.playerId} className="flex items-center gap-3 rounded-2xl bg-panel px-3 py-3">
                <span className={row.relation === "agreed" ? "text-xl text-mute" : row.isCorrect ? "text-xl text-mint" : "text-xl text-rose"}>
                  {row.relation === "agreed" ? "·" : row.isCorrect ? "✓" : "✗"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{row.nickname}</span>
                  <span className="block text-sm text-mute">{betCopy(row)}</span>
                </span>
                <span className="text-mute">{relationCopy(row.relation)}</span>
              </li>
            ))}
          </ul>
          <Leaderboard players={game.players} />
        </div>
      </Screen>
    </div>
  );
}

function GameOver({ game }: { game: PlayerView }) {
  const router = useRouter();
  const { again, leave } = useGame();
  const ranks = useMemo(() => rankPlayers(game.players), [game.players]);
  const winners = ranks.filter((player) => player.rank === 1);

  useEffect(() => {
    playWin();
  }, []);

  return (
    <div className="relative h-full overflow-hidden">
      <Confetti />
      <Screen
        footer={
          <div className="grid gap-2 pb-2">
            <Button onClick={again}>Play again</Button>
            <Button
              variant="secondary"
              onClick={() => {
                leave();
                router.push("/");
              }}
            >
              Home
            </Button>
          </div>
        }
      >
        <div className="rise pt-4 text-center">
          <p className="text-sm font-semibold tracking-[0.18em] text-amber">GAME OVER</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold">
            {winners.length > 1 ? "It's a tie" : winners[0]?.nickname}
          </h1>
          <p className="mt-2 text-mute">
            {winners.length > 1
              ? winners.map((player) => player.nickname).join(" · ")
              : `${winners[0]?.cards ?? 0} cards collected`}
          </p>
          <ol className="mt-6 grid gap-3 text-left">
            {ranks.map((player) => (
              <li key={player.id} className="rounded-2xl bg-panel px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 text-lg">{medal(player.rank)}</span>
                  <span className="flex-1 font-semibold">{player.nickname}</span>
                  <ChipStack count={player.coins} size="sm" />
                  <span className="font-bold">{player.cards} cards · {player.points} pts</span>
                </div>
                {player.timeline.length > 0 ? (
                  <ul className="mt-3 grid gap-1 pl-11 text-sm text-mute">
                    {player.timeline.slice().reverse().map((card) => (
                      <li key={card.songId} className="flex items-center gap-2">
                        <Cover label={card.title} accent={card.accent} image={card.image} size={36} />
                        <span>
                          {card.year} · {card.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </Screen>
    </div>
  );
}

function cardCountLabel(cards: number, game: PlayerView) {
  return game.winMode === "target" ? `${cards} / ${game.targetCards} cards` : `${cards} cards`;
}

function RoundHeader({ game }: { game: PlayerView }) {
  const active = game.active;
  const activeCards = active ? game.players.find((player) => player.id === active.id)?.cards : undefined;
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold tracking-[0.16em] text-mute">ROUND</p>
        <h1 className="font-display text-4xl font-extrabold leading-none">
          {game.roundNumber}
          {game.winMode === "rounds" ? <span className="text-2xl text-mute"> / {game.maxRounds}</span> : null}
        </h1>
        <p className="mt-2 text-sm font-semibold text-mute">{cardCountLabel(game.you.cards, game)}</p>
        <div className="mt-2 flex items-center gap-3">
          <ChipStack count={game.you.coins} />
          <p className="text-sm font-semibold text-amber">{game.you.points} pts</p>
        </div>
        {active && !active.isYou && activeCards !== undefined ? (
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-cream">
            <span>
              {active.nickname} · {cardCountLabel(activeCards, game)}
            </span>
            <ChipStack count={game.players.find((player) => player.id === active.id)?.coins ?? 0} size="sm" />
          </p>
        ) : null}
      </div>
      <EndControl />
    </div>
  );
}

function EndControl() {
  const router = useRouter();
  const { game, leave } = useGame();
  const [open, setOpen] = useState(false);
  if (!game) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-mute">
        End
      </button>
      {open ? (
        <Modal
          title="End this game?"
          body={game.canControl ? "The table closes on this phone." : "You'll leave the round."}
          confirmLabel="End game"
          onConfirm={() => {
            leave();
            router.push("/");
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function Leaderboard({ players }: { players: PublicPlayer[] }) {
  const ranks = rankPlayers(players);
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold tracking-[0.16em] text-mute">COLLECTION</h2>
      <ol className="mt-3 grid gap-2">
        {ranks.map((player) => (
          <li key={player.id} className="flex items-center gap-3 text-sm">
            <span className="w-5 text-mute">{player.rank}</span>
            <span className="flex-1 font-semibold">{player.nickname}</span>
            <ChipStack count={player.coins} size="sm" />
            <span className="w-10 text-right text-amber">{player.points}</span>
            <span className="w-6 text-right">{player.cards}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function rankPlayers(players: PublicPlayer[]) {
  const sorted = players
    .slice()
    .sort(
      (a, b) =>
        b.cards - a.cards || b.points - a.points || b.activeWins - a.activeWins || a.nickname.localeCompare(b.nickname),
    );
  let lastCards = Number.NaN;
  let lastPoints = Number.NaN;
  let lastWins = Number.NaN;
  let rank = 0;
  return sorted.map((player, index) => {
    if (player.cards !== lastCards || player.points !== lastPoints || player.activeWins !== lastWins) {
      rank = index + 1;
      lastCards = player.cards;
      lastPoints = player.points;
      lastWins = player.activeWins;
    }
    return { ...player, rank };
  });
}

function CollectionMeter({ game, playerId }: { game: PlayerView; playerId: string }) {
  const player = game.players.find((item) => item.id === playerId);
  const cards = player?.cards ?? 0;
  const target = game.winMode === "target" ? game.targetCards : Math.max(cards, 1);
  const width = Math.min(100, Math.round((cards / target) * 100));
  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-coral" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-2 text-sm text-mute">
        {game.winMode === "target" ? `${cards} / ${game.targetCards} cards` : `${cards} cards`}
      </p>
    </div>
  );
}

function medal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

function betCopy(row: ResultRow) {
  const parts: string[] = [];
  if (row.name === "hit") parts.push("Named it +1");
  if (row.name === "miss") parts.push("Name missed");
  if (row.gapChip === "back") parts.push("Chip back");
  if (row.gapChip === "lost") parts.push("Chip lost");
  return parts.join(" · ");
}

function relationCopy(relation: ResultRow["relation"]) {
  if (relation === "placed") return "Correct";
  if (relation === "missed") return "Wrong spot";
  if (relation === "challenge") return "Won the challenge";
  if (relation === "off") return "Wrong challenge";
  return "No challenge";
}

function useElapsed(playback: Playback) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (playback.status !== "playing") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [playback.status, playback.startedAt]);
  if (playback.status === "playing" && playback.startedAt) {
    return playback.elapsedMs + (now - playback.startedAt);
  }
  return playback.elapsedMs;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: index,
        left: `${(index * 17) % 100}%`,
        delay: `${(index % 8) * 0.08}s`,
        duration: `${2.6 + (index % 5) * 0.25}s`,
        color: ["#ff4d3a", "#ffb020", "#3ee0a2", "#f6f1e7", "#7aa2ff"][index % 5],
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti"
          style={{
            left: piece.left,
            background: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
          }}
        />
      ))}
    </div>
  );
}
