"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DiceView } from "./DiceView";
import { PlayerBar } from "./PlayerBar";
import type { UseGameReturn } from "@/hooks/useGame";
import type { Player } from "@/lib/types";
import { isValidSelection, scoreDice, getScoringPossibilities } from "@/lib/rulesets/farkle";
import { playTap, playTurnChange, playConfirm, playDeselect, playFarkle, getAudioCtx } from "@/lib/sounds";

export function FarkleView({ game }: { game: UseGameReturn }) {
  const { state, roll, toggleHold, setAside, bank } = game;
  const currentPlayer = state.players[state.currentPlayerIndex];

  const [interstitialPlayer, setInterstitialPlayer] = useState<Player | null>(null);
  const [interstitialExiting, setInterstitialExiting] = useState(false);
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

  useEffect(() => {
    return () => {
      if (bankTimer.current) clearTimeout(bankTimer.current);
    };
  }, []);

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

  function handleBustDone() {
    setBustExiting(true);
    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextPlayerIndex];
    const isSinglePlayer = state.players.length === 1;

    setTimeout(() => {
      setShowFarkleBust(false);
      setBustExiting(false);

      bank();

      if (!isSinglePlayer) {
        showInterstitial(nextPlayer);
        setTimeout(() => showInterstitial(null), 2000);
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
      bank();
      bankTimer.current = null;

      if (!isSinglePlayer) {
        showInterstitial(nextPlayer);
        setTimeout(() => showInterstitial(null), 2000);
      }
    }, 300);
  }

  const heldDice = state.dice.filter(
    (d) => d.held && !state.setAsideDiceIds.includes(d.id)
  );
  const heldValues = heldDice.map((d) => d.value);
  const selectionValid = heldValues.length > 0 && isValidSelection(heldValues);

  const currentRollSetAsideValues = state.dice
    .filter((d) => state.currentRollSetAsideIds.includes(d.id))
    .map((d) => d.value);
  const combinedValues = [...currentRollSetAsideValues, ...heldValues];
  const cumulativeScore = selectionValid ? scoreDice(combinedValues) : 0;
  const existingRollScore = currentRollSetAsideValues.length > 0 ? scoreDice(currentRollSetAsideValues) : 0;
  const selectionScore = selectionValid ? cumulativeScore - existingRollScore : 0;

  const hasRolled = state.rollsUsed > 0;
  const hotDice = !state.farkled && state.setAsideDiceIds.length === 0 && state.turnScore > 0 && hasRolled;
  const canSetAside = !state.farkled && selectionValid && hasRolled;
  const canRoll = !state.farkled && !state.mustSetAside && (state.setAsideDiceIds.length > 0 || hotDice) && !heldDice.length;
  const canBank = (state.farkled || (!state.mustSetAside && state.turnScore > 0)) && hasRolled && !heldDice.length;

  // Combined action button: ROLL or SET ASIDE depending on state
  let actionLabel: string;
  let actionEnabled: boolean;
  let actionHandler: () => void;

  if (!hasRolled) {
    actionLabel = "ROLL";
    actionEnabled = true;
    actionHandler = () => { getAudioCtx(); roll(); };
  } else if (canSetAside) {
    actionLabel = `SET ASIDE +${selectionScore}`;
    actionEnabled = true;
    actionHandler = () => { playTap(); setAside(); };
  } else if (hotDice) {
    actionLabel = "HOT DICE!";
    actionEnabled = true;
    actionHandler = () => { getAudioCtx(); roll(); };
  } else if (canRoll) {
    actionLabel = "ROLL";
    actionEnabled = true;
    actionHandler = () => { getAudioCtx(); roll(); };
  } else if (state.mustSetAside) {
    actionLabel = "SELECT DICE";
    actionEnabled = false;
    actionHandler = () => {};
  } else {
    actionLabel = "ROLL";
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
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(false);
    setDragOffset(0);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    let el = e.target as HTMLElement | null;
    while (el && el !== scrollRef.current) {
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
    onToggleHold: toggleHold,
    farkleMode: true as const,
    setAsideDiceIds: state.setAsideDiceIds,
    farkled: state.farkled,
    farkleActionLabel: actionLabel,
    farkleActionEnabled: actionEnabled,
    farkleBankEnabled: canBank,
    farkleOnBank: state.farkled ? handleBustDone : handleBank,
    farkleBankLabel: state.farkled ? "NEXT" : (canBank ? `BANK ${state.turnScore}` : "BANK"),
  };

  return (
    <div ref={containerRef} className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      {isLandscape ? (
        <div className="flex flex-row w-full h-full p-8" style={{ gap: 32 }}>
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <DiceView {...diceViewProps} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <TurnScoreBar
              turnScore={state.turnScore}
              selectionScore={selectionValid ? selectionScore : 0}
              playerColor={currentPlayer.color}
              finalRound={state.finalRound}
            />
            <div style={{ padding: "0 16px" }} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <FarkleScoringSheet
                possibilities={scoringPossibilities}
                hintsEnabled={state.scoringHintsEnabled}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <PlayerBar
            players={state.players}
            currentPlayerIndex={state.currentPlayerIndex}
            ruleset={state.ruleset}
          />

          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-hidden relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex flex-col w-full"
              style={{
                height: totalH || "300%",
                transform: `translateY(${translateY}px)`,
                transition: isDragging ? "none" : "transform 450ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                willChange: "transform",
              }}
            >
              <div className="w-full flex flex-col overflow-hidden" style={{ height: diceH || "auto" }}>
                <DiceView {...diceViewProps} />
              </div>

              <div ref={barRef}>
                <TurnScoreBar
                  turnScore={state.turnScore}
                  selectionScore={selectionValid ? selectionScore : 0}
                  playerColor={currentPlayer.color}
                  finalRound={state.finalRound}
                  onClick={() => { playTap(); snapTo(showScoring ? 0 : 1); }}
                />
              </div>

              <div className="w-full flex flex-col" style={{ height: diceH || "auto", padding: "0 16px" }}>
                <FarkleScoringSheet
                  possibilities={scoringPossibilities}
                  hintsEnabled={state.scoringHintsEnabled}
                />
              </div>
            </div>
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
        <PlayerInterstitial player={interstitialPlayer} exiting={interstitialExiting} />
      )}
    </div>
  );
}

// ===== Turn Score Bar =====

function TurnScoreBar({
  turnScore,
  selectionScore,
  playerColor,
  finalRound,
  onClick,
}: {
  turnScore: number;
  selectionScore: number;
  playerColor: string;
  finalRound: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`shrink-0 w-full${onClick ? " pressable" : ""}`}
      onClick={onClick}
      style={{ padding: "16px 16px" }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          padding: "8px 8px",
          borderRadius: 4,
          outline: "1px solid #ffffff",
          outlineOffset: -1,
          background: "transparent",
          fontSize: 13,
          fontWeight: 500,
          gap: 6,
        }}
      >
        <span style={{ color: "#999999" }}>Turn</span>
        <span style={{ color: "#ffffff", fontWeight: 700 }}>
          {turnScore + selectionScore}
        </span>
        {selectionScore > 0 && turnScore > 0 && (
          <span style={{ color: playerColor }}>
            +{selectionScore}
          </span>
        )}
        {finalRound && (
          <span style={{ color: "#ff6b6b" }}>
            Final round
          </span>
        )}
      </div>
    </div>
  );
}

