"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PLAYER_COLORS } from "@/lib/types";
import { COLOR } from "@/lib/color";
import { TYPE, WEIGHT } from "@/lib/type";
import { Z } from "@/lib/tokens";
import { hasNOfAKind, isSmallStraight, isLargeStraight, isFullHouse, sum } from "@/lib/rulesets/classic";
import { Scrim } from "@/components/ui/Scrim";
import { DialogCard } from "@/components/ui/DialogCard";
import { RoundButton } from "@/components/ui/RoundButton";
import { playSnakeEat, playSelect } from "@/lib/sounds";
import { hapticLight } from "@/lib/haptics";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = PLAYER_COLORS;
const SPIN_MS = 10000;
const TICK_MS = 150;
const FOOD_COUNT = 5;
const FOOD_LIFETIME = 10000;
const RADIUS_RATIO = 0.25; // segment corner radius as fraction of cell size

const PIP_PATTERNS: Record<number, [number, number][]> = {
  1: [[0.50, 0.50]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.50, 0.50], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.50, 0.50], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.20], [0.75, 0.20], [0.25, 0.50], [0.75, 0.50], [0.25, 0.80], [0.75, 0.80]],
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Point = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
type Food = Point & { value: number; expiry: number };
type WallSide = "top" | "bottom" | "left" | "right";
type Wall = { side: WallSide; offset: number; dir: 1 | -1 };

