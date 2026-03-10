"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GameState, GameAction } from "@/lib/types";
import {
  scorecardChooseHolds,
  scorecardChooseCategory,
  farkleChooseSetAside,
  farkleShouldBank,
  farkleShouldAcceptPiggyback,
  kyhdChooseHolds,
  kyhdChooseTarget,
} from "@/lib/ai";

const AI_DELAY_ROLL = 1200;
const AI_DELAY_HOLD = 600;
const AI_DELAY_SCORE = 800;
const AI_DELAY_FARKLE_SET_ASIDE = 800;
const AI_DELAY_FARKLE_BANK = 1000;
const AI_DELAY_FARKLE_BUST = 1500;

type DispatchFn = (action: GameAction) => void;

/**
 * Hook that watches the game state and auto-plays when it's a computer player's turn.
 * Returns `isAITurn` so UI can disable human input.
 */
export function useAI(
  state: GameState,
  dispatch: DispatchFn,
  callbacks?: {
    onAIScored?: () => void;
    onAIBanked?: () => void;
    onAIBusted?: () => void;
  }
): { isAITurn: boolean } {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isAITurn = currentPlayer?.isComputer && !state.gameOver;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    busyRef.current = false;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (!isAITurn) {
      cleanup();
      return;
    }

    if (busyRef.current) return;

    const isFarkle = !!state.ruleset.farkle;
    const isTarget = !!state.ruleset.targetAssignment;

    if (isFarkle) {
      runFarkleAI(state, dispatch, timerRef, busyRef, callbacks);
    } else if (isTarget) {
      runTargetAI(state, dispatch, timerRef, busyRef, callbacks);
    } else {
      runScorecardAI(state, dispatch, timerRef, busyRef, callbacks);
    }
  }, [isAITurn, state.rollsUsed, state.currentPlayerIndex, state.turn, state.farkled, state.mustSetAside, state.setAsideDiceIds.length, state.piggybackOffer]);

  return { isAITurn: !!isAITurn };
}

function delay(
  ms: number,
  timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>,
): Promise<void> {
  return new Promise((resolve) => {
    timerRef.current = setTimeout(resolve, ms);
  });
}

// ===== Scorecard AI (Weetzee / Kismet) =====

async function runScorecardAI(
  state: GameState,
  dispatch: DispatchFn,
  timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>,
  busyRef: React.RefObject<boolean>,
  callbacks?: { onAIScored?: () => void },
) {
  if (busyRef.current) return;
  busyRef.current = true;

  try {
    const maxRolls = state.ruleset.rollsPerTurn;
    const rollsLeft = maxRolls - state.rollsUsed;

    if (state.rollsUsed === 0) {
      // First roll
      await delay(AI_DELAY_ROLL, timerRef);
      dispatch({ type: "ROLL" });
      busyRef.current = false;
      return;
    }

    if (rollsLeft > 0) {
      // Decide holds then roll again
      const decision = scorecardChooseHolds(state);

      // Set holds
      const currentlyHeld = new Set(state.dice.filter((d) => d.held).map((d) => d.id));
      const targetHeld = new Set(decision.holdIds);

      for (const d of state.dice) {
        const shouldHold = targetHeld.has(d.id);
        const isHeld = currentlyHeld.has(d.id);
        if (shouldHold !== isHeld) {
          await delay(AI_DELAY_HOLD, timerRef);
          dispatch({ type: "TOGGLE_HOLD", dieId: d.id });
        }
      }

      // Check if all dice are held — go straight to scoring
      const heldAfter = decision.holdIds.length;
      if (heldAfter >= state.dice.length) {
        // All held — just score
        await delay(AI_DELAY_SCORE, timerRef);
        dispatch({ type: "SET_VIEW", view: "scorecard" });
        await delay(AI_DELAY_SCORE, timerRef);
        const catId = scorecardChooseCategory(state);
        if (catId) {
          dispatch({ type: "SCORE_CATEGORY", categoryId: catId });
          callbacks?.onAIScored?.();
        }
        busyRef.current = false;
        return;
      }

      await delay(AI_DELAY_ROLL, timerRef);
      dispatch({ type: "ROLL" });
      busyRef.current = false;
      return;
    }

    // No rolls left — score
    await delay(AI_DELAY_SCORE, timerRef);
    const catId = scorecardChooseCategory(state);
    if (catId) {
      dispatch({ type: "SCORE_CATEGORY", categoryId: catId });
      callbacks?.onAIScored?.();
    }
    busyRef.current = false;
  } catch {
    busyRef.current = false;
  }
}

// ===== Target AI (Keep Your Head Down) =====

