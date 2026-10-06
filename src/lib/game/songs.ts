import type { Playlist, Song } from "./types";

const ACCENTS = [
  "linear-gradient(150deg,#ff4d3a 0%,#2a101c 78%)",
  "linear-gradient(150deg,#ffb020 0%,#3a2208 80%)",
  "linear-gradient(150deg,#3ee0a2 0%,#0c2e28 80%)",
  "linear-gradient(150deg,#7aa2ff 0%,#161a38 80%)",
  "linear-gradient(150deg,#d48bff 0%,#2a1438 80%)",
  "linear-gradient(150deg,#ff6b81 0%,#3a1020 80%)",
  "linear-gradient(150deg,#f6f1e7 0%,#3a342c 82%)",
  "linear-gradient(150deg,#ff7a45 0%,#2c140c 80%)",
];

export function accentFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash + char.charCodeAt(0)) % ACCENTS.length;
  return ACCENTS[hash];
}

type Row = [string, string, string, string, number, boolean?];

const ROWS: Row[] = [
  ["bohemian", "Bohemian Rhapsody", "Queen", "A Night at the Opera", 1975],
  ["stayin", "Stayin' Alive", "Bee Gees", "Saturday Night Fever", 1977],
  ["heart", "Heart of Glass", "Blondie", "Parallel Lines", 1978],
  ["billie-jean", "Billie Jean", "Michael Jackson", "Thriller", 1982],
  ["sweet-dreams", "Sweet Dreams", "Eurythmics", "Sweet Dreams", 1983],
  ["purple-rain", "Purple Rain", "Prince", "Purple Rain", 1984],
  ["take-on-me", "Take On Me", "a-ha", "Hunting High and Low", 1985],
  ["like-a-prayer", "Like a Prayer", "Madonna", "Like a Prayer", 1989],
  ["teen-spirit", "Smells Like Teen Spirit", "Nirvana", "Nevermind", 1991],
  ["losing", "Losing My Religion", "R.E.M.", "Out of Time", 1991],
  ["waterfalls", "Waterfalls", "TLC", "CrazySexyCool", 1994],
  ["wonderwall", "Wonderwall", "Oasis", "(What's the Story) Morning Glory?", 1995],
  ["mmmbop", "MMMBop", "Hanson", "Middle of Nowhere", 1997],
  ["baby", "...Baby One More Time", "Britney Spears", "...Baby One More Time", 1998],
  ["californication", "Californication", "Red Hot Chili Peppers", "Californication", 1999],
  ["ms-jackson", "Ms. Jackson", "Outkast", "Stankonia", 2000],
  ["last-nite", "Last Nite", "The Strokes", "Is This It", 2001],
  ["lose-yourself", "Lose Yourself", "Eminem", "8 Mile", 2002],
  ["obstacle", "Obstacle 1", "Interpol", "Turn On the Bright Lights", 2002],
  ["mr-brightside", "Mr. Brightside", "The Killers", "Hot Fuss", 2003],
  ["seven-nation", "Seven Nation Army", "The White Stripes", "Elephant", 2003],
  ["hey-ya", "Hey Ya!", "Outkast", "Speakerboxxx/The Love Below", 2003],
  ["yeah", "Yeah!", "Usher", "Confessions", 2004],
  ["take-me-out", "Take Me Out", "Franz Ferdinand", "Franz Ferdinand", 2004],
  ["float-on", "Float On", "Modest Mouse", "Good News for People Who Love Bad News", 2004],
  ["rebellion", "Rebellion (Lies)", "Arcade Fire", "Funeral", 2004],
  ["somebody-told-me", "Somebody Told Me", "The Killers", "Hot Fuss", 2004],
  ["feel-good", "Feel Good Inc.", "Gorillaz", "Demon Days", 2005],
  ["young-folks", "Young Folks", "Peter Bjorn and John", "Writer's Block", 2006],
  ["crazy", "Crazy", "Gnarls Barkley", "St. Elsewhere", 2006],
  ["umbrella", "Umbrella", "Rihanna", "Good Girl Gone Bad", 2007],
  ["paper-planes", "Paper Planes", "M.I.A.", "Kala", 2007],
  ["fluorescent", "Fluorescent Adolescent", "Arctic Monkeys", "Favourite Worst Nightmare", 2007],
  ["kids", "Kids", "MGMT", "Oracular Spectacular", 2007],
  ["time-to-pretend", "Time to Pretend", "MGMT", "Oracular Spectacular", 2007],
  ["single-ladies", "Single Ladies", "Beyoncé", "I Am... Sasha Fierce", 2008],
  ["1901", "1901", "Phoenix", "Wolfgang Amadeus Phoenix", 2009],
  ["bad-romance", "Bad Romance", "Lady Gaga", "The Fame Monster", 2009],
  ["rolling", "Rolling in the Deep", "Adele", "21", 2010],
  ["somebody", "Somebody That I Used to Know", "Gotye", "Making Mirrors", 2011],
  ["get-lucky", "Get Lucky", "Daft Punk", "Random Access Memories", 2013],
  ["do-i-wanna", "Do I Wanna Know?", "Arctic Monkeys", "AM", 2013],
  ["r-u-mine", "R U Mine?", "Arctic Monkeys", "AM", 2013],
  ["shake", "Shake It Off", "Taylor Swift", "1989", 2014],
  ["cant-feel", "Can't Feel My Face", "The Weeknd", "Beauty Behind the Madness", 2015],
  ["one-dance", "One Dance", "Drake", "Views", 2016],
  ["humble", "HUMBLE.", "Kendrick Lamar", "DAMN.", 2017],
  ["bad-guy", "bad guy", "Billie Eilish", "When We All Fall Asleep, Where Do We Go?", 2019],
  ["blinding", "Blinding Lights", "The Weeknd", "After Hours", 2019],
  ["drivers", "drivers license", "Olivia Rodrigo", "SOUR", 2021],
  ["as-it-was", "As It Was", "Harry Styles", "Harry's House", 2022],
  ["flowers", "Flowers", "Miley Cyrus", "Endless Summer Vacation", 2023],
  ["espresso", "Espresso", "Sabrina Carpenter", "Short n' Sweet", 2024],
  ["birds", "Birds of a Feather", "Billie Eilish", "Hit Me Hard and Soft", 2024],
  ["luther", "luther", "Kendrick Lamar & SZA", "GNX", 2024],
  ["apt", "APT.", "ROSÉ & Bruno Mars", "APT.", 2024],
  ["vault", "Vault Track", "Various", "Unreleased", 2000, true],
];

