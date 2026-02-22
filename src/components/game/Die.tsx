"use client";

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

export function Die({
  value,
  held = false,
  heldColor = "#ffcc00",
  size = "full",
  onClick,
  disabled = false,
  rolling = false,
  flash = false,
  label,
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
}) {
  const pips = PIP_LAYOUTS[value] ?? [];
  const pipSize = size === "sm" ? "16%" : "17%";

  const accent = flash && !held ? heldColor : null;
  const borderColor = held ? heldColor : accent ?? "#ffffff";
  const pipColor = held ? "#000000" : accent ?? "#ffffff";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={[
        "relative rounded-[4px] select-none",
        "w-full aspect-square",
        onClick && !disabled ? "pressable" : "",
        rolling ? "animate-roll-loop" : "",
      ].join(" ")}
      style={{
        border: `1px solid ${borderColor}`,
        background: held ? heldColor : "#000000",
        transition: "border-color 150ms, background 150ms",
      }}
    >
      {label ? (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: size === "sm" ? 8 : 14,
            fontWeight: 500,
            color: held ? "#000000" : "#ffffff",
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
}
