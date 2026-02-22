import type { Ruleset, ScoreCategory } from "../types";

// ===== Scoring Utilities =====

export function counts(dice: number[]): Record<number, number> {
  return dice.reduce<Record<number, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

export function sum(dice: number[]): number {
  return dice.reduce((a, b) => a + b, 0);
}

export function hasNOfAKind(dice: number[], n: number): boolean {
  return Object.values(counts(dice)).some((c) => c >= n);
}

export function isSmallStraight(dice: number[]): boolean {
  const unique = [...new Set(dice)].sort((a, b) => a - b);
  const sequences = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
  return sequences.some((seq) => seq.every((n) => unique.includes(n)));
}

export function isLargeStraight(dice: number[]): boolean {
  const unique = [...new Set(dice)].sort((a, b) => a - b);
  if (unique.length !== 5) return false;
  return (
    JSON.stringify(unique) === JSON.stringify([1, 2, 3, 4, 5]) ||
    JSON.stringify(unique) === JSON.stringify([2, 3, 4, 5, 6])
  );
}

export function isFullHouse(dice: number[]): boolean {
  const vals = Object.values(counts(dice)).sort();
  return JSON.stringify(vals) === JSON.stringify([2, 3]);
}

// ===== Categories =====

export const UPPER_SECTION: ScoreCategory[] = [1, 2, 3, 4, 5, 6].map((face) => ({
  id: `upper_${face}`,
  name: ["Ones", "Twos", "Threes", "Fours", "Fives", "Sixes"][face - 1],
  evaluate: (dice) => dice.filter((d) => d === face).reduce((a, b) => a + b, 0),
  maxScore: face * 5,
}));

export const LOWER_SECTION: ScoreCategory[] = [
  {
    id: "three_of_a_kind",
    name: "3 of a kind",
    evaluate: (dice) => (hasNOfAKind(dice, 3) ? sum(dice) : null),
    maxScore: 30,
  },
  {
    id: "four_of_a_kind",
    name: "4 of a kind",
    evaluate: (dice) => (hasNOfAKind(dice, 4) ? sum(dice) : null),
    maxScore: 30,
  },
  {
    id: "sm_straight",
    name: "Sm. straight",
    evaluate: (dice) => (isSmallStraight(dice) ? 30 : null),
    maxScore: 30,
  },
  {
    id: "lg_straight",
    name: "Lg. straight",
    evaluate: (dice) => (isLargeStraight(dice) ? 40 : null),
    maxScore: 40,
  },
  {
    id: "full_house",
    name: "Full house",
    evaluate: (dice) => (isFullHouse(dice) ? 25 : null),
    maxScore: 25,
  },
  {
    id: "chance",
    name: "Chance",
    evaluate: (dice) => sum(dice),
    maxScore: 30,
  },
  {
    id: "weetzee",
    name: "Weetzee",
    evaluate: (dice) => (hasNOfAKind(dice, 5) ? 50 : null),
    maxScore: 50,
  },
  {
    id: "bonus",
    name: "Bonus",
    // Upper section bonus: auto-calculated, not directly scored by player
    // Represented as 0 until upper section >= 63, then 35
    evaluate: (dice) => null,
    maxScore: 35,
  },
];

export const YAHTZEE_RULESET: Ruleset = {
  id: "yahtzee",
  name: "Classic",
  description: "Standard Weetzee rules",
  diceCount: 5,
  rollsPerTurn: 3,
  categories: [...UPPER_SECTION, ...LOWER_SECTION],
  winCondition: "highest",
  getBonus: getBonusScore,
  getTotal: getFullTotal,
  fiveOfAKindId: "weetzee",
};

// Upper section category IDs for bonus calculation
export const UPPER_SECTION_IDS = UPPER_SECTION.map((c) => c.id);
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_VALUE = 35;

/** Compute upper section subtotal for a player's scores */
export function getUpperTotal(scores: Record<string, number | null>): number {
  return UPPER_SECTION_IDS.reduce((sum, id) => sum + (scores[id] ?? 0), 0);
}

/** Returns the bonus score (35 if upper >= 63, else 0) */
export function getBonusScore(scores: Record<string, number | null>): number {
  return getUpperTotal(scores) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_VALUE : 0;
}

export const EXTRA_WEETZEE_VALUE = 100;

/** Full player total including bonus and extra weetzees */
export function getFullTotal(scores: Record<string, number | null>, extraWeetzees: number = 0): number {
  const manualTotal = Object.entries(scores)
    .filter(([id]) => id !== "bonus")
    .reduce((sum, [, v]) => sum + (v ?? 0), 0);
  return manualTotal + getBonusScore(scores) + extraWeetzees * EXTRA_WEETZEE_VALUE;
}
