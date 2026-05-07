"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { gameReducer, makeInitialState } from "@/lib/engine";
import { getRuleset } from "@/lib/rulesets";
import { makeClassicCategories } from "@/lib/rulesets/classic";
import { makeKismetCategories } from "@/lib/rulesets/kismet";
import { getPlayerColors } from "@/lib/types";
import type { GameState, GameView, AIDifficulty } from "@/lib/types";

const STORAGE_KEY = "weetzee-game";
const PREFS_KEY = "weetzee-prefs";

type HouseRulesPrefs = {
  rollBankingEnabled: boolean;
  multipleWeetzeesEnabled: boolean;
  sequentialTargetsEnabled: boolean;
  scoringHintsEnabled: boolean;
  sixDiceEnabled: boolean;
  orderedScoringEnabled: boolean;
  openingThresholdEnabled: boolean;
  piggybackEnabled: boolean;
  aiDifficulty: AIDifficulty;
};

function savePrefs(prefs: HouseRulesPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

function loadPrefs(): HouseRulesPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        rollBankingEnabled: parsed.rollBankingEnabled ?? false,
        multipleWeetzeesEnabled: parsed.multipleWeetzeesEnabled ?? false,
        sequentialTargetsEnabled: parsed.sequentialTargetsEnabled ?? false,
        scoringHintsEnabled: parsed.scoringHintsEnabled ?? true,
        sixDiceEnabled: parsed.sixDiceEnabled ?? false,
        orderedScoringEnabled: parsed.orderedScoringEnabled ?? false,
        openingThresholdEnabled: parsed.openingThresholdEnabled ?? false,
        piggybackEnabled: parsed.piggybackEnabled ?? false,
        aiDifficulty: parsed.aiDifficulty ?? "medium",
      };
    }
  } catch {}
  return {
    rollBankingEnabled: false, multipleWeetzeesEnabled: false, sequentialTargetsEnabled: false,
    scoringHintsEnabled: true, sixDiceEnabled: false, orderedScoringEnabled: false,
    openingThresholdEnabled: false, piggybackEnabled: false, aiDifficulty: "medium",
  };
}

const MAX_SAVE_AGE_MS = 24 * 60 * 60 * 1000;

type SerializableState = Omit<GameState, "ruleset"> & { rulesetId: string; savedAt: number };

