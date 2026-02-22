"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/game/Header";
import { PlayerSelector } from "@/components/setup/PlayerSelector";
import { playTap } from "@/lib/sounds";

export default function SetupPage() {
  const [playerCount, setPlayerCount] = useState(1);
  const router = useRouter();

  function next() {
    playTap();
    router.push(`/ruleset?players=${playerCount}`);
  }

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

      <div
        className="flex flex-col flex-1 min-h-0 items-center justify-center gap-4"
        style={{ padding: 16 }}
      >
        <p
          style={{

            fontSize: 16,
            fontWeight: 400,
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          Number of players
        </p>

        <PlayerSelector count={playerCount} max={6} onChange={setPlayerCount} />

        <button
          onClick={next}
          className="flex items-center justify-center rounded-full shrink-0 pressable"
          style={{
            width: 109.67,
            height: 109.67,
            border: "1px solid #ffffff",
            background: "transparent",

            fontSize: 14,
            fontWeight: 500,
            color: "#ffffff",
            opacity: 1,
            cursor: "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
