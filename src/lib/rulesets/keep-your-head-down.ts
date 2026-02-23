import type { Ruleset, ScoreCategory } from "../types";

const DIE_VALUE_MAP: Record<number, number> = { 3: 0 };

function dieValue(face: number): number {
  return DIE_VALUE_MAP[face] ?? face;
}

function diceSum(dice: number[]): number {
  return dice.reduce((sum, face) => sum + dieValue(face), 0);
}

export function computeTargetPenalty(sum: number, target: number): number {
  const diff = Math.abs(sum - target);
  if (diff === 0) return -3;
  return diff * 3;
}

function makeTargetCategories(min: number, max: number): ScoreCategory[] {
  const cats: ScoreCategory[] = [];
  for (let t = min; t <= max; t++) {
    cats.push({
      id: `target_${t}`,
      name: `${t}`,
      evaluate: (dice) => computeTargetPenalty(diceSum(dice), t),
      maxScore: -3,
    });
  }
  return cats;
}

export const KEEP_YOUR_HEAD_DOWN_RULESET: Ruleset = {
  id: "keep-your-head-down",
  name: "Keep Your Head Down",
  description: "Hit the targets",
  diceCount: 5,
  rollsPerTurn: 3,
  categories: makeTargetCategories(10, 20),
  winCondition: "lowest",
  getBonus: () => 0,
  getTotal: (scores) => {
    return Object.values(scores)
      .filter((v): v is number => v !== null && v !== undefined)
      .reduce((sum, v) => sum + v, 0);
  },
  dieValueMap: DIE_VALUE_MAP,
  targetAssignment: true,
};
