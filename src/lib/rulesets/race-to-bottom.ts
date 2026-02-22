import type { Ruleset } from "../types";
import { CLASSIC_RULESET, getBonusScore, computeTotal } from "./classic";

export const RACE_TO_BOTTOM_RULESET: Ruleset = {
  id: "race-to-bottom",
  name: "Race to the Bottom",
  description: "Lowest score wins",
  diceCount: 5,
  rollsPerTurn: 3,
  categories: CLASSIC_RULESET.categories,
  winCondition: "lowest",
  getBonus: getBonusScore,
  getTotal: (scores) => computeTotal(scores, getBonusScore),
  fiveOfAKindId: "weetzee",
};
