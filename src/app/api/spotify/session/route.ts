import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canStream, spotifyCookies, spotifyCredentials, spotifyRedirectUri } from "@/lib/spotify/config";
import { spotifyFetch } from "@/lib/spotify/session";

export async function GET(request: Request) {
  const redirectUri = spotifyRedirectUri(request);
  if (!spotifyCredentials()) {
    return NextResponse.json({ configured: false, connected: false, redirectUri });
  }

  const result = await spotifyFetch("/me");
  if (!result.ok) {
    return NextResponse.json({
      configured: true,
      connected: false,
      redirectUri,
      reason: result.reason,
    });
  }

  const profile = result.data as { display_name?: string; product?: string };
  const jar = await cookies();
  return NextResponse.json({
    configured: true,
    connected: true,
    redirectUri,
    displayName: profile.display_name || "Spotify listener",
    product: profile.product || "unknown",
    playback: canStream(jar.get(spotifyCookies.scope)?.value),
  });
}
