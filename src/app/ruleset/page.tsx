"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/game/Header";
import { Die } from "@/components/game/Die";
import { VISIBLE_RULESETS } from "@/lib/rulesets";
import { playTap } from "@/lib/sounds";

const ITEM_COUNT = VISIBLE_RULESETS.length + 1;
const TITLE_RESERVE = 48;

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
  const [layout, setLayout] = useState({ cols: 2, rows: 3, cellSize: 0 });
  const GAP = 16;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const { width, height } = el!.getBoundingClientRect();
      setLayout(computeLayout(
        width - GAP * 2,
        height - GAP * 2 - TITLE_RESERVE,
        ITEM_COUNT,
        GAP
      ));
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

  const gridW = layout.cellSize > 0
    ? layout.cols * layout.cellSize + (layout.cols - 1) * GAP
    : undefined;

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
        ref={containerRef}
        className="flex flex-col flex-1 min-h-0 items-center justify-center"
        style={{ padding: `${GAP}px ${GAP}px 32px`, gap: 24 }}
      >
        <p
          className="shrink-0"
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: "#ffffff",
            textAlign: "center",
            width: gridW,
          }}
        >
          Choose ruleset
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: layout.cellSize > 0
              ? `repeat(${layout.cols}, ${layout.cellSize}px)`
              : "repeat(2, 1fr)",
            gridTemplateRows: layout.cellSize > 0
              ? `repeat(${layout.rows}, ${layout.cellSize}px)`
              : "repeat(3, 1fr)",
            gap: GAP,
          }}
        >
          {VISIBLE_RULESETS.map((r, i) => {
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
                  value={i + 1}
                  held={selected}
                  label={r.name}
                  onClick={() => { playTap(); setRulesetId(r.id); }}
                />
              </div>
            );
          })}
          <div style={{ width: layout.cellSize || "100%", height: layout.cellSize || "100%", containerType: "inline-size" }}>
            <button
              onClick={startGame}
              className="flex items-center justify-center rounded-full pressable"
              style={{
                width: "100%",
                height: "100%",
                outline: "1px solid #ffffff",
                outlineOffset: -1,
                background: "transparent",
                fontSize: "clamp(13px, 8cqi, 15px)",
                fontWeight: 500,
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Start
            </button>
          </div>
        </div>
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
