// ===== Core Game Types =====

export interface ScoreCategory {
  id: string;
  name: string;
  /** Returns the score for the given dice, or null if the combination is invalid / cannot be scored */
  evaluate: (dice: number[]) => number | null;
  maxScore: number;
}

export interface Ruleset {
  id: string;
  name: string;
  diceCount: number;
  rollsPerTurn: number;
  categories: ScoreCategory[];
}

// ===== Player =====

export const PLAYER_COLORS = ["#ffcc00", "#34c759", "#007aff", "#ff6b6b"] as const;

export interface Player {
  id: string;
  name: string;
  color: string;
  scores: Record<string, number | null>;
}

// ===== Die =====

export interface Die {
  id: number;
  value: number;
  held: boolean;
}

// ===== Game State =====

export type GameView = "rolling" | "scorecard";

export interface GameState {
  ruleset: Ruleset;
  players: Player[];
  currentPlayerIndex: number;
  dice: Die[];
  rollsUsed: number;
  turn: number;
  view: GameView;
  gameOver: boolean;
}

// ===== Actions =====

export type GameAction =
  | { type: "ROLL" }
  | { type: "TOGGLE_HOLD"; dieId: number }
  | { type: "SCORE_CATEGORY"; categoryId: string }
  | { type: "SET_VIEW"; view: GameView };
