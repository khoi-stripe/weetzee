import type { Ruleset } from "../types";
import { YAHTZEE_RULESET, UPPER_SECTION_IDS } from "./yahtzee";

function getRaceTotal(scores: Record<string, number | null>, extraWeetzees: number = 0): number {
  return Object.entries(scores)
    .filter(([id]) => id !== "bonus")
    .reduce((sum, [, v]) => sum + (v ?? 0), 0);
}

function getRaceBonus(scores: Record<string, number | null>): number {
  const upperTotal = UPPER_SECTION_IDS.reduce((sum, id) => sum + (scores[id] ?? 0), 0);
  return upperTotal >= 63 ? 35 : 0;
}

export const RACE_TO_BOTTOM_RULESET: Ruleset = {
  id: "race-to-bottom",
  name: "Race to the Bottom",
  description: "Lowest score wins",
  diceCount: 5,
  rollsPerTurn: 3,
  categories: YAHTZEE_RULESET.categories,
  winCondition: "lowest",
  getBonus: getRaceBonus,
  getTotal: (scores, extraWeetzees = 0) => getRaceTotal(scores) + getRaceBonus(scores),
  fiveOfAKindId: "weetzee",
};
