"use client";

/**
 * Horizontal player strip with responsive name+score layout.
 *
 * - When each cell is wide enough (>= MIN_CELL_WIDTH_WITH_SCORE), every
 *   player shows `name score`.
 * - When cells get tight, the active player keeps its score visible and
 *   grows to roughly 2× the size of inactive cells. Inactive cells show
 *   name only; tapping one peeks its score for 2 seconds.
 *
 * Used in two contexts:
 *
 *   <PlayerChipStrip variant="dark"  ... />   // in-game (PlayerBar) — white text on black
 *   <PlayerChipStrip variant="light" ... />   // ContinuePrompt card  — black text on white
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { COLOR } from "@/lib/color";
import { EASE, DURATION } from "@/lib/motion";
import { RADIUS } from "@/lib/tokens";
import { TYPE } from "@/lib/type";

const MIN_CELL_WIDTH_WITH_SCORE = 70;
const PEEK_DURATION_MS = 2000;

export type PlayerChip = {
  /** Stable identifier for React key. */
  id: string | number;
  name: string;
  /** Player accent color (used for active background and inactive text in dark theme). */
  color: string;
  /** Total score to show on the right side of the chip. */
  score: number | string;
};

export function PlayerChipStrip({
  players,
  currentIndex,
  variant = "dark",
  onClick,
}: {
  players: PlayerChip[];
  currentIndex: number;
  /** "dark" = on black surface (default). "light" = on white card. */
  variant?: "dark" | "light";
  /** Optional click handler for the whole strip (e.g. open scorecard). */
  onClick?: () => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [showScores, setShowScores] = useState(true);
  const [peekedIndex, setPeekedIndex] = useState<number | null>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    function measure() {
      const w = el!.getBoundingClientRect().width;
      setShowScores(w / players.length >= MIN_CELL_WIDTH_WITH_SCORE);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [players.length]);

  useEffect(() => {
    return () => { if (peekTimer.current) clearTimeout(peekTimer.current); };
  }, []);

  const peekPlayer = useCallback((index: number) => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeekedIndex(index);
    peekTimer.current = setTimeout(() => {
      setPeekedIndex(null);
      peekTimer.current = null;
    }, PEEK_DURATION_MS);
  }, []);

  const isLight = variant === "light";
  const outlineColor = isLight ? COLOR.inverse : COLOR.borderStrong;
  const dividerColor = outlineColor;

  return (
    <div
      ref={stripRef}
      className={`flex overflow-hidden ${onClick ? "pressable" : ""}`}
      style={{
        ...TYPE.body,
        width: "100%",
        outline: `1px solid ${outlineColor}`,
        outlineOffset: -1,
        borderRadius: RADIUS.sm,
      }}
      onClick={onClick}
    >
      {players.map((p, i) => {
        const isActive = i === currentIndex;
        const isPeeked = peekedIndex === i;
        const showScore = isActive || isPeeked || showScores;
        const expanded = (isActive || isPeeked) && !showScores;
        const cellTextColor = isActive
          ? COLOR.inverse
          : isLight
            ? COLOR.inverse
            : p.color;

        const peekable = !isActive && !showScores;

        return (
          <div
            key={p.id}
            className="flex items-center min-w-0 justify-center"
            style={{
              flex: expanded ? 2 : 1,
              padding: "8px 8px",
              gap: 6,
              background: isActive ? p.color : "transparent",
              color: cellTextColor,
              borderRight: i < players.length - 1 ? `1px solid ${dividerColor}` : "none",
              transition: `flex ${DURATION.slow}ms ${EASE.spring}`,
              cursor: peekable ? "pointer" : undefined,
            }}
            onClick={peekable ? (e) => { e.stopPropagation(); peekPlayer(i); } : undefined}
          >
            <span className="shrink-0">{p.name}</span>
            {showScore && <span className="shrink-0">{p.score}</span>}
          </div>
        );
      })}
    </div>
  );
}
