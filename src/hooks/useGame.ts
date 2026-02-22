"use client";

import { useReducer } from "react";
import { gameReducer, makeInitialState } from "@/lib/engine";
import { getRuleset } from "@/lib/rulesets";
import type { GameState, GameView } from "@/lib/types";

export function useGame(playerCount: number, rulesetId: string = "yahtzee") {
  const ruleset = getRuleset(rulesetId);
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => makeInitialState(ruleset, playerCount)
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
