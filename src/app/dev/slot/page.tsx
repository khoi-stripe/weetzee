"use client";

import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "@/lib/types";

const LABELS = ["HOT DICE!", "ROLL AGAIN", "ROLL", "THINKING...", "BANK"];

function SlotLabel({ label }: { label: string }) {
  const prevRef = useRef(label);
  const [anim, setAnim] = useState<{ from: string; to: string; id: number } | null>(null);

  useEffect(() => {
    if (label !== prevRef.current) {
      setAnim({ from: prevRef.current, to: label, id: Date.now() });
      prevRef.current = label;
    }
  }, [label]);

  return (
    <span style={{ overflow: "hidden", display: "block", position: "relative", width: "100%" }}>
      <span
        style={{
          display: "block",
          textAlign: "center",
          animation: anim ? "slot-exit 160ms cubic-bezier(0.4,0,1,1) forwards" : undefined,
        }}
        onAnimationEnd={() => setAnim(null)}
      >
        {anim ? anim.from : label}
      </span>
      {anim && (
        <span
          style={{
            display: "block",
            textAlign: "center",
            position: "absolute",
            inset: 0,
            animation: "slot-enter 160ms cubic-bezier(0,0,0.2,1) forwards",
          }}
        >
          {anim.to}
        </span>
      )}
    </span>
  );
}

export default function SlotDevPage() {
  const [labelIdx, setLabelIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const label = LABELS[labelIdx];
  const color = PLAYER_COLORS[colorIdx];

  useEffect(() => {
    if (!autoplay) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setLabelIdx((i) => (i === 0 ? 1 : 0));
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoplay]);

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#000",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 48, padding: 24, fontFamily: "monospace",
    }}>

      {/* Preview circle */}
      <div style={{
        width: 140, height: 140, borderRadius: "50%",
        border: `1px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color, fontSize: 13, fontWeight: 600, padding: 16,
        boxSizing: "border-box",
      }}>
        <SlotLabel label={label} />
      </div>

      {/* Label picker */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {LABELS.map((l, i) => (
          <button
            key={l}
            onClick={() => { setAutoplay(false); setLabelIdx(i); }}
            style={{
              padding: "8px 16px",
              background: i === labelIdx ? color : "#222",
              color: i === labelIdx ? "#000" : "#fff",
              border: "none", borderRadius: 6, fontSize: 12,
              fontFamily: "inherit", cursor: "pointer", fontWeight: 600,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div style={{ display: "flex", gap: 8 }}>
        {PLAYER_COLORS.map((c, i) => (
          <button key={c} onClick={() => setColorIdx(i)}
            style={{
              width: 28, height: 28, background: c,
              border: i === colorIdx ? "2px solid white" : "2px solid transparent",
              borderRadius: "50%", cursor: "pointer",
            }}
          />
        ))}
      </div>

      {/* Autoplay */}
      <button
        onClick={() => setAutoplay((v) => !v)}
        style={{
          padding: "8px 24px",
          background: autoplay ? color : "#333",
          color: autoplay ? "#000" : "#fff",
          border: "none", borderRadius: 6, fontSize: 12,
          fontFamily: "inherit", cursor: "pointer", fontWeight: 600,
        }}
      >
        {autoplay ? "Stop" : "Autoplay"}
      </button>
    </div>
  );
}
