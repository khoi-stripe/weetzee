"use client";

import { useEffect, useReducer, useRef } from "react";
import { gameReducer, makeInitialState } from "@/lib/engine";
import { getRuleset } from "@/lib/rulesets";
import type { GameState, GameView } from "@/lib/types";

const STORAGE_KEY = "weetzee-game";

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
    return { ...rest, ruleset };
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
    if (saved) dispatch({ type: "RESTORE", state: saved });
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
  }

  function toggleMultipleWeetzees() {
    dispatch({ type: "TOGGLE_MULTIPLE_WEETZEES" });
  }

  return { state, roll, toggleHold, scoreCategory, setView, toggleRollBanking, toggleMultipleWeetzees };
}

export type UseGameReturn = ReturnType<typeof useGame>;
export type { GameState };
