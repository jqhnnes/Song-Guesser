"use client";

import { useEffect, type ReactNode } from "react";
import type { TimelineCard } from "@/lib/game/types";
import { Cover } from "@/components/ui";
import { cn } from "@/lib/cn";

function LineTip({ className }: { className: string }) {
  return (
    <svg className={cn("absolute left-0 text-white/70", className)} width="12" height="8" viewBox="0 0 12 8" aria-hidden>
      <path
        d="M1 1 6 7 11 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Newest gap first, so the latest song sits at the top. */
export function newestSlots(cardCount: number) {
  return Array.from({ length: cardCount + 1 }, (_, index) => cardCount - index);
}

export function TimelineTrack({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-3" aria-hidden>
        <LineTip className="top-0" />
        <LineTip className="bottom-0" />
        <div className="absolute bottom-[7px] left-[5.5px] top-[7px] w-px bg-white/40" />
      </div>
      <ol className="grid gap-3 py-2">{children}</ol>
    </div>
  );
}

export function Timeline({
  cards,
  selected,
  canPlace,
  onPlace,
}: {
  cards: TimelineCard[];
  selected: number | null;
  canPlace: boolean;
  onPlace: (slot: number) => void;
}) {
  useEffect(() => {
    if (selected === null) return;
    document.querySelector(`[data-slot="${selected}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <TimelineTrack>
      {newestSlots(cards.length).map((slot) => (
        <li key={`slot-${slot}`} className="grid gap-3">
          {canPlace ? (
            <div className="pl-8">
              <button
                type="button"
                data-slot={slot}
                onClick={() => onPlace(slot)}
                aria-pressed={selected === slot}
                aria-label={slotLabel(cards, slot)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-center text-base font-semibold transition",
                  selected === slot
                    ? "border-coral bg-coral text-white"
                    : "border-dashed border-white/30 bg-white/[0.03] text-cream active:bg-white/[0.08]",
                )}
              >
                Here
              </button>
            </div>
          ) : null}
          {cards[slot - 1] ? <SongOnLine card={cards[slot - 1]} /> : null}
        </li>
      ))}
    </TimelineTrack>
  );
}

export function SongOnLine({ card, marked = false }: { card: TimelineCard; marked?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "relative z-10 h-3 w-3 shrink-0 rounded-full shadow-[0_0_0_4px_#09090b]",
          marked ? "bg-coral" : "bg-cream",
        )}
      />
      <div className={cn("flex min-w-0 flex-1 items-center gap-3", marked && "rounded-2xl bg-coral/15 py-1.5 pr-3")}>
        <Cover label={card.title} accent={card.accent} image={card.image} size={56} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber">{card.year}</p>
          <p className="truncate font-semibold leading-tight">{card.title}</p>
          <p className="truncate text-sm text-mute">{card.artist}</p>
        </div>
      </div>
    </div>
  );
}

function slotLabel(cards: TimelineCard[], slot: number) {
  const older = cards[slot - 1];
  const newer = cards[slot];
  if (older && newer) return `Place the song here, between ${older.year} and ${newer.year}`;
  if (newer) return `Place the song here, before ${newer.year}`;
  if (older) return `Place the song here, after ${older.year}`;
  return "Place the song here";
}
