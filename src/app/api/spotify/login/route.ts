import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SPOTIFY_SCOPES, appOrigin, cookieOptions, loopbackUrl, safeReturnPath, spotifyCookies, spotifyCredentials, spotifyRedirectUri } from "@/lib/spotify/config";

export async function GET(request: NextRequest) {
  const loopback = loopbackUrl(request);
  if (loopback) return NextResponse.redirect(loopback);

  const url = new URL(request.url);

  const name = (url.searchParams.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 16);
  const credentials = spotifyCredentials();
  if (!credentials) {
    const setup = new URL("/create", appOrigin(request));
    setup.searchParams.set("spotify", "setup");
    if (name) setup.searchParams.set("name", name);
    return NextResponse.redirect(setup);
  }

  const state = randomBytes(16).toString("hex");
  const authorize = new URL("https://accounts.spotify.com/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", credentials.clientId);
  authorize.searchParams.set("scope", SPOTIFY_SCOPES);
  authorize.searchParams.set("redirect_uri", spotifyRedirectUri(request));
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("show_dialog", url.searchParams.get("fresh") === "1" ? "true" : "false");

  const response = NextResponse.redirect(authorize);
  response.cookies.set(spotifyCookies.state, state, cookieOptions(10 * 60));
  response.cookies.set(spotifyCookies.name, name, cookieOptions(10 * 60));
  response.cookies.set(spotifyCookies.returnPath, safeReturnPath(url.searchParams.get("return")), cookieOptions(10 * 60));
  return response;
}