export const SONGS: Song[] = ROWS.map(([id, title, artist, album, year, unavailable], index) => ({
  id,
  title,
  artist,
  album,
  year,
  accent: ACCENTS[index % ACCENTS.length],
  unavailable,
}));

const byId = new Map(SONGS.map((song) => [song.id, song]));

export function getSong(id: string) {
  const song = byId.get(id);
  if (!song) throw new Error(`Missing sample song ${id}`);
  return song;
}

export const PLAYLISTS: Playlist[] = [
  {
    id: "nineties",
    name: "90s & 2000s Favorites",
    description: "Radio hits from the CD era into the blog era.",
    songIds: [
      "teen-spirit",
      "waterfalls",
      "wonderwall",
      "mmmbop",
      "baby",
      "californication",
      "ms-jackson",
      "last-nite",
      "lose-yourself",
      "mr-brightside",
      "hey-ya",
      "yeah",
      "feel-good",
      "crazy",
      "umbrella",
      "single-ladies",
    ],
  },
  {
    id: "indie",
    name: "Indie Roadtrip",
    description: "Guitars, festivals, and late-night drives.",
    songIds: [
      "teen-spirit",
      "losing",
      "wonderwall",
      "last-nite",
      "obstacle",
      "mr-brightside",
      "seven-nation",
      "take-me-out",
      "float-on",
      "rebellion",
      "somebody-told-me",
      "young-folks",
      "fluorescent",
      "kids",
      "time-to-pretend",
      "paper-planes",
      "1901",
      "do-i-wanna",
      "r-u-mine",
      "somebody",
      "get-lucky",
      "blinding",
    ],
  },
  {
    id: "decades",
    name: "Pop Through the Decades",
    description: "A long crate, from the seventies to now.",
    songIds: SONGS.map((song) => song.id),
  },
];

export function getPlaylist(id: string) {
  return PLAYLISTS.find((playlist) => playlist.id === id) ?? null;
}

export function playlistSongs(playlist: Playlist) {
  return playlist.songIds.map(getSong);
}

export function playableSongs(playlist: Playlist) {
  return playlistSongs(playlist).filter((song) => !song.unavailable);
}

export function yearSpan(playlist: Playlist) {
  const years = playableSongs(playlist).map((song) => song.year);
  return `${Math.min(...years)}–${Math.max(...years)}`;
}
