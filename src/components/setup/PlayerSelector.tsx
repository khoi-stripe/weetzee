"use client";

import { useEffect, useRef, useState } from "react";
import { Die } from "@/components/game/Die";
import { PLAYER_COLORS } from "@/lib/types";
import { playTap } from "@/lib/sounds";

function computeLayout(
  w: number,
  h: number,
  itemCount: number,
  gap: number
): { cols: number; rows: number; cellSize: number } {
  let best = { cols: 1, rows: itemCount, cellSize: 0 };

  for (let cols = 1; cols <= itemCount; cols++) {
    const rows = Math.ceil(itemCount / cols);
    const cellW = (w - gap * (cols - 1)) / cols;
    const cellH = (h - gap * (rows - 1)) / rows;
    const cellSize = Math.floor(Math.min(cellW, cellH));
    if (cellSize > best.cellSize) {
      best = { cols, rows, cellSize };
    }
  }

  return best;
}

// ===== PlayerSelector =====

export function PlayerSelector({
  count,
  max = 6,
  onChange,
}: {
  count: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ cols: 1, rows: max, cellSize: 0 });
  const GAP = 16;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function measure() {
      const { width, height } = el!.getBoundingClientRect();
      setLayout(computeLayout(width, height, max!, GAP));
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        display: "grid",
        gridTemplateColumns: layout.cellSize > 0
          ? `repeat(${layout.cols}, ${layout.cellSize}px)`
          : `repeat(1, 1fr)`,
        gridTemplateRows: layout.cellSize > 0
          ? `repeat(${layout.rows}, ${layout.cellSize}px)`
          : `repeat(${max}, 1fr)`,
        gap: GAP,
        placeContent: "center",
      }}
    >
      {Array.from({ length: max }, (_, i) => {
        const playerNum = i + 1;
        const isSelected = playerNum <= count;
        const color = PLAYER_COLORS[i] ?? "#ffffff";

        return (
          <div
            key={i}
            style={{
              width: layout.cellSize || "100%",
              height: layout.cellSize || "100%",
            }}
          >
            <Die
              value={playerNum}
              held={isSelected}
              heldColor={color}
              onClick={() => { playTap(); onChange(playerNum); }}
            />
          </div>
        );
      })}
    </div>
  );
}
