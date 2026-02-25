import type { Die, GameState, GameAction, Player, Ruleset } from "./types";
import { PLAYER_COLORS } from "./types";
import { hasScoring, scoreDice, isValidSelection } from "./rulesets/farkle";
import { makeClassicCategories } from "./rulesets/classic";
import { makeKismetCategories } from "./rulesets/kismet";

// ===== Dice Helpers =====

export function rollValue(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function makeDice(count: number): Die[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    value: 1,
    held: false,
  }));
}

function rollDice(dice: Die[]): Die[] {
  return dice.map((d) => (d.held ? d : { ...d, value: rollValue() }));
}

function hasAllSame(dice: number[]): boolean {
  return dice.length > 0 && dice.every((d) => d === dice[0]);
}

// ===== Player Factory =====

export function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `P${i + 1}`,
    color: PLAYER_COLORS[i] ?? "#ffffff",
    scores: {},
    bankedRolls: 0,
    extraWeetzees: 0,
  }));
}

// ===== Initial State =====

export function makeInitialState(ruleset: Ruleset, playerCount: number): GameState {
  return {
    ruleset,
    players: makePlayers(playerCount),
    currentPlayerIndex: 0,
    dice: makeDice(ruleset.diceCount),
    rollsUsed: 0,
    turn: 1,
    view: ruleset.targetAssignment ? "scorecard" : "rolling",
    gameOver: false,
    rollBankingEnabled: false,
    multipleWeetzeesEnabled: false,
    sequentialTargetsEnabled: false,
    turnScore: 0,
    turnScoreAtRollStart: 0,
    setAsideDiceIds: [],
    currentRollSetAsideIds: [],
    farkled: false,
    mustSetAside: false,
    finalRound: false,
    finalRoundTriggeredBy: -1,
    scoringHintsEnabled: true,
    sixDiceEnabled: false,
    orderedScoringEnabled: false,
  };
}

const MAX_BANKED_ROLLS = 3;

export function getEffectiveRollsPerTurn(state: GameState): number {
  if (!state.rollBankingEnabled) return state.ruleset.rollsPerTurn;
  const player = state.players[state.currentPlayerIndex];
  return state.ruleset.rollsPerTurn + player.bankedRolls;
}

// ===== Die Value Helpers =====

export function getMappedDieValue(face: number, dieValueMap?: Record<number, number>): number {
  if (!dieValueMap) return face;
  return dieValueMap[face] ?? face;
}

export function getMappedDiceSum(dice: number[], dieValueMap?: Record<number, number>): number {
  return dice.reduce((sum, face) => sum + getMappedDieValue(face, dieValueMap), 0);
}

// ===== Score Helpers =====

export function getAvailableScores(
  dice: number[],
  ruleset: Ruleset,
  playerScores: Record<string, number | null>
): Record<string, number> {
  const result: Record<string, number> = {};

  const fiveId = ruleset.fiveOfAKindId ?? "weetzee";
  let foundNextOrdered = false;

  for (const cat of ruleset.categories) {
    if (cat.id === "bonus") continue;
    const unscored = playerScores[cat.id] === undefined || playerScores[cat.id] === null;
    if (!unscored) continue;

    if (ruleset.orderedScoring) {
      const isWild = cat.id === fiveId;
      if (!isWild && foundNextOrdered) continue;
      if (!isWild) foundNextOrdered = true;
    }

    const score = cat.evaluate(dice);
    result[cat.id] = score ?? 0;
  }
  return result;
}

function isGameOver(state: GameState): boolean {
  const { ruleset, players } = state;
  const scoreable = ruleset.categories.filter((cat) => cat.id !== "bonus");
  return players.every((p) =>
    scoreable.every((cat) => p.scores[cat.id] !== undefined)
  );
}

