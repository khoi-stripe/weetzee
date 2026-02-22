import type { Die, GameState, GameAction, Player, Ruleset } from "./types";
import { PLAYER_COLORS } from "./types";

// ===== Dice Helpers =====

function rollValue(): number {
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
    view: "rolling",
    gameOver: false,
    rollBankingEnabled: false,
    multipleWeetzeesEnabled: false,
  };
}

const MAX_BANKED_ROLLS = 3;

export function getEffectiveRollsPerTurn(state: GameState): number {
  if (!state.rollBankingEnabled) return state.ruleset.rollsPerTurn;
  const player = state.players[state.currentPlayerIndex];
  return state.ruleset.rollsPerTurn + player.bankedRolls;
}

// ===== Score Helpers =====

export function getAvailableScores(
  dice: number[],
  ruleset: Ruleset,
  playerScores: Record<string, number | null>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const cat of ruleset.categories) {
    if (playerScores[cat.id] === undefined || playerScores[cat.id] === null) {
      const score = cat.evaluate(dice);
      if (score !== null) {
        result[cat.id] = score;
      }
    }
  }
  return result;
}

function isGameOver(state: GameState): boolean {
  const { ruleset, players } = state;
  return players.every((p) =>
    ruleset.categories.every((cat) => p.scores[cat.id] !== undefined)
  );
}

function advanceTurn(state: GameState): GameState {
  const nextPlayerIndex =
    (state.currentPlayerIndex + 1) % state.players.length;
  const nextTurn =
    nextPlayerIndex === 0 ? state.turn + 1 : state.turn;

  const newDice = makeDice(state.ruleset.diceCount);

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

  return {
    ...state,
    players,
    currentPlayerIndex: nextPlayerIndex,
    dice: newDice,
    rollsUsed: 0,
    turn: nextTurn,
    view: "rolling",
  };
}

// ===== Reducer =====

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ROLL": {
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
      // Can only hold after at least one roll, and before all rolls are used
      if (state.rollsUsed === 0) return state;
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

      const diceValues = state.dice.map((d) => d.value);
      const category = state.ruleset.categories.find(
        (c) => c.id === action.categoryId
      );
      if (!category) return state;

      const score = category.evaluate(diceValues) ?? 0;

      const fiveId = state.ruleset.fiveOfAKindId ?? "weetzee";
      const isWeetzee = hasAllSame(diceValues);
      const alreadyScoredWeetzee = currentPlayer.scores[fiveId] !== undefined && currentPlayer.scores[fiveId] !== null;
      const earnExtraWeetzee = state.multipleWeetzeesEnabled && isWeetzee && alreadyScoredWeetzee && (currentPlayer.scores[fiveId] ?? 0) > 0;

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

    default:
      return state;
  }
}

// ===== Score Totals =====

export function getPlayerTotal(player: Player): number {
  return Object.values(player.scores).reduce(
    (sum: number, v) => sum + (v ?? 0),
    0
  );
}
