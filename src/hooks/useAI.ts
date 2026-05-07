"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { GameState, GameAction } from "@/lib/types";
import {
  scorecardChooseHolds,
  scorecardChooseCategory,
  farkleChooseSetAside,
  farkleShouldBank,
  kyhdChooseHolds,
  kyhdChooseTarget,
} from "@/lib/ai";

const AI_DELAY_ROLL = 1200;
const AI_DELAY_HOLD = 400;
const AI_DELAY_SCORE = 1400;
const AI_DELAY_FARKLE_SET_ASIDE = 1100;
const AI_DELAY_FARKLE_BANK = 1600;
const AI_DELAY_FARKLE_BUST = 1650;
const AI_DELAY_TRANSITION = 2640;
const AI_PRESS_DURATION = 500;

const AI_THINK_SHORT = 500;
const AI_THINK_LONG = 1200;

function jitter(ms: number): number {
  const spread = 0.6 + Math.random() * 0.8;
  return Math.round(ms * spread);
}

function thinkTime(complexity: number): number {
  const base = AI_THINK_SHORT + (AI_THINK_LONG - AI_THINK_SHORT) * Math.min(complexity, 1);
  return jitter(base);
}

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
): { isAITurn: boolean; aiPendingAction: string | null } {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isAITurn = currentPlayer?.isComputer && !state.gameOver;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const cancelledRef = useRef(false);
  const [aiPendingAction, setAIPendingAction] = useState<string | null>(null);
  const prevPlayerRef = useRef(state.currentPlayerIndex);
  const needsTransitionDelay = useRef(false);

  if (prevPlayerRef.current !== state.currentPlayerIndex) {
    needsTransitionDelay.current = state.players.length > 1 && state.rollsUsed === 0;
    prevPlayerRef.current = state.currentPlayerIndex;
  }

  useEffect(() => {
    if (!isAITurn) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      busyRef.current = false;
      setAIPendingAction(null);
      return;
    }

    if (busyRef.current) return;

    // Piggyback offers are handled by FarkleView interstitial
    if (state.piggybackOffer) return;

    busyRef.current = true;
    cancelledRef.current = false;

    const isFarkle = !!state.ruleset.farkle;
    const isTarget = !!state.ruleset.targetAssignment;

    async function run() {
      try {
        if (needsTransitionDelay.current) {
          needsTransitionDelay.current = false;
          await delay(AI_DELAY_TRANSITION, timerRef);
        }
        if (cancelledRef.current) { busyRef.current = false; return; }

        busyRef.current = false;
        if (isFarkle) {
          runFarkleAI(state, dispatch, timerRef, busyRef, callbacks, setAIPendingAction);
        } else if (isTarget) {
          runTargetAI(state, dispatch, timerRef, busyRef, callbacks);
        } else {
          runScorecardAI(state, dispatch, timerRef, busyRef, callbacks);
        }
      } catch {
        busyRef.current = false;
      }
    }

    run();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      busyRef.current = false;
    };
  }, [isAITurn, state.rollsUsed, state.currentPlayerIndex, state.turn, state.farkled, state.mustSetAside, state.setAsideDiceIds.length, state.piggybackOffer]);

  return { isAITurn: !!isAITurn, aiPendingAction };
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
      await delay(jitter(AI_DELAY_ROLL), timerRef);
      dispatch({ type: "ROLL" });
      busyRef.current = false;
      return;
    }

    if (rollsLeft > 0) {
      const decision = scorecardChooseHolds(state);

      const currentlyHeld = new Set(state.dice.filter((d) => d.held).map((d) => d.id));
      const targetHeld = new Set(decision.holdIds);
      const toggleCount = state.dice.filter(d => targetHeld.has(d.id) !== currentlyHeld.has(d.id)).length;

      await delay(thinkTime(toggleCount / state.dice.length), timerRef);

      let first = true;
      for (const d of state.dice) {
        const shouldHold = targetHeld.has(d.id);
        const isHeld = currentlyHeld.has(d.id);
        if (shouldHold !== isHeld) {
          await delay(first ? jitter(AI_DELAY_HOLD) : jitter(AI_DELAY_HOLD * 0.5), timerRef);
          first = false;
          dispatch({ type: "TOGGLE_HOLD", dieId: d.id });
        }
      }

      const heldAfter = decision.holdIds.length;
      if (heldAfter >= state.dice.length) {
        await delay(jitter(AI_DELAY_SCORE), timerRef);
        dispatch({ type: "SET_VIEW", view: "scorecard" });
        await delay(jitter(AI_DELAY_SCORE), timerRef);
        const catId = scorecardChooseCategory(state);
        if (catId) {
          dispatch({ type: "SCORE_CATEGORY", categoryId: catId });
          callbacks?.onAIScored?.();
        }
        busyRef.current = false;
        return;
      }

      await delay(jitter(AI_DELAY_ROLL), timerRef);
      dispatch({ type: "ROLL" });
      busyRef.current = false;
      return;
    }

    await delay(thinkTime(0.7), timerRef);
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
      await delay(jitter(AI_DELAY_ROLL), timerRef);
      dispatch({ type: "ROLL" });
      busyRef.current = false;
      return;
    }

    if (rollsLeft > 0) {
      const decision = kyhdChooseHolds(state);

      const currentlyHeld = new Set(state.dice.filter((d) => d.held).map((d) => d.id));
      const targetHeld = new Set(decision.holdIds);
      const toggleCount = state.dice.filter(d => targetHeld.has(d.id) !== currentlyHeld.has(d.id)).length;

      await delay(thinkTime(toggleCount / state.dice.length), timerRef);

      let first = true;
      for (const d of state.dice) {
        const shouldHold = targetHeld.has(d.id);
        const isHeld = currentlyHeld.has(d.id);
        if (shouldHold !== isHeld) {
          await delay(first ? jitter(AI_DELAY_HOLD) : jitter(AI_DELAY_HOLD * 0.5), timerRef);
          first = false;
          dispatch({ type: "TOGGLE_HOLD", dieId: d.id });
        }
      }

      const heldCount = decision.holdIds.length;
      if (heldCount < state.dice.length) {
        await delay(jitter(AI_DELAY_ROLL), timerRef);
        dispatch({ type: "ROLL" });
        busyRef.current = false;
        return;
      }
    }

    await delay(jitter(AI_DELAY_SCORE), timerRef);
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
  signalAction?: (action: string | null) => void,
) {
  if (busyRef.current) return;
  busyRef.current = true;

  async function signalAndDelay(action: string, totalMs: number) {
    const total = jitter(totalMs);
    const thinkMs = Math.max(0, total - AI_PRESS_DURATION);
    if (thinkMs > 0) await delay(thinkMs, timerRef);
    signalAction?.(action);
    await delay(Math.min(total, AI_PRESS_DURATION), timerRef);
  }

  try {
    if (state.piggybackOffer) {
      busyRef.current = false;
      return;
    }

    if (state.farkled) {
      busyRef.current = false;
      return;
    }

    if (state.rollsUsed === 0) {
      await signalAndDelay("roll", AI_DELAY_ROLL);
      dispatch({ type: "ROLL" });
      signalAction?.(null);
      busyRef.current = false;
      return;
    }

    if (state.mustSetAside) {
      const decision = farkleChooseSetAside(state);
      const diceCount = decision.holdIds.length;
      await delay(thinkTime(diceCount / 6), timerRef);
      if (diceCount > 0) {
        let first = true;
        for (const id of decision.holdIds) {
          await delay(first ? jitter(350) : jitter(200), timerRef);
          first = false;
          dispatch({ type: "TOGGLE_HOLD", dieId: id });
        }
        await signalAndDelay("set-aside", AI_DELAY_FARKLE_SET_ASIDE);
        dispatch({ type: "SET_ASIDE" });
        signalAction?.(null);
      }
      busyRef.current = false;
      return;
    }

    const hotDice = state.setAsideDiceIds.length === 0 && state.turnScore > 0 && state.rollsUsed > 0;
    if (hotDice) {
      await delay(thinkTime(0.3), timerRef);
      await signalAndDelay("roll", AI_DELAY_ROLL);
      dispatch({ type: "ROLL" });
      signalAction?.(null);
      busyRef.current = false;
      return;
    }

    const bankWeight = state.turnScore > 2000 ? 0.9 : state.turnScore > 500 ? 0.6 : 0.3;
    await delay(thinkTime(bankWeight), timerRef);

    if (state.turnScore > 0 && farkleShouldBank(state)) {
      await signalAndDelay("bank", AI_DELAY_FARKLE_BANK);
      dispatch({ type: "BANK" });
      signalAction?.(null);
      callbacks?.onAIBanked?.();
      busyRef.current = false;
      return;
    }

    if (state.setAsideDiceIds.length > 0) {
      await signalAndDelay("roll", AI_DELAY_ROLL);
      dispatch({ type: "ROLL" });
      signalAction?.(null);
      busyRef.current = false;
      return;
    }

    busyRef.current = false;
  } catch {
    signalAction?.(null);
    busyRef.current = false;
  }
}
