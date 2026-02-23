"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useGame } from "@/hooks/useGame";
import { Header } from "@/components/game/Header";
import { GameView } from "@/components/game/GameView";
import { GameOverScreen } from "@/components/game/GameOverScreen";

function GameContent() {
  const params = useSearchParams();
  const playerCount = Math.min(Math.max(parseInt(params.get("players") ?? "2", 10), 1), 6);
  const rulesetId = params.get("ruleset") ?? "classic";
  const game = useGame(playerCount, rulesetId);
  const { state } = game;

  if (state.gameOver) {
    return <GameOverScreen players={state.players} ruleset={state.ruleset} />;
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "100%", background: "#000000", overflow: "hidden" }}
    >
      <Header
        rulesetId={state.ruleset.id}
        rulesetName={state.ruleset.name}
        rollBankingEnabled={state.rollBankingEnabled}
        onToggleRollBanking={state.ruleset.forcedRolls || state.ruleset.targetAssignment || state.ruleset.farkle ? undefined : game.toggleRollBanking}
        multipleWeetzeesEnabled={state.multipleWeetzeesEnabled}
        onToggleMultipleWeetzees={state.ruleset.targetAssignment || state.ruleset.farkle ? undefined : game.toggleMultipleWeetzees}
        sequentialTargetsEnabled={state.sequentialTargetsEnabled}
        onToggleSequentialTargets={state.ruleset.targetAssignment ? game.toggleSequentialTargets : undefined}
        onEndGame={game.endGame}
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
