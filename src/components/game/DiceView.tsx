"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Die } from "./Die";
import type { Die as DieType } from "@/lib/types";
import { rollValue } from "@/lib/engine";
import { computeSquareGridLayout } from "@/lib/gridLayout";
import { getAudioCtx, playBleep, playSettle, playTap } from "@/lib/sounds";
import { hapticDiceRoll } from "@/lib/haptics";
import { WEIGHT } from "@/lib/type";
import { COLOR } from "@/lib/color";
import { RADIUS } from "@/lib/tokens";

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

export const DiceView = memo(function DiceView({
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
  farkleActionLabel,
  farkleActionEnabled = false,
  farkleBankEnabled = false,
  farkleOnBank,
  farkleBankLabel,
  farkleActionPressed = false,
  farkleBankPressed = false,
  farkleBankReady = false,
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
  farkleActionLabel?: string;
  farkleActionEnabled?: boolean;
  farkleBankEnabled?: boolean;
  farkleOnBank?: () => void;
  farkleBankLabel?: string;
  farkleActionPressed?: boolean;
  farkleBankPressed?: boolean;
  farkleBankReady?: boolean;
}) {
  const heldCount = dice.filter((d) => d.held).length;
  const allHeld = heldCount >= dice.length;
  const canRoll = farkleMode ? false : (rollsUsed < rollsPerTurn && !allHeld);
  const canHold = farkleMode ? (rollsUsed > 0 && !farkled) : rollsUsed > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ cols: 2, rows: 3, cellSize: 0 });
  const GAP = 16;
  const showRollButton = !farkleMode;
  const showFarkleButtons = farkleMode;
  const extraItems = showRollButton ? 1 : showFarkleButtons ? 2 : 0;
  const ITEM_COUNT = dice.length + extraItems;

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

  const diceRef = useRef(dice);
  diceRef.current = dice;
  const setAsideDiceIdsRef = useRef(setAsideDiceIds);
  setAsideDiceIdsRef.current = setAsideDiceIds;

  // Detect when a roll just happened (rollsUsed increased)
  useEffect(() => {
    const justRolled = rollsUsed > prevRollsUsed.current && rollsUsed > 0;
    prevRollsUsed.current = rollsUsed;
    const dice = diceRef.current;
    const setAsideDiceIds = setAsideDiceIdsRef.current;

    if (!justRolled) {
      setDisplayValues(dice.map((d) => d.value));
      return;
    }

    // Determine which dice were not held and not set aside (those that were re-rolled)
    const unheldIndices = dice.map((d, i) => (!d.held && !setAsideDiceIds.includes(d.id) ? i : -1)).filter((i) => i !== -1);
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
  }, [rollsUsed]);

  // Keep displayValues in sync if dice values change while not animating (turn end, restore)
  useEffect(() => {
    if (isAnimating.current) return;
    setDisplayValues((prev) => {
      const next = dice.map((d) => d.value);
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
      return next;
    });
  }, [dice]);

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
        setLayout(computeSquareGridLayout(h, h, ITEM_COUNT, GAP));
      } else {
        const { width, height } = el!.getBoundingClientRect();
        setLayout(computeSquareGridLayout(width - GAP * 2, height - GAP * 2, ITEM_COUNT, GAP));
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
        // Set-aside dice get sorted to front via CSS order
        const order = farkleMode && isSetAside ? 0 : 1;
        return (
          <div
            key={die.id}
            className={visibleDice.has(i) ? "animate-spin-in" : ""}
            style={{
              width: layout.cellSize || "100%",
              height: layout.cellSize || "100%",
              opacity: isSetAside ? 0.4 : (visibleDice.has(i) ? undefined : 0),
              transition: "opacity 300ms",
              order,
            }}
          >
            <Die
              value={displayValues[i] ?? die.value}
              held={die.held}
              heldColor={playerColor}
              coloredPips={coloredPips}
              onClick={dieCanHold ? () => { playTap(); onToggleHold(die.id); } : undefined}
              disabled={!dieCanHold}
              label={rollsUsed === 0 ? "Roll me" : undefined}
              rolling={rollingDice.has(i)}
              flash={flashDice.has(i)}
              dieValueMap={dieValueMap}
              setAside={isSetAside}
              setAsideColor={playerColor}
            />
          </div>
        );
      })}
      {showRollButton && (
        <div style={{ width: layout.cellSize || "100%", height: layout.cellSize || "100%", containerType: "inline-size", order: 2 }}>
          <RollButton
            rollsUsed={rollsUsed}
            rollsPerTurn={rollsPerTurn}
            canRoll={canRoll}
            onRoll={onRoll}
            showButton={showButton}
            allHeld={allHeld}
            color={playerColor}
          />
        </div>
      )}
      {showFarkleButtons && (
        <>
          <div style={{ width: layout.cellSize || "100%", height: layout.cellSize || "100%", containerType: "inline-size", order: 2 }}>
            <FarkleActionButton
              label={farkleActionLabel ?? "ROLL"}
              enabled={farkleActionEnabled}
              onAction={onRoll}
              showButton={showButton}
              color={playerColor}
              hotDice={farkleActionLabel === "HOT DICE!"}
              pressed={farkleActionPressed}
            />
          </div>
          <div style={{ width: layout.cellSize || "100%", height: layout.cellSize || "100%", containerType: "inline-size", order: 2 }}>
            <FarkleBankButton
              label={farkleBankLabel ?? "BANK"}
              enabled={farkleBankEnabled}
              onBank={farkleOnBank ?? (() => {})}
              showButton={showButton && farkleBankReady}
              pressed={farkleBankPressed}
            />
          </div>
        </>
      )}
    </div>
  );
});

