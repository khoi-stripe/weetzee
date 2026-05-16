"use client";

import { memo } from "react";
import { WEIGHT } from "@/lib/type";
import { COLOR } from "@/lib/color";

// ===== Die Component =====
// Renders a single die face with pips drawn via CSS.
// Matches Figma: 1px solid white border, 4px radius, black bg, white pips.
// Held state: player-color border + subtle tint.

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

const KISMET_PIP_COLORS: Record<string, string> = {
  white: COLOR.textPrimary,
  red: "#ef4444",
  green: "#22c55e",
};

function kismetPipColor(value: number): string {
  if (value <= 2) return KISMET_PIP_COLORS.white;
  if (value <= 4) return KISMET_PIP_COLORS.red;
  return KISMET_PIP_COLORS.green;
}

export const Die = memo(function Die({
  value,
  held = false,
  heldColor = COLOR.textPrimary,
  size = "full",
  onClick,
  disabled = false,
  rolling = false,
  flash = false,
  label,
  coloredPips = false,
  setAside = false,
  setAsideColor,
}: {
  value: number;
  held?: boolean;
  heldColor?: string;
  size?: "full" | "sm";
  onClick?: () => void;
  disabled?: boolean;
  rolling?: boolean;
  flash?: boolean;
  label?: string;
  coloredPips?: boolean;
  setAside?: boolean;
  setAsideColor?: string;
}) {
  const pips = PIP_LAYOUTS[value] ?? [];
  const pipSize = size === "sm" ? "16%" : "17%";

  const accent = flash && !held ? heldColor : null;
  const kismetColor = coloredPips ? kismetPipColor(value) : null;
  const strokeColor = kismetColor ?? accent ?? COLOR.textPrimary;
  const heldFill = kismetColor ?? heldColor;

  let borderColor: string;
  let bg: string;
  let pipColor: string;

  if (setAside && setAsideColor) {
    borderColor = setAsideColor;
    bg = setAsideColor;
    pipColor = COLOR.surfaceBg;
  } else if (held) {
    borderColor = heldFill;
    bg = heldFill;
    pipColor = COLOR.surfaceBg;
  } else {
    borderColor = strokeColor;
    bg = COLOR.surfaceBg;
    pipColor = strokeColor;
  }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={[
        "relative select-none",
        "w-full aspect-square",
        onClick && !disabled ? "pressable" : "",
        rolling ? "animate-roll-loop" : "",
      ].join(" ")}
      style={{
        borderRadius: rolling ? undefined : 4,
        outline: `1px solid ${borderColor}`,
        outlineOffset: -1,
        background: bg,
        containerType: "inline-size",
      }}
    >
      {label ? (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            fontSize: "clamp(11px, 8cqi, 100px)",
            fontWeight: WEIGHT.medium,
            color: held ? COLOR.surfaceBg : COLOR.textPrimary,
            transform: "rotate(-45deg)",
            lineHeight: 1.1,
            textAlign: "center",
            padding: "10%",
          }}
        >
          {label}
        </div>
      ) : (
        pips.map(([x, y], i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: pipSize,
              height: pipSize,
              left: `calc(${x}% - ${pipSize} / 2)`,
              top: `calc(${y}% - ${pipSize} / 2)`,
              background: pipColor,
            }}
          />
        ))
      )}
    </div>
  );
});
