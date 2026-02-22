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
      <PlayerSelector
        title="Choose number of players"
        count={playerCount}
        max={6}
        onChange={setPlayerCount}
        onNext={next}
      />
    </div>
  );
}
