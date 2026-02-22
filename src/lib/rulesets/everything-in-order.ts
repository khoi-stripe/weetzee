import type { Ruleset } from "../types";
import { UPPER_SECTION, LOWER_SECTION, getBonusScore, getFullTotal } from "./classic";

export const EVERYTHING_IN_ORDER_RULESET: Ruleset = {
  id: "everything-in-order",
  name: "Everything in Order",
  description: "Score categories top to bottom",
  diceCount: 5,
  rollsPerTurn: 3,
  categories: [...UPPER_SECTION, ...LOWER_SECTION],
  winCondition: "highest",
  getBonus: getBonusScore,
  getTotal: getFullTotal,
  fiveOfAKindId: "weetzee",
  orderedScoring: true,
};
