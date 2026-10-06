"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/components/game/provider";
import { Button, Screen } from "@/components/ui";
import { isCode, normalizeCode } from "@/lib/game/rules";

export function JoinScreen() {
  const router = useRouter();
  const { game, joinDemo } = useGame();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const nextCode = normalizeCode(code);
    const nickname = name.trim();
    if (!nickname) {
      setError("Add a nickname first.");
      return;
    }
    if (!isCode(nextCode)) {
      setError("Enter a 4-character code.");
      return;
    }
    setBusy(true);
    await wait(400);
    if (nextCode === "DEMO") {
      joinDemo(nickname);
      router.push("/g/DEMO");
      return;
    }
    if (game?.code === nextCode) {
      router.push(`/g/${nextCode}`);
      return;
    }
    setBusy(false);
    setError("No game on this phone uses that code. Ask the host, or enter DEMO to try the player view.");
  }

  return (
    <Screen
      header={
        <button type="button" className="text-sm font-semibold text-mute" onClick={() => router.push("/")}>
          Back
        </button>
      }
      footer={
        <div className="pb-2">
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Finding the room…" : "Join game"}
          </Button>
        </div>
      }
    >
      <div className="rise pt-4">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Join a table</h1>
        <p className="mt-3 text-mute">
          Enter the host&apos;s code. On one phone, use <span className="text-cream">DEMO</span> to
          play as a guest.
        </p>
        <label className="mt-8 block text-sm font-semibold text-mute">
          Game code
          <input
            value={code}
            autoCapitalize="characters"
            autoCorrect="off"
            onChange={(event) => {
              setCode(normalizeCode(event.target.value));
              setError("");
            }}
            placeholder="AB7K"
            className="mt-2 w-full rounded-3xl bg-panel px-5 py-5 text-center font-display text-4xl font-extrabold tracking-[0.4em] outline-none ring-coral placeholder:tracking-[0.3em] placeholder:text-white/15 focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-mute">
          Nickname
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 16))}
            placeholder="Sam"
            className="mt-2 w-full rounded-3xl bg-panel px-5 py-5 text-2xl font-semibold outline-none ring-coral focus:ring-2"
          />
        </label>
        {error ? <p className="mt-4 text-sm text-rose">{error}</p> : null}
      </div>
    </Screen>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
