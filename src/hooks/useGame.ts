"use client";

import { useReducer } from "react";
import { gameReducer, makeInitialState } from "@/lib/engine";
import { YAHTZEE_RULESET } from "@/lib/rulesets/yahtzee";
import type { GameState, GameView } from "@/lib/types";

export function useGame(playerCount: number) {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => makeInitialState(YAHTZEE_RULESET, playerCount)
  );

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

  return { state, roll, toggleHold, scoreCategory, setView };
}

export type UseGameReturn = ReturnType<typeof useGame>;
export type { GameState };