function saveState(state: GameState) {
  try {
    const { ruleset, ...rest } = state;
    const serializable: SerializableState = { ...rest, rulesetId: ruleset.id, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {}
}

function loadState(playerCount: number, rulesetId: string): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved: SerializableState = JSON.parse(raw);
    if (saved.savedAt && Date.now() - saved.savedAt > MAX_SAVE_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (saved.rulesetId !== rulesetId || saved.players.length !== playerCount) return null;
    let ruleset = getRuleset(saved.rulesetId);
    const { rulesetId: _, savedAt: _ts, ...rest } = saved;
    const sixDice = rest.sixDiceEnabled ?? false;
    const orderedScoring = rest.orderedScoringEnabled ?? false;
    if (sixDice) {
      const diceCount = 6;
      if (ruleset.id === "weetzee") {
        ruleset = { ...ruleset, categories: makeClassicCategories(diceCount) };
      } else if (ruleset.id === "kismet") {
        ruleset = { ...ruleset, categories: makeKismetCategories(diceCount) };
      }
    }
    if (orderedScoring) {
      ruleset = { ...ruleset, orderedScoring: true };
    }
    const sessionColors = getPlayerColors();
    const players = rest.players.map((p: any, i: number) => ({
      ...p,
      color: sessionColors[i] ?? p.color,
      isComputer: p.isComputer ?? false,
    }));
    return {
      ...rest,
      players,
      ruleset,
      sequentialTargetsEnabled: rest.sequentialTargetsEnabled ?? false,
      turnScore: rest.turnScore ?? 0,
      turnScoreAtRollStart: rest.turnScoreAtRollStart ?? 0,
      setAsideDiceIds: rest.setAsideDiceIds ?? [],
      currentRollSetAsideIds: rest.currentRollSetAsideIds ?? [],
      farkled: rest.farkled ?? false,
      mustSetAside: rest.mustSetAside ?? false,
      finalRound: rest.finalRound ?? false,
      finalRoundTriggeredBy: rest.finalRoundTriggeredBy ?? -1,
      scoringHintsEnabled: rest.scoringHintsEnabled ?? true,
      sixDiceEnabled: sixDice,
      orderedScoringEnabled: orderedScoring,
      openingThresholdEnabled: rest.openingThresholdEnabled ?? false,
      piggybackEnabled: rest.piggybackEnabled ?? false,
      piggybackOffer: rest.piggybackOffer ?? null,
      aiDifficulty: rest.aiDifficulty ?? "medium",
    };
  } catch {
    return null;
  }
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function useGame(playerCount: number, rulesetId: string = "weetzee", aiIndices: number[] = []) {
  const ruleset = getRuleset(rulesetId);
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => makeInitialState(ruleset, playerCount, aiIndices)
  );

  const didRestore = useRef(false);

  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    const saved = loadState(playerCount, rulesetId);
    if (saved && !saved.gameOver) {
      dispatch({ type: "RESTORE", state: saved });
    } else {
      clearState();
      const prefs = loadPrefs();
      if (prefs.rollBankingEnabled && !ruleset.forcedRolls && !ruleset.targetAssignment) dispatch({ type: "TOGGLE_ROLL_BANKING" });
      if (prefs.multipleWeetzeesEnabled) dispatch({ type: "TOGGLE_MULTIPLE_WEETZEES" });
      if (prefs.sequentialTargetsEnabled && ruleset.targetAssignment) dispatch({ type: "TOGGLE_SEQUENTIAL_TARGETS" });
      if (!prefs.scoringHintsEnabled) dispatch({ type: "TOGGLE_SCORING_HINTS" });
      if (prefs.sixDiceEnabled) dispatch({ type: "TOGGLE_SIX_DICE" });
      if (prefs.orderedScoringEnabled) dispatch({ type: "TOGGLE_ORDERED_SCORING" });
      if (prefs.openingThresholdEnabled && ruleset.farkle) dispatch({ type: "TOGGLE_OPENING_THRESHOLD" });
      if (prefs.piggybackEnabled && ruleset.farkle) dispatch({ type: "TOGGLE_PIGGYBACK" });
      if (prefs.aiDifficulty !== "medium") dispatch({ type: "SET_AI_DIFFICULTY", difficulty: prefs.aiDifficulty });
    }
  }, [playerCount, rulesetId]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!didRestore.current) return;
    if (state.gameOver) {
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      clearState();
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState(stateRef.current);
      saveTimer.current = null;
    }, 200);
  }, [state]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        if (!stateRef.current.gameOver) saveState(stateRef.current);
      }
    };
  }, []);

  const currentPrefs = useCallback((): HouseRulesPrefs => {
    const s = stateRef.current;
    return {
      rollBankingEnabled: s.rollBankingEnabled,
      multipleWeetzeesEnabled: s.multipleWeetzeesEnabled,
      sequentialTargetsEnabled: s.sequentialTargetsEnabled,
      scoringHintsEnabled: s.scoringHintsEnabled,
      sixDiceEnabled: s.sixDiceEnabled,
      orderedScoringEnabled: s.orderedScoringEnabled,
      openingThresholdEnabled: s.openingThresholdEnabled,
      piggybackEnabled: s.piggybackEnabled,
      aiDifficulty: s.aiDifficulty,
    };
  }, []);

  const roll = useCallback(() => { dispatch({ type: "ROLL" }); }, []);
  const toggleHold = useCallback((dieId: number) => { dispatch({ type: "TOGGLE_HOLD", dieId }); }, []);
  const scoreCategory = useCallback((categoryId: string) => { dispatch({ type: "SCORE_CATEGORY", categoryId }); }, []);
  const setView = useCallback((view: GameView) => { dispatch({ type: "SET_VIEW", view }); }, []);
  const setAside = useCallback(() => { dispatch({ type: "SET_ASIDE" }); }, []);
  const bank = useCallback(() => { dispatch({ type: "BANK" }); }, []);
  const acceptPiggyback = useCallback(() => { dispatch({ type: "ACCEPT_PIGGYBACK" }); }, []);
  const endGame = useCallback(() => { clearState(); }, []);

  const toggleRollBanking = useCallback(() => {
    dispatch({ type: "TOGGLE_ROLL_BANKING" });
    savePrefs({ ...currentPrefs(), rollBankingEnabled: !stateRef.current.rollBankingEnabled });
  }, [currentPrefs]);

  const toggleMultipleWeetzees = useCallback(() => {
    dispatch({ type: "TOGGLE_MULTIPLE_WEETZEES" });
    savePrefs({ ...currentPrefs(), multipleWeetzeesEnabled: !stateRef.current.multipleWeetzeesEnabled });
  }, [currentPrefs]);

  const toggleSequentialTargets = useCallback(() => {
    dispatch({ type: "TOGGLE_SEQUENTIAL_TARGETS" });
    savePrefs({ ...currentPrefs(), sequentialTargetsEnabled: !stateRef.current.sequentialTargetsEnabled });
  }, [currentPrefs]);

  const toggleScoringHints = useCallback(() => {
    dispatch({ type: "TOGGLE_SCORING_HINTS" });
    savePrefs({ ...currentPrefs(), scoringHintsEnabled: !stateRef.current.scoringHintsEnabled });
  }, [currentPrefs]);

  const toggleSixDice = useCallback(() => {
    dispatch({ type: "TOGGLE_SIX_DICE" });
    savePrefs({ ...currentPrefs(), sixDiceEnabled: !stateRef.current.sixDiceEnabled });
  }, [currentPrefs]);

  const toggleOrderedScoring = useCallback(() => {
    dispatch({ type: "TOGGLE_ORDERED_SCORING" });
    savePrefs({ ...currentPrefs(), orderedScoringEnabled: !stateRef.current.orderedScoringEnabled });
  }, [currentPrefs]);

  const toggleOpeningThreshold = useCallback(() => {
    dispatch({ type: "TOGGLE_OPENING_THRESHOLD" });
    savePrefs({ ...currentPrefs(), openingThresholdEnabled: !stateRef.current.openingThresholdEnabled });
  }, [currentPrefs]);

  const togglePiggyback = useCallback(() => {
    dispatch({ type: "TOGGLE_PIGGYBACK" });
    savePrefs({ ...currentPrefs(), piggybackEnabled: !stateRef.current.piggybackEnabled });
  }, [currentPrefs]);

  const setAIDifficulty = useCallback((difficulty: AIDifficulty) => {
    dispatch({ type: "SET_AI_DIFFICULTY", difficulty });
    savePrefs({ ...currentPrefs(), aiDifficulty: difficulty });
  }, [currentPrefs]);

  return { state, roll, toggleHold, scoreCategory, setView, toggleRollBanking, toggleMultipleWeetzees, toggleSequentialTargets, setAside, bank, toggleScoringHints, toggleSixDice, toggleOrderedScoring, toggleOpeningThreshold, togglePiggyback, acceptPiggyback, setAIDifficulty, endGame };
}

export type UseGameReturn = ReturnType<typeof useGame>;
