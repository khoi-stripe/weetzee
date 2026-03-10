import type { GameState, Die, AIDifficulty } from "./types";
import { getAvailableScores } from "./engine";
import { counts } from "./rulesets/classic";
import { scoreDice } from "./rulesets/farkle";

// ===== Scorecard AI (Weetzee / Kismet) =====

interface HoldDecision {
  holdIds: number[];
  targetCategoryId: string;
}

export function scorecardChooseHolds(state: GameState): HoldDecision {
  const difficulty = state.aiDifficulty;
  const player = state.players[state.currentPlayerIndex];
  const dice = state.dice;
  const values = dice.map((d) => d.value);
  const available = getAvailableScores(values, state.ruleset, player.scores);

  const bestCatId = pickBestCategory(available, state, difficulty);
  if (!bestCatId) {
    return { holdIds: [], targetCategoryId: "" };
  }

  let holdIds = computeHoldsForCategory(dice, bestCatId, state);

  if (difficulty === "easy") {
    holdIds = perturbHolds(dice, holdIds, 0.3);
  }

  return { holdIds, targetCategoryId: bestCatId };
}

export function scorecardChooseCategory(state: GameState): string | null {
  const difficulty = state.aiDifficulty;
  const player = state.players[state.currentPlayerIndex];
  const values = state.dice.map((d) => d.value);
  const available = getAvailableScores(values, state.ruleset, player.scores);
  return pickBestCategory(available, state, difficulty);
}

function pickBestCategory(
  available: Record<string, number>,
  state: GameState,
  difficulty: AIDifficulty,
): string | null {
  const entries = Object.entries(available);
  if (entries.length === 0) return null;

  const categories = state.ruleset.categories;

  // Easy: 25% chance of picking a random available category
  if (difficulty === "easy" && entries.length > 1 && Math.random() < 0.25) {
    const idx = Math.floor(Math.random() * entries.length);
    return entries[idx][0];
  }

  let best: { id: string; value: number } | null = null;

  for (const [id, score] of entries) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) continue;

    const maxScore = cat.maxScore || 1;
    const efficiency = score / maxScore;

    let value: number;
    if (difficulty === "hard") {
      // Hard: stronger penalty for zeroing high-value categories,
      // bonus for approaching upper section bonus threshold
      const wastePenalty = score === 0 ? -maxScore * 0.8 : 0;
      const upperBonus = getUpperBonusBoost(id, score, state);
      value = score + efficiency * 15 + wastePenalty + upperBonus;
    } else {
      value = score === 0 ? -maxScore * 0.5 : score + efficiency * 10;
    }

    if (!best || value > best.value) {
      best = { id, value };
    }
  }

  // If all choices are zero, pick the one with the lowest max (least waste)
  if (best && (available[best.id] ?? 0) === 0) {
    let leastWaste: { id: string; maxScore: number } | null = null;
    for (const [id] of entries) {
      if (available[id] !== 0) continue;
      const cat = categories.find((c) => c.id === id);
      if (!cat) continue;

      if (difficulty === "easy") {
        // Easy: doesn't optimize waste — just picks any zero category
        return id;
      }

      if (!leastWaste || cat.maxScore < leastWaste.maxScore) {
        leastWaste = { id, maxScore: cat.maxScore };
      }
    }
    if (leastWaste) return leastWaste.id;
  }

  return best?.id ?? null;
}

/**
 * Hard mode: gives a scoring boost to upper section categories that
 * help reach the 63-point bonus threshold.
 */
function getUpperBonusBoost(
  categoryId: string,
  score: number,
  state: GameState,
): number {
  const upperMatch = categoryId.match(/^upper_(\d)$/);
  if (!upperMatch || score === 0) return 0;

  const player = state.players[state.currentPlayerIndex];
  const UPPER_IDS = [1, 2, 3, 4, 5, 6].map((f) => `upper_${f}`);
  const currentUpper = UPPER_IDS.reduce(
    (s, id) => s + ((player.scores[id] as number) ?? 0),
    0,
  );

  const face = parseInt(upperMatch[1], 10);
  const target = face * 3; // 3× face value = "on track" for bonus
  if (score >= target) return 8;
  if (currentUpper + score >= 50) return 5;
  return 0;
}