function advanceTurn(state: GameState): GameState {
  const nextPlayerIndex =
    (state.currentPlayerIndex + 1) % state.players.length;
  const nextTurn =
    nextPlayerIndex === 0 ? state.turn + 1 : state.turn;

  const effectiveDiceCount = state.sixDiceEnabled ? 6 : state.ruleset.diceCount;
  const newDice = makeDice(effectiveDiceCount);

  let players = state.players;
  if (state.rollBankingEnabled) {
    const effectiveMax = getEffectiveRollsPerTurn(state);
    const unused = Math.max(0, effectiveMax - state.rollsUsed);
    const currentPlayer = state.players[state.currentPlayerIndex];
    const newBanked = Math.min(unused, MAX_BANKED_ROLLS);
    players = state.players.map((p, i) =>
      i === state.currentPlayerIndex
        ? { ...p, bankedRolls: newBanked }
        : p
    );
  }

  const next: GameState = {
    ...state,
    players,
    currentPlayerIndex: nextPlayerIndex,
    dice: newDice,
    rollsUsed: 0,
    turn: nextTurn,
    view: state.ruleset.targetAssignment ? "scorecard" : "rolling",
    turnScore: 0,
    turnScoreAtRollStart: 0,
    setAsideDiceIds: [],
    currentRollSetAsideIds: [],
    farkled: false,
    mustSetAside: false,
  };

  if (state.finalRound && nextPlayerIndex === state.finalRoundTriggeredBy) {
    return { ...next, gameOver: true };
  }

  return next;
}

