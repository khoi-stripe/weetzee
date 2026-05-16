import type { Ruleset } from "../types";
import { CLASSIC_RULESET, getFullTotal, getBonusScore } from "./classic";
import { KISMET_RULESET } from "./kismet";
import { FARKLE_RULESET } from "./farkle";

export const ALL_RULESETS: Ruleset[] = [
  FARKLE_RULESET,
  CLASSIC_RULESET,
  KISMET_RULESET,
];

export const VISIBLE_RULESETS: Ruleset[] = ALL_RULESETS;

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
