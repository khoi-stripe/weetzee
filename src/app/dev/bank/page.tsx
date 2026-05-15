"use client";

import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "@/lib/types";
import { WEIGHT } from "@/lib/type";
import { COLOR } from "@/lib/color";
import { RADIUS } from "@/lib/tokens";

const DEFAULTS = {
  exitDuration: 220,
  scoreDuration: 260,
  flashDelay: 500,
  flashDuration: 200,
  totalDuration: 700,
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

function BankButtonPreview({ vars, color, playing }: {
  vars: typeof DEFAULTS;
  color: string;
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
    <div style={{
      width: SIZE, height: SIZE,
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @keyframes dev-bank-rise {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes dev-bank-exit {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(-40%); opacity: 0; }
        }
      `}</style>

      {/* Diamond exit */}
      <div style={{
        position: "absolute", inset: 0,
        transform: isExiting ? "translateY(130%)" : undefined,
        transition: phase === "exit" ? `transform ${vars.exitDuration}ms ease-in` : "none",
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
  const [colorIndex, setColorIndex] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const color = PLAYER_COLORS[colorIndex];
  const set = (key: keyof typeof DEFAULTS) => (v: number) => setVars((p) => ({ ...p, [key]: v }));

  function replay() {
    setIsPlaying(false);
    setTimeout(() => {
      setPlayKey((k) => k + 1);
      setIsPlaying(true);
    }, 50);
  }

  // Auto-reset playing state
  useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(() => setIsPlaying(false), vars.totalDuration + 50);
    return () => clearTimeout(t);
  }, [isPlaying, playKey, vars.totalDuration]);

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#000",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 40, padding: 24,
    }}>
      <BankButtonPreview key={playKey} vars={vars} color={color} playing={isPlaying} />

      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 10, background: "#111", borderRadius: 12, padding: 20 }}>
        <Slider label="exit duration (ms)"  value={vars.exitDuration}   min={50}  max={600} onChange={set("exitDuration")} />
        <Slider label="score duration (ms)" value={vars.scoreDuration}  min={50}  max={600} onChange={set("scoreDuration")} />
        <Slider label="flash delay (ms)"    value={vars.flashDelay}     min={100} max={900} onChange={set("flashDelay")} />
        <Slider label="flash duration (ms)" value={vars.flashDuration}  min={50}  max={400} onChange={set("flashDuration")} />
        <Slider label="total (ms)"          value={vars.totalDuration}  min={300} max={1200} onChange={set("totalDuration")} />
        <Slider label="score"               value={vars.score}          min={50}  max={1000} step={50} onChange={set("score")} />
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
        {PLAYER_COLORS.map((c, i) => (
          <button key={c} onClick={() => setColorIndex(i)}
            style={{ width: 28, height: 28, background: c, border: i === colorIndex ? "2px solid white" : "2px solid transparent", borderRadius: "50%", cursor: "pointer" }} />
        ))}
      </div>
    </div>
  );
}