// ===== Reducer =====

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ROLL": {
      if (state.ruleset.farkle) {
        const activeDice = state.dice.filter(d => !state.setAsideDiceIds.includes(d.id));
        const diceToRoll = activeDice.length === 0 ? state.dice : activeDice;

        const allIds = diceToRoll.map(d => d.id);
        const newDice = state.dice.map(d => {
          if (allIds.includes(d.id)) return { ...d, value: rollValue(), held: false };
          return d;
        });

        const rolledValues = newDice.filter(d => allIds.includes(d.id)).map(d => d.value);
        const isFarkle = !hasScoring(rolledValues);

        if (isFarkle) {
          return {
            ...state,
            dice: newDice,
            rollsUsed: state.rollsUsed + 1,
            farkled: true,
            mustSetAside: false,
            turnScoreAtRollStart: state.turnScore,
            currentRollSetAsideIds: [],
            setAsideDiceIds: activeDice.length === 0 ? [] : state.setAsideDiceIds,
          };
        }

        return {
          ...state,
          dice: newDice,
          rollsUsed: state.rollsUsed + 1,
          farkled: false,
          mustSetAside: true,
          turnScoreAtRollStart: state.turnScore,
          currentRollSetAsideIds: [],
          setAsideDiceIds: activeDice.length === 0 ? [] : state.setAsideDiceIds,
        };
      }

      const effectiveMax = getEffectiveRollsPerTurn(state);
      if (state.rollsUsed >= effectiveMax) return state;

      const newDice = rollDice(state.dice);
      const newRollsUsed = state.rollsUsed + 1;

      return {
        ...state,
        dice: newDice,
        rollsUsed: newRollsUsed,
      };
    }

    case "TOGGLE_HOLD": {
      if (state.rollsUsed === 0) return state;
      const die = state.dice.find((d) => d.id === action.dieId);
      if (!die) return state;

      if (state.ruleset.farkle) {
        if (state.setAsideDiceIds.includes(action.dieId)) return state;
        if (state.farkled) return state;
      }

      return {
        ...state,
        dice: state.dice.map((d) =>
          d.id === action.dieId ? { ...d, held: !d.held } : d
        ),
      };
    }

    case "SCORE_CATEGORY": {
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer.scores[action.categoryId] !== undefined) return state;
      if (state.rollsUsed === 0) return state;

      const effectiveMax = getEffectiveRollsPerTurn(state);
      if (state.ruleset.forcedRolls && state.rollsUsed < effectiveMax) return state;

      const diceValues = state.dice.map((d) => d.value);
      const category = state.ruleset.categories.find(
        (c) => c.id === action.categoryId
      );
      if (!category) return state;

      const score = category.evaluate(diceValues) ?? 0;

      const fiveId = state.ruleset.fiveOfAKindId ?? "weetzee";
      const isWeetzee = hasAllSame(diceValues);
      const alreadyScoredWeetzee = currentPlayer.scores[fiveId] !== undefined && currentPlayer.scores[fiveId] !== null;
      const earnExtraWeetzee = !state.ruleset.targetAssignment && state.multipleWeetzeesEnabled && isWeetzee && alreadyScoredWeetzee && (currentPlayer.scores[fiveId] ?? 0) > 0;

      const updatedPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? {
              ...p,
              scores: { ...p.scores, [action.categoryId]: score },
              extraWeetzees: earnExtraWeetzee ? p.extraWeetzees + 1 : p.extraWeetzees,
            }
          : p
      );

      const updatedState = { ...state, players: updatedPlayers };

      if (isGameOver(updatedState)) {
        return { ...updatedState, gameOver: true };
      }

      return advanceTurn(updatedState);
    }

    case "SET_VIEW": {
      return { ...state, view: action.view };
    }

    case "TOGGLE_ROLL_BANKING": {
      return { ...state, rollBankingEnabled: !state.rollBankingEnabled };
    }

    case "TOGGLE_MULTIPLE_WEETZEES": {
      return { ...state, multipleWeetzeesEnabled: !state.multipleWeetzeesEnabled };
    }

    case "TOGGLE_SEQUENTIAL_TARGETS": {
      if (state.rollsUsed > 0 || state.turn > 1) return state;
      return { ...state, sequentialTargetsEnabled: !state.sequentialTargetsEnabled };
    }

    case "SET_ASIDE": {
      if (!state.ruleset.farkle || state.farkled) return state;
      const heldDice = state.dice.filter(d => d.held && !state.setAsideDiceIds.includes(d.id));
      if (heldDice.length === 0) return state;

      const selectedValues = heldDice.map(d => d.value);
      if (!isValidSelection(selectedValues)) return state;

      const newCurrentRollSetAsideIds = [...state.currentRollSetAsideIds, ...heldDice.map(d => d.id)];
      const allCurrentRollValues = state.dice
        .filter(d => newCurrentRollSetAsideIds.includes(d.id))
        .map(d => d.value);
      const cumulativeScore = scoreDice(allCurrentRollValues);

      const newSetAside = [...state.setAsideDiceIds, ...heldDice.map(d => d.id)];
      const effectiveDiceCount = state.sixDiceEnabled ? 6 : state.ruleset.diceCount;
      const allSetAside = newSetAside.length === effectiveDiceCount;

      const newTurnScore = state.turnScoreAtRollStart + cumulativeScore;
      return {
        ...state,
        turnScore: newTurnScore,
        turnScoreAtRollStart: allSetAside ? newTurnScore : state.turnScoreAtRollStart,
        currentRollSetAsideIds: allSetAside ? [] : newCurrentRollSetAsideIds,
        setAsideDiceIds: allSetAside ? [] : newSetAside,
        dice: state.dice.map(d => heldDice.some(h => h.id === d.id) ? { ...d, held: false } : d),
        mustSetAside: false,
      };
    }

    case "BANK": {
      if (!state.ruleset.farkle) return state;
      if (state.farkled) return advanceTurn(state);

      const currentPlayer = state.players[state.currentPlayerIndex];
      const prevTotal = (currentPlayer.scores["total"] as number) ?? 0;
      const newTotal = prevTotal + state.turnScore;

      const updatedPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, scores: { ...p.scores, total: newTotal } }
          : p
      );

      let nextState = { ...state, players: updatedPlayers };

      if (!state.finalRound && state.ruleset.winThreshold && newTotal >= state.ruleset.winThreshold) {
        nextState = {
          ...nextState,
          finalRound: true,
          finalRoundTriggeredBy: state.currentPlayerIndex,
        };
      }

      return advanceTurn(nextState);
    }

    case "TOGGLE_SIX_DICE": {
      if (state.rollsUsed > 0 || state.turn > 1) return state;
      const enabling = !state.sixDiceEnabled;
      const newDiceCount = enabling ? 6 : state.ruleset.diceCount;
      let newCategories = state.ruleset.categories;
      if (state.ruleset.id === "weetzee") {
        newCategories = makeClassicCategories(newDiceCount);
      } else if (state.ruleset.id === "kismet") {
        newCategories = makeKismetCategories(newDiceCount);
      }
      return {
        ...state,
        sixDiceEnabled: enabling,
        dice: makeDice(newDiceCount),
        ruleset: { ...state.ruleset, categories: newCategories },
      };
    }

    case "TOGGLE_ORDERED_SCORING": {
      if (state.rollsUsed > 0 || state.turn > 1) return state;
      return {
        ...state,
        orderedScoringEnabled: !state.orderedScoringEnabled,
        ruleset: { ...state.ruleset, orderedScoring: !state.orderedScoringEnabled },
      };
    }

    case "TOGGLE_SCORING_HINTS": {
      return { ...state, scoringHintsEnabled: !state.scoringHintsEnabled };
    }

    case "RESTORE": {
      return action.state;
    }

    default:
      return state;
  }
}
