# Music Timeline — architecture

This is a card-collection party game. A song is a card. Players do not score points. The first player to fill a target collection wins, or the table plays a fixed number of turns and the biggest collection wins.

The playable build on this phone is a local prototype: one browser, simulated guests, and one Spotify account for the host. Realtime rooms, a server that owns the secret, and a separate Spotify login per player are specified here and are not built yet.

## 1. Architecture

```text
iPhone Home Screen PWA
  Next.js (React, TypeScript, Tailwind)
    screens read a redacted player view
    the host phone is the room speaker

This prototype
  reducer in the browser
  sessionStorage for refresh
  sample crates, or the host's Spotify playlist

Later
  route handlers for commands
  Postgres for games, timelines, and private songs
  Realtime broadcast of the redacted view
```

| Phase | What it adds | Status |
| --- | --- | --- |
| UI and local card engine | Screens, timelines, challenges, awards, discard, both win modes | In this build |
| Multiplayer | Same game on different phones | Not started |
| Per-player Spotify login | Each seat connects their own account | Host login only |
| Playlist import | Host picks a playlist; years come from the album | In this build |
| Playback | Official playback on the host device | In this build, host browser |
| Server authority | Year, owner, and winner computed off the device | Not started |
| PWA shell | Manifest, icons, safe areas | In this build |

The screen never receives the current title, artist, album, year, or artwork. `toPlayerView` copies those fields into the view only after the reducer has revealed the round.

## 2. Spotify

Verified against Spotify's Web API and Web Playback SDK docs, including the Development Mode notes.

- Several people can each complete the Authorization Code flow. This app currently stores one account in httpOnly cookies on the host browser. A later room stores a token per player on the server.
- Full Premium is required on the account whose token creates the Web Playback SDK device. Lite and Mini fail with `account_error`. In Development Mode the app owner must be Premium. Other allowlisted users do not need Premium to call the Web API. The cap is five users and one client id until Extended Quota Mode.
- The device that plays is the SDK device created in the host browser, or a Spotify Connect device on the host's phone if the SDK cannot start.
- There is no official API that plays one track into every player's headphones in sync. The legal party setup is one speaker: the host's phone. Everyone else listens in the room.
- The host can press Play without the game screen showing the title. Spotify still delivers the track name to the playing device and may show it in the OS media controls. Other phones must not receive the track URI before reveal.
- Playlist tracks are read with the Web API. The year is the album `release_date`, which is not always the original recording year. The screen calls it the release year.
- `preview_url` is not a fallback. The SDK is not licensed for a public commercial game without Spotify's written approval. iOS standalone mode is unreliable for encrypted media and autoplay; the fallback is Spotify Connect on the host phone.

Scopes in use: `user-read-private`, `user-read-email`, `playlist-read-private`, `playlist-read-collaborative`, `streaming`, `user-read-playback-state`, `user-modify-playback-state`. The client secret stays in server environment variables.

## 3. Lobby

The host creates a four-character code. Later, another phone opens `/join/CODE` or types the code. The server inserts a player row and Realtime pushes the lobby. This prototype keeps the room in `sessionStorage` on one phone and fills the other seats with simulated players. Joining `DEMO` starts a table whose host is simulated.

The host chooses the playlist, the player count (2–8), and the win condition, then starts. The host stays the host for the whole game. The active player rotates every turn and is a different role.

## 4. Game engine

```text
lobby
  → turn_start
  → deciding          active player places
  → challenge         others may claim a side
  → round_results     reveal and award
  → win check
  → next turn, or game_over
```

The reducer accepts commands and ignores anything that is illegal for the phase. A place is accepted only from the active player during `deciding`. A challenge is accepted only after the placement is locked, only for a gap the active player did not take, and only from someone who is not the active player. Each gap can be claimed once. Reveal runs when every other player has claimed a gap or said the placement is fine. An empty timeline skips the challenge and awards the card to the active player. The client does not decide the owner.

