"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/game/Header";
import { Die } from "@/components/game/Die";
import { VISIBLE_RULESETS } from "@/lib/rulesets";
import { computeSquareGridLayout } from "@/lib/gridLayout";
import { playTap } from "@/lib/sounds";
import { TYPE } from "@/lib/type";
import { COLOR } from "@/lib/color";
import { RoundButton } from "@/components/ui/RoundButton";
import { Scrim } from "@/components/ui/Scrim";
import { DialogCard } from "@/components/ui/DialogCard";

const SNAKE_EYES_RULESET = { id: "snake", name: "Snake Eyes" };
const ALL_GAME_OPTIONS = [...VISIBLE_RULESETS, SNAKE_EYES_RULESET];
const ITEM_COUNT = ALL_GAME_OPTIONS.length + 1;
const TITLE_RESERVE = 48;


function RulesetContent() {
  const params = useSearchParams();
  const playerCount = params.get("players") ?? "1";
  const aiParam = params.get("ai") ?? "";
  const [rulesetId, setRulesetId] = useState("farkle");
  const [showCpuWarning, setShowCpuWarning] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ cols: 2, rows: 3, cellSize: 0 });
  const GAP = 16;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const { width, height } = el!.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setLayout(computeSquareGridLayout(
        width - GAP * 2,
        height - GAP * 2 - TITLE_RESERVE,
        ITEM_COUNT,
        GAP
      ));
    }
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  function startGame() {
    playTap();
    if (rulesetId === "snake") {
      if (aiParam) { setShowCpuWarning(true); return; }
      router.push(`/snake?players=${playerCount}`);
      return;
    }
    const aiSuffix = aiParam ? `&ai=${aiParam}` : "";
    router.push(`/game?players=${playerCount}&ruleset=${rulesetId}${aiSuffix}`);
  }

  const gridW = layout.cellSize > 0
    ? layout.cols * layout.cellSize + (layout.cols - 1) * GAP
    : undefined;

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100%",
        background: COLOR.surfaceBg,
        overflow: "hidden",
      }}
    >
      <Header showBack={true} backLabel="Back" showAllRulesets />

      <div
        ref={containerRef}
        className="flex flex-col flex-1 min-h-0 items-center justify-center"
        style={{ padding: 20, gap: 24 }}
      >
        <p
          className="shrink-0"
          style={{
            ...TYPE.title,
            fontSize: 20,
            color: COLOR.textPrimary,
            textAlign: "center",
            width: gridW,
          }}
        >
          Choose game
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: layout.cellSize > 0
              ? `repeat(${layout.cols}, ${layout.cellSize}px)`
              : "repeat(2, 1fr)",
            gridTemplateRows: layout.cellSize > 0
              ? `repeat(${layout.rows}, ${layout.cellSize}px)`
              : "repeat(3, 1fr)",
            gap: GAP,
          }}
        >
          {ALL_GAME_OPTIONS.map((r, i) => {
            const selected = r.id === rulesetId;
            return (
              <div
                key={r.id}
                style={{
                  width: layout.cellSize || "100%",
                  height: layout.cellSize || "100%",
                }}
              >
                <Die
                  value={i + 1}
                  held={selected}
                  label={r.name}
                  onClick={() => { playTap(); setRulesetId(r.id); }}
                />
              </div>
            );
          })}
          <div style={{ width: layout.cellSize || "100%", height: layout.cellSize || "100%", containerType: "inline-size" }}>
            <RoundButton
              onClick={startGame}
              style={{ width: "100%", height: "100%", fontSize: "clamp(9px, 8cqi, 100px)" }}
            >
              Start
            </RoundButton>
          </div>
        </div>
      </div>

      {showCpuWarning && (
        <Scrim>
          <DialogCard>
            <p style={{ ...TYPE.title, fontSize: 20, textTransform: "uppercase", whiteSpace: "pre-line" }}>Snake Eyes is{"\n"}pass-and-play</p>
            <p style={{ ...TYPE.bodyRegular, fontSize: 16, marginTop: 8 }}>
              CPU players can&apos;t participate — Snake Eyes requires a real person to hold the phone. Only your human players will take turns.
            </p>
          </DialogCard>
          <div className="flex justify-center" style={{ gap: 16 }}>
            <RoundButton onClick={() => { playTap(); setShowCpuWarning(false); }}>Back</RoundButton>
            <RoundButton variant="filled" onClick={() => { playTap(); router.push(`/snake?players=${playerCount}`); }}>Continue</RoundButton>
          </div>
        </Scrim>
      )}
    </div>
  );
}

export default function RulesetPage() {
  return (
    <Suspense>
      <RulesetContent />
    </Suspense>
  );
}