// ===== Wavy animated border overlay =====

function buildWavyPath(cx: number, cy: number, r: number, w1: number, a1: number, p1: number, w2: number, a2: number, p2: number, pts = 120): string {
  const points: [number, number][] = [];
  for (let i = 0; i < pts; i++) {
    const angle = (i / pts) * Math.PI * 2;
    const ripple = r + a1 * Math.sin(w1 * angle + p1) + a2 * Math.sin(w2 * angle + p2);
    points.push([cx + ripple * Math.cos(angle), cy + ripple * Math.sin(angle)]);
  }
  const d: string[] = [`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`];
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1p = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];
    const cp1x = p1p[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1p[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1p[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1p[1]) / 6;
    d.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }
  return d.join(" ") + " Z";
}

function WavyBorder({ color, active }: { color: string; active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const phase1 = useRef(0);
  const phase2 = useRef(Math.PI * 0.7);
  const raf = useRef<number>(0);
  const last = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(raf.current);
      if (pathRef.current) pathRef.current.setAttribute("d", "");
      return;
    }
    const WAVES = 17, AMP1 = 4, WAVES2 = 22, AMP2 = 1.6, S1 = -3.6, S2 = 7.2;
    const PAD = AMP1 + AMP2 + 3;

    const FRAME_MS = 1000 / 30;
    function frame(ts: number) {
      if (last.current && ts - last.current < FRAME_MS) {
        raf.current = requestAnimationFrame(frame);
        return;
      }
      const dt = last.current ? (ts - last.current) / 1000 : 0;
      last.current = ts;
      phase1.current += S1 * dt * Math.PI * 2 * 0.25;
      phase2.current += S2 * dt * Math.PI * 2 * 0.25;

      const el = containerRef.current;
      if (el && pathRef.current && svgRef.current) {
        const w = el.offsetWidth;
        const svgSize = w + PAD * 2;
        const c = svgSize / 2;
        svgRef.current.setAttribute("width", String(svgSize));
        svgRef.current.setAttribute("height", String(svgSize));
        svgRef.current.style.left = `${-PAD}px`;
        svgRef.current.style.top = `${-PAD}px`;
        pathRef.current.setAttribute("d", buildWavyPath(c, c, w / 2, WAVES, AMP1, phase1.current, WAVES2, AMP2, phase2.current));
      }
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [active, color]);

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "50%", overflow: "visible" }}>
      <svg ref={svgRef} style={{ position: "absolute" }}>
        <path ref={pathRef} d="" fill="transparent" stroke={color} strokeWidth={1.5} />
      </svg>
    </div>
  );
}

// ===== Farkle Action Button (circular, in-grid) =====

