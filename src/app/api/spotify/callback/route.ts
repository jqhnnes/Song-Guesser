import { NextRequest, NextResponse } from "next/server";
import { appOrigin, cookieOptions, loopbackUrl, safeReturnPath, spotifyCookies, spotifyRedirectUri } from "@/lib/spotify/config";
import { applyTokens, exchangeCode } from "@/lib/spotify/session";

export async function GET(request: NextRequest) {
  const loopback = loopbackUrl(request);
  if (loopback) return NextResponse.redirect(loopback);

  const url = new URL(request.url);

  const back = safeReturnPath(request.cookies.get(spotifyCookies.returnPath)?.value);
  const destination = new URL(back, appOrigin(request));
  const name = request.cookies.get(spotifyCookies.name)?.value ?? "";
  if (back === "/create" && name) destination.searchParams.set("name", name);
  const spotifyError = url.searchParams.get("error");
  if (spotifyError === "access_denied") {
    if (back === "/create") destination.searchParams.set("spotify", "denied");
    return finish(NextResponse.redirect(destination));
  }
  if (spotifyError) {
    if (back === "/create") destination.searchParams.set("spotify", "error");
    return finish(NextResponse.redirect(destination));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = request.cookies.get(spotifyCookies.state)?.value;
  if (!code || !state || !expected || state !== expected) {
    if (back === "/create") destination.searchParams.set("spotify", "error");
    return finish(NextResponse.redirect(destination));
  }

  try {
    const tokens = await exchangeCode(code, spotifyRedirectUri(request));
    if (back === "/create") destination.searchParams.set("spotify", "connected");
    return finish(applyTokens(NextResponse.redirect(destination), tokens));
  } catch {
    if (back === "/create") destination.searchParams.set("spotify", "error");
    return finish(NextResponse.redirect(destination));
  }
}

function finish(response: NextResponse) {
  response.cookies.set(spotifyCookies.state, "", cookieOptions(0));
  response.cookies.set(spotifyCookies.name, "", cookieOptions(0));
  response.cookies.set(spotifyCookies.returnPath, "", cookieOptions(0));
  return response;
}