/**
 * Easy mode: randomly include/exclude some dice from the hold decision.
 * `noise` is the probability that each die flips its hold status.
 */
function perturbHolds(dice: Die[], holdIds: number[], noise: number): number[] {
  const holdSet = new Set(holdIds);
  const result: number[] = [];
  for (const d of dice) {
    const isHeld = holdSet.has(d.id);
    const flip = Math.random() < noise;
    if (flip ? !isHeld : isHeld) {
      result.push(d.id);
    }
  }
  return result;
}

function computeHoldsForCategory(
  dice: Die[],
  categoryId: string,
  state: GameState,
): number[] {
  const values = dice.map((d) => d.value);
  const c = counts(values);

  const upperMatch = categoryId.match(/^upper_(\d)$/);
  if (upperMatch) {
    const face = parseInt(upperMatch[1], 10);
    return dice.filter((d) => d.value === face).map((d) => d.id);
  }

  if (
    categoryId === "three_of_a_kind" ||
    categoryId === "four_of_a_kind" ||
    categoryId === "weetzee" ||
    categoryId === "kismet"
  ) {
    const bestFace = Object.entries(c)
      .sort(([, a], [, b]) => b - a || parseInt(b as any) - parseInt(a as any))[0];
    if (bestFace) {
      const face = parseInt(bestFace[0], 10);
      return dice.filter((d) => d.value === face).map((d) => d.id);
    }
  }

  if (categoryId === "full_house" || categoryId === "full_house_same_color") {
    const sorted = Object.entries(c).sort(([, a], [, b]) => b - a);
    if (sorted.length >= 2) {
      const tripleFace = parseInt(sorted[0][0], 10);
      const pairFace = parseInt(sorted[1][0], 10);
      const tripleCount = Math.min(sorted[0][1], 3);
      const pairCount = Math.min(sorted[1][1], 2);
      const holds: number[] = [];
      let tc = 0, pc = 0;
      for (const d of dice) {
        if (d.value === tripleFace && tc < tripleCount) { holds.push(d.id); tc++; }
        else if (d.value === pairFace && pc < pairCount) { holds.push(d.id); pc++; }
      }
      return holds;
    }
  }

  if (
    categoryId === "sm_straight" ||
    categoryId === "lg_straight" ||
    categoryId === "straight"
  ) {
    const target =
      categoryId === "sm_straight"
        ? findBestSmallStraightTarget(values)
        : findBestLargeStraightTarget(values);
    const held = new Set<number>();
    const usedFaces = new Set<number>();
    for (const face of target) {
      const die = dice.find((d) => d.value === face && !held.has(d.id) && !usedFaces.has(d.value));
      if (die) {
        held.add(die.id);
        usedFaces.add(die.value);
      }
    }
    return [...held];
  }

  if (categoryId === "flush") {
    const colorBuckets: Record<string, Die[]> = {};
    for (const d of dice) {
      const color = d.value <= 2 ? "white" : d.value <= 4 ? "red" : "green";
      (colorBuckets[color] ??= []).push(d);
    }
    const bestColor = Object.entries(colorBuckets).sort(([, a], [, b]) => b.length - a.length)[0];
    if (bestColor) return bestColor[1].map((d) => d.id);
  }

  if (categoryId === "two_pair_same_color") {
    const colorBuckets: Record<string, Die[]> = {};
    for (const d of dice) {
      const color = d.value <= 2 ? "white" : d.value <= 4 ? "red" : "green";
      (colorBuckets[color] ??= []).push(d);
    }
    const bestColor = Object.entries(colorBuckets).sort(([, a], [, b]) => b.length - a.length)[0];
    if (bestColor) return bestColor[1].map((d) => d.id);
  }

  if (categoryId === "chance" || categoryId === "yarborough") {
    return dice.filter((d) => d.value >= 4).map((d) => d.id);
  }

  return [];
}

