# Timeline

A mobile-first party game about collecting song cards. A song plays, the title stays hidden, and the active player places it on their own timeline. Everyone else can challenge the side they think is right. The card goes to whoever was correct, or it is discarded.

This version runs on one phone. Other seats are simulated. A sample crate uses a timer. A Spotify playlist plays in this browser.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Spotify rejects `localhost` as a redirect, so sign-in uses the loopback IP. On a desktop the game sits in a phone-width column. On an iPhone, add it to the Home Screen for the standalone app.

## Try the flow

1. **Create a game.** Name yourself, keep the sample crates, pick a playlist, then choose first-to-target or a fixed number of rounds.
2. Share the 4-character code. On this phone the other players are already in the lobby.
3. Start. You host, and you also take a turn. Play, place the card, lock, then wait out the challenge.
4. **Join → code `DEMO`.** You play as a guest while a simulated host runs the table.

The first card on an empty timeline cannot be challenged. After that, the other players may claim the years before or after your gap. Agreeing means doing nothing.

## Connect Spotify

Premium on your account is what Development Mode requires. The app still needs its own Spotify application. The client secret stays in `.env.local` and is never sent to the browser.

1. Open the [Spotify developer dashboard](https://developer.spotify.com/dashboard) and create an app.
2. In the app settings, add this redirect URI exactly:

   `http://127.0.0.1:3000/api/spotify/callback`

3. Copy `.env.example` to `.env.local` and paste the Client ID and Client Secret.
4. Restart `npm run dev`.
5. Open [http://127.0.0.1:3000](http://127.0.0.1:3000), create a game, and choose Connect Spotify.

If Spotify returns a 403, open the app's User Management and add your account. Development Mode allows five users.

Login reads your playlists and their album release years. On a Spotify game, Play starts the song in this browser through Spotify. The first login has to be repeated once so Spotify can grant audio permission. Sample crates still use the on-screen timer. The Web Playback SDK is not licensed for a public commercial game without Spotify's written approval.

The full architecture is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The current song stays out of the screen props. It still lives in local game state so a round can resolve without a multiplayer server.
