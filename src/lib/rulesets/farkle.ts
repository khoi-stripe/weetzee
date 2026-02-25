import type { Ruleset } from "../types";

// ===== Farkle Scoring =====

function countFaces(dice: number[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0]; // index 0 unused; 1-6
  for (const d of dice) counts[d]++;
  return counts;
}

function isStraight(counts: number[]): boolean {
  return counts[1] === 1 && counts[2] === 1 && counts[3] === 1 &&
         counts[4] === 1 && counts[5] === 1 && counts[6] === 1;
}

function isThreePairs(counts: number[]): boolean {
  let pairs = 0;
  for (let f = 1; f <= 6; f++) {
    if (counts[f] === 2) pairs++;
    else if (counts[f] === 4) pairs += 2;
    else if (counts[f] === 6) pairs += 3;
  }
  return pairs === 3;
}

/**
 * Score a set of dice using standard Farkle rules.
 * Returns the total score, or 0 if the dice contain no valid scoring combination.
 */
export function scoreDice(dice: number[]): number {
  if (dice.length === 0) return 0;
  const counts = countFaces(dice);

  if (dice.length === 6 && isStraight(counts)) return 2500;
  if (dice.length === 6 && isThreePairs(counts)) return 1500;

  let score = 0;
  const remaining = [...counts];

  for (let face = 1; face <= 6; face++) {
    if (remaining[face] >= 6) { score += 3000; remaining[face] -= 6; }
    else if (remaining[face] >= 5) { score += 2000; remaining[face] -= 5; }
    else if (remaining[face] >= 4) { score += 1000; remaining[face] -= 4; }
    else if (remaining[face] >= 3) {
      score += face === 1 ? 1000 : face * 100;
      remaining[face] -= 3;
    }
  }

  score += remaining[1] * 100;
  score += remaining[5] * 50;

  return score;
}

/**
 * Check whether a set of rolled dice contains any scoring dice at all.
 */
export function hasScoring(dice: number[]): boolean {
  if (dice.length === 0) return false;
  const counts = countFaces(dice);
  if (dice.length === 6 && (isStraight(counts) || isThreePairs(counts))) return true;
  for (let f = 1; f <= 6; f++) {
    if (counts[f] >= 3) return true;
  }
  return counts[1] > 0 || counts[5] > 0;
}

/**
 * Validate that a player's selected dice form valid scoring combinations.
 * Every selected die must contribute to a scoring combo.
 */
export function isValidSelection(selected: number[]): boolean {
  if (selected.length === 0) return false;
  const counts = countFaces(selected);

  if (selected.length === 6 && (isStraight(counts) || isThreePairs(counts))) return true;

  const remaining = [...counts];

  for (let face = 1; face <= 6; face++) {
    if (remaining[face] >= 6) remaining[face] -= 6;
    else if (remaining[face] >= 5) remaining[face] -= 5;
    else if (remaining[face] >= 4) remaining[face] -= 4;
    else if (remaining[face] >= 3) remaining[face] -= 3;
  }

  for (let face = 2; face <= 6; face++) {
    if (face === 5) continue;
    if (remaining[face] > 0) return false;
  }

  return true;
}

/**
 * Enumerate all scoring possibilities for a set of available (non-set-aside) dice.
 * Returns a list of { label, score, diceUsed } entries.
 */
export function getScoringPossibilities(dice: number[]): { label: string; score: number; count: number }[] {
  if (dice.length === 0) return [];
  const counts = countFaces(dice);
  const results: { label: string; score: number; count: number }[] = [];

  if (dice.length === 6 && isStraight(counts)) {
    results.push({ label: "Straight (1-2-3-4-5-6)", score: 2500, count: 6 });
  }
  if (dice.length === 6 && isThreePairs(counts)) {
    results.push({ label: "Three pairs", score: 1500, count: 6 });
  }

  for (let face = 1; face <= 6; face++) {
    if (counts[face] >= 6) results.push({ label: `Six ${face}s`, score: 3000, count: 6 });
    else if (counts[face] >= 5) results.push({ label: `Five ${face}s`, score: 2000, count: 5 });
    else if (counts[face] >= 4) results.push({ label: `Four ${face}s`, score: 1000, count: 4 });
    else if (counts[face] >= 3) {
      results.push({ label: `Three ${face}s`, score: face === 1 ? 1000 : face * 100, count: 3 });
    }
  }

  if (counts[1] > 0 && counts[1] < 3) {
    results.push({ label: counts[1] === 1 ? "Single 1" : "Two 1s", score: counts[1] * 100, count: counts[1] });
  }
  if (counts[5] > 0 && counts[5] < 3) {
    results.push({ label: counts[5] === 1 ? "Single 5" : "Two 5s", score: counts[5] * 50, count: counts[5] });
  }

  return results;
}

// ===== Ruleset =====

export const FARKLE_RULESET: Ruleset = {
  id: "farkle",
  name: "Farkle",
  description: "Push your luck to 10,000",
  diceCount: 6,
  rollsPerTurn: 999,
  categories: [{ id: "total", name: "Total", evaluate: () => 0, maxScore: 10000 }],
  winCondition: "highest",
  getBonus: () => 0,
  getTotal: (scores) => (scores["total"] as number) ?? 0,
  farkle: true,
  winThreshold: 10000,
};