async function runTargetAI(
  state: GameState,
  dispatch: DispatchFn,
  timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>,
  busyRef: React.RefObject<boolean>,
  callbacks?: { onAIScored?: () => void },
) {
  if (busyRef.current) return;
  busyRef.current = true;

  try {
    const maxRolls = state.ruleset.rollsPerTurn;
    const rollsLeft = maxRolls - state.rollsUsed;

    if (state.rollsUsed === 0) {
      // In target mode, player picks target first then rolls
      // But the game starts on the scorecard view, so we need to pick a target
      // Actually in KYHD, the flow is: view scorecard → roll → hold → roll → assign
      // Let's just roll first
      await delay(AI_DELAY_ROLL, timerRef);
      dispatch({ type: "ROLL" });
      busyRef.current = false;
      return;
    }

    if (rollsLeft > 0) {
      const decision = kyhdChooseHolds(state);

      const currentlyHeld = new Set(state.dice.filter((d) => d.held).map((d) => d.id));
      const targetHeld = new Set(decision.holdIds);

      for (const d of state.dice) {
        const shouldHold = targetHeld.has(d.id);
        const isHeld = currentlyHeld.has(d.id);
        if (shouldHold !== isHeld) {
          await delay(AI_DELAY_HOLD, timerRef);
          dispatch({ type: "TOGGLE_HOLD", dieId: d.id });
        }
      }

      // Roll again if we haven't used all rolls
      const heldCount = decision.holdIds.length;
      if (heldCount < state.dice.length) {
        await delay(AI_DELAY_ROLL, timerRef);
        dispatch({ type: "ROLL" });
        busyRef.current = false;
        return;
      }
    }

    // Score — pick best target
    await delay(AI_DELAY_SCORE, timerRef);
    const catId = kyhdChooseTarget(state);
    if (catId) {
      dispatch({ type: "SCORE_CATEGORY", categoryId: catId });
      callbacks?.onAIScored?.();
    }
    busyRef.current = false;
  } catch {
    busyRef.current = false;
  }
}

// ===== Farkle AI =====

async function runFarkleAI(
  state: GameState,
  dispatch: DispatchFn,
  timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>,
  busyRef: React.RefObject<boolean>,
  callbacks?: { onAIBanked?: () => void; onAIBusted?: () => void },
) {
  if (busyRef.current) return;
  busyRef.current = true;

  try {
    // Handle piggyback offer
    if (state.piggybackOffer) {
      await delay(AI_DELAY_ROLL, timerRef);
      if (farkleShouldAcceptPiggyback(state)) {
        dispatch({ type: "ACCEPT_PIGGYBACK" });
        await delay(AI_DELAY_ROLL, timerRef);
        dispatch({ type: "ROLL" });
      } else {
        // Decline piggyback → just roll fresh
        dispatch({ type: "ROLL" });
      }
      busyRef.current = false;
      return;
    }

    // Handle farkle (bust)
    if (state.farkled) {
      await delay(AI_DELAY_FARKLE_BUST, timerRef);
      dispatch({ type: "BANK" });
      callbacks?.onAIBusted?.();
      busyRef.current = false;
      return;
    }

    // Need to roll first
    if (state.rollsUsed === 0) {
      await delay(AI_DELAY_ROLL, timerRef);
      dispatch({ type: "ROLL" });
      busyRef.current = false;
      return;
    }

    // Must set aside scoring dice
    if (state.mustSetAside) {
      const decision = farkleChooseSetAside(state);
      if (decision.holdIds.length > 0) {
        for (const id of decision.holdIds) {
          await delay(300, timerRef);
          dispatch({ type: "TOGGLE_HOLD", dieId: id });
        }
        await delay(AI_DELAY_FARKLE_SET_ASIDE, timerRef);
        dispatch({ type: "SET_ASIDE" });
      }
      busyRef.current = false;
      return;
    }

    // Hot dice: all dice were set aside, setAsideDiceIds cleared — always roll
    const hotDice = state.setAsideDiceIds.length === 0 && state.turnScore > 0 && state.rollsUsed > 0;
    if (hotDice) {
      await delay(AI_DELAY_ROLL, timerRef);
      dispatch({ type: "ROLL" });
      busyRef.current = false;
      return;
    }

    // Decide: bank or roll
    if (state.turnScore > 0 && farkleShouldBank(state)) {
      await delay(AI_DELAY_FARKLE_BANK, timerRef);
      dispatch({ type: "BANK" });
      callbacks?.onAIBanked?.();
      busyRef.current = false;
      return;
    }

    // Roll again
    if (state.setAsideDiceIds.length > 0) {
      await delay(AI_DELAY_ROLL, timerRef);
      dispatch({ type: "ROLL" });
      busyRef.current = false;
      return;
    }

    busyRef.current = false;
  } catch {
    busyRef.current = false;
  }
}
