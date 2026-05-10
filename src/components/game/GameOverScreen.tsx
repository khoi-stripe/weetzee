"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import type { Player, Ruleset } from "@/lib/types";
import { getRulesetTotal } from "@/lib/rulesets";
import { incrementGamesCompleted } from "@/lib/supporter";
import { Header } from "./Header";
import { PlayerBar } from "./PlayerBar";
import { playWin, playTap } from "@/lib/sounds";
import { TYPE } from "@/lib/type";

function maybeRequestReview(gamesCompleted: number) {
  if (!Capacitor.isNativePlatform()) return;
  if (gamesCompleted === 3 || (gamesCompleted > 3 && (gamesCompleted - 3) % 10 === 0)) {
    import("@capacitor-community/in-app-review").then(({ InAppReview }) => {
      InAppReview.requestReview();
    }).catch(() => {});
  }
}

export function GameOverScreen({ players, ruleset }: { players: Player[]; ruleset: Ruleset }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(playWin, 300);
    const count = incrementGamesCompleted();
    maybeRequestReview(count);
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
            <span style={{ ...TYPE.body }}>
              {winner.name} wins!
            </span>
            <span style={{ ...TYPE.displayBold }}>
              {winner.total}
            </span>
          </div>
        </div>

        {ranked.length > 1 && (
          <div className="w-full" style={{ animation: "fade-in 400ms ease 200ms both" }}>
            <PlayerBar
              players={ranked}
              currentPlayerIndex={0}
              ruleset={ruleset}
            />
          </div>
        )}

        <button
          onClick={() => { playTap(); router.push("/"); }}
          className="flex items-center justify-center rounded-full shrink-0 pressable"
          style={{
            ...TYPE.body,
            width: 109.67,
            height: 109.67,
            outline: "1px solid #ffffff",
            outlineOffset: -1,
            background: "transparent",
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
