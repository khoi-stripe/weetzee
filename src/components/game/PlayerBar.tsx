"use client";

import type { Player } from "@/lib/types";
import { getFullTotal } from "@/lib/rulesets/yahtzee";

// ===== PlayerBar =====
// Shared score bar between dice and scorecard views.
// Tappable: tapping it toggles to the scorecard view.

export function PlayerBar({
  players,
  currentPlayerIndex,
  onClick,
}: {
  players: Player[];
  currentPlayerIndex: number;
  onClick?: () => void;
}) {
  return (
    <div
      className="shrink-0 w-full"
      style={{ padding: "16px 16px" }}
      onClick={onClick}
    >
      <div
        className="flex overflow-hidden"
        style={{
          border: "1px solid #ffffff",
          borderRadius: 4,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 14,
          fontWeight: 500,
          cursor: onClick ? "pointer" : "default",
        }}
      >
        {players.map((player, i) => {
          const isActive = i === currentPlayerIndex;
          const total = getFullTotal(player.scores);
          return (
            <div
              key={player.id}
              className="flex items-center gap-2 flex-1 min-w-0"
              style={{
                padding: "8px 16px",
                background: isActive ? `${player.color}4d` : "transparent",
                color: player.color,
                borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              }}
            >
              <span className="flex-1 min-w-0">{player.name}</span>
              <span className="flex-1 min-w-0 text-right">{total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
