"use client";

import { useState } from "react";
import { FarkleBustScreen } from "@/components/game/FarkleView";
import { PLAYER_COLORS } from "@/lib/types";

const MOCK_PLAYER = { id: "dev", name: "Khoi", color: PLAYER_COLORS[0], isComputer: false, scores: {}, bankedRolls: 0, extraWeetzees: 0 };

const SCENARIOS = [
  {
    label: "No score, all failed",
    lostScore: 0,
    failedDice: [{ value: 2 }, { value: 3 }, { value: 4 }, { value: 6 }, { value: 6 }, { value: 2 }],
    keptDice: [],
  },
  {
    label: "Had score, all failed",
    lostScore: 350,
    failedDice: [{ value: 2 }, { value: 3 }, { value: 4 }, { value: 6 }],
    keptDice: [{ value: 1 }, { value: 5 }],
  },
  {
    label: "Big score lost",
    lostScore: 1250,
    failedDice: [{ value: 3 }, { value: 3 }],
    keptDice: [{ value: 1 }, { value: 1 }, { value: 1 }, { value: 5 }],
  },
];

export default function FarkleDevPage() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [key, setKey] = useState(0);

  const scenario = SCENARIOS[scenarioIndex];
  const player = { ...MOCK_PLAYER, color: PLAYER_COLORS[colorIndex] };

  function replay() { setKey(k => k + 1); }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1 }}>
        <FarkleBustScreen
          key={key}
          player={player}
          lostScore={scenario.lostScore}
          exiting={false}
          onDone={replay}
          failedDice={scenario.failedDice}
          keptDice={scenario.keptDice}
        />
      </div>

      <div style={{ display: "flex", gap: 8, padding: 16, flexWrap: "wrap", zIndex: 9999, position: "relative" }}>
        {SCENARIOS.map((s, i) => (
          <button
            key={i}
            onClick={() => { setScenarioIndex(i); setKey(k => k + 1); }}
            style={{ padding: "6px 12px", background: i === scenarioIndex ? "white" : "#333", color: i === scenarioIndex ? "black" : "white", border: "none", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}
          >
            {s.label}
          </button>
        ))}
        {PLAYER_COLORS.map((c, i) => (
          <button
            key={c}
            onClick={() => { setColorIndex(i); setKey(k => k + 1); }}
            style={{ width: 28, height: 28, background: c, border: i === colorIndex ? "2px solid white" : "2px solid transparent", borderRadius: "50%", cursor: "pointer" }}
          />
        ))}
        <button
          onClick={replay}
          style={{ padding: "6px 12px", background: "#555", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}
        >
          Replay
        </button>
      </div>
    </div>
  );
}
