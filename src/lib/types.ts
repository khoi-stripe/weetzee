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
  description: string;
  diceCount: number;
  rollsPerTurn: number;
  categories: ScoreCategory[];
  winCondition: "highest" | "lowest";
  getBonus?: (scores: Record<string, number | null>) => number;
  getTotal?: (scores: Record<string, number | null>, extraWeetzees?: number) => number;
  fiveOfAKindId?: string;
  pipColors?: boolean;
  orderedScoring?: boolean;
  forcedRolls?: boolean;
  highestScoreOnly?: boolean;
  alwaysAvailableId?: string;
  lockedHolds?: boolean;
  dieValueMap?: Record<number, number>;
  targetAssignment?: boolean;
}

// ===== Player =====

export const PLAYER_COLORS = [
  "#ffcc00",  // yellow
  "#34c759",  // green
  "#00d4ff",  // cyan
  "#af52de",  // violet
  "#ff6b9d",  // pink
  "#2dd4bf",  // teal
] as const;

export interface Player {
  id: string;
  name: string;
  color: string;
  scores: Record<string, number | null>;
  bankedRolls: number;
  extraWeetzees: number;
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
  lockedDiceIds: number[];
  turn: number;
  view: GameView;
  gameOver: boolean;
  rollBankingEnabled: boolean;
  multipleWeetzeesEnabled: boolean;
}

// ===== Actions =====

export type GameAction =
  | { type: "ROLL" }
  | { type: "TOGGLE_HOLD"; dieId: number }
  | { type: "SCORE_CATEGORY"; categoryId: string }
  | { type: "SET_VIEW"; view: GameView }
  | { type: "TOGGLE_ROLL_BANKING" }
  | { type: "TOGGLE_MULTIPLE_WEETZEES" }
  | { type: "RESTORE"; state: GameState };
