import type { Ruleset } from "../types";
import { CLASSIC_RULESET, UPPER_SECTION_IDS } from "./classic";

const ZERO_PENALTY = 10;

function getRaceTotal(scores: Record<string, number | null>): number {
  let total = 0;
  for (const [id, v] of Object.entries(scores)) {
    if (id === "bonus") continue;
    const score = v ?? 0;
    total += score;
    if (score === 0 && UPPER_SECTION_IDS.includes(id)) {
      total += ZERO_PENALTY;
    }
  }
  return total;
}

export const RACE_TO_BOTTOM_RULESET: Ruleset = {
  id: "race-to-bottom",
  name: "Race to the Bottom",
  description: "Lowest score wins",
  diceCount: 5,
  rollsPerTurn: 3,
  categories: CLASSIC_RULESET.categories,
  winCondition: "lowest",
  getBonus: () => 0,
  getTotal: (scores) => getRaceTotal(scores),
  fiveOfAKindId: "weetzee",
  strictLowerSection: true,
};
