"use client";

import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";
import { getFullTotal } from "@/lib/rulesets/yahtzee";
import { Header } from "./Header";

// ===== GameOverScreen =====
// Shown when all categories are filled for all players.
// Lists players sorted by score, highlights winner.

export function GameOverScreen({ players }: { players: Player[] }) {
  const router = useRouter();

  const ranked = [...players]
    .map((p) => ({ ...p, total: getFullTotal(p.scores) }))
    .sort((a, b) => b.total - a.total);

  const winner = ranked[0];

  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh", background: "#000000", overflow: "hidden" }}
    >
      <Header />

      <div
        className="flex flex-col flex-1 min-h-0 items-center justify-center gap-6"
        style={{ padding: 32 }}
      >
        <p
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 16,
            fontWeight: 500,
            color: winner.color,
            textAlign: "center",
          }}
        >
          {winner.name} wins!
        </p>

        <div
          className="w-full flex flex-col overflow-hidden"
          style={{
            border: "1px solid #ffffff",
            borderRadius: 4,
          }}
        >
          {ranked.map((player, i) => (
            <div
              key={player.id}
              className="flex items-center"
              style={{
                padding: "12px 16px",
                borderBottom: i < ranked.length - 1 ? "1px solid #ffffff" : "none",
                background: i === 0 ? `${player.color}1a` : "#000000",
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 14,
                fontWeight: i === 0 ? 500 : 400,
                color: player.color,
                gap: 8,
              }}
            >
              <span className="flex-1">{player.name}</span>
              <span>{player.total}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push("/")}
          className="flex items-center justify-center rounded-full pressable"
          style={{
            width: 109.67,
            height: 109.67,
            border: "1px solid #ffffff",
            background: "transparent",
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 14,
            fontWeight: 500,
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          Play again
        </button>
      </div>
    </div>
  );
}
