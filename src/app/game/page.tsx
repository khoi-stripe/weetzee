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
  const rulesetId = params.get("ruleset") ?? "weetzee";
  const game = useGame(playerCount, rulesetId);
  const { state } = game;

  if (state.gameOver) {
    return <GameOverScreen players={state.players} ruleset={state.ruleset} />;
  }

  const gameStarted = state.rollsUsed > 0 || state.turn > 1;
  const isFarkle = !!state.ruleset.farkle;
  const isTarget = !!state.ruleset.targetAssignment;
  const showSixDice = !isFarkle && !isTarget;
  const showOrderedScoring = !isFarkle && !isTarget;

  return (
    <div
      className="flex flex-col"
      style={{ height: "100%", background: "#000000", overflow: "hidden" }}
    >
      <Header
        rulesetId={state.ruleset.id}
        rulesetName={state.ruleset.name}
        rollBankingEnabled={state.rollBankingEnabled}
        onToggleRollBanking={state.ruleset.forcedRolls || isTarget || isFarkle ? undefined : game.toggleRollBanking}
        multipleWeetzeesEnabled={state.multipleWeetzeesEnabled}
        onToggleMultipleWeetzees={isTarget || isFarkle ? undefined : game.toggleMultipleWeetzees}
        sequentialTargetsEnabled={isTarget ? state.sequentialTargetsEnabled : undefined}
        onToggleSequentialTargets={isTarget ? (gameStarted ? undefined : game.toggleSequentialTargets) : undefined}
        scoringHintsEnabled={state.scoringHintsEnabled}
        onToggleScoringHints={isFarkle ? game.toggleScoringHints : undefined}
        sixDiceEnabled={showSixDice ? state.sixDiceEnabled : undefined}
        onToggleSixDice={showSixDice ? (gameStarted ? undefined : game.toggleSixDice) : undefined}
        orderedScoringEnabled={showOrderedScoring ? state.orderedScoringEnabled : undefined}
        onToggleOrderedScoring={showOrderedScoring ? (gameStarted ? undefined : game.toggleOrderedScoring) : undefined}
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
