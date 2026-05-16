"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DiceView } from "./DiceView";
import { PlayerBar } from "./PlayerBar";
import type { UseGameReturn } from "@/hooks/useGame";
import type { Die, Player } from "@/lib/types";
import { isValidSelection, scoreDice, getScoringPossibilities } from "@/lib/rulesets/farkle";
import { farkleShouldAcceptPiggyback } from "@/lib/ai";
import { playTap, playTurnChange, playConfirm, playFarkle, getAudioCtx } from "@/lib/sounds";
import { TYPE } from "@/lib/type";
import { COLOR } from "@/lib/color";
import { DURATION, EASE } from "@/lib/motion";
import { RADIUS, Z } from "@/lib/tokens";
import { Scrim } from "@/components/ui/Scrim";
import { DialogCard } from "@/components/ui/DialogCard";
import { RoundButton } from "@/components/ui/RoundButton";

export function FarkleView({ game, isAITurn = false, aiPendingAction = null }: { game: UseGameReturn; isAITurn?: boolean; aiPendingAction?: string | null }) {
  const { state, roll, toggleHold, setAside, bank, acceptPiggyback } = game;
  const currentPlayer = state.players[state.currentPlayerIndex];

  const [interstitialPlayer, setInterstitialPlayer] = useState<Player | null>(null);
  const [interstitialExiting, setInterstitialExiting] = useState(false);
  const [interstitialLastTurn, setInterstitialLastTurn] = useState(false);
  const [interstitialPiggyback, setInterstitialPiggyback] = useState<{ score: number; dice: Die[]; setAsideDiceIds: number[] } | null>(null);
  const [showFarkleBust, setShowFarkleBust] = useState(false);
  const [bustExiting, setBustExiting] = useState(false);
  const bustScoreRef = useRef(0);

  const showInterstitial = useCallback((player: Player | null) => {
    if (player) {
      setInterstitialExiting(false);
      setInterstitialPlayer(player);
      playTurnChange();
    } else {
      setInterstitialExiting(true);
      setTimeout(() => {
        setInterstitialPlayer(null);
        setInterstitialExiting(false);
      }, 400);
    }
  }, []);

  const bankTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPlayerIndex = useRef(state.currentPlayerIndex);

  useEffect(() => {
    return () => {
      if (bankTimer.current) clearTimeout(bankTimer.current);
    };
  }, []);

  const [aiPiggybackChoice, setAiPiggybackChoice] = useState<"fresh" | "piggyback" | null>(null);

  // Show interstitial when transitioning between players (e.g., after AI turn ends)
  useEffect(() => {
    if (prevPlayerIndex.current !== state.currentPlayerIndex) {
      const prevWasAI = state.players[prevPlayerIndex.current]?.isComputer;
      prevPlayerIndex.current = state.currentPlayerIndex;

      if (prevWasAI && state.players.length > 1) {
        if (state.piggybackOffer) {
          setInterstitialPiggyback({
            score: state.piggybackOffer.turnScore,
            dice: state.piggybackOffer.dice,
            setAsideDiceIds: state.piggybackOffer.setAsideDiceIds,
          });
        } else {
          setInterstitialPiggyback(null);
        }
        setInterstitialLastTurn(state.finalRound);
        setAiPiggybackChoice(null);
        showInterstitial(currentPlayer);
        if (!state.piggybackOffer) {
          setTimeout(() => showInterstitial(null), state.finalRound ? 3200 : 2000);
        }
      }
    }
  }, [state.currentPlayerIndex, state.piggybackOffer]);

  // Auto-tap piggyback choice for CPU players
  // 3-phase: press down → bounce back → execute + dismiss
  const aiPiggybackDecisionRef = useRef<boolean | null>(null);
  const aiPiggybackTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    aiPiggybackTimers.current.forEach(clearTimeout);
    aiPiggybackTimers.current = [];
    aiPiggybackDecisionRef.current = null;
    setAiPiggybackChoice(null);

    if (!interstitialPiggyback || !currentPlayer.isComputer) return;

    const accept = farkleShouldAcceptPiggyback(state);
    aiPiggybackDecisionRef.current = accept;

    // Phase 1 (1.5s): press down
    const t1 = setTimeout(() => {
      setAiPiggybackChoice(accept ? "piggyback" : "fresh");
    }, 1500);

    // Phase 2 (2.0s): release — clear choice so .pressable transition bounces back
    const t2 = setTimeout(() => {
      setAiPiggybackChoice(null);
    }, 2000);

    // Phase 3 (2.6s): execute action + dismiss
    const t3 = setTimeout(() => {
      if (aiPiggybackDecisionRef.current) {
        acceptPiggyback();
        roll();
      } else {
        roll();
      }
      showInterstitial(null);
    }, 2600);

    aiPiggybackTimers.current.push(t1, t2, t3);

    return () => {
      aiPiggybackTimers.current.forEach(clearTimeout);
      aiPiggybackTimers.current = [];
    };
  }, [interstitialPiggyback, currentPlayer.isComputer]);

  // Show farkle bust screen when farkled (after 2s delay so player sees the roll)
  const prevFarkled = useRef(false);
  const farkleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bustDice, setBustDice] = useState<{ value: number }[]>([]);
  const [bustKeptDice, setBustKeptDice] = useState<{ value: number }[]>([]);
  useEffect(() => {
    if (state.farkled && !prevFarkled.current) {
      bustScoreRef.current = state.turnScore;
      const activeDice = state.dice.filter(d => !state.setAsideDiceIds.includes(d.id));
      const keptDice = state.dice.filter(d => state.setAsideDiceIds.includes(d.id));
      setBustDice(activeDice.map(d => ({ value: d.value })));
      setBustKeptDice(keptDice.map(d => ({ value: d.value })));
      farkleTimer.current = setTimeout(() => {
        setShowFarkleBust(true);
        playFarkle();
        farkleTimer.current = null;
      }, 2000);
    }
    prevFarkled.current = state.farkled;
  }, [state.farkled, state.turnScore, state.dice, state.setAsideDiceIds]);

  useEffect(() => {
    return () => { if (farkleTimer.current) clearTimeout(farkleTimer.current); };
  }, []);

  // Auto-dismiss bust screen for CPU players
  const bustAutoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (bustAutoTimer.current) { clearTimeout(bustAutoTimer.current); bustAutoTimer.current = null; }
    if (!showFarkleBust || !isAITurn) return;
    bustAutoTimer.current = setTimeout(() => {
      handleBustDone();
      bustAutoTimer.current = null;
    }, 2500);
    return () => { if (bustAutoTimer.current) { clearTimeout(bustAutoTimer.current); bustAutoTimer.current = null; } };
  }, [showFarkleBust, isAITurn]);

  // Re-entry guard: handleBustDone can be invoked from the auto-timer (CPU bust),
  // the bust screen's Done button, and the human's "NEXT" bank button. If the
  // auto-timer fires and the user then taps Done before the 400ms exit completes,
  // a second handleBustDone double-banks and skips the next player's turn — the
  // human's roll button looks disabled because the CPU silently got the turn back.
  const bustDoneInFlight = useRef(false);
  function handleBustDone() {
    if (bustDoneInFlight.current) return;
    bustDoneInFlight.current = true;
    if (bustAutoTimer.current) {
      clearTimeout(bustAutoTimer.current);
      bustAutoTimer.current = null;
    }
    // Human can tap "NEXT" before the 2s pre-bust delay completes; cancel the
    // pending bust reveal so it doesn't pop on the next player's turn.
    if (farkleTimer.current) {
      clearTimeout(farkleTimer.current);
      farkleTimer.current = null;
    }

    setBustExiting(true);
    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextPlayerIndex];
    const isSinglePlayer = state.players.length === 1;

    setTimeout(() => {
      setShowFarkleBust(false);
      setBustExiting(false);

      const isLastTurn = state.finalRound;
      bank();
      bustDoneInFlight.current = false;

      if (!isSinglePlayer) {
        setInterstitialLastTurn(isLastTurn);
        setInterstitialPiggyback(null);
        showInterstitial(nextPlayer);
        setTimeout(() => showInterstitial(null), isLastTurn ? 3200 : 2000);
      }
    }, 400);
  }

  function handleBank() {
    if (bankTimer.current) return;
    playConfirm();

    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextPlayerIndex];
    const isSinglePlayer = state.players.length === 1;

    bankTimer.current = setTimeout(() => {
      const currentTotal = (currentPlayer.scores["total"] as number ?? 0) + state.turnScore;
      const isLastTurn = state.finalRound ||
        (!state.finalRound && !!state.ruleset.winThreshold && currentTotal >= state.ruleset.winThreshold);
      const hasPiggyback = state.piggybackEnabled && !isSinglePlayer;
      const piggybackInfo = hasPiggyback ? {
        score: state.turnScore,
        dice: state.dice,
        setAsideDiceIds: state.setAsideDiceIds,
      } : null;

      bankTimer.current = null;

      if (isSinglePlayer) {
        bank();
        return;
      }

      // Delay bank() until the animation finishes and the interstitial covers the
      // screen — that way the dice/player-color transition happens behind the modal.
      setTimeout(() => {
        bank();
        setInterstitialLastTurn(isLastTurn);
        setInterstitialPiggyback(piggybackInfo);
        showInterstitial(nextPlayer);
        if (!hasPiggyback) {
          setTimeout(() => showInterstitial(null), isLastTurn ? 3200 : 2000);
        }
      }, 1770);
    }, 300);
  }

  const heldDice = state.dice.filter(
    (d) => d.held && !state.setAsideDiceIds.includes(d.id)
  );
  const heldValues = heldDice.map((d) => d.value);

  const currentRollSetAsideValues = state.dice
    .filter((d) => state.currentRollSetAsideIds.includes(d.id))
    .map((d) => d.value);
  const combinedValues = [...currentRollSetAsideValues, ...heldValues];
  const selectionValid = heldValues.length > 0 && (isValidSelection(heldValues) || isValidSelection(combinedValues));

  const cumulativeScore = selectionValid ? scoreDice(combinedValues) : 0;
  const existingRollScore = currentRollSetAsideValues.length > 0 ? scoreDice(currentRollSetAsideValues) : 0;
  const additiveScore = existingRollScore + (selectionValid ? scoreDice(heldValues) : 0);
  const effectiveScore = Math.max(cumulativeScore, additiveScore);
  const selectionScore = selectionValid ? effectiveScore - existingRollScore : 0;

  const hasRolled = state.rollsUsed > 0;
  const hotDice = !state.farkled && state.setAsideDiceIds.length === 0 && state.turnScore > 0 && hasRolled;
  // Hot dice has been triggered but the player hasn't pressed HOT DICE yet —
  // dice still show their previous scoring values. Lock them so the player
  // can't re-select them and double-score the same dice.
  const hotDiceWaiting = hotDice && !state.mustSetAside;
  const canSetAside = !state.farkled && selectionValid && hasRolled && !hotDiceWaiting;
  const canRoll = !state.farkled && !state.mustSetAside && (state.setAsideDiceIds.length > 0 || hotDiceWaiting) && !heldDice.length;
  const playerTotal = (currentPlayer.scores["total"] as number) ?? 0;
  const needsOpening = state.openingThresholdEnabled && playerTotal === 0;
  const belowThreshold = needsOpening && state.turnScore < 500;
  const canBank = !state.farkled && !state.mustSetAside && state.turnScore > 0 && !belowThreshold && hasRolled && !heldDice.length;

  // Combined action button: ROLL or SET ASIDE depending on state
  let actionLabel: string;
  let actionEnabled: boolean;
  let actionHandler: () => void;

  if (!hasRolled) {
    actionLabel = "Roll";
    actionEnabled = !isAITurn;
    actionHandler = isAITurn ? () => {} : () => { getAudioCtx(); roll(); };
  } else if (canSetAside) {
    actionLabel = `Set aside +${selectionScore}`;
    actionEnabled = !isAITurn;
    actionHandler = isAITurn ? () => {} : () => { playTap(); setAside(); };
  } else if (hotDiceWaiting) {
    // Single-shot: pressing HOT DICE! rolls and sets mustSetAside=true,
    // so the next render falls through to the "SELECT DICE" branch below.
    actionLabel = isAITurn ? "Thinking..." : "Hot dice!";
    actionEnabled = !isAITurn;
    actionHandler = isAITurn ? () => {} : () => { getAudioCtx(); roll(); };
  } else if (canRoll) {
    actionLabel = "Roll";
    actionEnabled = !isAITurn;
    actionHandler = isAITurn ? () => {} : () => { getAudioCtx(); roll(); };
  } else if (state.mustSetAside) {
    actionLabel = isAITurn ? "Thinking..." : "Select dice";
    actionEnabled = false;
    actionHandler = () => {};
  } else {
    actionLabel = "Roll";
    actionEnabled = false;
    actionHandler = () => {};
  }

  // Landscape detection — same ref as the top-level container, matching GameView pattern
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const { width, height } = el!.getBoundingClientRect();
      setIsLandscape(width > height);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scoring panel state (portrait only)
  const [showScoring, setShowScoring] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const [scrollH, setScrollH] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(50);

  // Re-attach observer when switching back to portrait
  useEffect(() => {
    if (isLandscape) return;
    const el = scrollRef.current;
    const bar = barRef.current;
    if (!el || !bar) return;
    function measure() {
      setScrollH(el!.getBoundingClientRect().height);
      setBarH(bar!.getBoundingClientRect().height);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [isLandscape]);

  const diceH = scrollH - barH;
  const totalH = diceH + barH + diceH;
  const activePanel = showScoring ? 1 : 0;
  const baseOffset = activePanel === 1 ? -diceH : 0;
  const liveOffset = isDragging ? dragOffset : 0;
  const translateY = baseOffset + liveOffset;

  function snapTo(panel: 0 | 1) {
    setIsDragging(false);
    setDragOffset(0);
    setShowScoring(panel === 1);
  }

  function onTouchStart(e: React.TouchEvent) {
    // Don't drag the drawer when an interstitial is covering the screen.
    if (showFarkleBust || interstitialPlayer) return;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(false);
    setDragOffset(0);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    let el = e.target as HTMLElement | null;
    while (el && el !== containerRef.current) {
      if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
        const style = window.getComputedStyle(el);
        if (style.overflowY === "auto" || style.overflowY === "scroll") return;
      }
      el = el.parentElement;
    }
    const delta = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(delta) > 10) {
      setIsDragging(true);
      setDragOffset(delta);
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    const wasDragging = isDragging;
    setIsDragging(false);
    setDragOffset(0);
    if (!wasDragging) return;
    const threshold = 60;
    if (delta < -threshold && !showScoring) snapTo(1);
    else if (delta > threshold && showScoring) snapTo(0);
  }

  // Available dice for scoring possibilities
  const availableDice = state.dice
    .filter(d => !state.setAsideDiceIds.includes(d.id) && !d.held)
    .map(d => d.value);
  const scoringPossibilities = hasRolled && !state.farkled
    ? getScoringPossibilities(availableDice)
    : [];

  const diceViewProps = {
    dice: state.dice,
    rollsUsed: state.rollsUsed,
    rollsPerTurn: 999,
    playerColor: currentPlayer.color,
    onRoll: actionHandler,
    onToggleHold: isAITurn ? () => {} : toggleHold,
    farkleMode: true as const,
    setAsideDiceIds: hotDiceWaiting ? state.dice.map((d) => d.id) : state.setAsideDiceIds,
    farkled: state.farkled,
    farkleActionLabel: actionLabel,
    farkleActionEnabled: actionEnabled,
    farkleBankEnabled: canBank,
    farkleOnBank: isAITurn ? () => {} : (state.farkled ? handleBustDone : handleBank),
    farkleBankLabel: belowThreshold && state.turnScore > 0 ? `Need 500` : (state.turnScore > 0 ? `Bank ${state.turnScore}` : "Bank"),
    farkleActionPressed: aiPendingAction === "roll" || aiPendingAction === "set-aside",
    farkleBankPressed: aiPendingAction === "bank",
    farkleBankReady: state.turnScore > 0,
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 flex flex-col overflow-hidden relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {isLandscape ? (
        <>
          <div style={{ position: "relative", zIndex: Z.playerBar }}>
            <PlayerBar
              players={state.players}
              currentPlayerIndex={state.currentPlayerIndex}
              ruleset={state.ruleset}
            />
          </div>
          <div className="flex flex-row flex-1 min-h-0 w-full px-8 pb-8" style={{ gap: 32 }}>
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <DiceView {...diceViewProps} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ padding: "0 16px" }}>
              <FarkleScoringSheet
                possibilities={scoringPossibilities}
                hintsEnabled={state.scoringHintsEnabled}
                playerColor={currentPlayer.color}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-hidden relative"
          >
            <div
              className="flex flex-col w-full"
              style={{
                height: totalH || "300%",
                transform: `translateY(${translateY}px)`,
                transition: isDragging ? "none" : `transform 450ms ${EASE.exit}`,
                willChange: "transform",
              }}
            >
              <div className="w-full flex flex-col overflow-hidden" style={{ height: diceH || "auto" }}>
                <DiceView {...diceViewProps} />
              </div>

              {/* Spacer that holds the bar's slot in the drawer's flow.
                  The actual visible PlayerBar is rendered as an overlay
                  outside this stacking context (see below) so it can paint
                  above interstitial Scrims. */}
              <div style={{ height: barH || 50 }} />

              <div className="w-full flex flex-col" style={{ height: diceH || "auto", padding: "0 16px" }}>
                <FarkleScoringSheet
                  possibilities={scoringPossibilities}
                  hintsEnabled={state.scoringHintsEnabled}
                  playerColor={currentPlayer.color}
                />
              </div>
            </div>
          </div>

          {/* PlayerBar overlay — lives outside scrollRef so its z-index can
              compete with sibling Scrims (Z.interstitial = 50). Mirrors the
              drawer's translate so it stays glued to the seam between dice
              and scoring panels. */}
          <div
            ref={barRef}
            className="absolute left-0 right-0"
            style={{
              top: 0,
              transform: `translateY(${(diceH || 0) + translateY}px)`,
              transition: isDragging ? "none" : `transform 450ms ${EASE.exit}`,
              willChange: "transform",
              zIndex: Z.playerBar,
              // Hide the overlay until the drawer's heights are measured —
              // otherwise it briefly paints at translateY(0) (top of screen)
              // before snapping into place.
              visibility: scrollH > 0 ? "visible" : "hidden",
              // Bar is informational while an interstitial is up; taps should
              // not snap the drawer behind the scrim.
              pointerEvents: (showFarkleBust || interstitialPlayer) ? "none" : "auto",
            }}
          >
            <PlayerBar
              players={state.players}
              currentPlayerIndex={state.currentPlayerIndex}
              ruleset={state.ruleset}
              onClick={() => { playTap(); snapTo(showScoring ? 0 : 1); }}
            />
          </div>
        </>
      )}

      {showFarkleBust && (
        <FarkleBustScreen
          player={currentPlayer}
          lostScore={bustScoreRef.current}
          exiting={bustExiting}
          onDone={handleBustDone}
          failedDice={bustDice}
          keptDice={bustKeptDice}
        />
      )}

      {interstitialPlayer && (
        <PlayerInterstitial
          player={interstitialPlayer}
          exiting={interstitialExiting}
          lastTurn={interstitialLastTurn}
          piggyback={interstitialPiggyback}
          aiChoice={aiPiggybackChoice}
          onFreshRoll={() => { playTap(); showInterstitial(null); }}
          onPiggyback={() => { playTap(); acceptPiggyback(); roll(); showInterstitial(null); }}
        />
      )}
    </div>
  );
}

