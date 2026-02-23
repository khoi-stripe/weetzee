import type { Ruleset } from "../types";
import { CLASSIC_RULESET } from "./classic";

export const KEEP_YOUR_HEAD_DOWN_RULESET: Ruleset = {
  id: "keep-your-head-down",
  name: "Keep Your Head Down",
  description: "Lowest score wins",
  diceCount: 5,
  rollsPerTurn: 3,
  categories: CLASSIC_RULESET.categories,
  winCondition: "lowest",
  getBonus: () => 0,
  getTotal: (scores) => {
    return Object.entries(scores)
      .filter(([id]) => id !== "bonus")
      .reduce((sum, [, v]) => sum + (v ?? 0), 0);
  },
  fiveOfAKindId: "weetzee",
  forcedRolls: true,
  highestScoreOnly: true,
};
