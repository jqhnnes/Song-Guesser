import "server-only";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const spotifyCookies = {
  state: "spotify_oauth_state",
  name: "spotify_return_name",
  access: "spotify_access",
  refresh: "spotify_refresh",
  expires: "spotify_expires",
  scope: "spotify_scopes",
  returnPath: "spotify_return_path",
};

export function canStream(scope: string | undefined) {
  const granted = new Set((scope ?? "").split(/\s+/));
  return granted.has("streaming") && granted.has("user-modify-playback-state");
}

/** Only send the browser back to this app's create screen or a room code. */
export function safeReturnPath(value: string | null | undefined) {
  if (value && /^\/g\/[A-Z0-9]{4}$/.test(value)) return value;
  return "/create";
}

export function cookieOptions(maxAge: number) {
  return { ...COOKIE_BASE, maxAge };
}

export function spotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * Next reports `request.url` as localhost even when the browser used 127.0.0.1.
 * Trust the Host header, and only bounce a real localhost visit.
 */
export function loopbackUrl(request: Request) {
  const headerHost = request.headers.get("host") ?? "";
  const hostname = headerHost.split(":")[0];
  if (hostname !== "localhost") return null;
  const url = new URL(request.url);
  const port = headerHost.includes(":") ? headerHost.slice(headerHost.indexOf(":") + 1) : url.port || "3000";
  return new URL(`${url.pathname}${url.search}`, `http://127.0.0.1:${port}`);
}

/** Spotify rejects `localhost`. Loopback must be the literal 127.0.0.1. */
export function spotifyRedirectUri(request: Request) {
  const configured = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (configured) return configured;
  const url = new URL(request.url);
  const port = url.port || "3000";
  return `http://127.0.0.1:${port}/api/spotify/callback`;
}

export function appOrigin(request: Request) {
  const headerHost = request.headers.get("host") ?? "";
  const hostname = headerHost.split(":")[0];
  if (hostname && hostname !== "localhost") {
    const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    return `${proto}://${headerHost}`;
  }
  const url = new URL(request.url);
  const port = headerHost.includes(":") ? headerHost.slice(headerHost.indexOf(":") + 1) : url.port || "3000";
  return `http://127.0.0.1:${port}`;
}