// ===== Farkle Scoring Sheet =====

function FarkleScoringSheet({
  possibilities,
  hintsEnabled,
  playerColor,
}: {
  possibilities: { label: string; score: number; count: number }[];
  hintsEnabled: boolean;
  playerColor: string;
}) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ paddingTop: 8, paddingBottom: 32 }}>
      <h3 style={{ ...TYPE.sectionHeading, color: COLOR.textPrimary, marginBottom: 16 }}>
        Scoring Reference
      </h3>

      {hintsEnabled && possibilities.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ ...TYPE.eyebrow, color: COLOR.textMuted, marginBottom: 8 }}>
            Available now
          </h4>
          {possibilities.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between"
              style={{ padding: "6px 0", borderBottom: `1px solid ${COLOR.surfaceRaised}` }}
            >
              <span style={{ ...TYPE.body, color: playerColor }}>{p.label}</span>
              <span style={{ ...TYPE.bodyEmphasis, color: playerColor }}>{p.score}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 style={{ ...TYPE.eyebrow, color: COLOR.textMuted, marginBottom: 8 }}>
          All combinations
        </h4>
        {FARKLE_REFERENCE.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between"
            style={{ padding: "6px 0", borderBottom: `1px solid ${COLOR.surfaceRaised}` }}
          >
            <span style={{ ...TYPE.body, color: COLOR.textMuted }}>{item.label}</span>
            <span style={{ ...TYPE.body, color: COLOR.textMuted }}>{item.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FARKLE_REFERENCE = [
  { label: "Single 1", score: "100" },
  { label: "Single 5", score: "50" },
  { label: "Three 1s", score: "1,000" },
  { label: "Three 2s", score: "200" },
  { label: "Three 3s", score: "300" },
  { label: "Three 4s", score: "400" },
  { label: "Three 5s", score: "500" },
  { label: "Three 6s", score: "600" },
  { label: "Four of a kind", score: "1,000" },
  { label: "Five of a kind", score: "2,000" },
  { label: "Six of a kind", score: "3,000" },
  { label: "Straight (1-2-3-4-5-6)", score: "2,500" },
  { label: "Three pairs", score: "1,500" },
];

// ===== Farkle Bust Screen =====

export function FarkleBustScreen({
  player,
  lostScore,
  exiting,
  onDone,
  failedDice,
  keptDice,
}: {
  player: Player;
  lostScore: number;
  exiting: boolean;
  onDone: () => void;
  failedDice: { value: number }[];
  keptDice: { value: number }[];
}) {
  const [displayScore, setDisplayScore] = useState(lostScore);
  useEffect(() => {
    if (lostScore <= 0) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    const delay = setTimeout(() => {
      const steps = Math.min(lostScore, 30);
      const tickMs = 800 / steps;
      let current = lostScore;
      const decrement = Math.ceil(lostScore / steps);

      interval = setInterval(() => {
        current = Math.max(0, current - decrement);
        setDisplayScore(current);
        if (current <= 0 && interval) {
          clearInterval(interval);
          interval = null;
        }
      }, tickMs);
    }, 1500);

    return () => {
      clearTimeout(delay);
      if (interval) clearInterval(interval);
    };
  }, [lostScore]);

  return (
    <Scrim
      exiting={exiting}
      position="absolute"
      zIndex={Z.interstitial}
      enterDuration={DURATION.modal}
      exitDuration={DURATION.slow}
    >
      <DialogCard
        background={player.color}
        enter="spinIn"
        exiting={exiting}
      >
        <span style={{ ...TYPE.titleBold }}>
          {player.name}
        </span>
        <span style={{ ...TYPE.subDisplayBold, color: COLOR.surfaceBg, textAlign: "center" }}>
          FARKLE!
        </span>

        {(keptDice.length > 0 || failedDice.length > 0) && (
          <div className="flex items-center justify-center" style={{ gap: 6, marginTop: 4, marginBottom: 4, flexWrap: "wrap" }}>
            {keptDice.map((d, i) => (
              <BustDie key={`k${i}`} value={d.value} failed={false} index={i} />
            ))}
            {failedDice.map((d, i) => (
              <BustDie key={`f${i}`} value={d.value} failed={true} index={keptDice.length + i} />
            ))}
          </div>
        )}

        <span style={{ ...TYPE.display, fontVariantNumeric: "tabular-nums" }}>
          {displayScore}
        </span>
      </DialogCard>

      <RoundButton
        className="shrink-0"
        onClick={() => { playTap(); onDone(); }}
        style={{
          animation: exiting ? undefined : `scale-in ${DURATION.slow + 50}ms ${EASE.spring} ${DURATION.slow}ms both`,
        }}
      >
        Done
      </RoundButton>
    </Scrim>
  );
}

// ===== Bust Die (inverted colors + X overlay) =====

const BUST_PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

function BustDie({
  value,
  failed,
  index = 0,
  animate = true,
}: {
  value: number;
  failed: boolean;
  index?: number;
  animate?: boolean;
}) {
  const pips = BUST_PIP_LAYOUTS[value] ?? [];
  const pipSize = "17%";

  const entryDelay = 500 + index * 80;
  const entryDuration = 300;
  const entry = `bust-die-in ${entryDuration}ms ${EASE.spring} ${entryDelay}ms both`;

  return (
    <div
      className="relative"
      style={{
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        outline: `1px solid ${COLOR.surfaceBg}`,
        outlineOffset: -1,
        background: "transparent",
        flexShrink: 0,
        opacity: failed ? 0.4 : 1,
        animation: animate ? entry : undefined,
      }}
    >
      {pips.map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: pipSize,
            height: pipSize,
            left: `calc(${x}% - ${pipSize} / 2)`,
            top: `calc(${y}% - ${pipSize} / 2)`,
            background: COLOR.surfaceBg,
          }}
        />
      ))}
      {failed && (
        <div
          className="absolute inset-0"
          style={{ overflow: "hidden", borderRadius: RADIUS.sm }}
        >
          <div
            className="absolute"
            style={{
              width: "141%",
              height: 0,
              borderTop: `1px solid ${COLOR.surfaceBg}`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(45deg)",
              transformOrigin: "center",
            }}
          />
          <div
            className="absolute"
            style={{
              width: "141%",
              height: 0,
              borderTop: `1px solid ${COLOR.surfaceBg}`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              transformOrigin: "center",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ===== Player Interstitial =====

function PlayerInterstitial({
  player,
  exiting,
  lastTurn,
  piggyback,
  aiChoice,
  onFreshRoll,
  onPiggyback,
}: {
  player: Player;
  exiting: boolean;
  lastTurn?: boolean;
  piggyback?: { score: number; dice: Die[]; setAsideDiceIds: number[] } | null;
  aiChoice?: "fresh" | "piggyback" | null;
  onFreshRoll?: () => void;
  onPiggyback?: () => void;
}) {
  const [freshIntroDone, setFreshIntroDone] = useState(false);
  const [piggyIntroDone, setPiggyIntroDone] = useState(false);

  if (piggyback) {
    const remainingDice = piggyback.dice.filter(d => !piggyback.setAsideDiceIds.includes(d.id));
    const diceToShow = remainingDice.length === 0 ? piggyback.dice : remainingDice;

    const buttonTransition = `transform ${DURATION.expressive + 50}ms ${EASE.pressable}, opacity ${DURATION.modal}ms ease, background ${DURATION.modal}ms ease, color ${DURATION.modal}ms ease`;

    return (
      <Scrim
        exiting={exiting}
        position="absolute"
        zIndex={Z.interstitial}
        enterDuration={DURATION.modal}
        exitDuration={DURATION.slow}
      >
        <DialogCard
          background={player.color}
          enter="spinIn"
          exiting={exiting}
          padding={0}
        >
          <span style={{ ...TYPE.titleBold }}>
            {player.name}
          </span>
          {lastTurn && (
            <span style={{ ...TYPE.bodyEmphasis, color: "rgba(0, 0, 0, 0.6)" }}>
              Final round
            </span>
          )}
          <span style={{ ...TYPE.title, marginBottom: 4 }}>
            +{piggyback.score} piggyback
          </span>
          <div className="flex items-center justify-center" style={{ gap: 6, marginTop: 2 }}>
            {diceToShow.map((d, i) => (
              <BustDie key={i} value={d.value} failed={false} animate={false} />
            ))}
          </div>
        </DialogCard>

        <div className="flex items-center justify-center" style={{ gap: 16 }}>
          <RoundButton
            className="shrink-0"
            variant={aiChoice === "fresh" ? "filled" : "outline"}
            onClick={onFreshRoll}
            onAnimationEnd={() => setFreshIntroDone(true)}
            disabled={aiChoice !== null}
            style={{
              opacity: aiChoice === "piggyback" ? 0.4 : 1,
              animation: (freshIntroDone || exiting) ? undefined : `scale-in ${DURATION.slow + 50}ms ${EASE.spring} ${DURATION.slow}ms both`,
              transition: freshIntroDone ? buttonTransition : undefined,
              transform: aiChoice === "fresh" ? "scale(0.85)" : undefined,
            }}
          >
            Fresh roll
          </RoundButton>
          <RoundButton
            className="shrink-0"
            variant={aiChoice === "piggyback" || !aiChoice ? "filled" : "outline"}
            onClick={onPiggyback}
            onAnimationEnd={() => setPiggyIntroDone(true)}
            disabled={aiChoice !== null}
            style={{
              opacity: aiChoice === "fresh" ? 0.4 : 1,
              animation: (piggyIntroDone || exiting) ? undefined : `scale-in ${DURATION.slow + 50}ms ${EASE.spring} ${DURATION.expressive}ms both`,
              transition: piggyIntroDone ? buttonTransition : undefined,
              transform: aiChoice === "piggyback" ? "scale(0.85)" : undefined,
            }}
          >
            Piggyback
          </RoundButton>
        </div>
      </Scrim>
    );
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: COLOR.surfaceOverlay,
        zIndex: Z.interstitial,
        padding: 16,
        animation: exiting
          ? "interstitial-out 400ms ease forwards"
          : "interstitial-in 300ms ease forwards",
      }}
    >
      <div
        className="flex flex-col items-center justify-center rounded-full"
        style={{
          ...TYPE.headline,
          width: "100%",
          maxWidth: "min(80vw, 80vh, 400px)",
          aspectRatio: "1 / 1",
          background: player.color,
          color: COLOR.surfaceBg,
          gap: 4,
          animation: exiting
            ? `scale-out ${DURATION.slow}ms ${EASE.spring} forwards`
            : `spin-in ${DURATION.expressive}ms ${EASE.standard} 150ms both`,
        }}
      >
        {player.name}
        {lastTurn && (
          <span style={{ ...TYPE.bodyEmphasis, color: "rgba(0, 0, 0, 0.6)" }}>
            Final round
          </span>
        )}
      </div>
    </div>
  );
}

