"use client";

import { useState } from "react";
import { Die } from "@/components/game/Die";
import { PLAYER_COLORS } from "@/lib/types";

const ORIGINAL = {
  duration: 300,
  rotMax: 16,
  rotMid: 8,
  scaleMin: 0.95,
  scaleMax: 1.05,
  blobIntensity: 0,
  steps: 4,
};

const DEFAULTS = {
  duration: 434,
  rotMax: 16,
  rotMid: 8,
  scaleMin: 0.95,
  scaleMax: 1.36,
  blobIntensity: 0,
  steps: 14,
};

// Seeded pseudo-random so shapes are deterministic per step index
function blobRadius(step: number, corner: number, b: number) {
  const base = [30, 45, 35, 40];
  const offset = Math.sin(step * 2.4 + corner * 1.7) * b;
  return Math.round(base[corner % 4] + offset);
}

function buildStyles(v: typeof DEFAULTS) {
  const frames: string[] = [];
  for (let i = 0; i <= v.steps; i++) {
    const pct = Math.round((i / v.steps) * 100);
    const t = i / v.steps;
    const angle = i === 0 || i === v.steps
      ? 0
      : i % 2 === 1
        ? -v.rotMax * Math.sin(t * Math.PI * 2)
        : v.rotMax * Math.sin(t * Math.PI * 2);
    const scale = 1 + (i % 2 === 1 ? v.scaleMin - 1 : v.scaleMax - 1) * Math.abs(Math.sin(t * Math.PI * 2));

    const r = (c: number) => blobRadius(i, c, v.blobIntensity);
    const br = `${r(0)}% ${r(1)}% ${r(2)}% ${r(3)}% / ${r(3)}% ${r(2)}% ${r(1)}% ${r(0)}%`;

    frames.push(`${pct}% { transform: rotate(${angle.toFixed(1)}deg) scale(${scale.toFixed(3)}); border-radius: ${br}; }`);
  }

  return `
    @keyframes roll-preview { ${frames.join(" ")} }
    .roll-override .animate-roll-loop {
      animation: roll-preview ${v.duration}ms ease-in-out infinite !important;
    }
  `;
}

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
      <span style={{ color: "#aaa", fontSize: 11, fontFamily: "monospace", width: 36, flexShrink: 0 }}>
        {value}
      </span>
    </div>
  );
}

export default function DiceDevPage() {
  const [rolling, setRolling] = useState(true);
  const [colorIndex, setColorIndex] = useState(0);
  const [vars, setVars] = useState(DEFAULTS);

  const playerColor = PLAYER_COLORS[colorIndex];
  const set = (key: keyof typeof DEFAULTS) => (v: number) => setVars((prev) => ({ ...prev, [key]: v }));

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: 24 }}>
      <style>{buildStyles(vars)}</style>

      <div className="roll-override" style={{ display: "grid", gridTemplateColumns: "repeat(3, 80px)", gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((v) => (
          <div key={v} style={{ width: 80, height: 80 }}>
            <Die value={v} rolling={rolling} heldColor={playerColor} />
          </div>
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 10, background: "#111", borderRadius: 12, padding: 20 }}>
        <Slider label="duration (ms)"  value={vars.duration}       min={80}  max={800} onChange={set("duration")} />
        <Slider label="rot max (deg)"  value={vars.rotMax}          min={0}   max={45}  onChange={set("rotMax")} />
        <Slider label="rot mid (deg)"  value={vars.rotMid}          min={0}   max={30}  onChange={set("rotMid")} />
        <Slider label="scale min"      value={vars.scaleMin}        min={0.7} max={1}   step={0.01} onChange={set("scaleMin")} />
        <Slider label="scale max"      value={vars.scaleMax}        min={1}   max={1.4} step={0.01} onChange={set("scaleMax")} />
        <Slider label="blob intensity" value={vars.blobIntensity}   min={0}   max={40}  onChange={set("blobIntensity")} />
        <Slider label="blob steps"     value={vars.steps}           min={4}   max={16}  onChange={set("steps")} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => setRolling((r) => !r)}
          style={{ padding: "6px 14px", background: rolling ? "white" : "#333", color: rolling ? "black" : "white", border: "none", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
          {rolling ? "Stop" : "Roll"}
        </button>
        <button onClick={() => setVars(DEFAULTS)}
          style={{ padding: "6px 14px", background: "#333", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
          Reset
        </button>
        <button onClick={() => setVars(ORIGINAL)}
          style={{ padding: "6px 14px", background: "#333", color: "#aaa", border: "none", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
          Original
        </button>
        {PLAYER_COLORS.map((c, i) => (
          <button key={c} onClick={() => setColorIndex(i)}
            style={{ width: 28, height: 28, background: c, border: i === colorIndex ? "2px solid white" : "2px solid transparent", borderRadius: "50%", cursor: "pointer" }} />
        ))}
      </div>
    </div>
  );
}
