"use client";

import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "@/lib/types";
import { WEIGHT } from "@/lib/type";
import { COLOR } from "@/lib/color";
import { RADIUS } from "@/lib/tokens";

const DEFAULTS = {
  exitDuration: 400,
  pausePct: 40,      // % of exit animation spent "hanging" before drop
  pauseDrift: 3,     // % translateY during the hang (slight upward bob)
  scoreDuration: 260,
  flashDelay: 600,
  flashDuration: 200,
  totalDuration: 850,
  showHole: 1,
  score: 350,
};

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

function buildExitKeyframes(pausePct: number, pauseDrift: number) {
  // Looney Tunes: hangs at top, drifts slightly, then gravity catches up fast
  const midPct = pausePct + (100 - pausePct) * 0.3;
  return `
    @keyframes dev-diamond-drop {
      0%         { transform: translateY(0); }
      ${pausePct * 0.5}%  { transform: translateY(-${pauseDrift}%); }
      ${pausePct}%       { transform: translateY(-${pauseDrift * 0.5}%); }
      ${midPct.toFixed(0)}%  { transform: translateY(20%); }
      100%       { transform: translateY(130%); }
    }
    @keyframes dev-bank-rise {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes dev-bank-exit {
      from { transform: translateY(0);    opacity: 1; }
      to   { transform: translateY(-40%); opacity: 0; }
    }
    @keyframes dev-hole-in {
      from { opacity: 0; transform: scaleX(0.3); }
      to   { opacity: 1; transform: scaleX(1); }
    }
  `;
}

function BankButtonPreview({ vars, playing }: {
  vars: typeof DEFAULTS;
  playing: boolean;
}) {
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

  const isExiting = phase !== "idle";
  const showScore = phase === "score" || phase === "flash";
  const label = `BANK ${vars.score}`;
  const SIZE = 160;

  return (
    <div style={{ width: SIZE, height: SIZE, overflow: "hidden", position: "relative" }}>
      <style>{buildExitKeyframes(vars.pausePct, vars.pauseDrift)}</style>

      {/* Diamond */}
      <div style={{
        position: "absolute", inset: 0,
        animation: phase === "exit"
          ? `dev-diamond-drop ${vars.exitDuration}ms cubic-bezier(0.3, 0, 1, 1) forwards`
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
              transform: "rotate(-45deg)",
              display: "block",
              textAlign: "center",
              fontSize: 13,
              fontWeight: WEIGHT.semibold,
              color: COLOR.surfaceBg,
              lineHeight: 1.2,
              fontFamily: "inherit",
            }}>
              {label}
            </span>
          </div>
        </div>
      </div>

      {/* Hole */}
      {isExiting && vars.showHole > 0 && (
        <svg
          viewBox="0 0 258 42"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 42 / 160 * 100 + "%",
            animation: `dev-hole-in 120ms ease-out forwards`,
            opacity: vars.showHole,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <ellipse cx="129" cy="21" rx="129" ry="21" fill="#1A1A1A" />
        </svg>
      )}

      {/* Rising score */}
      {showScore && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          fontWeight: WEIGHT.semibold,
          color: COLOR.textPrimary,
          fontFamily: "inherit",
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
    setTimeout(() => {
      setPlayKey((k) => k + 1);
      setIsPlaying(true);
    }, 50);
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
