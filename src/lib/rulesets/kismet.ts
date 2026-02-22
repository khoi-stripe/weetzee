import type { Ruleset, ScoreCategory } from "../types";
import { counts, sum, hasNOfAKind, isLargeStraight, isFullHouse, computeTotal } from "./classic";

export function pipColor(value: number): "black" | "red" | "green" {
  if (value <= 2) return "black";
  if (value <= 4) return "red";
  return "green";
}

function allSameColor(dice: number[]): boolean {
  if (dice.length === 0) return false;
  const c = pipColor(dice[0]);
  return dice.every((d) => pipColor(d) === c);
}

function hasTwoPairSameColor(dice: number[]): boolean {
  const c = counts(dice);
  const pairs = Object.entries(c).filter(([, count]) => count >= 2);
  if (pairs.length < 2) return false;
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const v1 = Number(pairs[i][0]);
      const v2 = Number(pairs[j][0]);
      if (pipColor(v1) === pipColor(v2)) return true;
    }
  }
  return false;
}

function isFullHouseSameColor(dice: number[]): boolean {
  return isFullHouse(dice) && allSameColor(dice);
}

// ===== Basic Section (same as upper) =====

const BASIC_SECTION: ScoreCategory[] = [1, 2, 3, 4, 5, 6].map((face) => ({
  id: `upper_${face}`,
  name: ["Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes"][face - 1],
  evaluate: (dice: number[]) => dice.filter((d) => d === face).reduce((a, b) => a + b, 0),
  maxScore: face * 5,
}));

// ===== Kismet Section =====

const KISMET_SECTION: ScoreCategory[] = [
  {
    id: "two_pair_same_color",
    name: "2 Pair Same Color",
    evaluate: (dice) => (hasTwoPairSameColor(dice) ? sum(dice) : null),
    maxScore: 30,
  },
  {
    id: "three_of_a_kind",
    name: "3 of a kind",
    evaluate: (dice) => (hasNOfAKind(dice, 3) ? sum(dice) : null),
    maxScore: 30,
  },
  {
    id: "straight",
    name: "Straight",
    evaluate: (dice) => (isLargeStraight(dice) ? 30 : null),
    maxScore: 30,
  },
  {
    id: "flush",
    name: "Flush",
    evaluate: (dice) => (allSameColor(dice) ? 35 : null),
    maxScore: 35,
  },
  {
    id: "full_house",
    name: "Full House",
    evaluate: (dice) => (isFullHouse(dice) ? sum(dice) + 15 : null),
    maxScore: 45,
  },
  {
    id: "full_house_same_color",
    name: "Full House SC",
    evaluate: (dice) => (isFullHouseSameColor(dice) ? sum(dice) + 20 : null),
    maxScore: 50,
  },
  {
    id: "four_of_a_kind",
    name: "4 of a kind",
    evaluate: (dice) => (hasNOfAKind(dice, 4) ? sum(dice) + 25 : null),
    maxScore: 55,
  },
  {
    id: "yarborough",
    name: "Yarborough",
    evaluate: (dice) => sum(dice),
    maxScore: 30,
  },
  {
    id: "kismet",
    name: "Kismet",
    evaluate: (dice) => (hasNOfAKind(dice, 5) ? sum(dice) + 50 : null),
    maxScore: 80,
  },
  {
    id: "bonus",
    name: "Bonus",
    evaluate: () => null,
    maxScore: 75,
  },
];

const BASIC_IDS = BASIC_SECTION.map((c) => c.id);

function getKismetBonus(scores: Record<string, number | null>): number {
  const upperTotal = BASIC_IDS.reduce((s, id) => s + (scores[id] ?? 0), 0);
  if (upperTotal >= 78) return 75;
  if (upperTotal >= 71) return 55;
  if (upperTotal >= 63) return 35;
  return 0;
}

function getKismetTotal(scores: Record<string, number | null>, extraWeetzees: number = 0): number {
  return computeTotal(scores, getKismetBonus, extraWeetzees);
}

export const KISMET_RULESET: Ruleset = {
  id: "kismet",
  name: "Kismet",
  description: "Colored dice with unique combos",
  diceCount: 5,
  rollsPerTurn: 3,
  categories: [...BASIC_SECTION, ...KISMET_SECTION],
  winCondition: "highest",
  getBonus: getKismetBonus,
  getTotal: getKismetTotal,
  fiveOfAKindId: "kismet",
  pipColors: true,
};
