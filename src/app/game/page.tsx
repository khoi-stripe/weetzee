"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useCallback, useRef } from "react";
import { useGame } from "@/hooks/useGame";
import { useAI } from "@/hooks/useAI";
import { Header } from "@/components/game/Header";
import { GameView } from "@/components/game/GameView";
import { GameOverScreen } from "@/components/game/GameOverScreen";
import type { GameAction } from "@/lib/types";

function GameContent() {
  const params = useSearchParams();
  const playerCount = Math.min(Math.max(parseInt(params.get("players") ?? "2", 10), 1), 6);
  const rulesetId = params.get("ruleset") ?? "weetzee";
  const aiParam = params.get("ai") ?? "";
  const aiIndices = useMemo(
    () => aiParam ? aiParam.split(",").map(Number).filter((n) => !isNaN(n) && n >= 0 && n < playerCount) : [],
    [aiParam, playerCount]
  );

  const game = useGame(playerCount, rulesetId, aiIndices);
  const { state } = game;

  const gameRef = useRef(game);
  gameRef.current = game;

  const dispatch = useCallback((action: GameAction) => {
    const g = gameRef.current;
    switch (action.type) {
      case "ROLL": g.roll(); break;
      case "TOGGLE_HOLD": g.toggleHold(action.dieId); break;
      case "SCORE_CATEGORY": g.scoreCategory(action.categoryId); break;
      case "SET_VIEW": g.setView(action.view); break;
      case "SET_ASIDE": g.setAside(); break;
      case "BANK": g.bank(); break;
      case "ACCEPT_PIGGYBACK": g.acceptPiggyback(); break;
    }
  }, []);

  const { isAITurn, aiPendingAction } = useAI(state, dispatch);

  if (state.gameOver) {
    return <GameOverScreen players={state.players} ruleset={state.ruleset} />;
  }

  const hasCPU = state.players.some((p) => p.isComputer);
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
        openingThresholdEnabled={isFarkle ? state.openingThresholdEnabled : undefined}
        onToggleOpeningThreshold={isFarkle ? game.toggleOpeningThreshold : undefined}
        piggybackEnabled={isFarkle ? state.piggybackEnabled : undefined}
        onTogglePiggyback={isFarkle ? game.togglePiggyback : undefined}
        aiDifficulty={hasCPU ? state.aiDifficulty : undefined}
        onSetAIDifficulty={hasCPU ? game.setAIDifficulty : undefined}
        onEndGame={game.endGame}
      />
      <GameView game={game} isAITurn={isAITurn} aiPendingAction={aiPendingAction} />
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
