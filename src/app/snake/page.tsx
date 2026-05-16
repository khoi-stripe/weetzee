"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PLAYER_COLORS } from "@/lib/types";
import { COLOR } from "@/lib/color";
import { TYPE, WEIGHT } from "@/lib/type";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = PLAYER_COLORS;
const SPIN_MS = 10000;
const TICK_MS = 140;
const RADIUS_RATIO = 0.25; // segment corner radius as fraction of cell size

const PIP_PATTERNS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]],
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Point = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
type Food = Point & { value: number };

type GameState = {
  snake: Point[];
  dir: Dir;
  nextDir: Dir;
  food: Food;
  score: number;
  over: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomFood(snake: Point[], cols: number, rows: number): Food {
  if (cols <= 0 || rows <= 0) return { x: 0, y: 0, value: 1 };
  let p: Point;
  let attempts = 0;
  do {
    p = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    attempts++;
    if (attempts > cols * rows) break;
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return { ...p, value: Math.floor(Math.random() * 6) + 1 };
}

function step(p: Point, dir: Dir): Point {
  switch (dir) {
    case "up":    return { x: p.x,     y: p.y - 1 };
    case "down":  return { x: p.x,     y: p.y + 1 };
    case "left":  return { x: p.x - 1, y: p.y };
    case "right": return { x: p.x + 1, y: p.y };
  }
}

function opposite(d: Dir): Dir {
  return d === "up" ? "down" : d === "down" ? "up" : d === "left" ? "right" : "left";
}

function makeInitial(cols: number, rows: number): GameState {
  const mid = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  const snake = [mid, { x: mid.x - 1, y: mid.y }, { x: mid.x - 2, y: mid.y }];
  return { snake, dir: "right", nextDir: "right", food: randomFood(snake, cols, rows), score: 0, over: false };
}

// ─── Canvas drawing ───────────────────────────────────────────────────────────

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function segmentColor(idx: number, len: number, now: number): string {
  const phase = (now % SPIN_MS) / SPIN_MS;
  const frac = ((phase + (len <= 1 ? 0 : idx / len)) % 1 + 1) % 1;
  return COLORS[Math.floor(frac * COLORS.length)];
}

function drawDie(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, value: number) {
  const pad = cell * 0.1;
  const s = cell - pad * 2;
  const r = s * RADIUS_RATIO;
  ctx.save();
  roundedRect(ctx, x + pad, y + pad, s, s, r);
  ctx.fillStyle = COLOR.textPrimary;
  ctx.fill();
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  const pipR = cell * 0.07;
  ctx.fillStyle = COLOR.surfaceBg;
  for (const [fx, fy] of PIP_PATTERNS[value]) {
    ctx.beginPath();
    ctx.arc(x + pad + s * fx, y + pad + s * fy, pipR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cols: number,
  rows: number,
  cell: number,
  now: number,
) {
  const w = cols * cell;
  const h = rows * cell;

  // Background
  ctx.fillStyle = COLOR.surfaceBg;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath(); ctx.moveTo(c * cell, 0); ctx.lineTo(c * cell, h); ctx.stroke();
  }
  for (let row = 0; row <= rows; row++) {
    ctx.beginPath(); ctx.moveTo(0, row * cell); ctx.lineTo(w, row * cell); ctx.stroke();
  }

  // Food
  drawDie(ctx, state.food.x * cell, state.food.y * cell, cell, state.food.value);

  // Snake
  const len = state.snake.length;
  for (let i = len - 1; i >= 0; i--) {
    const { x, y } = state.snake[i];
    const pad = cell * 0.08;
    const s = cell - pad * 2;
    const r = s * RADIUS_RATIO;
    ctx.save();
    roundedRect(ctx, x * cell + pad, y * cell + pad, s, s, r);
    ctx.fillStyle = segmentColor(i, len, now);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Game loop hook ───────────────────────────────────────────────────────────

function useSnakeGame(cols: number, rows: number, active: boolean) {
  const stateRef = useRef<GameState>(makeInitial(cols, rows));

  const reset = useCallback(() => {
    stateRef.current = makeInitial(cols, rows);
  }, [cols, rows]);

  const steer = useCallback((dir: Dir) => {
    const s = stateRef.current;
    if (s.over) return;
    if (dir !== opposite(s.dir)) s.nextDir = dir;
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (s.over) return;
      const dir = s.nextDir;
      const head = step(s.snake[0], dir);
      // Wall collision
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        stateRef.current = { ...s, over: true };
        return;
      }
      // Self collision
      if (s.snake.some((p) => p.x === head.x && p.y === head.y)) {
        stateRef.current = { ...s, over: true };
        return;
      }
      const ate = head.x === s.food.x && head.y === s.food.y;
      const newSnake = [head, ...s.snake.slice(0, ate ? undefined : -1)];
      const newFood = ate ? randomFood(newSnake, cols, rows) : s.food;
      stateRef.current = {
        snake: newSnake,
        dir,
        nextDir: dir,
        food: newFood,
        score: ate ? s.score + s.food.value : s.score,
        over: false,
      };
    }, TICK_MS);
    return () => clearInterval(id);
  }, [cols, rows, active]);

  return { stateRef, steer, reset };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SnakePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(0);
  const [cols, setCols] = useState(0);
  const [rows, setRows] = useState(0);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const rafRef = useRef<number>(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  // Measure container → compute grid
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const { width, height } = el!.getBoundingClientRect();
      const c = Math.floor(Math.min(width, height * 0.55) / 16);
      const cellPx = Math.floor(width / c);
      const r = Math.floor(height / cellPx);
      setCols(c);
      setRows(r);
      setCell(cellPx);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { stateRef, steer, reset } = useSnakeGame(cols, rows, started && !over);

  // Render loop
  useEffect(() => {
    if (!cell || !cols || !rows) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let running = true;
    function loop() {
      if (!running) return;
      const s = stateRef.current;
      drawFrame(ctx!, s, cols, rows, cell, Date.now());
      setScore(s.score);
      if (s.over && !over) setOver(true);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [cell, cols, rows, stateRef, over]);

  // Keyboard
  useEffect(() => {
    const MAP: Record<string, Dir> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
    };
    function onKey(e: KeyboardEvent) {
      const dir = MAP[e.key];
      if (!dir) return;
      e.preventDefault();
      if (!started) setStarted(true);
      steer(dir);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steer, started]);

  // Touch swipe
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    const dir: Dir = Math.abs(dx) > Math.abs(dy)
      ? dx > 0 ? "right" : "left"
      : dy > 0 ? "down" : "up";
    if (!started) setStarted(true);
    steer(dir);
  }, [steer, started]);

  function handleRestart() {
    reset();
    setOver(false);
    setScore(0);
    setStarted(true);
  }

  return (
    <div
      style={{ height: "100%", background: COLOR.surfaceBg, display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", flexShrink: 0 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: COLOR.textPrimary, fontSize: 15, fontFamily: "inherit", cursor: "pointer", padding: 0 }}
        >
          ← Back
        </button>
        <span style={{ ...TYPE.bodyEmphasis, color: COLOR.textPrimary, fontVariantNumeric: "tabular-nums" }}>
          {score}
        </span>
        <div style={{ width: 48 }} />
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, position: "relative" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {cell > 0 && (
          <canvas
            ref={canvasRef}
            width={cols * cell}
            height={rows * cell}
            style={{ display: "block", margin: "0 auto" }}
          />
        )}

        {/* Start prompt */}
        {!started && !over && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
            background: "rgba(0,0,0,0.6)",
          }}>
            <span style={{ ...TYPE.titleBold, color: COLOR.textPrimary }}>Snake</span>
            <span style={{ ...TYPE.microRegular, color: COLOR.textMuted }}>Swipe or use arrow keys</span>
          </div>
        )}

        {/* Game over */}
        {over && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16,
            background: "rgba(0,0,0,0.75)",
          }}>
            <span style={{ ...TYPE.titleBold, color: COLOR.textPrimary }}>Game over</span>
            <span style={{ fontSize: 40, fontWeight: WEIGHT.extrabold, color: COLOR.textPrimary, fontVariantNumeric: "tabular-nums" }}>
              {score}
            </span>
            <button
              onClick={handleRestart}
              style={{
                ...TYPE.bodyEmphasis,
                marginTop: 8,
                padding: "12px 32px",
                borderRadius: 9999,
                background: COLOR.textPrimary,
                color: COLOR.surfaceBg,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
