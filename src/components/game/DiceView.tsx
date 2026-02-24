"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Die } from "./Die";
import type { Die as DieType } from "@/lib/types";
import { rollValue } from "@/lib/engine";
import { getAudioCtx, playBleep, playSettle, playTap } from "@/lib/sounds";

// ===== Layout computation =====

function computeLayout(
  w: number,
  h: number,
  itemCount: number,
  gap: number
): { cols: number; rows: number; cellSize: number } {
  let best = { cols: 1, rows: itemCount, cellSize: 0 };

  for (let cols = 1; cols <= itemCount; cols++) {
    const rows = Math.ceil(itemCount / cols);
    const cellW = (w - gap * (cols - 1)) / cols;
    const cellH = (h - gap * (rows - 1)) / rows;
    const cellSize = Math.floor(Math.min(cellW, cellH));
    if (cellSize > best.cellSize) {
      best = { cols, rows, cellSize };
    }
  }

  return best;
}

// ===== Rolling animation helpers =====

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DICE_STAGGER = 100;
const CYCLE_INTERVAL = 50;
const CYCLE_BASE_DURATION = 300;
const CYCLE_STAGGER_PER_DIE = 60;

// ===== DiceView =====

export function DiceView({
  dice,
  rollsUsed,
  rollsPerTurn,
  playerColor,
  coloredPips = false,
  onRoll,
  onToggleHold,
  alignTop = false,
  dieValueMap,
  farkleMode = false,
  setAsideDiceIds = [],
  farkled = false,
  hugged = false,
}: {
  dice: DieType[];
  rollsUsed: number;
  rollsPerTurn: number;
  playerColor: string;
  coloredPips?: boolean;
  onRoll: () => void;
  onToggleHold: (id: number) => void;
  alignTop?: boolean;
  dieValueMap?: Record<number, number>;
  farkleMode?: boolean;
  setAsideDiceIds?: number[];
  farkled?: boolean;
  hugged?: boolean;
}) {
  const heldCount = dice.filter((d) => d.held).length;
  const allHeld = heldCount >= dice.length;
  const canRoll = farkleMode ? false : (rollsUsed < rollsPerTurn && !allHeld);
  const canHold = farkleMode ? (rollsUsed > 0 && !farkled) : rollsUsed > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ cols: 2, rows: 3, cellSize: 0 });
  const GAP = 16;
  const showRollButton = !farkleMode;
  const ITEM_COUNT = dice.length + (showRollButton ? 1 : 0);

  // --- Intro fade-in ---
  const staggerOrder = useRef<number[]>(shuffle(dice.map((_, i) => i)));
  const [visibleDice, setVisibleDice] = useState<Set<number>>(new Set());
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    staggerOrder.current.forEach((dieIndex, seq) => {
      timers.push(
        setTimeout(() => {
          setVisibleDice((prev) => new Set(prev).add(dieIndex));
        }, 150 + seq * DICE_STAGGER)
      );
    });

    timers.push(
      setTimeout(() => {
        setShowButton(true);
      }, 150 + dice.length * DICE_STAGGER + 100)
    );

    return () => {
      timers.forEach(clearTimeout);
      setVisibleDice(new Set());
      setShowButton(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Rolling animation ---
  const [displayValues, setDisplayValues] = useState<number[]>(() => dice.map((d) => d.value));
  const [rollingDice, setRollingDice] = useState<Set<number>>(new Set());
  const [flashDice, setFlashDice] = useState<Set<number>>(new Set());
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isAnimating = useRef(false);
  const prevRollsUsed = useRef(rollsUsed);

  const stopAnimation = useCallback(() => {
    if (cycleRef.current) {
      clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
    settleTimers.current.forEach(clearTimeout);
    settleTimers.current = [];
    isAnimating.current = false;
    setFlashDice(new Set());
  }, []);

  useEffect(() => {
    return () => stopAnimation();
  }, [stopAnimation]);

  // Detect when a roll just happened (rollsUsed increased)
  useEffect(() => {
    const justRolled = rollsUsed > prevRollsUsed.current && rollsUsed > 0;
    prevRollsUsed.current = rollsUsed;

    if (!justRolled) {
      setDisplayValues(dice.map((d) => d.value));
      return;
    }

    // Determine which dice were not held (those that were re-rolled)
    const unheldIndices = dice.map((d, i) => (!d.held ? i : -1)).filter((i) => i !== -1);
    if (unheldIndices.length === 0) {
      setDisplayValues(dice.map((d) => d.value));
      return;
    }

    stopAnimation();
    isAnimating.current = true;

    // Mark all unheld dice as rolling
    setRollingDice(new Set(unheldIndices));

    // Start cycling random values for unheld dice, with random color flashes + bleeps
    cycleRef.current = setInterval(() => {
      setDisplayValues((prev) => {
        const next = [...prev];
        for (const idx of unheldIndices) {
          next[idx] = rollValue();
        }
        return next;
      });
      setFlashDice(() => {
        const flashing = new Set<number>();
        for (const idx of unheldIndices) {
          if (Math.random() < 0.2) flashing.add(idx);
        }
        return flashing;
      });
      if (Math.random() < 0.6) playBleep();
    }, CYCLE_INTERVAL);

    // Stagger settle: each unheld die locks in at a different time
    const shuffledUnheld = shuffle([...unheldIndices]);
    shuffledUnheld.forEach((dieIdx, seq) => {
      const delay = CYCLE_BASE_DURATION + seq * CYCLE_STAGGER_PER_DIE;
      settleTimers.current.push(
        setTimeout(() => {
          setDisplayValues((prev) => {
            const next = [...prev];
            next[dieIdx] = dice[dieIdx].value;
            return next;
          });
          setRollingDice((prev) => {
            const next = new Set(prev);
            next.delete(dieIdx);
            return next;
          });
          playSettle(seq, shuffledUnheld.length);
        }, delay)
      );
    });

    // Stop the cycling interval after the last die settles
    const totalDuration = CYCLE_BASE_DURATION + shuffledUnheld.length * CYCLE_STAGGER_PER_DIE + 50;
    settleTimers.current.push(
      setTimeout(() => {
        if (cycleRef.current) {
          clearInterval(cycleRef.current);
          cycleRef.current = null;
        }
        isAnimating.current = false;
        setDisplayValues(dice.map((d) => d.value));
        setRollingDice(new Set());
        setFlashDice(new Set());
      }, totalDuration)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollsUsed, dice]);

  // --- Layout ---

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function measure() {
      if (hugged) {
        const parent = el!.parentElement;
        if (!parent) return;
        const { height } = parent.getBoundingClientRect();
        const h = height - GAP * 2;
        setLayout(computeLayout(h, h, ITEM_COUNT, GAP));
      } else {
        const { width, height } = el!.getBoundingClientRect();
        setLayout(computeLayout(width - GAP * 2, height - GAP * 2, ITEM_COUNT, GAP));
      }
    }

    measure();
    const target = hugged ? el!.parentElement! : el;
    const ro = new ResizeObserver(measure);
    ro.observe(target);
    return () => ro.disconnect();
  }, [ITEM_COUNT, hugged]);

  const huggedWidth = layout.cellSize > 0
    ? layout.cols * layout.cellSize + (layout.cols - 1) * GAP + GAP * 2
    : undefined;

  return (
    <div
      ref={containerRef}
      style={{
        flex: hugged ? "none" : 1,
        minHeight: 0,
        width: hugged ? huggedWidth : undefined,
        height: hugged ? "100%" : undefined,
        display: "grid",
        gridTemplateColumns: layout.cellSize > 0
          ? `repeat(${layout.cols}, ${layout.cellSize}px)`
          : `repeat(2, 1fr)`,
        gridTemplateRows: layout.cellSize > 0
          ? `repeat(${layout.rows}, ${layout.cellSize}px)`
          : `repeat(3, 1fr)`,
        gap: GAP,
        placeContent: alignTop ? "start center" : "center",
        padding: GAP,
      }}
    >
      {dice.map((die, i) => {
        const isSetAside = farkleMode && setAsideDiceIds.includes(die.id);
        const dieCanHold = canHold && !isSetAside;
        return (
          <div
            key={die.id}
            className={visibleDice.has(i) ? "animate-spin-in" : ""}
            style={{
              width: layout.cellSize || "100%",
              height: layout.cellSize || "100%",
              opacity: isSetAside ? 0.3 : (visibleDice.has(i) ? undefined : 0),
              transition: "opacity 300ms",
            }}
          >
            <Die
              value={displayValues[i] ?? die.value}
              held={die.held}
              heldColor={playerColor}
              coloredPips={coloredPips}
              onClick={dieCanHold ? () => { playTap(); onToggleHold(die.id); } : undefined}
              disabled={!dieCanHold}
              label={!farkleMode && rollsUsed === 0 ? "Roll me" : undefined}
              rolling={rollingDice.has(i)}
              flash={flashDice.has(i)}
              dieValueMap={dieValueMap}
            />
          </div>
        );
      })}
      {showRollButton && (
        <div style={{ width: layout.cellSize || "100%", height: layout.cellSize || "100%", containerType: "inline-size" }}>
          <RollButton
            rollsUsed={rollsUsed}
            rollsPerTurn={rollsPerTurn}
            canRoll={canRoll}
            onRoll={onRoll}
            showButton={showButton}
            allHeld={allHeld}
          />
        </div>
      )}
    </div>
  );
}

// ===== RollButton =====

function RollButton({
  rollsUsed,
  rollsPerTurn,
  canRoll,
  onRoll,
  showButton,
  allHeld = false,
}: {
  rollsUsed: number;
  rollsPerTurn: number;
  canRoll: boolean;
  onRoll: () => void;
  showButton: boolean;
  allHeld?: boolean;
}) {
  const [introDone, setIntroDone] = useState(false);

  const rollsRemaining = rollsPerTurn - rollsUsed;

  let label: string;
  if (allHeld || rollsUsed >= rollsPerTurn) {
    label = "SCORE";
  } else {
    label = rollsUsed === 0 ? "ROLL" : `ROLL (${rollsRemaining})`;
  }

  const animating = showButton && !introDone;

  return (
    <button
      onClick={canRoll ? () => { getAudioCtx(); onRoll(); } : undefined}
      disabled={!canRoll}
      className={`flex items-center justify-center rounded-full pressable ${animating ? "animate-scale-in" : ""}`}
      onAnimationEnd={() => setIntroDone(true)}
      style={{
        width: "100%",
        height: "100%",
        outline: "1px solid #ffffff",
        outlineOffset: -1,
        opacity: canRoll ? 1 : 0.35,

        fontSize: "clamp(13px, 8cqi, 15px)",
        fontWeight: 500,
        color: "#ffffff",
        background: "transparent",
        cursor: canRoll ? "pointer" : "default",
        transform: showButton ? undefined : "scale(0)",
      }}
    >
      {label}
    </button>
  );
}
