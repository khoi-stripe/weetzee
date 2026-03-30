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
  dieValueMap?: Record<number, number>;
  targetAssignment?: boolean;
  farkle?: boolean;
  winThreshold?: number;
}

// ===== Player =====

export const PLAYER_COLORS = [
  "#ffcc00",  // yellow
  "#34c759",  // green
  "#00d4ff",  // cyan
  "#af52de",  // violet
  "#ff6b9d",  // pink
  "#2dd4bf",  // teal
];

const COLORS_STORAGE_KEY = "weetzee-player-colors";

let _playerColors: string[] | null = null;

function loadStoredColors(): string[] | null {
  try {
    const raw = sessionStorage.getItem(COLORS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === PLAYER_COLORS.length) return parsed;
  } catch {}
  return null;
}

export function getPlayerColors(): string[] {
  if (_playerColors) return _playerColors;
  if (typeof window !== "undefined") {
    const stored = loadStoredColors();
    if (stored) {
      _playerColors = stored;
      return stored;
    }
  }
  return PLAYER_COLORS;
}

export function shufflePlayerColors(): string[] {
  const a = [...PLAYER_COLORS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  _playerColors = a;
  try { sessionStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(a)); } catch {}
  return a;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  scores: Record<string, number | null>;
  bankedRolls: number;
  extraWeetzees: number;
  isComputer: boolean;
}

// ===== Die =====

export interface Die {
  id: number;
  value: number;
  held: boolean;
}

// ===== AI Difficulty =====

export type AIDifficulty = "easy" | "medium" | "hard";

export const AI_DIFFICULTY_LABELS: Record<AIDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

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
  rollBankingEnabled: boolean;
  multipleWeetzeesEnabled: boolean;
  sequentialTargetsEnabled: boolean;
  turnScore: number;
  turnScoreAtRollStart: number;
  setAsideDiceIds: number[];
  currentRollSetAsideIds: number[];
  farkled: boolean;
  mustSetAside: boolean;
  finalRound: boolean;
  finalRoundTriggeredBy: number;
  scoringHintsEnabled: boolean;
  sixDiceEnabled: boolean;
  orderedScoringEnabled: boolean;
  openingThresholdEnabled: boolean;
  piggybackEnabled: boolean;
  piggybackOffer: { dice: Die[]; setAsideDiceIds: number[]; turnScore: number } | null;
  aiDifficulty: AIDifficulty;
}

// ===== Actions =====

export type GameAction =
  | { type: "ROLL" }
  | { type: "TOGGLE_HOLD"; dieId: number }
  | { type: "SCORE_CATEGORY"; categoryId: string }
  | { type: "SET_VIEW"; view: GameView }
  | { type: "TOGGLE_ROLL_BANKING" }
  | { type: "TOGGLE_MULTIPLE_WEETZEES" }
  | { type: "TOGGLE_SEQUENTIAL_TARGETS" }
  | { type: "SET_ASIDE" }
  | { type: "BANK" }
  | { type: "TOGGLE_SCORING_HINTS" }
  | { type: "TOGGLE_SIX_DICE" }
  | { type: "TOGGLE_ORDERED_SCORING" }
  | { type: "TOGGLE_OPENING_THRESHOLD" }
  | { type: "TOGGLE_PIGGYBACK" }
  | { type: "ACCEPT_PIGGYBACK" }
  | { type: "SET_AI_DIFFICULTY"; difficulty: AIDifficulty }
  | { type: "RESTORE"; state: GameState };
