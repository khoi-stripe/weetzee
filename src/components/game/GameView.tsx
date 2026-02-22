"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DiceView } from "./DiceView";
import { ScorecardView } from "./ScorecardView";
import { PlayerBar } from "./PlayerBar";
import type { UseGameReturn } from "@/hooks/useGame";
import type { Player } from "@/lib/types";
import { getEffectiveRollsPerTurn } from "@/lib/engine";

// ===== GameView =====
// One continuous vertical page: DiceView → PlayerBar → ScorecardView.
// Swiping up reveals the scorecard; swiping down returns to dice.
// PlayerBar is always visible as the seam between the two sections.
// Tapping PlayerBar → scorecard. Tapping mini dice strip → dice.

export function GameView({ game }: { game: UseGameReturn }) {
  const { state, roll, toggleHold, scoreCategory, setView } = game;
  const [activePanel, setActivePanel] = useState<0 | 1>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state.view → activePanel (for manual SET_VIEW calls)
  useEffect(() => {
    const target = state.view === "scorecard" ? 1 : 0;
    if (target !== activePanel) {
      setActivePanel(target as 0 | 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view]);

  // Auto-transition to scorecard after final roll with a delay
  const autoTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoTransitionTimer.current) {
      clearTimeout(autoTransitionTimer.current);
      autoTransitionTimer.current = null;
    }

    const effectiveMax = getEffectiveRollsPerTurn(state);
    const usedAllRolls = state.rollsUsed >= effectiveMax;

    if (usedAllRolls && activePanel === 0) {

      autoTransitionTimer.current = setTimeout(() => {
        snapTo(1);
      }, 1500);
    }

    return () => {
      if (autoTransitionTimer.current) {
        clearTimeout(autoTransitionTimer.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rollsUsed, state.ruleset.rollsPerTurn, state.rollBankingEnabled]);

  function snapTo(panel: 0 | 1) {
    setIsDragging(false);
    setDragOffset(0);
    setActivePanel(panel);
    setView(panel === 1 ? "scorecard" : "rolling");
  }

  // ===== Touch handlers =====

  const touchInScrollable = useRef(false);

  function isInsideScrollable(target: EventTarget | null): boolean {
    let el = target as HTMLElement | null;
    while (el && el !== containerRef.current) {
      if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
        const style = window.getComputedStyle(el);
        const overflow = style.overflowY;
        if (overflow === "auto" || overflow === "scroll") return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    touchInScrollable.current = isInsideScrollable(e.target);
    setIsDragging(false);
    setDragOffset(0);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null || touchInScrollable.current) return;
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

    if (touchInScrollable.current) {
      touchInScrollable.current = false;
      return;
    }

    if (!wasDragging) return;

    const threshold = 60;
    if (delta < -threshold && activePanel === 0) snapTo(1);
    else if (delta > threshold && activePanel === 1) snapTo(0);
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  // --- Next-player interstitial ---
  const [interstitialPlayer, setInterstitialPlayer] = useState<Player | null>(null);
  const [interstitialExiting, setInterstitialExiting] = useState(false);

  const showInterstitial = useCallback((player: Player | null) => {
    if (player) {
      setInterstitialExiting(false);
      setInterstitialPlayer(player);
    } else {
      setInterstitialExiting(true);
      setTimeout(() => {
        setInterstitialPlayer(null);
        setInterstitialExiting(false);
      }, 400);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-hidden relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <ContentStrip
        activePanel={activePanel}
        isDragging={isDragging}
        dragOffset={dragOffset}
        state={state}
        currentPlayer={currentPlayer}
        roll={roll}
        toggleHold={toggleHold}
        scoreCategory={scoreCategory}
        snapTo={snapTo}
        onShowInterstitial={showInterstitial}
      />
      {interstitialPlayer && (
        <PlayerInterstitial player={interstitialPlayer} exiting={interstitialExiting} />
      )}
    </div>
  );
}

// ===== Content Strip =====
// Lays out: [DiceView] [PlayerBar] [ScorecardView] vertically.
// Each "page" is: dice+bar (panel 0) or bar+scorecard (panel 1).
// The bar is the shared element.

function ContentStrip({
  activePanel,
  isDragging,
  dragOffset,
  state,
  currentPlayer,
  roll,
  toggleHold,
  scoreCategory,
  snapTo,
  onShowInterstitial,
}: {
  activePanel: 0 | 1;
  isDragging: boolean;
  dragOffset: number;
  state: UseGameReturn["state"];
  currentPlayer: { color: string };
  roll: () => void;
  toggleHold: (id: number) => void;
  scoreCategory: (id: string) => void;
  snapTo: (panel: 0 | 1) => void;
  onShowInterstitial: (player: Player | null) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);
  const [barH, setBarH] = useState(66);

  const effectiveRolls = getEffectiveRollsPerTurn(state);

  const [justScoredCategoryId, setJustScoredCategoryId] = useState<string | null>(null);
  const [justScoredPlayerIndex, setJustScoredPlayerIndex] = useState<number | null>(null);
  const scoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scoreTimer.current) clearTimeout(scoreTimer.current);
    };
  }, []);

  useEffect(() => {
    const strip = stripRef.current?.parentElement;
    const bar = barRef.current;
    if (!strip || !bar) return;

    function measure() {
      setContainerH(strip!.getBoundingClientRect().height);
      setBarH(bar!.getBoundingClientRect().height);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(strip);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  const diceH = containerH - barH;
  const totalH = diceH + barH + diceH;

  const baseOffset = activePanel === 1 ? -diceH : 0;
  const liveOffset = isDragging ? dragOffset : 0;
  const translateY = baseOffset + liveOffset;

  function handleScoreCategory(id: string) {
    if (scoreTimer.current) return;

    setJustScoredCategoryId(id);
    setJustScoredPlayerIndex(state.currentPlayerIndex);

    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextPlayerIndex];
    const isSinglePlayer = state.players.length === 1;

    scoreTimer.current = setTimeout(() => {
      scoreCategory(id);
      setJustScoredCategoryId(null);
      setJustScoredPlayerIndex(null);
      scoreTimer.current = null;

      if (isSinglePlayer) {
        setTimeout(() => snapTo(0), 320);
      } else {
        onShowInterstitial(nextPlayer);
        setTimeout(() => {
          onShowInterstitial(null);
          snapTo(0);
        }, 2000);
      }
    }, 1500);
  }

  return (
    <div
      ref={stripRef}
      className="flex flex-col w-full"
      style={{
        height: totalH || "300%",
        transform: `translateY(${translateY}px)`,
        transition: isDragging ? "none" : "transform 450ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        willChange: "transform",
      }}
    >
      <div className="w-full flex flex-col overflow-hidden" style={{ height: diceH || "auto" }}>
        <DiceView
          dice={state.dice}
          rollsUsed={state.rollsUsed}
          rollsPerTurn={effectiveRolls}
          playerColor={currentPlayer.color}
          onRoll={roll}
          onToggleHold={toggleHold}
        />
      </div>

      {/* Shared PlayerBar — tapping toggles panel */}
      <div ref={barRef}>
        <PlayerBar
          players={state.players}
          currentPlayerIndex={state.currentPlayerIndex}
          onClick={() => snapTo(activePanel === 0 ? 1 : 0)}
        />
      </div>

      {/* Scorecard section */}
      <div className="w-full flex flex-col" style={{ height: diceH || "auto" }}>
        <ScorecardView
          players={state.players}
          currentPlayerIndex={state.currentPlayerIndex}
          dice={state.dice}
          ruleset={state.ruleset}
          turn={state.turn}
          rollsUsed={state.rollsUsed}
          rollsPerTurn={effectiveRolls}
          playerColor={currentPlayer.color}
          onScoreCategory={handleScoreCategory}
          onRoll={roll}
          onToggleHold={toggleHold}
          justScoredCategoryId={justScoredCategoryId}
          justScoredPlayerIndex={justScoredPlayerIndex}
          multipleWeetzeesEnabled={state.multipleWeetzeesEnabled}
        />
      </div>
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
          maxWidth: "80%",
          background: player.color,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 20,
          fontWeight: 500,
          color: "#000000",
          animation: exiting
            ? "scale-out 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
            : "scale-in 450ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms both",
        }}
      >
        {player.name}
      </div>
    </div>
  );
}
