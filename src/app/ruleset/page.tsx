"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/game/Header";
import { Die } from "@/components/game/Die";
import { ALL_RULESETS } from "@/lib/rulesets";
import { playTap } from "@/lib/sounds";

function computeLayout(
  w: number,
  h: number,
  count: number,
  gap: number
): { cols: number; rows: number; cellSize: number } {
  let best = { cols: 1, rows: count, cellSize: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = (w - gap * (cols - 1)) / cols;
    const cellH = (h - gap * (rows - 1)) / rows;
    const cellSize = Math.floor(Math.min(cellW, cellH));
    if (cellSize > best.cellSize) best = { cols, rows, cellSize };
  }
  return best;
}

function RulesetContent() {
  const params = useSearchParams();
  const playerCount = params.get("players") ?? "1";
  const [rulesetId, setRulesetId] = useState("classic");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ cols: 2, rows: 2, cellSize: 0 });
  const GAP = 16;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const { width, height } = el!.getBoundingClientRect();
      setLayout(computeLayout(width, height, ALL_RULESETS.length, GAP));
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function startGame() {
    playTap();
    router.push(`/game?players=${playerCount}&ruleset=${rulesetId}`);
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
      <Header showBack={true} backLabel="Back" showAllRulesets />

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
          Choose a ruleset
        </p>

        <div
          ref={containerRef}
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "grid",
            gridTemplateColumns: layout.cellSize > 0
              ? `repeat(${layout.cols}, ${layout.cellSize}px)`
              : "repeat(2, 1fr)",
            gridTemplateRows: layout.cellSize > 0
              ? `repeat(${layout.rows}, ${layout.cellSize}px)`
              : "repeat(2, 1fr)",
            gap: GAP,
            placeContent: "center",
          }}
        >
          {ALL_RULESETS.map((r) => {
            const selected = r.id === rulesetId;
            return (
              <div
                key={r.id}
                style={{
                  width: layout.cellSize || "100%",
                  height: layout.cellSize || "100%",
                }}
              >
                <Die
                  value={ALL_RULESETS.indexOf(r) + 1}
                  held={selected}
                  label={r.name}
                  onClick={() => { playTap(); setRulesetId(r.id); }}
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={startGame}
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
            marginTop: 8,
          }}
        >
          Start
        </button>
      </div>
    </div>
  );
}

export default function RulesetPage() {
  return (
    <Suspense>
      <RulesetContent />
    </Suspense>
  );
}