Songs are drawn without replacement. Unavailable tracks are skipped. Sample crates advance on a timer. A Spotify playlist plays through the Web Playback SDK when the host presses Play, and only while the phase is `turn_start`.

## 5. Timelines

Each player has their own list of cards, sorted by release year. Collections start empty. There is no shared timeline and no starter card.

On an empty timeline the song plays and the card goes straight into that collection. There is no placement step and no challenge.

After the reveal, the card is inserted into exactly one timeline: the owner’s. A discarded card is inserted nowhere.

## 6. Challenges

The active player chooses a gap and locks it. Other players may then claim any other gap on that timeline. The active player's gap stays theirs. Each remaining gap can be taken by only one player, so several people can challenge as long as they pick different gaps.

A player who thinks the placement is right says so. That answer does not move the card. It only tells the table they are done. The song stays hidden until every other player has either claimed a gap or agreed. There is no countdown.

## 7. Card ownership

A gap accepts every year from the card before it through the card after it, including both ends. Before the oldest card has no lower limit. After the newest card has no upper limit. Two cards from the same year still leave a gap between them, and the gaps before and after that year stay open to guess.

If the revealed year falls inside the active player's gap, that player keeps the card. This stays true when another gap also includes that year. With 2020, 2020, 2022, a placement between 2020 and 2022 keeps a 2020 song even if someone else claimed before 2020.

```text
year is inside the active player's gap   → active player
else a challenger claimed a gap that fits → that challenger
else                                      → discard pile
```

When several challengers' gaps contain the year, the card goes to the one who claimed the earliest fitting gap, or the narrowest gap if that one was free.

A wrong gap never receives the card. If the active player is wrong and nobody claimed the true gap, the card is discarded. The discard pile is a count. Those songs are not drawn again in the same game.

`CARD_RULES` in `src/lib/game/scoring.ts` is the switch for this. The reducer calls `awardCard` and applies the result.

## 8. Win conditions

**First to target.** Default 10 cards. Choices are 5, 10, 15, 20, or a custom count. The game ends on the turn a timeline reaches the target.

**Fixed rounds.** The table plays that many turns. The biggest collection wins.

Tie-break, in order: most cards, then most cards won on a turn where that player was the one placing, then a shared win. `cardsWonAsActive` exists only for that tie-break.

## 9. Database schema

Not created yet. The service role is the only writer for ownership, years, and secrets. Players can read a public view of their game. They cannot select the secret table.

```text
users
  id, display_name, spotify_user_id

spotify_accounts          -- one row per player, tokens stay server-side
  user_id, refresh_token, scopes, product

games
  id, code, host_player_id, playlist_id, playlist_name
  status, win_mode          -- target | rounds
  target_cards, max_rounds, round_number, discarded_count

players
  id, game_id, user_id, nickname, is_host, connected
  cards_won_as_active

timeline_cards
  id, game_id, player_id, song_id, year, position
  title, artist, album, artwork_url   -- copied at award time

discarded_cards
  game_id, song_id

songs                     -- private pool, no client policy
  id, game_id, spotify_uri, title, artist, album
  release_year, artwork_url, used

rounds
  id, game_id, round_number, active_player_id
  placement_slot, challenge_before_player_id, challenge_after_player_id
  award                     -- active | challenger | discarded
  owner_player_id, revealed_at
```

Before `revealed_at`, the public view includes nicknames, card counts, the active player’s already-awarded timeline, the locked slot, and who claimed each side. It does not include the current song.

## 10. UI flow

```text
Home
  Create
    name → sample crate or Spotify → playlist
    → first to N cards, or N rounds, and a player count
  Join
    code on this phone reopens the room
    DEMO sits you at a simulated table

Room
  Lobby            code, players, host starts
  Turn start       host presses Play
  Deciding         active player sees gaps; everyone else watches
  Challenge        Before / After, or “I’m not challenging”
  Result           year, who was right, card awarded or lost
  Game over        collections, play again
```

Portrait, thumb-zone buttons, safe areas, and a phone-width column on a wide screen. Add to Home Screen on iPhone for the standalone shell.