function findBestSmallStraightTarget(values: number[]): number[] {
  const targets = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
  let best: number[] = targets[0];
  let bestCount = 0;
  for (const t of targets) {
    const present = t.filter((n) => values.includes(n)).length;
    if (present > bestCount) { bestCount = present; best = t; }
  }
  return best;
}

function findBestLargeStraightTarget(values: number[]): number[] {
  const targets = [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]];
  let best: number[] = targets[0];
  let bestCount = 0;
  for (const t of targets) {
    const present = t.filter((n) => values.includes(n)).length;
    if (present > bestCount) { bestCount = present; best = t; }
  }
  return best;
}

// ===== Farkle AI =====

interface FarkleSetAsideDecision {
  holdIds: number[];
}

export function farkleChooseSetAside(state: GameState): FarkleSetAsideDecision {
  const difficulty = state.aiDifficulty;
  const activeDice = state.dice.filter(
    (d) => !state.setAsideDiceIds.includes(d.id) && !state.currentRollSetAsideIds.includes(d.id)
  );
  const activeValues = activeDice.map((d) => d.value);
  if (activeValues.length === 0) return { holdIds: [] };

  if (difficulty === "easy") {
    return { holdIds: findMinimalFarkleSelection(activeDice) };
  }

  return { holdIds: findBestFarkleSelection(activeDice, difficulty) };
}

/**
 * Easy mode: just pick the minimum required scoring dice (single 1 or single 5).
 * Less efficient but keeps more dice to roll.
 */
function findMinimalFarkleSelection(dice: Die[]): number[] {
  const one = dice.find((d) => d.value === 1);
  if (one) return [one.id];
  const five = dice.find((d) => d.value === 5);
  if (five) return [five.id];
  // Fallback to best selection if no singles available
  return findBestFarkleSelection(dice, "easy");
}

function findBestFarkleSelection(dice: Die[], difficulty: AIDifficulty): number[] {
  const values = dice.map((d) => d.value);
  const faceCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const v of values) faceCounts[v]++;

  if (dice.length === 6) {
    const isStraight =
      faceCounts[1] === 1 && faceCounts[2] === 1 && faceCounts[3] === 1 &&
      faceCounts[4] === 1 && faceCounts[5] === 1 && faceCounts[6] === 1;
    if (isStraight) return dice.map((d) => d.id);

    let pairs = 0;
    for (let f = 1; f <= 6; f++) {
      if (faceCounts[f] === 2) pairs++;
      else if (faceCounts[f] === 4) pairs += 2;
      else if (faceCounts[f] === 6) pairs += 3;
    }
    if (pairs === 3) return dice.map((d) => d.id);
  }

  const selections: { ids: number[]; score: number; remaining: number }[] = [];

  for (let face = 1; face <= 6; face++) {
    if (faceCounts[face] >= 3) {
      const count = faceCounts[face];
      const matchingDice = dice.filter((d) => d.value === face);
      const ids = matchingDice.slice(0, count).map((d) => d.id);
      const vals = matchingDice.slice(0, count).map((d) => d.value);
      selections.push({ ids, score: scoreDice(vals), remaining: dice.length - count });
    }
  }

  if (faceCounts[1] > 0 && faceCounts[1] < 3) {
    for (let n = faceCounts[1]; n >= 1; n--) {
      const ones = dice.filter((d) => d.value === 1).slice(0, n);
      selections.push({ ids: ones.map((d) => d.id), score: n * 100, remaining: dice.length - n });
    }
  }
  if (faceCounts[5] > 0 && faceCounts[5] < 3) {
    for (let n = faceCounts[5]; n >= 1; n--) {
      const fives = dice.filter((d) => d.value === 5).slice(0, n);
      selections.push({ ids: fives.map((d) => d.id), score: n * 50, remaining: dice.length - n });
    }
  }

  if (selections.length === 0) return [];

  // Hard: prefer higher score even at cost of fewer remaining dice
  // Medium: balanced score vs remaining
  // Easy: prefer keeping more dice (already handled above, this is fallback)
  const remainingWeight = difficulty === "hard" ? 15 : difficulty === "easy" ? 50 : 30;

  let best = selections[0];
  for (const s of selections) {
    const sValue = s.score + s.remaining * remainingWeight;
    const bValue = best.score + best.remaining * remainingWeight;
    if (sValue > bValue) best = s;
  }

  return best.ids;
}

