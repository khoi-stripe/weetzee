"use client";

import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "@/lib/types";

const DEFAULTS = {
  waves: 18,
  amplitude: 8,
  speed: 0.8,
  speed2: 1.3,
  waveOffset: 1,
  amplitude2ratio: 0.6,
  size: 120,
};

// Two overlapping sine waves at slightly different frequencies and speeds.
// Their interference creates a beating/undulating pattern — bumps grow and
// shrink organically as the two phases drift relative to each other.
function buildWavyPath(
  cx: number, cy: number, r: number,
  waves: number, amplitude: number, phase1: number,
  waves2: number, amplitude2: number, phase2: number,
  points = 360
): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const ripple = r
      + amplitude  * Math.sin(waves  * angle + phase1)
      + amplitude2 * Math.sin(waves2 * angle + phase2);
    pts.push([cx + ripple * Math.cos(angle), cy + ripple * Math.sin(angle)]);
  }

  const d: string[] = [`M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const p3 = pts[(i + 2) % pts.length];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }
  d.push("Z");
  return d.join(" ");
}

function WavyButton({ waves, amplitude, speed, speed2, waveOffset, amplitude2ratio, size, color, label }: typeof DEFAULTS & { color: string; label: string }) {
  const pathRef = useRef<SVGPathElement>(null);
  const phase1Ref = useRef(0);
  const phase2Ref = useRef(Math.PI * 0.7);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const amplitude2 = amplitude * amplitude2ratio;
  const waves2 = waves + waveOffset;

  useEffect(() => {
    function frame(ts: number) {
      const dt = lastRef.current ? (ts - lastRef.current) / 1000 : 0;
      lastRef.current = ts;
      phase1Ref.current += speed  * dt * Math.PI * 2 * 0.25;
      phase2Ref.current += speed2 * dt * Math.PI * 2 * 0.25;

      if (pathRef.current) {
        const pad = amplitude + amplitude2 + 4;
        const svgSize = size + pad * 2;
        const cx = svgSize / 2;
        const cy = svgSize / 2;
        pathRef.current.setAttribute("d", buildWavyPath(
          cx, cy, size / 2,
          waves, amplitude, phase1Ref.current,
          waves2, amplitude2, phase2Ref.current,
        ));
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [waves, amplitude, speed, speed2, waveOffset, amplitude2ratio, size]);

  const amplitude2val = amplitude * amplitude2ratio;
  const pad = amplitude + amplitude2val + 4;
  const svgSize = size + pad * 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const initialPath = buildWavyPath(cx, cy, size / 2, waves, amplitude, 0, waves2, amplitude2val, Math.PI * 0.7);

  return (
    <div style={{ position: "relative", width: svgSize, height: svgSize, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={svgSize} height={svgSize} style={{ position: "absolute", inset: 0 }}>
        <path ref={pathRef} d={initialPath} fill="transparent" stroke={color} strokeWidth={1.5} />
      </svg>
      <span style={{ color, fontSize: 13, fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.08em" }}>
        {label}
      </span>
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <span style={{ color: "white", fontSize: 11, fontFamily: "monospace", width: 120, textAlign: "right", flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "white" }} />
      <span style={{ color: "#aaa", fontSize: 11, fontFamily: "monospace", width: 36, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

export default function ButtonsDevPage() {
  const [vars, setVars] = useState(DEFAULTS);
  const [colorIndex, setColorIndex] = useState(0);
  const set = (key: keyof typeof DEFAULTS) => (v: number) => setVars((p) => ({ ...p, [key]: v }));
  const color = PLAYER_COLORS[colorIndex];

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40, padding: 24 }}>
      <div style={{ display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <WavyButton {...vars} color={color} label="ROLL" />
        <WavyButton {...vars} color={color} label="BANK" speed={vars.speed * 1.4} speed2={vars.speed2 * 0.6} />
        <WavyButton {...vars} color={color} label="DONE" speed={-vars.speed * 0.9} speed2={vars.speed2 * 1.8} />
      </div>

      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 10, background: "#111", borderRadius: 12, padding: 20 }}>
        <Slider label="waves"        value={vars.waves}          min={3}   max={40}  onChange={set("waves")} />
        <Slider label="amplitude"    value={vars.amplitude}      min={0}   max={30}  onChange={set("amplitude")} />
        <Slider label="wave offset"  value={vars.waveOffset}     min={1}   max={10}  onChange={set("waveOffset")} />
        <Slider label="amp2 ratio"   value={vars.amplitude2ratio} min={0}  max={1}   step={0.05} onChange={set("amplitude2ratio")} />
        <Slider label="speed 1"      value={vars.speed}          min={-4}  max={4}   step={0.1} onChange={set("speed")} />
        <Slider label="speed 2"      value={vars.speed2}         min={-4}  max={4}   step={0.1} onChange={set("speed2")} />
        <Slider label="size"         value={vars.size}           min={60}  max={200} onChange={set("size")} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => setVars(DEFAULTS)}
          style={{ padding: "6px 14px", background: "#333", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
          Reset
        </button>
        {PLAYER_COLORS.map((c, i) => (
          <button key={c} onClick={() => setColorIndex(i)}
            style={{ width: 28, height: 28, background: c, border: i === colorIndex ? "2px solid white" : "2px solid transparent", borderRadius: "50%", cursor: "pointer" }} />
        ))}
      </div>
    </div>
  );
}
