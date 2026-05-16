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
import { COLOR } from "@/lib/color";
import { DialogCard } from "@/components/ui/DialogCard";
import { RoundButton } from "@/components/ui/RoundButton";

function maybeRequestReview(gamesCompleted: number) {
  if (!Capacitor.isNativePlatform()) return;
  if (gamesCompleted === 3 || (gamesCompleted > 3 && (gamesCompleted - 3) % 10 === 0)) {
    import("@capacitor-community/in-app-review").then(({ InAppReview }) => {
      InAppReview.requestReview();
    }).catch(() => {});
  }
}

export function GameOverScreen({
  players,
  ruleset,
  onPlayAgain,
  newGameUrl,
}: {
  players: Player[];
  ruleset: Ruleset;
  onPlayAgain: () => void;
  newGameUrl: string;
}) {
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
      style={{ height: "100%", background: COLOR.surfaceBg, overflow: "hidden" }}
    >
      <Header showBack backLabel="Exit" exitWithoutConfirm onEndGame={() => router.push("/")} />

      <div
        className="flex flex-col flex-1 min-h-0 items-center justify-center"
        style={{ padding: 16, gap: 24 }}
      >
        <DialogCard
          background={winner.color}
          maxWidth="calc(100dvh - 48px - 100px - 24px - 32px - 32px)"
        >
          <span style={{ ...TYPE.body }}>{winner.name} wins!</span>
          <span style={{ ...TYPE.displayBold }}>{winner.total}</span>
        </DialogCard>

        {ranked.length > 1 && (
          <div className="w-full" style={{ animation: "fade-in 400ms ease 200ms both" }}>
            <PlayerBar
              players={ranked}
              currentPlayerIndex={0}
              ruleset={ruleset}
            />
          </div>
        )}

        <div className="flex shrink-0" style={{ gap: 16 }}>
          <RoundButton
            onClick={() => { playTap(); router.push(newGameUrl); }}
          >
            New game
          </RoundButton>
          <RoundButton
            variant="filled"
            onClick={() => { playTap(); onPlayAgain(); }}
          >
            Play again
          </RoundButton>
        </div>
      </div>
    </div>
  );
}
