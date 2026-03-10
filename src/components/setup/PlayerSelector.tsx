"use client";

import { useEffect, useRef, useState } from "react";
import { Die } from "@/components/game/Die";
import { PLAYER_COLORS } from "@/lib/types";
import { playTap, playToggle } from "@/lib/sounds";

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
  cpuPlayers,
  onToggleCpu,
}: {
  title: string;
  count: number;
  max?: number;
  onChange: (n: number) => void;
  onNext: () => void;
  cpuPlayers?: Set<number>;
  onToggleCpu?: (playerIndex: number) => void;
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

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  function handlePointerDown(playerIndex: number) {
    if (!onToggleCpu) return;
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      const playerNum = playerIndex + 1;
      if (playerNum > count) onChange(playerNum);
      playToggle(!cpuPlayers?.has(playerIndex));
      onToggleCpu(playerIndex);
    }, 500);
  }

  function handlePointerUp(playerIndex: number) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    playTap();
    onChange(playerIndex + 1);
  }

  function handlePointerCancel() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressTriggered.current = false;
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center"
      style={{ flex: 1, minHeight: 0, width: "100%", padding: `${GAP}px ${GAP}px 32px`, gap: 24 }}
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
          const isCpu = cpuPlayers?.has(i) ?? false;
          const color = PLAYER_COLORS[i] ?? "#ffffff";

          return (
            <div
              key={i}
              style={{
                width: layout.cellSize || "100%",
                height: layout.cellSize || "100%",
                position: "relative",
              }}
              onPointerDown={() => handlePointerDown(i)}
              onPointerUp={() => handlePointerUp(i)}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={handlePointerCancel}
            >
              <Die
                value={playerNum}
                held={isSelected}
                heldColor={color}
                label={isCpu && isSelected ? "CPU" : undefined}
              />
              {isCpu && isSelected && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "4%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "20%",
                    height: "20%",
                    borderRadius: "50%",
                    background: color,
                    opacity: 0.6,
                  }}
                />
              )}
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
              outline: "1px solid #ffffff",
              outlineOffset: -1,
              background: "transparent",
              fontSize: "clamp(9px, 8cqi, 100px)",
              fontWeight: 500,
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Next
          </button>
        </div>
      </div>

      {onToggleCpu && (
        <p
          className="shrink-0"
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: "#666666",
            textAlign: "center",
          }}
        >
          Long-press to toggle CPU
        </p>
      )}
    </div>
  );
}
