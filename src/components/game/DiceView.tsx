"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Die } from "./Die";
import type { Die as DieType } from "@/lib/types";

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

function randomValue(): number {
  return Math.floor(Math.random() * 6) + 1;
}

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

// ===== Synthesized roll sounds =====

const BLEEP_NOTES = [440, 523, 587, 659, 698, 784, 880, 988, 1047];

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_audioCtx) _audioCtx = new AudioContext();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

function playBleep(freq?: number, duration = 0.04, volume = 0.08) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq ?? BLEEP_NOTES[Math.floor(Math.random() * BLEEP_NOTES.length)];
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function playSettle(index: number, total: number) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const baseFreq = 600 + index * (400 / Math.max(total, 1));
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, t + 0.06);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

// ===== DiceView =====

export function DiceView({
  dice,
  rollsUsed,
  rollsPerTurn,
  playerColor,
  coloredPips = false,
  onRoll,
  onToggleHold,
}: {
  dice: DieType[];
  rollsUsed: number;
  rollsPerTurn: number;
  playerColor: string;
  coloredPips?: boolean;
  onRoll: () => void;
  onToggleHold: (id: number) => void;
}) {
  const canRoll = rollsUsed < rollsPerTurn;
  const canHold = rollsUsed > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ cols: 2, rows: 3, cellSize: 0 });
  const GAP = 16;
  const ITEM_COUNT = dice.length + 1;

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
          next[idx] = randomValue();
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
      const { width, height } = el!.getBoundingClientRect();
      setLayout(computeLayout(width - GAP * 2, height - GAP * 2, ITEM_COUNT, GAP));
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ITEM_COUNT]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: layout.cellSize > 0
          ? `repeat(${layout.cols}, ${layout.cellSize}px)`
          : `repeat(2, 1fr)`,
        gridTemplateRows: layout.cellSize > 0
          ? `repeat(${layout.rows}, ${layout.cellSize}px)`
          : `repeat(3, 1fr)`,
        gap: GAP,
        placeContent: "center",
        padding: GAP,
      }}
    >
      {dice.map((die, i) => (
        <div
          key={die.id}
          className={visibleDice.has(i) ? "animate-spin-in" : ""}
          style={{
            width: layout.cellSize || "100%",
            height: layout.cellSize || "100%",
            opacity: visibleDice.has(i) ? undefined : 0,
          }}
        >
          <Die
            value={displayValues[i] ?? die.value}
            held={die.held}
            heldColor={playerColor}
            coloredPips={coloredPips}
            onClick={canHold ? () => onToggleHold(die.id) : undefined}
            disabled={!canHold}
            label={rollsUsed === 0 ? "Roll me" : undefined}
            rolling={rollingDice.has(i)}
            flash={flashDice.has(i)}
          />
        </div>
      ))}
      <div style={{ width: layout.cellSize || "100%", height: layout.cellSize || "100%" }}>
        <RollButton
          rollsUsed={rollsUsed}
          rollsPerTurn={rollsPerTurn}
          canRoll={canRoll}
          onRoll={onRoll}
          showButton={showButton}
          cellSize={layout.cellSize}
        />
      </div>
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
  cellSize,
}: {
  rollsUsed: number;
  rollsPerTurn: number;
  canRoll: boolean;
  onRoll: () => void;
  showButton: boolean;
  cellSize: number;
}) {
  const [introDone, setIntroDone] = useState(false);

  const label =
    rollsUsed === 0
      ? `ROLL 1 of ${rollsPerTurn}`
      : `ROLL ${Math.min(rollsUsed + 1, rollsPerTurn)} of ${rollsPerTurn}`;

  const animating = showButton && !introDone;

  return (
    <button
      onClick={canRoll ? onRoll : undefined}
      disabled={!canRoll}
      className={`flex items-center justify-center rounded-full pressable ${animating ? "animate-scale-in" : ""}`}
      onAnimationEnd={() => setIntroDone(true)}
      style={{
        width: "100%",
        height: "100%",
        border: "1px solid #ffffff",
        opacity: canRoll ? 1 : 0.35,
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: cellSize > 80 ? 14 : cellSize > 60 ? 11 : 9,
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
