import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, spotifyCookies, spotifyCredentials } from "./config";

export type SpotifyTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

type TokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; status: number; reason: "unauthorized" | "setup" | "spotify" };

export async function exchangeCode(code: string, redirectUri: string): Promise<SpotifyTokens> {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

export async function readAccessToken(): Promise<TokenResult> {
  const credentials = spotifyCredentials();
  if (!credentials) return { ok: false, status: 500, reason: "setup" };

  const jar = await cookies();
  const access = jar.get(spotifyCookies.access)?.value;
  const expires = Number(jar.get(spotifyCookies.expires)?.value ?? 0);
  if (access && expires > Date.now() + 30_000) return { ok: true, accessToken: access };

  const refresh = jar.get(spotifyCookies.refresh)?.value;
  if (!refresh) return { ok: false, status: 401, reason: "unauthorized" };

  try {
    const tokens = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: refresh,
    });
    await storeTokens(tokens, refresh);
    return { ok: true, accessToken: tokens.access_token };
  } catch {
    await clearSpotifyCookies();
    return { ok: false, status: 401, reason: "spotify" };
  }
}

export function applyTokens(response: NextResponse, tokens: SpotifyTokens, previousRefresh?: string) {
  const refresh = tokens.refresh_token || previousRefresh;
  response.cookies.set(spotifyCookies.access, tokens.access_token, cookieOptions(tokens.expires_in));
  response.cookies.set(
    spotifyCookies.expires,
    String(Date.now() + tokens.expires_in * 1000),
    cookieOptions(tokens.expires_in),
  );
  if (refresh) {
    response.cookies.set(spotifyCookies.refresh, refresh, cookieOptions(60 * 60 * 24 * 30));
  }
  if (tokens.scope) {
    response.cookies.set(spotifyCookies.scope, tokens.scope, cookieOptions(60 * 60 * 24 * 30));
  }
  return response;
}

export async function storeTokens(tokens: SpotifyTokens, previousRefresh?: string) {
  const jar = await cookies();
  const refresh = tokens.refresh_token || previousRefresh;
  jar.set(spotifyCookies.access, tokens.access_token, cookieOptions(tokens.expires_in));
  jar.set(
    spotifyCookies.expires,
    String(Date.now() + tokens.expires_in * 1000),
    cookieOptions(tokens.expires_in),
  );
  if (refresh) jar.set(spotifyCookies.refresh, refresh, cookieOptions(60 * 60 * 24 * 30));
  if (tokens.scope) jar.set(spotifyCookies.scope, tokens.scope, cookieOptions(60 * 60 * 24 * 30));
}

export async function clearSpotifyCookies() {
  const jar = await cookies();
  for (const name of [spotifyCookies.access, spotifyCookies.refresh, spotifyCookies.expires, spotifyCookies.scope]) {
    jar.delete(name);
  }
}

async function tokenRequest(fields: Record<string, string>) {
  const credentials = spotifyCredentials();
  if (!credentials) throw new Error("Spotify credentials are missing");
  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Spotify token request failed (${response.status})`);
  }
  return (await response.json()) as SpotifyTokens;
}

export async function spotifyFetch(path: string) {
  const token = await readAccessToken();
  if (!token.ok) return token;
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401) {
    await clearSpotifyCookies();
    return { ok: false as const, status: 401, reason: "unauthorized" as const };
  }
  if (response.status === 403) {
    return { ok: false as const, status: 403, reason: "forbidden" as const };
  }
  if (!response.ok) {
    return { ok: false as const, status: response.status, reason: "spotify" as const };
  }
  return { ok: true as const, data: await response.json() };
}

export async function spotifyCommand(path: string, method: "PUT" | "POST", body?: unknown) {
  const token = await readAccessToken();
  if (!token.ok) return token;
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (response.status === 204 || response.status === 202) return { ok: true as const, status: response.status, reason: "" };
  let reason = "";
  try {
    const data = (await response.json()) as { error?: { reason?: string; message?: string } };
    reason = data.error?.reason || data.error?.message || "";
  } catch {
    reason = "";
  }
  if (response.status === 401) {
    await clearSpotifyCookies();
    return { ok: false as const, status: 401, reason: "unauthorized" };
  }
  return { ok: false as const, status: response.status, reason };
}