// ===== Farkle Scoring Sheet =====

function FarkleScoringSheet({
  possibilities,
  hintsEnabled,
}: {
  possibilities: { label: string; score: number; count: number }[];
  hintsEnabled: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ paddingTop: 8, paddingBottom: 32 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", marginBottom: 16 }}>
        Scoring Reference
      </h3>

      {hintsEnabled && possibilities.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 11, fontWeight: 500, color: "#999999", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            Available now
          </h4>
          {possibilities.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between"
              style={{ padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}
            >
              <span style={{ color: "#ffffff", fontSize: 13 }}>{p.label}</span>
              <span style={{ color: "#ffffff", fontSize: 13, fontWeight: 600 }}>{p.score}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 style={{ fontSize: 11, fontWeight: 500, color: "#999999", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
          All combinations
        </h4>
        {FARKLE_REFERENCE.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between"
            style={{ padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}
          >
            <span style={{ color: "#999999", fontSize: 13 }}>{item.label}</span>
            <span style={{ color: "#999999", fontSize: 13 }}>{item.score}</span>
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

function FarkleBustScreen({
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

    const delay = setTimeout(() => {
      const steps = Math.min(lostScore, 30);
      const interval = 800 / steps;
      let current = lostScore;
      const decrement = Math.ceil(lostScore / steps);

      const timer = setInterval(() => {
        current = Math.max(0, current - decrement);
        setDisplayScore(current);
        if (current <= 0) clearInterval(timer);
      }, interval);

      return () => clearInterval(timer);
    }, 1500);

    return () => clearTimeout(delay);
  }, [lostScore]);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background: "rgba(0, 0, 0, 0.9)",
        zIndex: 60,
        padding: 16,
        gap: 24,
        animation: exiting
          ? "interstitial-out 400ms ease forwards"
          : "interstitial-in 300ms ease forwards",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "min(80vw, 80vh)",
          aspectRatio: "1 / 1",
        }}
      >
        <div
          className="w-full h-full flex flex-col items-center justify-center"
          style={{
            background: player.color,
            borderRadius: 4,
            color: "#000000",
            padding: "10%",
            gap: 8,
            animation: exiting
              ? "scale-out 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
              : "spin-in 500ms cubic-bezier(0.22, 1, 0.36, 1) 150ms both",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            {player.name}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            FARKLE!
          </span>

          {/* Dice rows: kept (success) then failed */}
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

          <span style={{ fontSize: 48, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {displayScore}
          </span>
        </div>
      </div>

      <button
        onClick={() => { playTap(); onDone(); }}
        className="flex items-center justify-center rounded-full shrink-0 pressable"
        style={{
          width: 100,
          height: 100,
          outline: "1px solid #ffffff",
          outlineOffset: -1,
          background: "transparent",
          fontSize: 13,
          fontWeight: 500,
          color: "#ffffff",
          cursor: "pointer",
          animation: exiting ? undefined : "scale-in 450ms cubic-bezier(0.34, 1.56, 0.64, 1) 400ms both",
        }}
      >
        Done
      </button>
    </div>
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

function BustDie({ value, failed, index = 0 }: { value: number; failed: boolean; index?: number }) {
  const pips = BUST_PIP_LAYOUTS[value] ?? [];
  const pipSize = "17%";

  return (
    <div
      className="relative"
      style={{
        width: 36,
        height: 36,
        borderRadius: 4,
        outline: "1px solid #000000",
        outlineOffset: -1,
        background: "transparent",
        flexShrink: 0,
        opacity: failed ? 0.4 : 1,
        animation: `bust-die-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) ${500 + index * 80}ms both`,
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
            background: "#000000",
          }}
        />
      ))}
      {failed && (
        <div
          className="absolute inset-0"
          style={{ overflow: "hidden", borderRadius: 4 }}
        >
          <div
            className="absolute"
            style={{
              width: "141%",
              height: 0,
              borderTop: "1px solid #000000",
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
              borderTop: "1px solid #000000",
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

function PlayerInterstitial({ player, exiting }: { player: Player; exiting: boolean }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: "rgba(0, 0, 0, 0.85)",
        zIndex: 50,
        padding: 16,
        animation: exiting
          ? "interstitial-out 400ms ease forwards"
          : "interstitial-in 300ms ease forwards",
      }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          background: player.color,
          fontSize: 20,
          fontWeight: 500,
          color: "#000000",
          animation: exiting
            ? "scale-out 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
            : "spin-in 500ms cubic-bezier(0.22, 1, 0.36, 1) 150ms both",
        }}
      >
        {player.name}
      </div>
    </div>
  );
}
