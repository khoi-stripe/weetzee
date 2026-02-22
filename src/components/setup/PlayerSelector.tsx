"use client";

import { useEffect, useRef, useState } from "react";
import { Die } from "@/components/game/Die";
import { PLAYER_COLORS } from "@/lib/types";
import { playTap } from "@/lib/sounds";

const TITLE_RESERVE = 48;

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

export function PlayerSelector({
  title,
  count,
  max = 6,
  onChange,
  onNext,
}: {
  title: string;
  count: number;
  max?: number;
  onChange: (n: number) => void;
  onNext: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_COUNT = max + 1;
  const [layout, setLayout] = useState({ cols: 1, rows: ITEM_COUNT, cellSize: 0 });
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
  }, [ITEM_COUNT]);

  const gridW = layout.cellSize > 0
    ? layout.cols * layout.cellSize + (layout.cols - 1) * GAP
    : undefined;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center"
      style={{ flex: 1, minHeight: 0, width: "100%", padding: GAP, gap: 24 }}
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
        {title}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: layout.cellSize > 0
            ? `repeat(${layout.cols}, ${layout.cellSize}px)`
            : `repeat(1, 1fr)`,
          gridTemplateRows: layout.cellSize > 0
            ? `repeat(${layout.rows}, ${layout.cellSize}px)`
            : `repeat(${ITEM_COUNT}, 1fr)`,
          gap: GAP,
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
        <div style={{ width: layout.cellSize || "100%", height: layout.cellSize || "100%", containerType: "inline-size" }}>
          <button
            onClick={onNext}
            className="flex items-center justify-center rounded-full pressable"
            style={{
              width: "100%",
              height: "100%",
              border: "1px solid #ffffff",
              background: "transparent",
              fontSize: "8cqi",
              fontWeight: 500,
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
