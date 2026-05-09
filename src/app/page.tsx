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
    setTimeout(onContinue, 300);
  };

  const handleNew = () => {
    playTap();
    setExiting(true);
    setTimeout(onNewGame, 300);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 200,
        background: "rgba(0, 0, 0, 0.85)",
        padding: 16,
        gap: 24,
        animation: exiting
          ? "interstitial-out 300ms ease forwards"
          : "interstitial-in 200ms ease forwards",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "min(80vw, 80vh, 400px)",
          aspectRatio: "1 / 1",
        }}
      >
        <div
          className="w-full h-full flex flex-col items-center justify-center"
          style={{
            background: "#ffffff",
            borderRadius: 4,
            color: "#000000",
            padding: "10%",
            gap: 8,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: "#666666" }}>
            Game in progress
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
            {saved.rulesetName}
          </p>

          <div
            className="flex overflow-hidden"
            style={{
              width: "100%",
              outline: "1px solid #000000",
              outlineOffset: -1,
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {saved.players.map((p, i) => {
              const isActive = i === saved.currentPlayerIndex;
              return (
                <div
                  key={i}
                  className="flex items-center min-w-0 justify-center"
                  style={{
                    flex: 1,
                    padding: "8px 8px",
                    gap: 6,
                    background: isActive ? p.color : "transparent",
                    color: "#000000",
                    borderRight: i < saved.players.length - 1 ? "1px solid #000000" : "none",
                  }}
                >
                  <span className="shrink-0">{p.name}</span>
                  <span className="shrink-0">{p.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-center" style={{ gap: 16 }}>
        <button
          onClick={handleNew}
          className="flex items-center justify-center rounded-full pressable"
          style={{
            width: 100,
            height: 100,
            outline: "1px solid #ffffff",
            outlineOffset: -1,
            background: "transparent",
            fontSize: 13,
            fontWeight: 500,
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          New game
        </button>
        <button
          onClick={handleContinue}
          className="flex items-center justify-center rounded-full pressable"
          style={{
            width: 100,
            height: 100,
            outline: "1px solid #ffffff",
            outlineOffset: -1,
            background: "#ffffff",
            fontSize: 13,
            fontWeight: 500,
            color: "#000000",
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </div>
    </div>
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
        background: "#000000",
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
