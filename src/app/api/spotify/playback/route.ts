import { NextResponse } from "next/server";
import { spotifyCommand } from "@/lib/spotify/session";

const DEVICE_ID = /^[A-Za-z0-9]{20,80}$/;
const TRACK_ID = /^[A-Za-z0-9]{10,30}$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    deviceId?: string;
    trackId?: string;
  } | null;
  const action = body?.action;
  const deviceId = body?.deviceId ?? "";
  if (!DEVICE_ID.test(deviceId) || (action !== "play" && action !== "pause" && action !== "resume")) {
    return NextResponse.json({ ok: false, reason: "device" }, { status: 400 });
  }

  const device = encodeURIComponent(deviceId);
  if (action === "pause") {
    const paused = await spotifyCommand(`/me/player/pause?device_id=${device}`, "PUT");
    return NextResponse.json({ ok: paused.ok });
  }

  if (action === "resume") {
    const resumed = await spotifyCommand(`/me/player/play?device_id=${device}`, "PUT");
    if (resumed.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, reason: publicReason(resumed.status, resumed.reason) }, { status: resumed.status });
  }

  const trackId = body?.trackId ?? "";
  if (!TRACK_ID.test(trackId)) return NextResponse.json({ ok: false, reason: "track" }, { status: 400 });

  const started = await playOn(device, trackId);
  if (started.ok) return NextResponse.json({ ok: true });
  if (started.status === 404) {
    const transferred = await spotifyCommand("/me/player", "PUT", { device_ids: [deviceId], play: false });
    if (transferred.ok) {
      const retry = await playOn(device, trackId);
      if (retry.ok) return NextResponse.json({ ok: true });
      return NextResponse.json({ ok: false, reason: publicReason(retry.status, retry.reason) }, { status: retry.status });
    }
  }
  return NextResponse.json({ ok: false, reason: publicReason(started.status, started.reason) }, { status: started.status });
}

function playOn(device: string, trackId: string) {
  return spotifyCommand(`/me/player/play?device_id=${device}`, "PUT", {
    uris: [`spotify:track:${trackId}`],
  });
}

function publicReason(status: number, reason: string) {
  const value = reason.toUpperCase();
  if (status === 401 || value.includes("UNAUTHORIZED")) return "unauthorized";
  if (value.includes("SCOPE")) return "scope";
  if (value.includes("PREMIUM")) return "premium";
  if (status === 404 || value.includes("DEVICE")) return "device";
  return "spotify";
}
