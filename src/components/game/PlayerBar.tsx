"use client";

import { useEffect, useRef, useState } from "react";
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
          const total = getRulesetTotal(ruleset, player.scores, player.extraWeetzees);
          return (
            <div
              key={player.id}
              className="flex items-center min-w-0 justify-center"
              style={{
                flex: isActive && !showScores ? 2 : 1,
                padding: "8px 8px",
                gap: 6,
                background: isActive ? player.color : "transparent",
                color: isActive ? "#000000" : player.color,
                borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              }}
            >
              <span className="shrink-0">{player.name}</span>
              {(isActive || showScores) && <span className="shrink-0">{total}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
