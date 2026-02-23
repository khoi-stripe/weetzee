"use client";

import { useEffect, useReducer, useRef } from "react";
import { gameReducer, makeInitialState } from "@/lib/engine";
import { getRuleset } from "@/lib/rulesets";
import type { GameState, GameView } from "@/lib/types";

const STORAGE_KEY = "weetzee-game";
const PREFS_KEY = "weetzee-prefs";

type HouseRulesPrefs = {
  rollBankingEnabled: boolean;
  multipleWeetzeesEnabled: boolean;
  sequentialTargetsEnabled: boolean;
};

function savePrefs(prefs: HouseRulesPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

function loadPrefs(): HouseRulesPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { rollBankingEnabled: false, multipleWeetzeesEnabled: false, sequentialTargetsEnabled: false };
}

type SerializableState = Omit<GameState, "ruleset"> & { rulesetId: string };

function saveState(state: GameState) {
  try {
    const { ruleset, ...rest } = state;
    const serializable: SerializableState = { ...rest, rulesetId: ruleset.id };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {}
}

function loadState(playerCount: number, rulesetId: string): GameState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved: SerializableState = JSON.parse(raw);
    if (saved.rulesetId !== rulesetId || saved.players.length !== playerCount) return null;
    const ruleset = getRuleset(saved.rulesetId);
    const { rulesetId: _, ...rest } = saved;
    return { ...rest, ruleset, sequentialTargetsEnabled: rest.sequentialTargetsEnabled ?? false };
  } catch {
    return null;
  }
}

function clearState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function useGame(playerCount: number, rulesetId: string = "classic") {
  const ruleset = getRuleset(rulesetId);
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => makeInitialState(ruleset, playerCount)
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
    }
  }, [playerCount, rulesetId]);

  useEffect(() => {
    if (!didRestore.current) return;
    if (state.gameOver) {
      clearState();
    } else {
      saveState(state);
    }
  }, [state]);

  function roll() {
    dispatch({ type: "ROLL" });
  }

  function toggleHold(dieId: number) {
    dispatch({ type: "TOGGLE_HOLD", dieId });
  }

  function scoreCategory(categoryId: string) {
    dispatch({ type: "SCORE_CATEGORY", categoryId });
  }

  function setView(view: GameView) {
    dispatch({ type: "SET_VIEW", view });
  }

  function toggleRollBanking() {
    dispatch({ type: "TOGGLE_ROLL_BANKING" });
    savePrefs({
      rollBankingEnabled: !state.rollBankingEnabled,
      multipleWeetzeesEnabled: state.multipleWeetzeesEnabled,
      sequentialTargetsEnabled: state.sequentialTargetsEnabled,
    });
  }

  function toggleMultipleWeetzees() {
    dispatch({ type: "TOGGLE_MULTIPLE_WEETZEES" });
    savePrefs({
      rollBankingEnabled: state.rollBankingEnabled,
      multipleWeetzeesEnabled: !state.multipleWeetzeesEnabled,
      sequentialTargetsEnabled: state.sequentialTargetsEnabled,
    });
  }

  function toggleSequentialTargets() {
    dispatch({ type: "TOGGLE_SEQUENTIAL_TARGETS" });
    savePrefs({
      rollBankingEnabled: state.rollBankingEnabled,
      multipleWeetzeesEnabled: state.multipleWeetzeesEnabled,
      sequentialTargetsEnabled: !state.sequentialTargetsEnabled,
    });
  }

  function endGame() {
    clearState();
  }

  return { state, roll, toggleHold, scoreCategory, setView, toggleRollBanking, toggleMultipleWeetzees, toggleSequentialTargets, endGame };
}

export type UseGameReturn = ReturnType<typeof useGame>;
export type { GameState };
