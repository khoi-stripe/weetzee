"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Player, Ruleset } from "@/lib/types";
import { getRulesetTotal } from "@/lib/rulesets";
import { Header } from "./Header";
import { playWin, playTap } from "@/lib/sounds";

export function GameOverScreen({ players, ruleset }: { players: Player[]; ruleset: Ruleset }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(playWin, 300);
    return () => clearTimeout(timer);
  }, []);

  const ranked = [...players]
    .map((p) => ({ ...p, total: getRulesetTotal(ruleset, p.scores, p.extraWeetzees) }))
    .sort((a, b) => ruleset.winCondition === "lowest" ? a.total - b.total : b.total - a.total);

  const winner = ranked[0];

  return (
    <div
      className="flex flex-col"
      style={{ height: "100%", background: "#000000", overflow: "hidden" }}
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

              color: "#000000",
              padding: "10%",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {winner.name} wins!
            </span>
            <span style={{ fontSize: 48, fontWeight: 700 }}>
              {winner.total}
            </span>
          </div>
        </div>

        {ranked.length > 1 && (
          <div className="flex flex-col items-center" style={{ gap: 6, width: "100%" }}>
            {ranked.slice(1).map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-center"
                style={{
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#ffffff",
                  opacity: 0.6,
                  animation: `fade-in 400ms ease ${200 + i * 100}ms both`,
                }}
              >
                <span style={{ color: p.color, fontWeight: 700 }}>{p.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{p.total}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => { playTap(); router.push("/"); }}
          className="flex items-center justify-center rounded-full shrink-0 pressable"
          style={{
            width: 109.67,
            height: 109.67,
            outline: "1px solid #ffffff",
            outlineOffset: -1,
            background: "transparent",

            fontSize: 13,
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
