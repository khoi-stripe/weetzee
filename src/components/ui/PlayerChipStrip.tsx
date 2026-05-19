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

/** Approx average glyph width as a fraction of font-size for IBM Plex Mono. */
const MONO_CHAR_RATIO = 0.6;
/** Per-cell horizontal padding (8px each side) + gap between name and score (6px). */
const CELL_INNER_PADDING_PX = 22;
/** Default text size (matches TYPE.body); also the upper bound so we never *grow* text. */
const BASE_FONT_SIZE = 13;
/** Lower bound — below this the strip becomes hard to read. */
const MIN_FONT_SIZE = 10;

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
  const [stripWidth, setStripWidth] = useState(0);
  const [peekedIndex, setPeekedIndex] = useState<number | null>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    function measure() {
      setStripWidth(el!.getBoundingClientRect().width);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showScores = stripWidth === 0
    || stripWidth / players.length >= MIN_CELL_WIDTH_WITH_SCORE;

  // Pick the largest font-size (capped at body) that fits every cell's worst-case
  // content — including the active cell's wider "name + score" layout.
  // This is what keeps "CP6 10000" inside its cell instead of overflowing.
  const fontSize = (() => {
    if (stripWidth === 0) return BASE_FONT_SIZE;
    const expanded = !showScores ? 2 : 1; // matches the `flex` value used below
    const inactiveCellPx = stripWidth / (players.length - 1 + expanded);
    const activeCellPx = inactiveCellPx * expanded;
    const longestActiveChars = Math.max(
      ...players.map((p) => `${p.name} ${p.score}`.length),
      1,
    );
    const longestInactiveChars = showScores
      ? longestActiveChars
      : Math.max(...players.map((p) => p.name.length), 1);
    const fitFor = (w: number, chars: number) =>
      (w - CELL_INNER_PADDING_PX) / (chars * MONO_CHAR_RATIO);
    const fit = Math.min(
      fitFor(activeCellPx, longestActiveChars),
      fitFor(inactiveCellPx, longestInactiveChars),
    );
    return Math.max(MIN_FONT_SIZE, Math.min(BASE_FONT_SIZE, Math.floor(fit)));
  })();

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
        fontSize,
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
        // Inactive cells (both variants) show the player color as text on a
        // black background. In the light variant this means the strip
        // becomes a black block dotted with player-colored names — same
        // treatment as the in-game bar so all colors are recognizable.
        const cellTextColor = isActive ? COLOR.inverse : p.color;
        const cellBg = isActive
          ? p.color
          : isLight
            ? COLOR.surfaceBg
            : "transparent";

        const peekable = !isActive && !showScores;

        return (
          <div
            key={p.id}
            className="flex items-center min-w-0 justify-center"
            style={{
              flex: expanded ? 2 : 1,
              padding: "8px 8px",
              gap: 6,
              background: cellBg,
              color: cellTextColor,
              borderRight: i < players.length - 1 ? `1px solid ${dividerColor}` : "none",
              transition: `flex ${DURATION.slow}ms ${EASE.spring}`,
              cursor: peekable ? "pointer" : undefined,
            }}
            onClick={peekable ? (e) => { e.stopPropagation(); peekPlayer(i); } : undefined}
          >
            <span className="min-w-0 truncate">{p.name}</span>
            {showScore && <span className="shrink-0">{p.score}</span>}
          </div>
        );
      })}
    </div>
  );
}