function FarkleActionButton({
  label,
  enabled,
  onAction,
  showButton,
  color,
  hotDice,
  pressed = false,
}: {
  label: string;
  enabled: boolean;
  onAction: () => void;
  showButton: boolean;
  color: string;
  hotDice?: boolean;
  pressed?: boolean;
}) {
  const [introDone, setIntroDone] = useState(false);
  const animating = showButton && !introDone;

  const showWavy = !!(hotDice && !pressed && showButton);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <WavyBorder color={color} active={showWavy} />
      <button
        onClick={enabled ? () => { getAudioCtx(); hapticDiceRoll(); onAction(); } : undefined}
        disabled={!enabled && !pressed}
        className={`flex items-center justify-center rounded-full pressable ${animating ? "animate-scale-in" : ""}`}
        onAnimationEnd={() => setIntroDone(true)}
        style={{
          width: "100%",
          height: "100%",
          outline: showWavy ? "none" : `1px solid ${pressed ? color : (enabled ? color : COLOR.textPrimary)}`,
          outlineOffset: -1,
          opacity: pressed ? 1 : (enabled ? 1 : 0.35),
          fontSize: "clamp(11px, 8cqi, 100px)",
          fontWeight: WEIGHT.semibold,
          color: pressed ? COLOR.surfaceBg : (enabled ? color : COLOR.textPrimary),
          background: pressed ? color : "transparent",
          cursor: enabled ? "pointer" : "default",
          transform: pressed ? "scale(0.85)" : (showButton ? undefined : "scale(0)"),
          textAlign: "center",
          lineHeight: 1.2,
          padding: "8%",
        }}
      >
        {label}
      </button>
    </div>
  );
}

// ===== Farkle Bank Button (diamond, in-grid) =====

// Hole ry as a fraction of the container size, matching Figma proportions.
const BANK_HOLE_RY_RATIO = 12.5 / 160;

function buildBankKeyframes(pausePct: number, pauseDrift: number, size: number, holeRy: number) {
  const midPct = pausePct + (100 - pausePct) * 0.3;
  const frames: [number, number][] = [
    [0, 0],
    [pausePct * 0.5, -pauseDrift],
    [pausePct, -pauseDrift * 0.5],
    [midPct, 20],
    [100, 130],
  ];
  const easings = [
    "animation-timing-function: ease-in-out;",
    "animation-timing-function: ease-in-out;",
    "animation-timing-function: cubic-bezier(0.55, 0, 1, 1);",
    "animation-timing-function: cubic-bezier(0.8, 0, 1, 1);",
    "",
  ];
  const sz = Math.round(size);
  const lines = frames.map(([pct, ty], i) => {
    const maskY = ty > 0 ? `${(-(ty / 100) * size).toFixed(1)}px` : "0px";
    return `${pct.toFixed(1)}% { transform: translateY(${ty}%); mask-position: 0px ${maskY}; -webkit-mask-position: 0px ${maskY}; ${easings[i]} }`;
  }).join(" ");
  return `@keyframes bank-drop-${sz} { ${lines} } @keyframes bank-hole-open-${sz} { from { transform: scaleX(0); } to { transform: scaleX(1); } }`;
}

