"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/game/Header";
import { PlayerSelector } from "@/components/setup/PlayerSelector";
import { playTap } from "@/lib/sounds";
import { PLAYER_COLORS, shufflePlayerColors } from "@/lib/types";
import { peekSavedGame, clearSavedGame } from "@/hooks/useGame";
import type { SavedGameSummary } from "@/hooks/useGame";

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
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 200,
        background: "rgba(0, 0, 0, 0.85)",
        animation: exiting
          ? "interstitial-out 300ms ease forwards"
          : "interstitial-in 200ms ease forwards",
      }}
    >
      <div style={{ textAlign: "center", padding: 32 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#ffffff", marginBottom: 8 }}>
          Game in progress
        </p>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 24 }}>
          {saved.rulesetName}
        </p>

        <div
          className="flex overflow-hidden"
          style={{
            outline: "1px solid #ffffff",
            outlineOffset: -1,
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 24,
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
                  color: isActive ? "#000000" : p.color,
                  borderRight: i < saved.players.length - 1 ? "1px solid #ffffff" : "none",
                }}
              >
                <span className="shrink-0">{p.name}</span>
                <span className="shrink-0">{p.score}</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-6 justify-center">
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
    </div>
  );
}

export default function SetupPage() {
  const [playerCount, setPlayerCount] = useState(1);
  const [cpuPlayers, setCpuPlayers] = useState<Set<number>>(new Set());
  const [colors, setColors] = useState(PLAYER_COLORS);
  const [savedGame, setSavedGame] = useState<SavedGameSummary | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setColors(shufflePlayerColors());
    setSavedGame(peekSavedGame());
    setChecked(true);
  }, []);
  const router = useRouter();

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
    </div>
  );
}