type GameState = {
  snake: Point[];
  dir: Dir;
  nextDir: Dir;
  foods: Food[];
  score: number;
  over: boolean;
  walls: Wall[];
  wallTick: number;
  powerUp: (Point & { value: number; color: string }) | null;
  powerUpExpiry: number;
  intangibleUntil: number;
  intangibleColor: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomFood(excluded: Point[], cols: number, rows: number, now: number): Food {
  if (cols <= 0 || rows <= 0) return { x: 0, y: 0, value: 1, expiry: now + FOOD_LIFETIME };
  let p: Point;
  let attempts = 0;
  do {
    p = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    attempts++;
    if (attempts > cols * rows) break;
  } while (excluded.some((s) => s.x === p.x && s.y === p.y));
  return { ...p, value: Math.floor(Math.random() * 6) + 1, expiry: now + FOOD_LIFETIME };
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

function wallLength(snakeLen: number, sideLen: number): number {
  const min = 2;
  const max = Math.floor(sideLen * 0.5);
  const t = Math.min(1, (snakeLen - 3) / 20);
  return Math.max(min, Math.round(min + (max - min) * t));
}

function wallCells(wall: Wall, length: number, cols: number, rows: number): Point[] {
  const sideLen = wall.side === "top" || wall.side === "bottom" ? cols : rows;
  const cells: Point[] = [];
  for (let i = 0; i < length; i++) {
    const pos = wall.offset + i;
    if (pos < 0 || pos >= sideLen) continue;
    if (wall.side === "top")    cells.push({ x: pos, y: 0 });
    if (wall.side === "bottom") cells.push({ x: pos, y: rows - 1 });
    if (wall.side === "left")   cells.push({ x: 0, y: pos });
    if (wall.side === "right")  cells.push({ x: cols - 1, y: pos });
  }
  return cells;
}

function advanceWall(wall: Wall, length: number, cols: number, rows: number): Wall {
  const sideLen = wall.side === "top" || wall.side === "bottom" ? cols : rows;
  let offset = wall.offset + wall.dir;
  let dir = wall.dir;
  if (offset + length >= sideLen) { offset = sideLen - length; dir = -1; }
  if (offset <= 0) { offset = 0; dir = 1; }
  return { ...wall, offset, dir };
}

function makeInitial(cols: number, rows: number): GameState {
  const now = Date.now();
  const mid = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  const snake = [mid, { x: mid.x - 1, y: mid.y }, { x: mid.x - 2, y: mid.y }];
  const foods: Food[] = [];
  for (let i = 0; i < FOOD_COUNT; i++) {
    foods.push(randomFood([...snake, ...foods], cols, rows, now));
  }
  const walls: Wall[] = [
    { side: "top",    offset: 0,                         dir: 1 },
    { side: "bottom", offset: Math.floor(cols / 2),      dir: -1 },
    { side: "left",   offset: 0,                         dir: 1 },
    { side: "right",  offset: Math.floor(rows / 2),      dir: -1 },
  ];
  return { snake, dir: "right", nextDir: "right", foods, score: 0, over: false, walls, wallTick: 0, powerUp: null, powerUpExpiry: 0, intangibleUntil: 0, intangibleColor: "" };
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

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function snakeColor(frac: number): string {
  const n = COLORS.length;
  const pos = (((frac % 1) + 1) % 1) * n;
  const i = Math.floor(pos) % n;
  return lerpColor(COLORS[i], COLORS[(i + 1) % n], pos - Math.floor(pos));
}

function segmentFrac(idx: number, len: number, now: number): number {
  const phase = (now % SPIN_MS) / SPIN_MS;
  return ((phase + (len <= 1 ? 0 : idx / len)) % 1 + 1) % 1;
}

function drawDie(
  ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, value: number,
  bg: string = COLOR.surfaceBg, fg: string = COLOR.textPrimary, borderColor: string = COLOR.textPrimary,
) {
  const pad = cell * 0.1;
  const s = cell - pad * 2;
  ctx.save();
  roundedRect(ctx, x + pad, y + pad, s, s, 4);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  const pipR = s * 0.085;
  ctx.fillStyle = fg;
  for (const [fx, fy] of PIP_PATTERNS[value]) {
    ctx.beginPath();
    ctx.arc(x + pad + s * fx, y + pad + s * fy, pipR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWalls(ctx: CanvasRenderingContext2D, walls: Wall[], snakeLen: number, cols: number, rows: number, cell: number) {
  for (const wall of walls) {
    const sideLen = wall.side === "top" || wall.side === "bottom" ? cols : rows;
    const len = wallLength(snakeLen, sideLen);
    const cells = wallCells(wall, len, cols, rows);
    cells.forEach((c) => {
      drawDie(ctx, c.x * cell, c.y * cell, cell, 1, COLOR.textPrimary, COLOR.surfaceBg, COLOR.surfaceBg);
    });
  }
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  prevSnake: Point[],
  t: number,
  cell: number,
  now: number,
) {
  const len = state.snake.length;
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const lx = (i: number) => {
    const prev = prevSnake[i];
    const curr = state.snake[i];
    if (!prev || Math.abs(curr.x - prev.x) > 1) return curr.x * cell + cell / 2;
    return lerp(prev.x, curr.x) * cell + cell / 2;
  };
  const ly = (i: number) => {
    const prev = prevSnake[i];
    const curr = state.snake[i];
    if (!prev || Math.abs(curr.y - prev.y) > 1) return curr.y * cell + cell / 2;
    return lerp(prev.y, curr.y) * cell + cell / 2;
  };
  const outerW = cell * 0.78;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = outerW;
  for (let i = len - 1; i >= 1; i--) {
    const x1 = lx(i), y1 = ly(i), x2 = lx(i - 1), y2 = ly(i - 1);
    if (Math.abs(x2 - x1) > cell * 2 || Math.abs(y2 - y1) > cell * 2) continue;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, snakeColor(segmentFrac(i, len, now)));
    grad.addColorStop(1, snakeColor(segmentFrac(i - 1, len, now)));
    ctx.beginPath();
    ctx.strokeStyle = grad;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.fillStyle = snakeColor(segmentFrac(0, len, now));
  roundedRect(ctx, lx(0) - outerW / 2, ly(0) - outerW / 2, outerW, outerW, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = snakeColor(segmentFrac(len - 1, len, now));
  roundedRect(ctx, lx(len - 1) - outerW / 2, ly(len - 1) - outerW / 2, outerW, outerW, 4);
  ctx.fill();
}

// ─── Hand scoring ─────────────────────────────────────────────────────────────

const VALUE_COLORS: Record<number, string> = {
  1: COLORS[0], // yellow
  2: COLORS[1], // green
  3: COLORS[2], // cyan
  4: COLORS[3], // violet
  5: COLORS[4], // pink
  6: COLORS[5], // teal
};

function getComboName(values: number[]): string | null {
  if (values.length === 0) return null;
  if (hasNOfAKind(values, 5)) return "WEETZEE";
  if (isLargeStraight(values)) return "LG. STRAIGHT";
  if (isFullHouse(values)) return "FULL HOUSE";
  if (isSmallStraight(values)) return "SM. STRAIGHT";
  if (hasNOfAKind(values, 4)) return "4 OF A KIND";
  if (hasNOfAKind(values, 3)) return "3 OF A KIND";
  return null;
}

function scoreSnakeHand(values: number[]): number {
  if (values.length === 0) return 0;
  if (hasNOfAKind(values, 5)) return 50;
  if (isLargeStraight(values)) return 40;
  if (isFullHouse(values)) return 25;
  if (isSmallStraight(values)) return 30;
  if (hasNOfAKind(values, 4)) return sum(values);
  if (hasNOfAKind(values, 3)) return sum(values);
  return sum(values);
}

type PoppedDie = { x: number; y: number; value: number; color: string; startTime: number };
const POP_DURATION = 125;

function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  prevSnake: Point[],
  t: number,
  cols: number,
  rows: number,
  cell: number,
  now: number,
  snakeCanvas: HTMLCanvasElement,
  poppedDice: PoppedDie[],
  dpr: number,
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

  // Walls
  drawWalls(ctx, state.walls, state.snake.length, cols, rows, cell);

  // Food — colored to match slot color when eaten
  for (const food of state.foods) {
    const c = VALUE_COLORS[food.value] ?? COLOR.textPrimary;
    drawDie(ctx, food.x * cell, food.y * cell, cell, food.value, c, "#000000", c);
  }

  // Power-up die — hollow (black bg, white border/pips)
  if (state.powerUp) {
    const pu = state.powerUp;
    drawDie(ctx, pu.x * cell, pu.y * cell, cell, pu.value);
  }

  // Pop-out animations for expired power-up dice
  for (const pd of poppedDice) {
    const prog = (now - pd.startTime) / POP_DURATION;
    if (prog >= 1) continue;
    const eased = 1 - Math.pow(1 - prog, 3); // cubic ease-out
    const scale = 1 + eased * 1.0;
    const alpha = Math.pow(1 - prog, 0.6);
    const cx = pd.x * cell + cell / 2;
    const cy = pd.y * cell + cell / 2;
    // Die scaling out
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cell / 2, -cell / 2);
    drawDie(ctx, 0, 0, cell, pd.value, pd.color, "#000000", pd.color);
    ctx.restore();
    // Stars shooting out in 4 cardinal directions
    const starDist = eased * cell * 1.8;
    const fontSize = Math.max(8, cell * 0.55);
    ctx.save();
    ctx.globalAlpha = Math.pow(1 - prog, 0.5);
    ctx.fillStyle = pd.color;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      ctx.fillText("*", cx + dx * starDist, cy + dy * starDist);
    }
    ctx.restore();
  }

  // Snake — draw to offscreen canvas first, then composite at desired alpha
  const intangible = now < state.intangibleUntil;
  const flashAlpha = intangible ? (Math.floor(now / 200) % 2 === 0 ? 1 : 0.35) : 1;
  snakeCanvas.width = w * dpr;
  snakeCanvas.height = h * dpr;
  const snakeCtx = snakeCanvas.getContext("2d")!;
  snakeCtx.scale(dpr, dpr);
  snakeCtx.clearRect(0, 0, w, h);
  drawSnake(snakeCtx, state, prevSnake, t, cell, now);
  ctx.globalAlpha = flashAlpha;
  ctx.drawImage(snakeCanvas, 0, 0, w, h);
  ctx.globalAlpha = 1;
}

// ─── Game loop hook ───────────────────────────────────────────────────────────

function useSnakeGame(cols: number, rows: number, active: boolean, onFoodEatenRef: React.MutableRefObject<(value: number) => void>) {
  const stateRef = useRef<GameState>(makeInitial(cols, rows));
  const prevSnakeRef = useRef<Point[]>(stateRef.current.snake);
  const lastTickRef = useRef(Date.now());
  const tickDurRef = useRef(TICK_MS);

  // Reinitialize once when dimensions first become valid (initial state has cols=0,rows=0)
  const dimInitialized = useRef(false);
  useEffect(() => {
    if (cols > 0 && rows > 0 && !dimInitialized.current) {
      dimInitialized.current = true;
      const s = makeInitial(cols, rows);
      stateRef.current = s;
      prevSnakeRef.current = s.snake;
    }
  }, [cols, rows]);

  const reset = useCallback(() => {
    const s = makeInitial(cols, rows);
    stateRef.current = s;
    prevSnakeRef.current = s.snake;
    lastTickRef.current = Date.now();
    tickDurRef.current = TICK_MS;
  }, [cols, rows]);

  const nudgeRef = useRef<(() => void) | null>(null);

  const steer = useCallback((dir: Dir) => {
    const s = stateRef.current;
    if (s.over) return;
    if (dir !== opposite(s.dir)) {
      s.nextDir = dir;
      nudgeRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let pendingId: ReturnType<typeof setTimeout> | null = null;

    function tick() {
      if (cancelled) return;
      pendingId = null;
      const s = stateRef.current;
      prevSnakeRef.current = s.snake;
      lastTickRef.current = Date.now();
      if (!s.over) {
        const dir = s.nextDir;
        const raw = step(s.snake[0], dir);
        const head = {
          x: ((raw.x % cols) + cols) % cols,
          y: ((raw.y % rows) + rows) % rows,
        };
        const newWallTick = s.wallTick + 1;
        const snakeLen = s.snake.length;
        const newWalls = newWallTick % 2 === 0
          ? s.walls.map(w => advanceWall(w, wallLength(snakeLen, w.side === "top" || w.side === "bottom" ? cols : rows), cols, rows))
          : s.walls;
        const now = Date.now();
        const intangible = now < s.intangibleUntil;
        const hitWall = !intangible && newWalls.some(w =>
          wallCells(w, wallLength(snakeLen, w.side === "top" || w.side === "bottom" ? cols : rows), cols, rows)
            .some(c => c.x === head.x && c.y === head.y)
        );
        const hitSelf = !intangible && s.snake.slice(0, -1).some((p) => p.x === head.x && p.y === head.y);
        if (hitSelf || hitWall) {
          stateRef.current = { ...s, over: true, intangibleUntil: 0 };
        } else {
          const eatenIdx = s.foods.findIndex(f => head.x === f.x && head.y === f.y);
          const ate = eatenIdx >= 0;
          const atePowerUp = s.powerUp !== null && head.x === s.powerUp.x && head.y === s.powerUp.y;
          const newSnake = [head, ...s.snake.slice(0, ate ? undefined : -1)];
          const afterEat: Food[] = ate
            ? [...s.foods.slice(0, eatenIdx), ...s.foods.slice(eatenIdx + 1),
               randomFood([...newSnake, ...s.foods.filter((_, i) => i !== eatenIdx)], cols, rows, now)]
            : s.foods;
          // Replace any expired food dice with new ones at fresh positions
          const newFoods = afterEat.map((f, i) =>
            now >= f.expiry
              ? randomFood([...newSnake, ...afterEat.filter((_, j) => j !== i)], cols, rows, now)
              : f
          );
          if (ate) { onFoodEatenRef.current(s.foods[eatenIdx].value); }
          if (ate || atePowerUp) { hapticLight(); playSnakeEat(); }
          // Expire power-up after 10 seconds
          const powerUpExpired = s.powerUp !== null && now >= s.powerUpExpiry;
          // Spawn a power-up with ~20% chance when food is eaten and none exists
          const spawnPowerUp = ate && s.powerUp === null && Math.random() < 0.20;
          const allOccupied = [...newSnake, ...newFoods];
          const newPowerUpExpiry = spawnPowerUp ? now + 10000 : atePowerUp || powerUpExpired ? 0 : s.powerUpExpiry;
          const newPowerUp = atePowerUp || powerUpExpired
            ? null
            : spawnPowerUp
              ? (() => {
                  const p = randomFood(allOccupied, cols, rows, now);
                  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                  return { ...p, color };
                })()
              : s.powerUp;
          stateRef.current = {
            snake: newSnake,
            dir,
            nextDir: dir,
            foods: newFoods,
            score: s.score,
            over: false,
            walls: newWalls,
            wallTick: newWallTick,
            powerUp: newPowerUp,
            powerUpExpiry: newPowerUpExpiry,
            intangibleUntil: atePowerUp ? now + 10000 : s.intangibleUntil,
            intangibleColor: atePowerUp ? (s.powerUp?.color ?? s.intangibleColor) : s.intangibleColor,
          };
        }
      }
      const len = stateRef.current.snake.length;
      const delay = TICK_MS * Math.pow(0.985, len - 3);
      tickDurRef.current = delay;
      pendingId = setTimeout(tick, delay);
    }

    nudgeRef.current = () => {
      const elapsed = Date.now() - lastTickRef.current;
      if (pendingId !== null && elapsed >= tickDurRef.current * 0.5) {
        clearTimeout(pendingId);
        tick();
      }
    };

    pendingId = setTimeout(tick, TICK_MS);
    return () => {
      cancelled = true;
      if (pendingId !== null) clearTimeout(pendingId);
      nudgeRef.current = null;
    };
  }, [cols, rows, active]);

  return { stateRef, prevSnakeRef, lastTickRef, tickDurRef, steer, reset };
}

// ─── Main component ───────────────────────────────────────────────────────────

const INTANGIBLE_DURATION = 10000;

function IntangibleTimer({ until, color, onExpire, size = 18 }: { until: number; color: string; onExpire: () => void; size?: number }) {
  const [fraction, setFraction] = useState(() =>
    Math.max(0, Math.min(1, (until - Date.now()) / INTANGIBLE_DURATION))
  );
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let raf: number;
    let fadeTimer: ReturnType<typeof setTimeout>;
    function tick() {
      const f = Math.max(0, Math.min(1, (until - Date.now()) / INTANGIBLE_DURATION));
      setFraction(f);
      if (f > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        setFading(true);
        fadeTimer = setTimeout(onExpire, 300);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(fadeTimer); };
  }, [until]);

  const cx = size / 2;
  const cy = size / 2;
  const r = cx - 1.5;

  let piePath = "";
  if (fraction >= 0.9999) {
    piePath = `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`;
  } else if (fraction > 0) {
    const angle = fraction * Math.PI * 2;
    const ex = +(cx - r * Math.sin(angle)).toFixed(3);
    const ey = +(cy - r * Math.cos(angle)).toFixed(3);
    const largeArc = angle > Math.PI ? 1 : 0;
    piePath = `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey} Z`;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transition: "opacity 300ms ease-out", opacity: fading ? 0 : 1 }}>
      {piePath && <path d={piePath} fill={color} />}
    </svg>
  );
}

function SlotDie({ value, color }: { value: number; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 40;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    const CELL = SIZE / 0.8;
    const OFFSET = -(CELL - SIZE) / 2;
    ctx.clearRect(0, 0, SIZE, SIZE);
    drawDie(ctx, OFFSET, OFFSET, CELL, value, color, "#000000", color);
  }, [value, color]);
  return <canvas ref={canvasRef} style={{ display: "block", width: SIZE, height: SIZE }} />;
}

const HS_KEY = "weetzee-snake-highscore";

export default function SnakePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(0);
  const [cols, setCols] = useState(0);
  const [rows, setRows] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [over, setOver] = useState(false);
  const [intangibleUntil, setIntangibleUntil] = useState(0);
  const [intangibleColor, setIntangibleColor] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [handSlots, setHandSlots] = useState<Array<{ value: number; color: string }>>([]);
  const [popAnim, setPopAnim] = useState<{ score: number; phase: "rise" | "hold" | "exit"; color: string } | null>(null);
  const rafRef = useRef<number>(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const snakeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const poppedDiceRef = useRef<PoppedDie[]>([]);
  const prevPowerUpRef = useRef<GameState["powerUp"]>(null);
  const lastShownIntangibleRef = useRef(0);
  const popTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [comboFlash, setComboFlash] = useState<string | null>(null);
  const comboFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFoodEatenRef = useRef<(value: number) => void>(() => {});
  onFoodEatenRef.current = (value: number) => {
    const color = VALUE_COLORS[value] ?? COLOR.textPrimary;
    const next = [{ value, color }, ...handSlots].slice(0, 5);
    const prevCombo = getComboName(handSlots.map(s => s.value));
    const nextCombo = getComboName(next.map(s => s.value));
    if (nextCombo && nextCombo !== prevCombo) {
      hapticLight();
      playSelect();
      setComboFlash(nextCombo);
      if (comboFlashTimerRef.current) clearTimeout(comboFlashTimerRef.current);
      comboFlashTimerRef.current = setTimeout(() => setComboFlash(null), 1500);
    }
    setHandSlots(next);
  };

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(HS_KEY) ?? "0", 10);
    if (!isNaN(stored)) setHighScore(stored);
  }, []);

  // Countdown before game starts
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setStarted(true);
      return;
    }
    const id = setTimeout(() => setCountdown(n => (n ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  // Measure container → compute grid
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const { width, height } = el!.getBoundingClientRect();
      const cellPx = 24;
      const c = Math.floor(width / cellPx);
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

  const { stateRef, prevSnakeRef, lastTickRef, tickDurRef, steer, reset } = useSnakeGame(cols, rows, started && !over, onFoodEatenRef);

  // Render loop
  useEffect(() => {
    if (!cell || !cols || !rows) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cols * cell;
    const h = rows * cell;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    if (!snakeCanvasRef.current) snakeCanvasRef.current = document.createElement("canvas");
    const snakeCanvas = snakeCanvasRef.current;
    let running = true;
    function loop() {
      if (!running) return;
      const s = stateRef.current;
      const now = Date.now();
      const t = s.over ? 1 : Math.min(1, (now - lastTickRef.current) / tickDurRef.current);
      // Detect power-up expiry (disappeared without being eaten by snake head)
      const prev = prevPowerUpRef.current;
      if (prev !== null && s.powerUp === null) {
        const headAtPU = s.snake[0].x === prev.x && s.snake[0].y === prev.y;
        if (!headAtPU) {
          poppedDiceRef.current.push({ x: prev.x, y: prev.y, value: prev.value, color: prev.color, startTime: now });
        }
      }
      prevPowerUpRef.current = s.powerUp;
      poppedDiceRef.current = poppedDiceRef.current.filter(p => now - p.startTime < POP_DURATION);
      drawFrame(ctx!, s, prevSnakeRef.current, t, cols, rows, cell, now, snakeCanvas, poppedDiceRef.current, dpr);
      setScore(s.score);
      if (s.intangibleUntil !== 0 && s.intangibleUntil !== lastShownIntangibleRef.current) {
        lastShownIntangibleRef.current = s.intangibleUntil;
        setIntangibleUntil(s.intangibleUntil);
        setIntangibleColor(s.intangibleColor);
        setShowTimer(true);
      }
      if (s.over && !over) {
        setOver(true);
        setHighScore((prev) => {
          const next = Math.max(prev, s.score);
          localStorage.setItem(HS_KEY, String(next));
          return next;
        });
      }
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

  // Native (non-passive) touch handlers — assigned each render so closures stay fresh.
  const nativeTouchRef = useRef<{
    start: (e: TouchEvent) => void;
    move: (e: TouchEvent) => void;
    end: () => void;
  } | null>(null);

  nativeTouchRef.current = {
    start: (e: TouchEvent) => {
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    move: (e: TouchEvent) => {
      e.preventDefault();
      if (!touchRef.current) return;
      const dx = e.touches[0].clientX - touchRef.current.x;
      const dy = e.touches[0].clientY - touchRef.current.y;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const dir: Dir = Math.abs(dx) > Math.abs(dy)
        ? dx > 0 ? "right" : "left"
        : dy > 0 ? "down" : "up";
      if (!started) setStarted(true);
      steer(dir);
    },
    end: () => { touchRef.current = null; },
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => nativeTouchRef.current?.start(e);
    const onMove  = (e: TouchEvent) => nativeTouchRef.current?.move(e);
    const onEnd   = ()              => nativeTouchRef.current?.end();
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove",  onMove,  { passive: false });
    el.addEventListener("touchend",   onEnd,   { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
    };
  }, []);

  function handleTakeHand() {
    if (handSlots.length === 0) return;
    const handScore = scoreSnakeHand(handSlots.map(s => s.value));
    stateRef.current = { ...stateRef.current, score: stateRef.current.score + handScore };
    setHandSlots([]);
    popTimersRef.current.forEach(clearTimeout);
    setPopAnim({ score: handScore, phase: "rise", color: "#ffcc00" });
    popTimersRef.current = [
      setTimeout(() => setPopAnim(p => p ? { ...p, phase: "hold" } : null), 260),
      setTimeout(() => setPopAnim(p => p ? { ...p, phase: "exit" } : null), 1260),
      setTimeout(() => setPopAnim(null), 1460),
    ];
  }

  function handleRestart() {
    reset();
    setOver(false);
    setScore(0);
    setShowTimer(false);
    setStarted(true);
    setHandSlots([]);
    setPopAnim(null);
    setComboFlash(null);
    popTimersRef.current.forEach(clearTimeout);
    if (comboFlashTimerRef.current) clearTimeout(comboFlashTimerRef.current);
    poppedDiceRef.current = [];
    prevPowerUpRef.current = null;
    lastShownIntangibleRef.current = 0;
  }

  const currentCombo = getComboName(handSlots.map(s => s.value));
  const currentComboScore = currentCombo ? scoreSnakeHand(handSlots.map(s => s.value)) : null;

  return (
    <div
      style={{ height: "100%", background: COLOR.surfaceBg, display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", flexShrink: 0, gap: 8 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: COLOR.textPrimary, fontSize: 15, fontFamily: "inherit", cursor: "pointer", padding: 0, flexShrink: 0 }}
        >
          Back
        </button>
        <span style={{ fontFamily: "inherit", fontSize: 13, fontWeight: WEIGHT.semibold, color: "#ffcc00", letterSpacing: "0.06em", textAlign: "right", whiteSpace: "nowrap" }}>
          {currentCombo ? `${currentCombo} · ${currentComboScore}pt` : ""}
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", touchAction: "none" }}
      >
        {cell > 0 && (
          <canvas
            ref={canvasRef}
            style={{ display: "block", margin: "0 auto" }}
          />
        )}

        {/* Start prompt */}
        {!started && !over && countdown === null && (
          <Scrim position="absolute" zIndex={Z.interstitial}>
            <div style={{ position: "relative", width: "100%", maxWidth: "min(80vw, 80vh, 400px)" }}>
              <div className="snake-modal-border" />
              <DialogCard enter="spinIn" style={{ borderRadius: 4, position: "relative" }}>
                <div style={{ ...TYPE.subDisplayBold, fontFamily: "inherit" }}>SNAKE EYES</div>
              </DialogCard>
            </div>
            <RoundButton variant="filled" onClick={() => setCountdown(3)}>
              Play
            </RoundButton>
          </Scrim>
        )}

        {/* Countdown overlay */}
        {countdown !== null && countdown > 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: Z.interstitial }}>
            <div key={countdown} style={{ width: 72, height: 72, borderRadius: "50%", background: "#000", border: `2px solid ${COLOR.textPrimary}`, display: "flex", alignItems: "center", justifyContent: "center", animation: "scale-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}>
              <span style={{ fontFamily: "inherit", fontSize: 36, fontWeight: WEIGHT.semibold, color: COLOR.textPrimary, lineHeight: 1 }}>
                {countdown}
              </span>
            </div>
          </div>
        )}

        {/* Game over */}
        {over && (
          <Scrim position="absolute" zIndex={Z.interstitial}>
            <div style={{ position: "relative", width: "100%", maxWidth: "min(80vw, 80vh, 400px)" }}>
              <div className="snake-modal-border" />
              <DialogCard enter="spinIn" style={{ borderRadius: 4, position: "relative" }}>
              <span style={{ ...TYPE.body, fontFamily: "inherit" }}>Game over</span>
              <span style={{ ...TYPE.displayBold, fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }}>{score}</span>
              {highScore > 0 && (
                <span style={{ ...TYPE.body, fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }}>
                  Best {highScore}
                </span>
              )}
            </DialogCard>
            </div>
            <RoundButton variant="filled" onClick={handleRestart}>
              Play again
            </RoundButton>
          </Scrim>
        )}
      </div>

      {/* Below-board zone */}
      <div style={{ background: "#0F0F0F", flexShrink: 0, paddingTop: 64, paddingBottom: 16 }}>
      {/* Below-board panel */}
      <div style={{ marginLeft: "auto", marginRight: "auto", width: "calc(100% - 32px)", maxWidth: 358, background: "#0F0F0F", border: `1px solid ${COLOR.textPrimary}`, borderRadius: 8, height: 56, position: "relative", overflow: "visible" }}>
        <div style={{ display: "flex", alignItems: "center", height: "100%", padding: 8, gap: 8 }}>

          {/* Score circle */}
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid ${COLOR.textPrimary}`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {showTimer && (
              <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                <IntangibleTimer until={intangibleUntil} color={intangibleColor || COLOR.textPrimary} onExpire={() => setShowTimer(false)} size={40} />
              </div>
            )}
            <span style={{ position: "relative", zIndex: 1, fontWeight: WEIGHT.semibold, fontSize: score >= 1000 ? 10 : 13, color: COLOR.textPrimary, fontVariantNumeric: "tabular-nums", fontFamily: "inherit" }}>
              {score}
            </span>
          </div>

          {/* Die slots */}
          {Array.from({ length: 5 }, (_, i) => {
            const slot = handSlots[i];
            return (
              <div key={i} style={{ flex: 1, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {slot ? (
                  <SlotDie value={slot.value} color={slot.color} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 4, border: `1px solid ${COLOR.textPrimary}`, opacity: 0.3 }} />
                )}
              </div>
            );
          })}

          {/* Take hand button */}
          {(() => {
            const combo = getComboName(handSlots.map(s => s.value));
            return (
              <div style={{ flex: 1, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <button
                  onClick={handleTakeHand}
                  style={{ width: 40, height: 40, background: combo ? "#ffcc00" : "#000", border: `1px solid ${COLOR.textPrimary}`, borderRadius: 4, color: combo ? "#000" : COLOR.textPrimary, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: "inherit", lineHeight: 1, outline: "none", animation: combo ? "combo-bg-cycle 1.2s linear infinite" : undefined }}
                >
                  +
                </button>
              </div>
            );
          })()}
        </div>

        {/* Combo flash label */}
        {comboFlash && (
          <div style={{ position: "absolute", bottom: "calc(100% + 16px)", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 16, fontWeight: WEIGHT.semibold, color: COLOR.textPrimary, fontFamily: "inherit", letterSpacing: "0.06em", animation: "combo-flash 1500ms ease-in-out forwards" }}>
            {comboFlash}
          </div>
        )}

        {/* Score pop animation */}
        {popAnim && (
          <div style={{ position: "absolute", bottom: "calc(100% + 16px)", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 32, fontWeight: WEIGHT.semibold, color: popAnim.color, fontFamily: "inherit", animation: popAnim.phase === "rise" ? "bank-score-rise 260ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards" : popAnim.phase === "exit" ? "bank-score-exit 200ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards" : undefined }}>
            {popAnim.score}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
