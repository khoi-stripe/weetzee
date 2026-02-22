import type { Ruleset, ScoreCategory } from "../types";
import {
  counts, sum, hasNOfAKind, isSmallStraight,
  UPPER_SECTION_IDS, UPPER_BONUS_THRESHOLD, UPPER_BONUS_VALUE, EXTRA_WEETZEE_VALUE,
} from "./yahtzee";

function isFullHouse6(dice: number[]): boolean {
  const vals = Object.values(counts(dice)).sort((a, b) => a - b);
  const distinct = vals.length;
  if (distinct !== 2) return false;
  return vals[0] >= 2 && vals[1] >= 3;
}

function isLargeStraight6(dice: number[]): boolean {
  const unique = new Set(dice);
  const runs = [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]];
  return runs.some((run) => run.every((n) => unique.has(n)));
}

const UPPER_SECTION_6: ScoreCategory[] = [1, 2, 3, 4, 5, 6].map((face) => ({
  id: `upper_${face}`,
  name: ["Ones", "Twos", "Threes", "Fours", "Fives", "Sixes"][face - 1],
  evaluate: (dice: number[]) => dice.filter((d) => d === face).reduce((a, b) => a + b, 0),
  maxScore: face * 6,
}));

const LOWER_SECTION_6: ScoreCategory[] = [
  {
    id: "three_of_a_kind",
    name: "3 of a kind",
    evaluate: (dice) => (hasNOfAKind(dice, 3) ? sum(dice) : null),
    maxScore: 36,
  },
  {
    id: "four_of_a_kind",
    name: "4 of a kind",
    evaluate: (dice) => (hasNOfAKind(dice, 4) ? sum(dice) : null),
    maxScore: 36,
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
    evaluate: (dice) => (isLargeStraight6(dice) ? 40 : null),
    maxScore: 40,
  },
  {
    id: "full_house",
    name: "Full house",
    evaluate: (dice) => (isFullHouse6(dice) ? 25 : null),
    maxScore: 25,
  },
  {
    id: "chance",
    name: "Chance",
    evaluate: (dice) => sum(dice),
    maxScore: 36,
  },
  {
    id: "weetzee",
    name: "Weetzee",
    evaluate: (dice) => (hasNOfAKind(dice, 6) ? 50 : null),
    maxScore: 50,
  },
  {
    id: "bonus",
    name: "Bonus",
    evaluate: () => null,
    maxScore: 35,
  },
];

function getBonus6(scores: Record<string, number | null>): number {
  const upperTotal = UPPER_SECTION_IDS.reduce((s, id) => s + (scores[id] ?? 0), 0);
  return upperTotal >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_VALUE : 0;
}

function getTotal6(scores: Record<string, number | null>, extraWeetzees: number = 0): number {
  const manualTotal = Object.entries(scores)
    .filter(([id]) => id !== "bonus")
    .reduce((s, [, v]) => s + (v ?? 0), 0);
  return manualTotal + getBonus6(scores) + extraWeetzees * EXTRA_WEETZEE_VALUE;
}

export const A_LITTLE_HELP_RULESET: Ruleset = {
  id: "a-little-help",
  name: "A Little Help",
  description: "6 dice instead of 5",
  diceCount: 6,
  rollsPerTurn: 3,
  categories: [...UPPER_SECTION_6, ...LOWER_SECTION_6],
  winCondition: "highest",
  getBonus: getBonus6,
  getTotal: getTotal6,
  fiveOfAKindId: "weetzee",
};
