import type { Ruleset } from "../types";
import { CLASSIC_RULESET, getFullTotal, getBonusScore, EXTRA_WEETZEE_VALUE } from "./classic";
import { KEEP_YOUR_HEAD_DOWN_RULESET } from "./keep-your-head-down";
import { A_LITTLE_HELP_RULESET } from "./a-little-help";
import { KISMET_RULESET } from "./kismet";
import { EVERYTHING_IN_ORDER_RULESET } from "./everything-in-order";

export const ALL_RULESETS: Ruleset[] = [
  CLASSIC_RULESET,
  KISMET_RULESET,
  KEEP_YOUR_HEAD_DOWN_RULESET,
  EVERYTHING_IN_ORDER_RULESET,
  A_LITTLE_HELP_RULESET,
];

export function getRuleset(id: string): Ruleset {
  return ALL_RULESETS.find((r) => r.id === id) ?? CLASSIC_RULESET;
}

export function getRulesetBonus(ruleset: Ruleset, scores: Record<string, number | null>): number {
  if (ruleset.getBonus) return ruleset.getBonus(scores);
  return getBonusScore(scores);
}

export function getRulesetTotal(
  ruleset: Ruleset,
  scores: Record<string, number | null>,
  extraWeetzees: number = 0
): number {
  if (ruleset.getTotal) return ruleset.getTotal(scores, extraWeetzees);
  return getFullTotal(scores, extraWeetzees);
}
