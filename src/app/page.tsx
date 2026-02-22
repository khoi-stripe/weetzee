"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/game/Header";
import { PlayerSelector } from "@/components/setup/PlayerSelector";

// ===== Setup Page =====
// Matches Figma: "Number of players" title, vertical dice selector, circular Start button.

export default function SetupPage() {
  const [playerCount, setPlayerCount] = useState(1);
  const router = useRouter();

  function startGame() {
    router.push(`/game?players=${playerCount}`);
  }

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        background: "#000000",
        overflow: "hidden",
      }}
    >
      <Header showBack={false} />

      <div
        className="flex flex-col flex-1 min-h-0 items-center justify-center gap-4"
        style={{ padding: "16px 0" }}
      >
        <p
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 16,
            fontWeight: 400,
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          Number of players
        </p>

        <PlayerSelector count={playerCount} max={3} onChange={setPlayerCount} />

        {/* Start button — circular, 109.67px, opacity-50 until pressed */}
        <button
          onClick={startGame}
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 109.67,
            height: 109.67,
            border: "1px solid #ffffff",
            background: "transparent",
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 14,
            fontWeight: 500,
            color: "#ffffff",
            opacity: 0.5,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
          onTouchStart={(e) => (e.currentTarget.style.opacity = "1")}
          onTouchEnd={(e) => (e.currentTarget.style.opacity = "0.5")}
        >
          Start
        </button>
      </div>
    </div>
  );
}
