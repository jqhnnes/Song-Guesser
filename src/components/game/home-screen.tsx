"use client";

import { useSyncExternalStore } from "react";
import { Button, Screen, Wordmark } from "@/components/ui";

function installHintSnapshot() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true;
  return /iPhone|iPad/.test(navigator.userAgent) && !standalone;
}

export function HomeScreen() {
  const installHint = useSyncExternalStore(
    () => () => {},
    installHintSnapshot,
    () => false,
  );

  return (
    <Screen
      header={
        <div className="flex items-center justify-between">
          <Wordmark />
          <span className="rounded-full bg-white/6 px-3 py-1 text-xs font-semibold tracking-wide text-mute">
            PARTY GAME
          </span>
        </div>
      }
      footer={
        <div className="grid gap-3 pb-2">
          <Button href="/create">Create a game</Button>
          <Button href="/join" variant="secondary">
            Join with a code
          </Button>
        </div>
      }
    >
      <div className="rise pt-6">
        <p className="text-sm font-semibold tracking-[0.18em] text-amber">LISTEN. PLACE. COLLECT.</p>
        <h1 className="mt-3 font-display text-[3.5rem] leading-[0.88] font-extrabold tracking-tight">
          When did
          <br />
          it drop?
        </h1>
        <p className="mt-4 max-w-[18rem] text-lg leading-snug text-mute">
          A song plays. Place it on your timeline. Keep the card if you were right.
        </p>
      </div>
      <Preview />
      {installHint ? (
        <p className="mt-6 rounded-2xl bg-panel px-4 py-3 text-sm leading-relaxed text-mute">
          On iPhone, tap Share, then <span className="text-cream">Add to Home Screen</span>. It
          opens like an app.
        </p>
      ) : (
        <p className="mt-6 text-sm text-mute">Best played from your Home Screen, phones in a circle.</p>
      )}
    </Screen>
  );
}

function Preview() {
  const years = [1977, 1991, 2004, 2019];
  return (
    <div className="relative mt-10 overflow-hidden rounded-[28px] bg-panel px-4 py-6">
      <div className="absolute inset-x-8 top-1/2 h-px bg-white/15" />
      <div className="relative flex items-center justify-between">
        {years.map((year) => (
          <div key={year} className="grid justify-items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cream" />
            <span className="text-xs font-semibold text-mute">{year}</span>
          </div>
        ))}
      </div>
      <div className="floaty absolute left-[46%] top-3 rounded-2xl bg-coral px-3 py-2 text-sm font-bold text-white shadow-lg">
        ????
      </div>
    </div>
  );
}
