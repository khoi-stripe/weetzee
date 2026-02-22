"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Die } from "./Die";
import type { Die as DieType, Player } from "@/lib/types";
import type { ScoreCategory } from "@/lib/types";
import { getAvailableScores } from "@/lib/engine";
import { getRulesetBonus, getRulesetTotal } from "@/lib/rulesets";
import { EXTRA_WEETZEE_VALUE } from "@/lib/rulesets/yahtzee";
import type { Ruleset } from "@/lib/types";

// ===== ScorecardView =====
// Scorecard table + mini dice strip at bottom.
// No longer includes its own PlayerBar — that's now shared in GameView.

export function ScorecardView({
  players,
  currentPlayerIndex,
  dice,
  ruleset,
  turn,
  rollsUsed,
  rollsPerTurn,
  playerColor,
  onScoreCategory,
  onRoll,
  onToggleHold,
  justScoredCategoryId,
  justScoredPlayerIndex,
  multipleWeetzeesEnabled,
}: {
  players: Player[];
  currentPlayerIndex: number;
  dice: DieType[];
  ruleset: Ruleset;
  turn: number;
  rollsUsed: number;
  rollsPerTurn: number;
  playerColor: string;
  onScoreCategory: (id: string) => void;
  onRoll: () => void;
  onToggleHold: (id: number) => void;
  justScoredCategoryId?: string | null;
  justScoredPlayerIndex?: number | null;
  multipleWeetzeesEnabled?: boolean;
}) {
  const currentPlayer = players[currentPlayerIndex];
  const diceValues = dice.map((d) => d.value);

  const availableScores = getAvailableScores(
    diceValues,
    ruleset,
    currentPlayer.scores
  );

  const categories = ruleset.categories.filter((c) => c.id !== "bonus");

  const locked = justScoredCategoryId != null;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCategoryId(null);
  }, [turn, currentPlayerIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const th = el.querySelectorAll("thead th")[currentPlayerIndex + 1];
    if (!th) return;

    const containerRect = el.getBoundingClientRect();
    const thRect = th.getBoundingClientRect();
    const stickyColWidth = 141;
    const visibleLeft = containerRect.left + stickyColWidth;
    const visibleRight = containerRect.right;

    if (thRect.left < visibleLeft) {
      el.scrollTo({ left: el.scrollLeft + (thRect.left - visibleLeft), behavior: "smooth" });
    } else if (thRect.right > visibleRight) {
      el.scrollTo({ left: el.scrollLeft + (thRect.right - visibleRight), behavior: "smooth" });
    }
  }, [currentPlayerIndex]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef<{ top: number; left: number } | null>(null);
  const [showFade, setShowFade] = useState(false);
  const [scrolledX, setScrolledX] = useState(false);

  const checkFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 2;
    setShowFade(el.scrollHeight > el.clientHeight && !atBottom);
    setScrolledX(el.scrollLeft > 0);
  }, []);

  const scrollLock = useRef<{ axis: "x" | "y" | null; startX: number; startY: number; scrollX: number; scrollY: number }>({
    axis: null, startX: 0, startY: 0, scrollX: 0, scrollY: 0,
  });
  const LOCK_THRESHOLD = 4;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkFade();
    el.addEventListener("scroll", checkFade, { passive: true });
    const ro = new ResizeObserver(checkFade);
    ro.observe(el);

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      scrollLock.current = { axis: null, startX: t.clientX, startY: t.clientY, scrollX: el!.scrollLeft, scrollY: el!.scrollTop };
    }

    function onTouchMove(e: TouchEvent) {
      const lock = scrollLock.current;
      const t = e.touches[0];
      const dx = t.clientX - lock.startX;
      const dy = t.clientY - lock.startY;

      if (!lock.axis) {
        if (Math.abs(dx) > LOCK_THRESHOLD || Math.abs(dy) > LOCK_THRESHOLD) {
          lock.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        } else {
          return;
        }
      }

      e.preventDefault();
      if (lock.axis === "x") {
        el!.scrollLeft = lock.scrollX - dx;
      } else {
        el!.scrollTop = lock.scrollY - dy;
      }
    }

    function onTouchEnd() {
      scrollLock.current.axis = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("scroll", checkFade);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      ro.disconnect();
    };
  }, [checkFade]);

  useLayoutEffect(() => {
    if (savedScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = savedScroll.current.top;
      scrollRef.current.scrollLeft = savedScroll.current.left;
      savedScroll.current = null;
    }
  });

  function saveScroll() {
    const el = scrollRef.current;
    if (el) savedScroll.current = { top: el.scrollTop, left: el.scrollLeft };
  }

  return (
    <div className="flex flex-col w-full flex-1 min-h-0" style={{ padding: "0 16px 16px", gap: 16 }}>
      {/* Scrollable table with fade */}
      <div className="relative min-h-0">
        <div
          ref={scrollRef}
          className="min-h-0 overflow-y-auto overflow-x-auto rounded scrollbar-visible"
          style={{ border: "1px solid #ffffff", maxHeight: "100%" }}
        >
          <table
            className="border-collapse"
            style={{
              tableLayout: "fixed",
              minWidth: players.length > 3 ? `${140 + players.length * 64}px` : "100%",
              width: "100%",
            }}
          >
            <colgroup>
              <col style={{ width: 140 }} />
              {players.map((p) => (
                <col key={p.id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <Th style={{ position: "sticky", top: 0, left: 0, zIndex: 3, background: "#1a1a1a" }}>{""}</Th>
                {players.map((p) => (
                  <Th key={p.id} style={{ position: "sticky", top: 0, zIndex: 2, color: p.color }}>
                    {p.name}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <ScoreRow
                  key={cat.id}
                  category={cat}
                  players={players}
                  currentPlayerIndex={currentPlayerIndex}
                  availableScore={availableScores[cat.id]}
                  selected={cat.id === selectedCategoryId}
                  onScore={() => {
                    if (!locked) {
                      saveScroll();
                      setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id);
                    }
                  }}
                  justScored={cat.id === justScoredCategoryId}
                  justScoredPlayerIndex={justScoredPlayerIndex ?? null}
                />
              ))}
              <BonusRow players={players} ruleset={ruleset} />
              {multipleWeetzeesEnabled && <WeetzeeBonusRow players={players} />}
            </tbody>
            <tfoot>
              <TotalRow players={players} ruleset={ruleset} />
            </tfoot>
          </table>
        </div>
        <div
          style={{
            position: "absolute",
            top: 1,
            bottom: 1,
            left: 141,
            width: 1,
            background: "#ffffff",
            pointerEvents: "none",
            zIndex: 4,
            opacity: scrolledX ? 1 : 0,
            transition: "opacity 200ms",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 38,
            left: 0,
            right: 0,
            height: 40,
            background: "linear-gradient(to bottom, transparent, #000000)",
            pointerEvents: "none",
            opacity: showFade ? 1 : 0,
            transition: "opacity 200ms",
          }}
        />
      </div>

      <div className="flex-1" />

      {selectedCategoryId && !locked && (
        <button
          onClick={() => {
            saveScroll();
            onScoreCategory(selectedCategoryId);
            setSelectedCategoryId(null);
          }}
          className="shrink-0 w-full pressable"
          style={{
            padding: "12px 0",
            border: "1px solid #ffffff",
            borderRadius: 4,
            background: "#ffffff",
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 14,
            fontWeight: 500,
            color: "#000000",
            cursor: "pointer",
          }}
        >
          Done
        </button>
      )}

      {/* Interactive mini dice strip + roll button */}
      <MiniDiceStrip
        dice={dice}
        rollsUsed={rollsUsed}
        rollsPerTurn={rollsPerTurn}
        playerColor={playerColor}
        coloredPips={!!ruleset.pipColors}
        onRoll={onRoll}
        onToggleHold={onToggleHold}
      />
    </div>
  );
}

// ===== Score Row =====

function ScoreRow({
  category,
  players,
  currentPlayerIndex,
  availableScore,
  selected = false,
  onScore,
  justScored,
  justScoredPlayerIndex,
}: {
  category: ScoreCategory;
  players: Player[];
  currentPlayerIndex: number;
  availableScore: number | undefined;
  selected?: boolean;
  onScore: () => void;
  justScored: boolean;
  justScoredPlayerIndex: number | null;
}) {
  const currentPlayer = players[currentPlayerIndex];
  const alreadyScored = currentPlayer.scores[category.id] !== undefined;
  const isScoreable = !alreadyScored && availableScore !== undefined && !justScored;

  return (
    <tr
      onClick={isScoreable ? onScore : undefined}
      style={{ cursor: isScoreable ? "pointer" : "default" }}
    >
      <td
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #ffffff",
          borderRight: "1px solid #ffffff",
          background: "#1a1a1a",
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 14,
          color: "#ffffff",
          fontWeight: 400,
          transition: "background 150ms, color 150ms",
          position: "sticky",
          left: 0,
          zIndex: 1,
        }}
      >
        {category.name}
      </td>
      {players.map((player, i) => {
        const scored = player.scores[category.id];
        const isCurrent = i === currentPlayerIndex;
        const isJustScoredCell = justScored && i === justScoredPlayerIndex;
        const isSelectedCell = selected && isCurrent;
        const showPreview = isCurrent && !alreadyScored && availableScore !== undefined && !justScored && !selected;
        const bg = isSelectedCell
          ? player.color
          : isJustScoredCell
            ? player.color
            : showPreview
              ? `${player.color}33`
              : "#000000";

        return (
          <td
            key={player.id}
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid #ffffff",
              borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              background: bg,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 14,
              fontWeight: isSelectedCell || isJustScoredCell ? 500 : 400,
              color: isSelectedCell || isJustScoredCell ? "#000000" : showPreview ? player.color : "#ffffff",
              transition: "background 150ms, color 150ms",
            }}
          >
            {isSelectedCell ? (
              availableScore
            ) : showPreview ? (
              <span className="pressable" style={{ display: "inline-block" }}>
                {availableScore}
              </span>
            ) : (
              scored !== undefined ? scored : isJustScoredCell ? availableScore : ""
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Bonus Row =====

function BonusRow({ players, ruleset }: { players: Player[]; ruleset: Ruleset }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 16px",
          borderRight: "1px solid #ffffff",
          background: "#1a1a1a",
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 14,
          color: "#ffffff",
          position: "sticky",
          left: 0,
          zIndex: 1,
        }}
      >
        Bonus
      </td>
      {players.map((player, i) => {
        const bonus = getRulesetBonus(ruleset, player.scores);
        return (
          <td
            key={player.id}
            style={{
              padding: "8px 16px",
              borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              background: "#000000",
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 14,
              color: bonus > 0 ? player.color : "#ffffff",
            }}
          >
            {bonus > 0 ? bonus : "—"}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Weetzee Bonus Row =====

function WeetzeeBonusRow({ players }: { players: Player[] }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 16px",
          borderRight: "1px solid #ffffff",
          background: "#1a1a1a",
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 14,
          color: "#ffffff",
          position: "sticky",
          left: 0,
          zIndex: 1,
        }}
      >
        Weetzee+
      </td>
      {players.map((player, i) => {
        const count = player.extraWeetzees;
        const points = count * EXTRA_WEETZEE_VALUE;
        return (
          <td
            key={player.id}
            style={{
              padding: "8px 16px",
              borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              background: "#000000",
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 14,
              color: count > 0 ? player.color : "#ffffff",
            }}
          >
            {count > 0 ? points : "—"}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Total Row =====

function TotalRow({ players, ruleset }: { players: Player[]; ruleset: Ruleset }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 16px",
          borderRight: "1px solid #ffffff",
          background: "#1a1a1a",
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 14,
          fontWeight: 600,
          color: "#ffffff",
          boxShadow: "inset 0 1px 0 #ffffff",
          position: "sticky",
          left: 0,
          bottom: 0,
          zIndex: 3,
        }}
      >
        Total
      </td>
      {players.map((player, i) => {
        const total = getRulesetTotal(ruleset, player.scores, player.extraWeetzees);
        return (
          <td
            key={player.id}
            style={{
              padding: "8px 16px",
              borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              boxShadow: "inset 0 1px 0 #ffffff",
              background: player.color,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 14,
              fontWeight: 600,
              color: "#000000",
              position: "sticky",
              bottom: 0,
              zIndex: 2,
            }}
          >
            {total}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Mini Dice Strip =====

const MINI_CYCLE_INTERVAL = 50;
const MINI_CYCLE_DURATION = 350;

function randomValue(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function MiniDiceStrip({
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

  const rollLabel = rollsUsed === 0
    ? `${1}/${rollsPerTurn}`
    : `${Math.min(rollsUsed + 1, rollsPerTurn)}/${rollsPerTurn}`;

  // --- Mini rolling animation ---
  const [displayValues, setDisplayValues] = useState<number[]>(() => dice.map((d) => d.value));
  const [rollingDice, setRollingDice] = useState<Set<number>>(new Set());
  const [flashDice, setFlashDice] = useState<Set<number>>(new Set());
  const prevRollsUsed = useRef(rollsUsed);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const justRolled = rollsUsed > prevRollsUsed.current && rollsUsed > 0;
    prevRollsUsed.current = rollsUsed;

    if (!justRolled) {
      setDisplayValues(dice.map((d) => d.value));
      return;
    }

    const unheldIndices = dice.map((d, i) => (!d.held ? i : -1)).filter((i) => i !== -1);
    if (unheldIndices.length === 0) {
      setDisplayValues(dice.map((d) => d.value));
      return;
    }

    setRollingDice(new Set(unheldIndices));

    if (cycleRef.current) clearInterval(cycleRef.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);

    cycleRef.current = setInterval(() => {
      setDisplayValues((prev) => {
        const next = [...prev];
        for (const idx of unheldIndices) next[idx] = randomValue();
        return next;
      });
      setFlashDice(() => {
        const flashing = new Set<number>();
        for (const idx of unheldIndices) {
          if (Math.random() < 0.2) flashing.add(idx);
        }
        return flashing;
      });
    }, MINI_CYCLE_INTERVAL);

    settleTimer.current = setTimeout(() => {
      if (cycleRef.current) clearInterval(cycleRef.current);
      cycleRef.current = null;
      setDisplayValues(dice.map((d) => d.value));
      setRollingDice(new Set());
      setFlashDice(new Set());
    }, MINI_CYCLE_DURATION);

    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollsUsed, dice]);

  return (
    <div className="flex gap-3 w-full shrink-0">
      {dice.map((die, i) => (
        <div key={die.id} className="flex-1 min-w-0">
          <Die
            value={displayValues[i] ?? die.value}
            size="sm"
            held={die.held}
            heldColor={playerColor}
            coloredPips={coloredPips}
            onClick={canHold ? () => onToggleHold(die.id) : undefined}
            disabled={!canHold}
            rolling={rollingDice.has(i)}
            flash={flashDice.has(i)}
          />
        </div>
      ))}
      <button
        onClick={canRoll ? onRoll : undefined}
        disabled={!canRoll}
        className="flex-1 min-w-0 flex items-center justify-center rounded-full aspect-square pressable"
        style={{
          border: "1px solid #ffffff",
          background: "transparent",
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10,
          fontWeight: 500,
          color: "#ffffff",
          opacity: canRoll ? 1 : 0.35,
          cursor: canRoll ? "pointer" : "default",
          transition: "opacity 200ms",
          padding: 0,
        }}
      >
        {rollLabel}
      </button>
    </div>
  );
}

// ===== Table Header Cell =====

function Th({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        padding: "8px 16px",
        borderRight: "1px solid #ffffff",
        background: "#000000",
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 14,
        fontWeight: 400,
        color: "#ffffff",
        textAlign: "left",
        boxShadow: "inset 0 -1px 0 #ffffff",
        ...style,
      }}
    >
      {children}
    </th>
  );
}