export function farkleShouldBank(state: GameState): boolean {
  const difficulty = state.aiDifficulty;
  const player = state.players[state.currentPlayerIndex];
  const total = (player.scores["total"] as number) ?? 0;
  const turnScore = state.turnScore;

  if (state.openingThresholdEnabled && total === 0 && turnScore < 500) {
    return false;
  }

  const effectiveDiceCount = state.sixDiceEnabled ? 6 : state.ruleset.diceCount;
  const activeDice = effectiveDiceCount - state.setAsideDiceIds.length;

  if (activeDice === 0 && turnScore > 0) return false;

  // Difficulty-scaled thresholds
  const thresholds = getBankingThresholds(difficulty);

  if (activeDice <= 1) return turnScore >= thresholds.dice1;
  if (activeDice <= 2) return turnScore >= thresholds.dice2;
  if (activeDice <= 3) return turnScore >= thresholds.dice3;
  if (turnScore >= thresholds.always) return true;

  // Hard: position-aware adjustments
  if (difficulty === "hard") {
    const maxOpponentScore = state.players
      .filter((_, i) => i !== state.currentPlayerIndex)
      .reduce((max, p) => Math.max(max, (p.scores["total"] as number) ?? 0), 0);

    if (total + turnScore < maxOpponentScore - 2000) {
      if (activeDice >= 3) return turnScore >= 1000;
      return turnScore >= 600;
    }

    if (state.finalRound) {
      const threshold = state.ruleset.winThreshold ?? 10000;
      if (total + turnScore < threshold) return false;
      return true;
    }
  }

  // Medium: modest position awareness
  if (difficulty === "medium") {
    const maxOpponentScore = state.players
      .filter((_, i) => i !== state.currentPlayerIndex)
      .reduce((max, p) => Math.max(max, (p.scores["total"] as number) ?? 0), 0);

    if (total + turnScore < maxOpponentScore - 2000) {
      if (activeDice >= 3) return turnScore >= 800;
      return turnScore >= 500;
    }

    if (state.finalRound) {
      const threshold = state.ruleset.winThreshold ?? 10000;
      if (total + turnScore < threshold) return false;
      return true;
    }
  }

  return turnScore >= thresholds.default;
}

function getBankingThresholds(difficulty: AIDifficulty) {
  switch (difficulty) {
    case "easy":
      return { dice1: 150, dice2: 200, dice3: 300, always: 500, default: 300 };
    case "hard":
      return { dice1: 350, dice2: 500, dice3: 750, always: 1500, default: 700 };
    default:
      return { dice1: 250, dice2: 400, dice3: 600, always: 1000, default: 500 };
  }
}

// ===== Keep Your Head Down AI =====

interface TargetHoldDecision {
  holdIds: number[];
  targetCategoryId: string;
}

export function kyhdChooseHolds(state: GameState): TargetHoldDecision {
  const difficulty = state.aiDifficulty;
  const player = state.players[state.currentPlayerIndex];
  const dice = state.dice;
  const values = dice.map((d) => d.value);
  const dieValueMap = state.ruleset.dieValueMap;

  const available = getAvailableScores(values, state.ruleset, player.scores);
  const bestTarget = kyhdPickBestTarget(available, state, difficulty);
  if (!bestTarget) return { holdIds: [], targetCategoryId: "" };

  const targetNum = parseInt(
    state.ruleset.categories.find((c) => c.id === bestTarget)?.name ?? "0",
    10,
  );

  let holdIds = kyhdComputeHolds(dice, targetNum, dieValueMap);

  if (difficulty === "easy") {
    holdIds = perturbHolds(dice, holdIds, 0.25);
  }

  return { holdIds, targetCategoryId: bestTarget };
}

