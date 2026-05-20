"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState, GameAction } from "@/lib/types";
import {
  scorecardChooseHolds,
  scorecardChooseCategory,
  farkleChooseSetAside,
  farkleShouldBank,
} from "@/lib/ai";

const AI_DELAY_ROLL = 1200;
const AI_DELAY_HOLD = 400;
const AI_DELAY_SCORE = 1400;
const AI_DELAY_FARKLE_SET_ASIDE = 1100;
const AI_DELAY_FARKLE_BANK = 1600;
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

// Sentinel thrown by `delay` when the AI run has been cancelled.
// Caught by the outer try in each runner so cancellation cleanly unwinds.
const CANCELLED = Symbol("ai-cancelled");

interface RunSignal {
  cancelled: () => boolean;
  onAbort: (cb: () => void) => void;
}

function delay(ms: number, signal: RunSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.cancelled()) {
      reject(CANCELLED);
      return;
    }
    const t = setTimeout(() => {
      resolve();
    }, ms);
    signal.onAbort(() => {
      clearTimeout(t);
      reject(CANCELLED);
    });
  });
}

/**
 * Hook that watches the game state and auto-plays when it's a computer player's turn.
 * Returns `isAITurn` so UI can disable human input.
 *
 * Concurrency model: each effect run owns a private RunSignal. When the effect
 * cleans up (deps change / unmount), the signal is aborted, which rejects any
 * pending `delay()` and causes the run* function to bail in its catch block.
 * No state is shared across runs, so a stuck run can't deadlock the next one.
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
  const isAITurn = !!currentPlayer?.isComputer && !state.gameOver;
  const [aiPendingAction, setAIPendingAction] = useState<string | null>(null);
  const prevPlayerRef = useRef(state.currentPlayerIndex);
  const needsTransitionDelay = useRef(false);

  if (prevPlayerRef.current !== state.currentPlayerIndex) {
    needsTransitionDelay.current = state.players.length > 1 && state.rollsUsed === 0;
    prevPlayerRef.current = state.currentPlayerIndex;
  }

  useEffect(() => {
    if (!isAITurn) {
      setAIPendingAction(null);
      return;
    }

    // Piggyback offers are handled by FarkleView's interstitial.
    if (state.piggybackOffer) return;

    let cancelled = false;
    const abortHandlers: Array<() => void> = [];
    const signal: RunSignal = {
      cancelled: () => cancelled,
      onAbort: (cb) => {
        if (cancelled) cb();
        else abortHandlers.push(cb);
      },
    };

    const isFarkle = !!state.ruleset.farkle;

    async function run() {
      try {
        if (needsTransitionDelay.current) {
          await delay(AI_DELAY_TRANSITION, signal);
          // Only clear after the delay actually completed; if cancelled,
          // the next effect run should re-honor the transition.
          needsTransitionDelay.current = false;
        }
        if (cancelled) return;

        if (isFarkle) {
          await runFarkleAI(state, dispatch, signal, callbacks, setAIPendingAction);
        } else {
          await runScorecardAI(state, dispatch, signal, callbacks);
        }
      } catch (err) {
        if (err !== CANCELLED) {
          console.error("[useAI] Unexpected error:", err);
          setAIPendingAction(null);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
      for (const cb of abortHandlers) cb();
      abortHandlers.length = 0;
    };
  }, [
    isAITurn,
    state.rollsUsed,
    state.currentPlayerIndex,
    state.turn,
    state.farkled,
    state.mustSetAside,
    state.setAsideDiceIds.length,
    state.piggybackOffer,
  ]);

  return { isAITurn, aiPendingAction };
}

// ===== Scorecard AI (Weetzee / Kismet) =====

async function runScorecardAI(
  state: GameState,
  dispatch: DispatchFn,
  signal: RunSignal,
  callbacks?: { onAIScored?: () => void },
) {
  const maxRolls = state.ruleset.rollsPerTurn;
  const rollsLeft = maxRolls - state.rollsUsed;

  if (state.rollsUsed === 0) {
    await delay(jitter(AI_DELAY_ROLL), signal);
    dispatch({ type: "ROLL" });
    return;
  }

  if (rollsLeft > 0) {
    const decision = scorecardChooseHolds(state);

    const currentlyHeld = new Set(state.dice.filter((d) => d.held).map((d) => d.id));
    const targetHeld = new Set(decision.holdIds);
    const toggleCount = state.dice.filter(d => targetHeld.has(d.id) !== currentlyHeld.has(d.id)).length;

    await delay(thinkTime(toggleCount / state.dice.length), signal);

    let first = true;
    for (const d of state.dice) {
      const shouldHold = targetHeld.has(d.id);
      const isHeld = currentlyHeld.has(d.id);
      if (shouldHold !== isHeld) {
        await delay(first ? jitter(AI_DELAY_HOLD) : jitter(AI_DELAY_HOLD * 0.5), signal);
        first = false;
        dispatch({ type: "TOGGLE_HOLD", dieId: d.id });
      }
    }

    const heldAfter = decision.holdIds.length;
    if (heldAfter >= state.dice.length) {
      await delay(jitter(AI_DELAY_SCORE), signal);
      dispatch({ type: "SET_VIEW", view: "scorecard" });
      await delay(jitter(AI_DELAY_SCORE), signal);
      const catId = scorecardChooseCategory(state);
      if (catId) {
        dispatch({ type: "SCORE_CATEGORY", categoryId: catId });
        callbacks?.onAIScored?.();
      }
      return;
    }

    await delay(jitter(AI_DELAY_ROLL), signal);
    dispatch({ type: "ROLL" });
    return;
  }

  await delay(thinkTime(0.7), signal);
  const catId = scorecardChooseCategory(state);
  if (catId) {
    dispatch({ type: "SCORE_CATEGORY", categoryId: catId });
    callbacks?.onAIScored?.();
  }
}

// ===== Farkle AI =====

async function runFarkleAI(
  state: GameState,
  dispatch: DispatchFn,
  signal: RunSignal,
  callbacks?: { onAIBanked?: () => void; onAIBusted?: () => void },
  signalAction?: (action: string | null) => void,
) {
  async function signalAndDelay(action: string, totalMs: number) {
    const total = jitter(totalMs);
    const thinkMs = Math.max(0, total - AI_PRESS_DURATION);
    if (thinkMs > 0) await delay(thinkMs, signal);
    signalAction?.(action);
    await delay(Math.min(total, AI_PRESS_DURATION), signal);
  }

  try {
    if (state.piggybackOffer) return;

    if (state.farkled) {
      // Bust screen + auto-dismiss is owned by FarkleView; AI just yields.
      return;
    }

    if (state.rollsUsed === 0) {
      await signalAndDelay("roll", AI_DELAY_ROLL);
      dispatch({ type: "ROLL" });
      signalAction?.(null);
      return;
    }

    if (state.mustSetAside) {
      const decision = farkleChooseSetAside(state);
      const diceCount = decision.holdIds.length;
      await delay(thinkTime(diceCount / 6), signal);
      if (diceCount > 0) {
        let first = true;
        for (const id of decision.holdIds) {
          await delay(first ? jitter(350) : jitter(200), signal);
          first = false;
          dispatch({ type: "TOGGLE_HOLD", dieId: id });
        }
        await signalAndDelay("set-aside", AI_DELAY_FARKLE_SET_ASIDE);
        dispatch({ type: "SET_ASIDE" });
        signalAction?.(null);
      }
      return;
    }

    const hotDice = state.setAsideDiceIds.length === 0 && state.turnScore > 0 && state.rollsUsed > 0;
    if (hotDice) {
      await delay(thinkTime(0.3), signal);
      await signalAndDelay("roll", AI_DELAY_ROLL);
      dispatch({ type: "ROLL" });
      signalAction?.(null);
      return;
    }

    const bankWeight = state.turnScore > 2000 ? 0.9 : state.turnScore > 500 ? 0.6 : 0.3;
    await delay(thinkTime(bankWeight), signal);

    if (state.turnScore > 0 && farkleShouldBank(state)) {
      await signalAndDelay("bank", AI_DELAY_FARKLE_BANK);
      dispatch({ type: "BANK" });
      signalAction?.(null);
      callbacks?.onAIBanked?.();
      return;
    }

    if (state.setAsideDiceIds.length > 0) {
      await signalAndDelay("roll", AI_DELAY_ROLL);
      dispatch({ type: "ROLL" });
      signalAction?.(null);
      return;
    }
  } catch (err) {
    // Cancellation: clear any "pressing..." UI hint and bail silently.
    signalAction?.(null);
    if (err !== CANCELLED) throw err;
  }
}
