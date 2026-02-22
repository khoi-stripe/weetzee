"use client";

import { useRouter } from "next/navigation";
import type { Player, Ruleset } from "@/lib/types";
import { getRulesetTotal } from "@/lib/rulesets";
import { Header } from "./Header";

export function GameOverScreen({ players, ruleset }: { players: Player[]; ruleset: Ruleset }) {
  const router = useRouter();

  const ranked = [...players]
    .map((p) => ({ ...p, total: getRulesetTotal(ruleset, p.scores, p.extraWeetzees) }))
    .sort((a, b) => ruleset.winCondition === "lowest" ? a.total - b.total : b.total - a.total);

  const winner = ranked[0];

  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh", background: "#000000", overflow: "hidden" }}
    >
      <Header />

      <div
        className="flex flex-col flex-1 min-h-0 items-center justify-center"
        style={{ padding: 16, gap: 24 }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "calc(100dvh - 48px - 109.67px - 24px - 32px - 32px)",
            aspectRatio: "1 / 1",
          }}
        >
          <div
            className="w-full h-full flex flex-col items-center justify-center"
            style={{
              background: winner.color,
              borderRadius: 4,
              border: `1px solid ${winner.color}`,
              fontFamily: '"IBM Plex Mono", monospace',
              color: "#000000",
              padding: "10%",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 500 }}>
              {winner.name} wins!
            </span>
            <span style={{ fontSize: 48, fontWeight: 700 }}>
              {winner.total}
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push("/")}
          className="flex items-center justify-center rounded-full shrink-0 pressable"
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
