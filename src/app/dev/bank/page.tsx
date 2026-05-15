"use client";

import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "@/lib/types";
import { WEIGHT } from "@/lib/type";
import { COLOR } from "@/lib/color";
import { RADIUS } from "@/lib/tokens";

const DEFAULTS = {
  exitDuration: 650,
  pausePct: 55,
  pauseDrift: 3,
  scoreDuration: 260,
  flashDelay: 2000,
  flashDuration: 200,
  totalDuration: 2400,
  showHole: 1,
  score: 350,
};

// The mask is a rectangle (full width, top portion) + ellipse bump at bottom.
// Applied to the diamond so it's only visible through the hole-shaped aperture.
// mask-position-y tracks -translateY so the aperture stays fixed in container space.
function buildStyles(pausePct: number, pauseDrift: number, size: number, holeRy: number) {
  const midPct = pausePct + (100 - pausePct) * 0.3;

  const frames: [number, number][] = [
    [0,             0],
    [pausePct * 0.5, -pauseDrift],
    [pausePct,       -pauseDrift * 0.5],
    [midPct,         20],
    [100,            130],
  ];

  // Per-keyframe easing: hang phase uses ease-in-out, fall phase uses ease-in so
  // the diamond starts slow and accelerates through the hole.
  const easings = [
    "animation-timing-function: ease-in-out;",
    "animation-timing-function: ease-in-out;",
    "animation-timing-function: cubic-bezier(0.55, 0, 1, 1);",
    "animation-timing-function: cubic-bezier(0.8, 0, 1, 1);",
    "",
  ];

  // mask-position-y = -(translateY in px), but only once falling (keep 0 during hang/drift)
  const keyframeLines = frames.map(([pct, ty], i) => {
    const maskY = ty > 0 ? `${(-(ty / 100) * size).toFixed(1)}px` : "0px";
    return `${pct.toFixed(1)}% { transform: translateY(${ty}%); mask-position: 0px ${maskY}; -webkit-mask-position: 0px ${maskY}; ${easings[i]} }`;
  }).join("\n      ");

  return `
    @keyframes dev-diamond-drop { ${keyframeLines} }
    @keyframes dev-bank-rise {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes dev-bank-exit {
      from { transform: translateY(0);    opacity: 1; }
      to   { transform: translateY(-40%); opacity: 0; }
    }
    @keyframes dev-hole-in {
      from { transform: scale(0); }
      to   { transform: scale(1); }
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
      <span style={{ color: "#aaa", fontSize: 11, fontFamily: "monospace", width: 40, flexShrink: 0 }}>
        {value}
      </span>
    </div>
  );
}

function BankButtonPreview({ vars, playing }: { vars: typeof DEFAULTS; playing: boolean }) {
  const [phase, setPhase] = useState<"idle" | "exit" | "score" | "flash">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!playing) return;
    timers.current.forEach(clearTimeout);
    setPhase("exit");
    timers.current = [
      setTimeout(() => setPhase("score"), vars.exitDuration),
      setTimeout(() => setPhase("flash"), vars.flashDelay),
      setTimeout(() => setPhase("idle"), vars.totalDuration),
    ];
    return () => { timers.current.forEach(clearTimeout); };
  }, [playing, vars]);

  const SIZE = 160;
  const HOLE_RY = 12.5;
  const HOLE_CY = SIZE - HOLE_RY;
  const hangDelay = Math.round((vars.pausePct / 100) * vars.exitDuration);
  const isExiting = phase !== "idle";
  const showScore = phase === "score" || phase === "flash";
  const label = `BANK ${vars.score}`;

  // Mask: full-width rectangle (y=0..SIZE) + ellipse bump (cy=SIZE, ry=HOLE_RY).
  // Applied to diamond so it's only visible through the hole aperture as it falls.
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE + HOLE_RY}"><rect width="${SIZE}" height="${SIZE}" fill="black"/><ellipse cx="${SIZE / 2}" cy="${SIZE}" rx="${SIZE / 2}" ry="${HOLE_RY}" fill="black"/></svg>`;
  const maskUrl = `url("data:image/svg+xml,${encodeURIComponent(maskSvg)}")`;
  const maskSize = `${SIZE}px ${SIZE + HOLE_RY}px`;

  return (
    <div style={{ width: SIZE, height: SIZE, position: "relative" }}>
      <style>{buildStyles(vars.pausePct, vars.pauseDrift, SIZE, HOLE_RY)}</style>

      {/* z=0 — grey hole, behind diamond */}
      {isExiting && vars.showHole > 0 && (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}
          style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "visible", pointerEvents: "none" }}>
          <ellipse
            cx={SIZE / 2} cy={HOLE_CY} rx={SIZE / 2} ry={HOLE_RY}
            fill="#1A1A1A" opacity={vars.showHole}
            style={{
              animation: `dev-hole-in 150ms ease-out ${hangDelay}ms forwards`,
              transformBox: "fill-box", transformOrigin: "center",
            }}
          />
        </svg>
      )}

      {/* z=1 — diamond with CSS mask-image tracking the hole aperture */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        WebkitMaskImage: maskUrl, maskImage: maskUrl,
        WebkitMaskSize: maskSize, maskSize,
        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        WebkitMaskPosition: "0px 0px", maskPosition: "0px 0px",
        // Keep off-screen after animation ends so removing the animation prop
        // doesn't snap the diamond back into view while the score is showing.
        transform: (phase === "score" || phase === "flash") ? "translateY(200%)" : undefined,
        animation: phase === "exit"
          ? `dev-diamond-drop ${vars.exitDuration}ms linear forwards`
          : undefined,
      }}>
        <div style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: "rotate(45deg)",
        }}>
          <div style={{
            width: "71%", height: "71%",
            outline: `1.5px solid ${COLOR.textPrimary}`,
            outlineOffset: -1,
            borderRadius: RADIUS.sm,
            background: COLOR.textPrimary,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              transform: "rotate(-45deg)", display: "block", textAlign: "center",
              fontSize: 13, fontWeight: WEIGHT.semibold,
              color: COLOR.surfaceBg, lineHeight: 1.2, fontFamily: "inherit",
            }}>
              {label}
            </span>
          </div>
        </div>
      </div>

      {/* z=2 — rising score */}
      {showScore && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: WEIGHT.semibold,
          color: COLOR.textPrimary, fontFamily: "inherit",
          animation: phase === "score"
            ? `dev-bank-rise ${vars.scoreDuration}ms cubic-bezier(0, 0, 0.2, 1) forwards`
            : `dev-bank-exit ${vars.flashDuration}ms ease-out forwards`,
        }}>
          {phase === "flash" ? "*" : String(vars.score)}
        </div>
      )}
    </div>
  );
}

