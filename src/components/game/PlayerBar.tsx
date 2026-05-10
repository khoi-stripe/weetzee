"use client";

import type { Player, Ruleset } from "@/lib/types";
import { getRulesetTotal } from "@/lib/rulesets";
import { PlayerChipStrip } from "@/components/ui/PlayerChipStrip";

export function PlayerBar({
  players,
  currentPlayerIndex,
  ruleset,
  onClick,
}: {
  players: Player[];
  currentPlayerIndex: number;
  ruleset: Ruleset;
  onClick?: () => void;
}) {
  const chipPlayers = players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    score: getRulesetTotal(ruleset, p.scores, p.extraWeetzees),
  }));

  return (
    <div className="shrink-0 w-full" style={{ padding: "16px 16px" }}>
      <PlayerChipStrip
        players={chipPlayers}
        currentIndex={currentPlayerIndex}
        variant="dark"
        onClick={onClick}
      />
    </div>
  );
}
