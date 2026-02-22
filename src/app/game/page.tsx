"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useGame } from "@/hooks/useGame";
import { Header } from "@/components/game/Header";
import { GameView } from "@/components/game/GameView";
import { GameOverScreen } from "@/components/game/GameOverScreen";

function GameContent() {
  const params = useSearchParams();
  const playerCount = Math.min(Math.max(parseInt(params.get("players") ?? "2"), 1), 3);
  const game = useGame(playerCount);
  const { state } = game;

  if (state.gameOver) {
    return <GameOverScreen players={state.players} />;
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh", background: "#000000", overflow: "hidden" }}
    >
      <Header
        rollBankingEnabled={state.rollBankingEnabled}
        onToggleRollBanking={game.toggleRollBanking}
        multipleWeetzeesEnabled={state.multipleWeetzeesEnabled}
        onToggleMultipleWeetzees={game.toggleMultipleWeetzees}
      />
      <GameView game={game} />
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense>
      <GameContent />
    </Suspense>
  );
}
