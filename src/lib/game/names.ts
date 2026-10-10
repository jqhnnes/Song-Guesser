/** A call matches when both the title and one credited artist are close enough. */
export function songCallMatches(
  guess: { title: string; artist: string },
  song: { title: string; artist: string },
) {
  return titleMatches(guess.title, song.title) && artistMatches(guess.artist, song.artist);
}

function titleMatches(guess: string, answer: string) {
  const typed = normalize(stripVersionNotes(guess));
  if (!typed) return false;
  return titleOptions(answer).some((option) => closeTitle(typed, option));
}

function artistMatches(guess: string, answer: string) {
  const typed = normalize(guess);
  if (!typed) return false;
  return artistOptions(answer).some((name) => closeName(typed, name));
}

function titleOptions(answer: string) {
  const options = new Set<string>();
  const notes = [...answer.matchAll(/\(([^)]+)\)|\[([^\]]+)\]/g)].map((match) => match[1] || match[2] || "");
  for (const note of notes) {
    if (!isVersionNote(note)) {
      const alt = normalize(note);
      if (alt) options.add(alt);
    }
  }
  const core = normalize(
    answer
      .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
      .replace(/\s[-–—]\s.*$/, " ")
      .replace(/\b(feat|ft|featuring)\.?\b.*$/i, " "),
  );
  if (core) options.add(core);
  return [...options];
}

function artistOptions(answer: string) {
  return answer
    .split(/,|&|\bfeat\.?\b|\bft\.?\b|\bfeaturing\b/i)
    .map((name) => normalize(name))
    .filter((name) => name.length > 1);
}

function stripVersionNotes(value: string) {
  return value
    .replace(/\(([^)]*)\)|\[([^\]]*)\]/g, (whole, round: string, square: string) =>
      isVersionNote(round || square || "") ? " " : whole,
    )
    .replace(/\s[-–—]\s.*$/, " ")
    .replace(/\b(feat|ft|featuring)\.?\b.*$/i, " ");
}

function isVersionNote(value: string) {
  return /\b(feat|ft|featuring|remix|remaster(?:ed)?|live|radio|edit|version|deluxe|acoustic|instrumental|extended|mix)\b/i.test(
    value,
  );
}

function closeTitle(guess: string, answer: string) {
  if (guess === answer) return true;
  const guessWords = guess.split(" ").filter(Boolean);
  const answerWords = answer.split(" ").filter(Boolean);
  if (answerWords.length >= 2 && guessWords.length < 2) return false;
  return edits(guess, answer) <= typoBudget(answer.length);
}

function closeName(guess: string, answer: string) {
  if (!answer) return false;
  if (guess === answer) return true;
  return edits(guess, answer) <= typoBudget(answer.length);
}

function typoBudget(length: number) {
  if (length < 6) return 1;
  if (length < 12) return 2;
  return 3;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u00c0-\u024f\u0400-\u04ff\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function edits(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const saved = previous[column];
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + cost);
      diagonal = saved;
    }
  }
  return previous[right.length];
}