function FarkleBankButton({
  label,
  enabled,
  onBank,
  showButton,
  pressed = false,
}: {
  label: string;
  enabled: boolean;
  onBank: () => void;
  showButton: boolean;
  pressed?: boolean;
}) {
  const [introDone, setIntroDone] = useState(false);
  const [bankAnim, setBankAnim] = useState<"idle" | "exit" | "score" | "flash">("idle");
  const [done, setDone] = useState(false);
  const [size, setSize] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const animating = showButton && !introDone;
  const scoreOnly = label.replace(/[^0-9]/g, "");

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setSize(Math.round(entries[0].contentRect.width));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Reset animation state when the button becomes visible for a new turn.
  useEffect(() => {
    if (showButton) { setDone(false); setIntroDone(false); }
  }, [showButton]);

  function runBankAnim() {
    timers.current.forEach(clearTimeout);
    setBankAnim("exit");
    setDone(false);
    timers.current = [
      setTimeout(() => setBankAnim("score"), 900),
      setTimeout(() => setBankAnim("flash"), 1800),
      setTimeout(() => { setBankAnim("idle"); setDone(true); }, 2070),
    ];
  }

  useEffect(() => {
    if (pressed) runBankAnim();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressed]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const isExiting = bankAnim !== "idle";
  const showScore = bankAnim === "score" || bankAnim === "flash";
  const sz = Math.round(size);
  const holeRy = size > 0 ? Math.round(size * BANK_HOLE_RY_RATIO) : 0;
  const holeCy = size - holeRy;
  const maskUrl = size > 0
    ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + holeRy}"><rect width="${size}" height="${size}" fill="black"/><ellipse cx="${size / 2}" cy="${size}" rx="${size / 2}" ry="${holeRy}" fill="black"/></svg>`)}")`
    : undefined;
  const maskSize = size > 0 ? `${size}px ${size + holeRy}px` : undefined;

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: isExiting ? "hidden" : "visible", position: "relative" }}>
      {size > 0 && <style>{buildBankKeyframes(70, 3, size, holeRy)}</style>}

      {/* z=0 — grey hole, opens from center */}
      {isExiting && size > 0 && (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}
          style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "visible", pointerEvents: "none" }}>
          <ellipse
            cx={size / 2} cy={holeCy} rx={size / 2} ry={holeRy}
            fill="#0F0F0F"
            style={{
              animation: `bank-hole-open-${sz} 200ms ease-out 0ms forwards`,
              transformBox: "fill-box", transformOrigin: "center",
            }}
          />
        </svg>
      )}

      {/* z=1 — diamond with CSS mask tracking the hole aperture (only during exit) */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        WebkitMaskImage: bankAnim === "exit" ? maskUrl : undefined,
        maskImage: bankAnim === "exit" ? maskUrl : undefined,
        WebkitMaskSize: bankAnim === "exit" ? maskSize : undefined,
        maskSize: bankAnim === "exit" ? maskSize : undefined,
        WebkitMaskRepeat: bankAnim === "exit" ? "no-repeat" : undefined,
        maskRepeat: bankAnim === "exit" ? "no-repeat" : undefined,
        WebkitMaskPosition: bankAnim === "exit" ? "0px 0px" : undefined,
        maskPosition: bankAnim === "exit" ? "0px 0px" : undefined,
        opacity: (bankAnim !== "exit" && (bankAnim !== "idle" || done)) ? 0 : undefined,
        animation: bankAnim === "exit" && size > 0
          ? `bank-drop-${sz} 900ms linear forwards`
          : undefined,
      }}>
        <div
          className="flex items-center justify-center"
          style={{ width: "100%", height: "100%", transform: (showButton || bankAnim !== "idle") ? "rotate(45deg)" : "rotate(45deg) scale(0)" }}
        >
          <button
            onClick={enabled && bankAnim === "idle" ? () => { runBankAnim(); onBank(); } : undefined}
            disabled={!enabled && !pressed}
            className={`flex items-center justify-center pressable ${animating ? "animate-scale-in" : ""}`}
            onAnimationEnd={() => setIntroDone(true)}
            style={{
              width: "66%",
              height: "66%",
              outline: `1px solid ${COLOR.textPrimary}`,
              outlineOffset: -1,
              borderRadius: RADIUS.sm,
              opacity: enabled ? 1 : 0.35,
              fontSize: "clamp(11px, 8cqi, 100px)",
              fontWeight: WEIGHT.semibold,
              color: enabled ? COLOR.surfaceBg : COLOR.textPrimary,
              background: enabled ? COLOR.textPrimary : "transparent",
              cursor: enabled ? "pointer" : "default",
              lineHeight: 1.2,
              padding: "4%",
            }}
          >
            <span style={{ transform: "rotate(-45deg)", display: "block", textAlign: "center" }}>
              {label}
            </span>
          </button>
        </div>
      </div>

      {/* z=2 — rising score / flash */}
      {showScore && scoreOnly && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "clamp(16px, 14cqi, 100px)",
          fontWeight: WEIGHT.semibold,
          color: COLOR.textPrimary,
          animation: bankAnim === "score"
            ? "bank-score-rise 260ms cubic-bezier(0, 0, 0.2, 1) forwards"
            : "bank-score-exit 200ms ease-out forwards",
        }}>
          {bankAnim === "flash" ? "*" : scoreOnly}
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
  color = COLOR.textPrimary,
}: {
  rollsUsed: number;
  rollsPerTurn: number;
  canRoll: boolean;
  onRoll: () => void;
  showButton: boolean;
  allHeld?: boolean;
  color?: string;
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
      onClick={canRoll ? () => { getAudioCtx(); hapticDiceRoll(); onRoll(); } : undefined}
      disabled={!canRoll}
      className={`flex items-center justify-center rounded-full pressable ${animating ? "animate-scale-in" : ""}`}
      onAnimationEnd={() => setIntroDone(true)}
      style={{
        width: "100%",
        height: "100%",
        outline: `1px solid ${canRoll ? color : COLOR.textPrimary}`,
        outlineOffset: -1,
        opacity: canRoll ? 1 : 0.35,
        fontSize: "clamp(11px, 8cqi, 100px)",
        fontWeight: WEIGHT.medium,
        color: canRoll ? color : COLOR.textPrimary,
        background: "transparent",
        cursor: canRoll ? "pointer" : "default",
        transform: showButton ? undefined : "scale(0)",
      }}
    >
      {label}
    </button>
  );
}
