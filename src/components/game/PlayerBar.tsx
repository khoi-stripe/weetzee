"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Player, Ruleset } from "@/lib/types";
import { getRulesetTotal } from "@/lib/rulesets";

const MIN_CELL_WIDTH_WITH_SCORE = 70;

export function PlayerBar({
  players,
  currentPlayerIndex,
  ruleset,
  onClick,
}: {
  players: Player[];
  currentPlayerIndex: number;
  ruleset: Ruleset;
  onClick?: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [showScores, setShowScores] = useState(true);
  const [peekedIndex, setPeekedIndex] = useState<number | null>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = barRef.current;
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
    }, 2000);
  }, []);

  return (
    <div
      className="shrink-0 w-full"
      style={{ padding: "16px 16px" }}
      onClick={onClick}
    >
      <div
        ref={barRef}
        className={`flex overflow-hidden ${onClick ? "pressable" : ""}`}
        style={{
          outline: "1px solid #ffffff",
          outlineOffset: -1,
          borderRadius: 4,

          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {players.map((player, i) => {
          const isActive = i === currentPlayerIndex;
          const isPeeked = peekedIndex === i;
          const showScore = isActive || isPeeked || showScores;
          const expanded = (isActive || isPeeked) && !showScores;
          const total = getRulesetTotal(ruleset, player.scores, player.extraWeetzees);
          return (
            <div
              key={player.id}
              className="flex items-center min-w-0 justify-center"
              style={{
                flex: expanded ? 2 : 1,
                padding: "8px 8px",
                gap: 6,
                background: isActive ? player.color : "transparent",
                color: isActive ? "#000000" : player.color,
                borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
                transition: "flex 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                cursor: !onClick && !isActive && !showScores ? "pointer" : undefined,
              }}
              onClick={!onClick && !isActive && !showScores ? (e) => { e.stopPropagation(); peekPlayer(i); } : undefined}
            >
              <span className="shrink-0">{player.name}</span>
              {showScore && <span className="shrink-0">{total}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
