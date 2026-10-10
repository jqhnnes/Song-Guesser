import { canonicalSlot, gapBounds, placementIsCorrect, yearInGap } from "./rules";
import type { ResultRow } from "./types";

/**
 * Card rules. The active player keeps the card when the year falls in their gap,
 * including a year that another gap also accepts. A challenger keeps it only when
 * the active player missed and their gap contains the year. Otherwise it is discarded.
 */
export const CARD_RULES = {
  activeKeepsCorrectPlacement: true,
  challengerKeepsCorrectGap: true,
  discardWhenCorrectGapUnclaimed: true,
};

export type CardRules = typeof CARD_RULES;

export type CardAward =
  | { type: "active"; playerId: string }
  | { type: "challenger"; playerId: string; slot: number }
  | { type: "discarded" };

export function awardCard(
  input: {
    players: Array<{ id: string; nickname: string }>;
    activePlayerId: string;
    years: number[];
    slot: number;
    year: number;
    claims: Array<{ playerId: string; slot: number }>;
  },
  rules: CardRules = CARD_RULES,
): { award: CardAward; rows: ResultRow[] } {
  const activeCorrect = input.years.length === 0 || placementIsCorrect(input.years, input.slot, input.year);
  const hits = activeCorrect
    ? []
    : input.claims.filter((claim) => yearInGap(input.years, claim.slot, input.year));
  const claimed = pickClaim(input.years, input.year, hits);

  let award: CardAward = { type: "discarded" };
  if (activeCorrect && rules.activeKeepsCorrectPlacement) {
    award = { type: "active", playerId: input.activePlayerId };
  } else if (claimed && rules.challengerKeepsCorrectGap) {
    award = { type: "challenger", playerId: claimed.playerId, slot: claimed.slot };
  } else if (!rules.discardWhenCorrectGapUnclaimed && activeCorrect) {
    award = { type: "active", playerId: input.activePlayerId };
  }

  const rows = input.players.map((player) => {
    if (player.id === input.activePlayerId) {
      return row(player, activeCorrect, activeCorrect ? "placed" : "missed");
    }
    const claim = input.claims.find((item) => item.playerId === player.id);
    if (!claim) return row(player, false, "agreed");
    const hit = award.type === "challenger" && award.playerId === player.id;
    return row(player, hit, hit ? "challenge" : "off");
  });

  return { award, rows };
}

/** Most cards, then most cards won on your own turn, then a shared win. */
export function collectionRank(left: { cards: number; activeWins: number }, right: { cards: number; activeWins: number }) {
  if (left.cards !== right.cards) return right.cards - left.cards;
  return right.activeWins - left.activeWins;
}

function pickClaim(
  years: number[],
  year: number,
  hits: Array<{ playerId: string; slot: number }>,
) {
  if (hits.length === 0) return null;
  const canonical = years.length === 0 ? 0 : canonicalSlot(years, year);
  return (
    hits.find((claim) => claim.slot === canonical) ??
    hits.slice().sort((left, right) => gapSpan(years, left.slot) - gapSpan(years, right.slot))[0]
  );
}

function gapSpan(years: number[], slot: number) {
  const { lo, hi } = gapBounds(years, slot);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return Number.POSITIVE_INFINITY;
  return hi - lo;
}

function row(
  player: { id: string; nickname: string },
  isCorrect: boolean,
  relation: ResultRow["relation"],
): ResultRow {
  return {
    playerId: player.id,
    nickname: player.nickname,
    isCorrect,
    relation,
    gapChip: "none",
    name: "none",
  };
}