export function kyhdChooseTarget(state: GameState): string | null {
  const difficulty = state.aiDifficulty;
  const player = state.players[state.currentPlayerIndex];
  const values = state.dice.map((d) => d.value);
  const available = getAvailableScores(values, state.ruleset, player.scores);
  return kyhdPickBestTarget(available, state, difficulty);
}

function kyhdPickBestTarget(
  available: Record<string, number>,
  state: GameState,
  difficulty: AIDifficulty,
): string | null {
  const entries = Object.entries(available);
  if (entries.length === 0) return null;

  // Easy: 30% chance of random target
  if (difficulty === "easy" && entries.length > 1 && Math.random() < 0.3) {
    const idx = Math.floor(Math.random() * entries.length);
    return entries[idx][0];
  }

  let best: { id: string; penalty: number } | null = null;
  for (const [id, penalty] of entries) {
    if (!best || penalty < best.penalty) {
      best = { id, penalty };
    }
  }

  // Hard: if the best penalty is high, consider saving it for a later round
  // when the dice might be more favorable
  if (difficulty === "hard" && best && best.penalty > 9 && entries.length > 2) {
    const sorted = entries.sort(([, a], [, b]) => a - b);
    const secondBest = sorted[1];
    if (secondBest && secondBest[1] - best.penalty <= 3) {
      const bestCat = state.ruleset.categories.find((c) => c.id === best!.id);
      const secondCat = state.ruleset.categories.find((c) => c.id === secondBest[0]);
      const bestTarget = parseInt(bestCat?.name ?? "0", 10);
      const secondTarget = parseInt(secondCat?.name ?? "0", 10);
      // Prefer saving extreme targets (10, 20) for later — they're harder to hit
      if (bestTarget === 10 || bestTarget === 20) {
        return secondBest[0];
      }
    }
  }

  return best?.id ?? null;
}

function kyhdComputeHolds(
  dice: Die[],
  target: number,
  dieValueMap?: Record<number, number>,
): number[] {
  const mappedValue = (face: number) => dieValueMap?.[face] ?? face;
  const currentSum = dice.reduce((s, d) => s + mappedValue(d.value), 0);

  if (currentSum === target) {
    return dice.map((d) => d.id);
  }

  const n = dice.length;
  let bestHold: number[] = [];
  let bestDiff = Infinity;

  for (let mask = 0; mask < (1 << n); mask++) {
    const held: Die[] = [];
    let heldSum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        held.push(dice[i]);
        heldSum += mappedValue(dice[i].value);
      }
    }

    if (held.length === 0) continue;
    if (held.length === n) continue;

    const remaining = n - held.length;
    const avgDie = [1, 2, 3, 4, 5, 6].reduce((s, f) => s + mappedValue(f), 0) / 6;
    const expectedRemaining = remaining * avgDie;
    const expectedTotal = heldSum + expectedRemaining;
    const diff = Math.abs(expectedTotal - target);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestHold = held.map((d) => d.id);
    }
  }

  return bestHold;
}

// ===== Accept Piggyback Decision =====

export function farkleShouldAcceptPiggyback(state: GameState): boolean {
  if (!state.piggybackOffer) return false;
  const difficulty = state.aiDifficulty;
  const offer = state.piggybackOffer;
  const remainingDice = offer.dice.filter(
    (d) => !offer.setAsideDiceIds.includes(d.id),
  );
  const isHotDice = remainingDice.length === 0;

  // Easy: rarely accepts piggyback (too risky for a cautious player)
  if (difficulty === "easy") {
    if (isHotDice) return offer.turnScore >= 400;
    return remainingDice.length >= 4;
  }

  // Hard: almost always accepts — it's a free advantage
  if (difficulty === "hard") {
    if (isHotDice) return true;
    return remainingDice.length >= 1 || offer.turnScore >= 150;
  }

  // Medium
  if (isHotDice) return offer.turnScore >= 200;
  return remainingDice.length >= 2 || offer.turnScore >= 300;
}