export default function BankDevPage() {
  const [vars, setVars] = useState(DEFAULTS);
  const [playKey, setPlayKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const set = (key: keyof typeof DEFAULTS) => (v: number) => setVars((p) => ({ ...p, [key]: v }));

  function replay() {
    setIsPlaying(false);
    setTimeout(() => { setPlayKey((k) => k + 1); setIsPlaying(true); }, 50);
  }

  useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(() => setIsPlaying(false), vars.totalDuration + 100);
    return () => clearTimeout(t);
  }, [isPlaying, playKey, vars.totalDuration]);

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#000",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 40, padding: 24,
    }}>
      <BankButtonPreview key={playKey} vars={vars} playing={isPlaying} />

      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 10, background: "#111", borderRadius: 12, padding: 20 }}>
        <Slider label="exit duration (ms)"  value={vars.exitDuration}  min={100} max={800} onChange={set("exitDuration")} />
        <Slider label="pause % of exit"     value={vars.pausePct}      min={0}   max={70}  onChange={set("pausePct")} />
        <Slider label="hang drift %"        value={vars.pauseDrift}    min={0}   max={20}  onChange={set("pauseDrift")} />
        <Slider label="score rise (ms)"     value={vars.scoreDuration} min={50}  max={500} onChange={set("scoreDuration")} />
        <Slider label="flash delay (ms)"    value={vars.flashDelay}    min={200} max={1000} onChange={set("flashDelay")} />
        <Slider label="flash duration (ms)" value={vars.flashDuration} min={50}  max={400} onChange={set("flashDuration")} />
        <Slider label="total (ms)"          value={vars.totalDuration} min={400} max={1400} onChange={set("totalDuration")} />
        <Slider label="hole opacity"        value={vars.showHole}      min={0}   max={1}   step={0.05} onChange={set("showHole")} />
        <Slider label="score"               value={vars.score}         min={50}  max={1000} step={50} onChange={set("score")} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={replay}
          style={{ padding: "6px 14px", background: "white", color: "black", border: "none", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
          Replay
        </button>
        <button onClick={() => setVars(DEFAULTS)}
          style={{ padding: "6px 14px", background: "#333", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
          Reset
        </button>
      </div>
    </div>
  );
}
