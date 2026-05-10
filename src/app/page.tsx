"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/game/Header";
import { PlayerSelector } from "@/components/setup/PlayerSelector";
import { playTap } from "@/lib/sounds";
import { PLAYER_COLORS, shufflePlayerColors } from "@/lib/types";
import { peekSavedGame, clearSavedGame } from "@/hooks/useGame";
import type { SavedGameSummary } from "@/hooks/useGame";
import { SplashIntro } from "@/components/SplashIntro";
import { TYPE } from "@/lib/type";
import { COLOR } from "@/lib/color";
import { Scrim } from "@/components/ui/Scrim";
import { DialogCard } from "@/components/ui/DialogCard";
import { RoundButton } from "@/components/ui/RoundButton";
import { PlayerChipStrip } from "@/components/ui/PlayerChipStrip";
import { DURATION } from "@/lib/motion";

function ContinuePrompt({
  saved,
  onContinue,
  onNewGame,
}: {
  saved: SavedGameSummary;
  onContinue: () => void;
  onNewGame: () => void;
}) {
  const [exiting, setExiting] = useState(false);

  const handleContinue = () => {
    playTap();
    setExiting(true);
    setTimeout(onContinue, DURATION.modal);
  };

  const handleNew = () => {
    playTap();
    setExiting(true);
    setTimeout(onNewGame, DURATION.modal);
  };

  const chipPlayers = saved.players.map((p, i) => ({
    id: i,
    name: p.name,
    color: p.color,
    score: p.score,
  }));

  return (
    <Scrim exiting={exiting}>
      <DialogCard>
        <p style={{ ...TYPE.body, color: COLOR.textDisabled }}>
          Game in progress
        </p>
        <p style={{ ...TYPE.headline, marginBottom: 16 }}>
          {saved.rulesetName}
        </p>
        <PlayerChipStrip
          players={chipPlayers}
          currentIndex={saved.currentPlayerIndex}
          variant="light"
        />
      </DialogCard>

      <div className="flex justify-center" style={{ gap: 16 }}>
        <RoundButton onClick={handleNew}>New game</RoundButton>
        <RoundButton variant="filled" onClick={handleContinue}>
          Continue
        </RoundButton>
      </div>
    </Scrim>
  );
}

export default function SetupPage() {
  const [playerCount, setPlayerCount] = useState(1);
  const [cpuPlayers, setCpuPlayers] = useState<Set<number>>(new Set());
  const [colors, setColors] = useState(PLAYER_COLORS);
  const [savedGame, setSavedGame] = useState<SavedGameSummary | null>(null);
  const [checked, setChecked] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setColors(shufflePlayerColors());
    const saved = peekSavedGame();
    setSavedGame(saved);
    setChecked(true);

    const w = window as unknown as { __shortcutAction?: string };
    if (w.__shortcutAction === "continue" && saved) {
      w.__shortcutAction = undefined;
      const aiParam = saved.aiIndices.length > 0 ? `&ai=${saved.aiIndices.join(",")}` : "";
      router.push(`/game?players=${saved.playerCount}&ruleset=${saved.rulesetId}${aiParam}`);
    } else if (w.__shortcutAction) {
      w.__shortcutAction = undefined;
    }
  }, [router]);

  const handleChange = useCallback((n: number) => {
    setPlayerCount(n);
    setCpuPlayers((prev) => {
      const next = new Set(prev);
      for (const idx of prev) {
        if (idx >= n) next.delete(idx);
      }
      return next;
    });
  }, []);

  const toggleCpu = useCallback((playerIndex: number) => {
    setCpuPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerIndex)) next.delete(playerIndex);
      else next.add(playerIndex);
      return next;
    });
  }, []);

  function next() {
    playTap();
    const aiParam = cpuPlayers.size > 0 ? `&ai=${[...cpuPlayers].sort().join(",")}` : "";
    router.push(`/ruleset?players=${playerCount}${aiParam}`);
  }

  const continueGame = useCallback(() => {
    if (!savedGame) return;
    const aiParam = savedGame.aiIndices.length > 0 ? `&ai=${savedGame.aiIndices.join(",")}` : "";
    router.push(`/game?players=${savedGame.playerCount}&ruleset=${savedGame.rulesetId}${aiParam}`);
  }, [savedGame, router]);

  const dismissSaved = useCallback(() => {
    clearSavedGame();
    setSavedGame(null);
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100%",
        background: COLOR.surfaceBg,
        overflow: "hidden",
      }}
    >
      <Header showBack={false} />
      <PlayerSelector
        title="Choose number of players"
        count={playerCount}
        max={6}
        onChange={handleChange}
        onNext={next}
        cpuPlayers={cpuPlayers}
        onToggleCpu={toggleCpu}
        colors={colors}
      />
      {checked && savedGame && (
        <ContinuePrompt
          saved={savedGame}
          onContinue={continueGame}
          onNewGame={dismissSaved}
        />
      )}
      <SplashIntro />
    </div>
  );
}
