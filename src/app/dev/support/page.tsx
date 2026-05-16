"use client";

import { useState } from "react";
import { PLAYER_COLORS } from "@/lib/types";
import { WEIGHT } from "@/lib/type";

// Hard color stops — each color occupies an equal arc with no blending
const SEGMENT = 360 / PLAYER_COLORS.length;
const GRADIENT = PLAYER_COLORS.map((c, i) =>
  `${c} ${(i * SEGMENT).toFixed(2)}deg ${((i + 1) * SEGMENT).toFixed(2)}deg`
).join(", ");

function Slider({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <span style={{ color: "white", fontSize: 11, fontFamily: "monospace", width: 130, textAlign: "right", flexShrink: 0 }}>
        {label}
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "white" }}
      />
      <span style={{ color: "#aaa", fontSize: 11, fontFamily: "monospace", width: 40, flexShrink: 0 }}>
        {value}
      </span>
    </div>
  );
}

function RainbowButton({
  duration,
  borderWidth,
  blur,
  opacity,
}: {
  duration: number;
  borderWidth: number;
  blur: number;
  opacity: number;
}) {
  const id = "support-border";
  const keyframes = `
    @property --angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }
    @keyframes ${id}-spin {
      to { --angle: 360deg; }
    }
    .${id}-outer {
      background: conic-gradient(from var(--angle), ${GRADIENT});
      animation: ${id}-spin ${duration}ms linear infinite;
    }
  `;

  return (
    <div style={{ width: "100%", maxWidth: 360 }}>
      <style>{keyframes}</style>
      {/* Outer ring — conic-gradient that spins */}
      <div
        className={`${id}-outer`}
        style={{
          borderRadius: 9999,
          padding: borderWidth,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
          opacity,
        }}
      >
        {/* Inner button — black fill punches out the center, leaving only the border ring */}
        <button
          className="flex items-center justify-center"
          style={{
            width: "100%",
            height: 48,
            borderRadius: 9999,
            background: "#000",
            border: "none",
            color: "white",
            fontSize: 15,
            fontWeight: WEIGHT.semibold,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Support Weetzee — $2.99
        </button>
      </div>
    </div>
  );
}

export default function SupportDevPage() {
  const [duration, setDuration] = useState(3000);
  const [borderWidth, setBorderWidth] = useState(2);
  const [blur, setBlur] = useState(0);
  const [opacity, setOpacity] = useState(1);

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#000",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 48, padding: 24,
    }}>
      <RainbowButton
        duration={duration}
        borderWidth={borderWidth}
        blur={blur}
        opacity={opacity}
      />

      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 10, background: "#111", borderRadius: 12, padding: 20 }}>
        <Slider label="speed (ms)"    value={duration}     min={500}  max={10000} step={100} onChange={setDuration} />
        <Slider label="border width"  value={borderWidth}  min={1}    max={12}    step={0.5} onChange={setBorderWidth} />
        <Slider label="blur (px)"     value={blur}         min={0}    max={20}    step={0.5} onChange={setBlur} />
        <Slider label="opacity"       value={opacity}      min={0.1}  max={1}     step={0.05} onChange={setOpacity} />
      </div>

      {/* Color swatch reference */}
      <div style={{ display: "flex", gap: 8 }}>
        {PLAYER_COLORS.map((c) => (
          <div key={c} style={{ width: 20, height: 20, borderRadius: "50%", background: c }} />
        ))}
      </div>
    </div>
  );
}
