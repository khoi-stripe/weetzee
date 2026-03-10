"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/game/Header";
import { PlayerSelector } from "@/components/setup/PlayerSelector";
import { playTap } from "@/lib/sounds";

export default function SetupPage() {
  const [playerCount, setPlayerCount] = useState(1);
  const [cpuPlayers, setCpuPlayers] = useState<Set<number>>(new Set());
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
      />
    </div>
  );
}
