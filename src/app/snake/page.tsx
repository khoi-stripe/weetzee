"use client";

import React, { useEffect, useRef, useCallback, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PLAYER_COLORS } from "@/lib/types";
import { COLOR } from "@/lib/color";
import { TYPE, WEIGHT } from "@/lib/type";
import { EASE, DURATION } from "@/lib/motion";
import { Z } from "@/lib/tokens";
import { hasNOfAKind, isSmallStraight, isLargeStraight, isFullHouse, sum } from "@/lib/rulesets/classic";
import { Scrim } from "@/components/ui/Scrim";
import { DialogCard } from "@/components/ui/DialogCard";
import { RoundButton } from "@/components/ui/RoundButton";
import { PlayerChipStrip } from "@/components/ui/PlayerChipStrip";
import { playSnakeEat, playSelect, playTap, playTurnChange, playCountdownTick, playSnakePowerUp, playSnakeDeath, playToggle } from "@/lib/sounds";
import { hapticLight } from "@/lib/haptics";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = PLAYER_COLORS;
const SPIN_MS = 10000;
const TICK_MS = 150;
const MOBILE_FOOD_COUNT = 5;
const MOBILE_AREA = 432; // ~16×27 cells on a phone
function computeFoodCount(cols: number, rows: number) {
  return Math.max(MOBILE_FOOD_COUNT, Math.round(MOBILE_FOOD_COUNT * Math.sqrt((cols * rows) / MOBILE_AREA)));
}
const FOOD_LIFETIME = 10000;
const RADIUS_RATIO = 0.25; // segment corner radius as fraction of cell size
const HOLE_DURATION = 10000;
const HOLE_INTERVAL_MIN = 10000;
const HOLE_INTERVAL_MAX = 20000;
const HOLE_OPEN_ANIM = 400;
const HOLE_CLOSE_ANIM = 400;
function randomHoleInterval() { return HOLE_INTERVAL_MIN + Math.random() * (HOLE_INTERVAL_MAX - HOLE_INTERVAL_MIN); }

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
type HolePair = { a: Point; b: Point; openTime: number; closeTime: number };

type GameState = {
  snake: Point[];
  dir: Dir;
  nextDir: Dir;
  foods: Food[];
  foodCount: number;
  score: number;
  over: boolean;
  walls: Wall[];
  wallTick: number;
  powerUp: (Point & { value: number; color: string; type: "ghost" | "diet" }) | null;
  powerUpExpiry: number;
  intangibleUntil: number;
  intangibleColor: string;
  holes: HolePair | null;
  nextHoleTime: number;
  holeCooldown: number;
  pendingTeleport: Point | null;
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
  const foodCount = computeFoodCount(cols, rows);
  const foods: Food[] = [];
  for (let i = 0; i < foodCount; i++) {
    foods.push(randomFood([...snake, ...foods], cols, rows, now));
  }
  const walls: Wall[] = [
    { side: "top",    offset: 0,                         dir: 1 },
    { side: "bottom", offset: Math.floor(cols / 2),      dir: -1 },
    { side: "left",   offset: 0,                         dir: 1 },
    { side: "right",  offset: Math.floor(rows / 2),      dir: -1 },
  ];
  return { snake, dir: "right", nextDir: "right", foods, foodCount, score: 0, over: false, walls, wallTick: 0, powerUp: null, powerUpExpiry: 0, intangibleUntil: 0, intangibleColor: "", holes: null, nextHoleTime: now + randomHoleInterval(), holeCooldown: 0, pendingTeleport: null };
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

function holeScale(hole: HolePair, now: number): number {
  const age = now - hole.openTime;
  const remaining = hole.closeTime - now;
  if (age < HOLE_OPEN_ANIM) return age / HOLE_OPEN_ANIM;
  if (remaining < HOLE_CLOSE_ANIM) return Math.max(0, remaining / HOLE_CLOSE_ANIM);
  return 1;
}

function drawHole(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, scale: number) {
  if (scale <= 0) return;
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;
  const r = cell * 0.4;
  const innerR = r * 0.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  ctx.strokeStyle = COLOR.textPrimary;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.surfaceBg;
  ctx.fill();
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
    if (!prev) return curr.x * cell + cell / 2;
    const dx = curr.x - prev.x, dy = curr.y - prev.y;
    if (dx * dx + dy * dy > 1) return curr.x * cell + cell / 2;
    return lerp(prev.x, curr.x) * cell + cell / 2;
  };
  const ly = (i: number) => {
    const prev = prevSnake[i];
    const curr = state.snake[i];
    if (!prev) return curr.y * cell + cell / 2;
    const dx = curr.x - prev.x, dy = curr.y - prev.y;
    if (dx * dx + dy * dy > 1) return curr.y * cell + cell / 2;
    return lerp(prev.y, curr.y) * cell + cell / 2;
  };
  const outerW = cell * 0.78;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = outerW;
  for (let i = len - 1; i >= 1; i--) {
    const x1 = lx(i), y1 = ly(i), x2 = lx(i - 1), y2 = ly(i - 1);
    if (Math.abs(x2 - x1) > cell || Math.abs(y2 - y1) > cell) continue;
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
type PoppedSegment = { x: number; y: number; startTime: number };
const POP_DURATION = 125;
const SEG_POP_DURATION = 200;

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
  poppedSegments: PoppedSegment[],
  dpr: number,
  wallsEnabled: boolean,
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
  if (wallsEnabled) drawWalls(ctx, state.walls, state.snake.length, cols, rows, cell);

  // Food — colored to match slot color when eaten
  for (const food of state.foods) {
    const c = VALUE_COLORS[food.value] ?? COLOR.textPrimary;
    drawDie(ctx, food.x * cell, food.y * cell, cell, food.value, c, "#000000", c);
  }

  // Holes — paired portals that scale in/out
  if (state.holes) {
    const sc = holeScale(state.holes, now);
    drawHole(ctx, state.holes.a.x, state.holes.a.y, cell, sc);
    drawHole(ctx, state.holes.b.x, state.holes.b.y, cell, sc);
  }

  // Power-up dice — ghost: hollow static; diet: hollow 1, spinning
  if (state.powerUp) {
    const pu = state.powerUp;
    if (pu.type === "diet") {
      const angle = (now % 2000) / 2000 * Math.PI * 2;
      const cx = pu.x * cell + cell / 2;
      const cy = pu.y * cell + cell / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.translate(-cell / 2, -cell / 2);
      drawDie(ctx, 0, 0, cell, 1);
      ctx.restore();
    } else {
      const pulse = 1.0 + 0.1 * Math.sin(now * Math.PI * 2 / 900);
      const cx = pu.x * cell + cell / 2;
      const cy = pu.y * cell + cell / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.translate(-cell / 2, -cell / 2);
      drawDie(ctx, 0, 0, cell, pu.value);
      ctx.restore();
    }
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

  // Pop animations for diet-removed snake segments
  for (const ps of poppedSegments) {
    const prog = (now - ps.startTime) / SEG_POP_DURATION;
    if (prog >= 1) continue;
    const eased = 1 - Math.pow(1 - prog, 2);
    const r = (cell * 0.35) * (1 - eased * 0.6);
    const cx = ps.x * cell + cell / 2;
    const cy = ps.y * cell + cell / 2;
    ctx.save();
    ctx.globalAlpha = 1 - prog;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.textPrimary;
    ctx.fill();
    ctx.restore();
  }

  // Snake — draw to offscreen canvas first, then composite at desired alpha
  const intangible = now < state.intangibleUntil;
  const flashAlpha = (() => {
    if (!intangible) return 1;
    const remaining = state.intangibleUntil - now;
    const interval = remaining < 1500 ? 75 : remaining < 3000 ? 130 : 220;
    return Math.floor(now / interval) % 2 === 0 ? 1 : 0.3;
  })();
  const needsResize = snakeCanvas.width !== w * dpr || snakeCanvas.height !== h * dpr;
  if (needsResize) {
    snakeCanvas.width = w * dpr;
    snakeCanvas.height = h * dpr;
  }
  const snakeCtx = snakeCanvas.getContext("2d")!;
  if (needsResize) snakeCtx.scale(dpr, dpr);
  snakeCtx.clearRect(0, 0, w, h);
  drawSnake(snakeCtx, state, prevSnake, t, cell, now);
  ctx.globalAlpha = flashAlpha;
  ctx.drawImage(snakeCanvas, 0, 0, w, h);
  ctx.globalAlpha = 1;
}

// ─── Game loop hook ───────────────────────────────────────────────────────────

function useSnakeGame(cols: number, rows: number, active: boolean, wallsEnabled: boolean, holesEnabled: boolean, paused: boolean, onFoodEatenRef: React.MutableRefObject<(value: number) => void>, expiredFoodsRef: React.MutableRefObject<Array<{ x: number; y: number; value: number; color: string }>>, removedSegmentsRef: React.MutableRefObject<Array<{ x: number; y: number }>>) {
  const stateRef = useRef<GameState>(makeInitial(cols, rows));
  const prevSnakeRef = useRef<Point[]>(stateRef.current.snake);
  const lastTickRef = useRef(Date.now());
  const tickDurRef = useRef(TICK_MS);
  const wallsEnabledRef = useRef(false);
  const holesEnabledRef = useRef(false);
  const pausedRef = useRef(false);
  useEffect(() => { wallsEnabledRef.current = wallsEnabled; }, [wallsEnabled]);
  useEffect(() => { holesEnabledRef.current = holesEnabled; }, [holesEnabled]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

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
    stateRef.current = { ...stateRef.current, intangibleUntil: Date.now() + 5000, intangibleColor: "" };
    let cancelled = false;
    let pendingId: ReturnType<typeof setTimeout> | null = null;

    function tick() {
      if (cancelled) return;
      pendingId = null;
      lastTickRef.current = Date.now();
      if (pausedRef.current) {
        pendingId = setTimeout(tick, 100);
        return;
      }
      const s = stateRef.current;
      prevSnakeRef.current = s.snake;
      if (!s.over) {
        const now = Date.now();
        const dir = s.nextDir;
        // If a teleport was queued last tick (head was at entrance), step from exit now
        let teleporting = false;
        let head: Point;
        if (s.pendingTeleport) {
          const raw = step(s.pendingTeleport, dir);
          head = { x: ((raw.x % cols) + cols) % cols, y: ((raw.y % rows) + rows) % rows };
          teleporting = true;
        } else {
          const raw = step(s.snake[0], dir);
          head = { x: ((raw.x % cols) + cols) % cols, y: ((raw.y % rows) + rows) % rows };
        }
        // Hole teleport — queue for next tick so head visually enters the entrance cell
        let newPendingTeleport: Point | null = null;
        if (!teleporting && s.holes && now > s.holeCooldown) {
          if (head.x === s.holes.a.x && head.y === s.holes.a.y) {
            newPendingTeleport = { x: s.holes.b.x, y: s.holes.b.y };
          } else if (head.x === s.holes.b.x && head.y === s.holes.b.y) {
            newPendingTeleport = { x: s.holes.a.x, y: s.holes.a.y };
          }
        }
        const newWallTick = s.wallTick + 1;
        const snakeLen = s.snake.length;
        const newWalls = newWallTick % 2 === 0
          ? s.walls.map(w => advanceWall(w, wallLength(snakeLen, w.side === "top" || w.side === "bottom" ? cols : rows), cols, rows))
          : s.walls;
        const intangible = now < s.intangibleUntil;
        const hitWall = wallsEnabledRef.current && !intangible && newWalls.some(w =>
          wallCells(w, wallLength(snakeLen, w.side === "top" || w.side === "bottom" ? cols : rows), cols, rows)
            .some(c => c.x === head.x && c.y === head.y)
        );
        const hitSelf = !intangible && s.snake.slice(0, -1).some((p) => p.x === head.x && p.y === head.y);
        if (hitSelf || hitWall) {
          playSnakeDeath();
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
          const newFoods = afterEat.map((f, i) => {
            if (now >= f.expiry) {
              expiredFoodsRef.current.push({ x: f.x, y: f.y, value: f.value, color: VALUE_COLORS[f.value] ?? COLOR.textPrimary });
              return randomFood([...newSnake, ...afterEat.filter((_, j) => j !== i)], cols, rows, now);
            }
            return f;
          });
          if (ate) { onFoodEatenRef.current(s.foods[eatenIdx].value); }
          if (atePowerUp) { playSnakePowerUp(); } else if (ate) { hapticLight(); playSnakeEat(); }
          // Expire power-up after 10 seconds
          const powerUpExpired = s.powerUp !== null && now >= s.powerUpExpiry;
          // Spawn a power-up with ~20% chance when food is eaten and none exists
          const spawnPowerUp = ate && s.powerUp === null && Math.random() < 0.20;
          const allOccupied = [...newSnake, ...newFoods];
          const newPowerUpExpiry = spawnPowerUp ? now + INTANGIBLE_DURATION : atePowerUp || powerUpExpired ? 0 : s.powerUpExpiry;
          const newPowerUp = atePowerUp || powerUpExpired
            ? null
            : spawnPowerUp
              ? (() => {
                  const p = randomFood(allOccupied, cols, rows, now);
                  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                  const type: "ghost" | "diet" = Math.random() < 0.6 ? "ghost" : "diet";
                  return { ...p, color, type, value: type === "diet" ? 1 : p.value };
                })()
              : s.powerUp;
          const ateGhost = atePowerUp && s.powerUp?.type === "ghost";
          const ateDiet  = atePowerUp && s.powerUp?.type === "diet";
          const snakeAfterDiet = ateDiet
            ? (() => {
                const kept = Math.max(3, Math.floor(newSnake.length * 0.8));
                const removed = newSnake.slice(kept);
                removed.forEach(seg => removedSegmentsRef.current.push({ x: seg.x, y: seg.y }));
                return newSnake.slice(0, kept);
              })()
            : newSnake;
          // Holes: expire old pair, spawn new pair
          const holesExpired = s.holes !== null && now >= s.holes.closeTime;
          const allOccupiedForHoles = [...snakeAfterDiet, ...newFoods, ...(newPowerUp ? [newPowerUp] : [])];
          const shouldSpawnHoles = holesEnabledRef.current && (s.holes === null || holesExpired) && now >= s.nextHoleTime;
          const newHoles: HolePair | null = shouldSpawnHoles
            ? (() => {
                const pa = randomFood(allOccupiedForHoles, cols, rows, now);
                const pb = randomFood([...allOccupiedForHoles, pa], cols, rows, now);
                return { a: { x: pa.x, y: pa.y }, b: { x: pb.x, y: pb.y }, openTime: now, closeTime: now + HOLE_DURATION };
              })()
            : holesExpired ? null : s.holes;
          const nextHoleTime = (holesExpired || shouldSpawnHoles) ? now + randomHoleInterval() : s.nextHoleTime;
          if (teleporting) {
            // Snap entire prevSnake to new state so no segment lerps across the teleport gap
            prevSnakeRef.current = [...snakeAfterDiet];
          }
          stateRef.current = {
            snake: snakeAfterDiet,
            dir,
            nextDir: dir,
            foods: newFoods,
            foodCount: s.foodCount,
            score: s.score,
            over: false,
            walls: newWalls,
            wallTick: newWallTick,
            powerUp: newPowerUp,
            powerUpExpiry: newPowerUpExpiry,
            intangibleUntil: ateGhost ? now + INTANGIBLE_DURATION : s.intangibleUntil,
            intangibleColor: ateGhost ? (s.powerUp?.color ?? s.intangibleColor) : s.intangibleColor,
            holes: newHoles,
            nextHoleTime,
            holeCooldown: (teleporting || newPendingTeleport) ? now + TICK_MS * 4 : s.holeCooldown,
            pendingTeleport: newPendingTeleport,
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

function LegendDie({ value, spin = false, pulse = false }: { value: number; spin?: boolean; pulse?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Canvas is large enough that a rotating die never clips its corners.
  // A die of DIE_SIZE has diagonal DIE_SIZE*√2 ≈ 42px; CANVAS_SIZE=48 gives ~3px clearance.
  const CANVAS_SIZE = 48;
  const DIE_SIZE = 30;
  const DIE_OFFSET = (CANVAS_SIZE - DIE_SIZE) / 2;
  const animRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.scale(dpr, dpr);
    if (spin) {
      let running = true;
      function frame() {
        if (!running) return;
        const angle = (Date.now() % 2000) / 2000 * Math.PI * 2;
        ctx!.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx!.save();
        ctx!.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        ctx!.rotate(angle);
        ctx!.translate(-DIE_SIZE / 2, -DIE_SIZE / 2);
        drawDie(ctx!, 0, 0, DIE_SIZE, value);
        ctx!.restore();
        animRef.current = requestAnimationFrame(frame);
      }
      frame();
      return () => { running = false; cancelAnimationFrame(animRef.current); };
    } else if (pulse) {
      let running = true;
      function frame() {
        if (!running) return;
        const scale = 1.0 + 0.1 * Math.sin(Date.now() * Math.PI * 2 / 900);
        ctx!.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx!.save();
        ctx!.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        ctx!.scale(scale, scale);
        ctx!.translate(-DIE_SIZE / 2, -DIE_SIZE / 2);
        drawDie(ctx!, 0, 0, DIE_SIZE, value);
        ctx!.restore();
        animRef.current = requestAnimationFrame(frame);
      }
      frame();
      return () => { running = false; cancelAnimationFrame(animRef.current); };
    } else {
      drawDie(ctx, DIE_OFFSET, DIE_OFFSET, DIE_SIZE, value);
    }
  }, [value, spin, pulse]);
  return <canvas ref={canvasRef} style={{ display: "block", width: CANVAS_SIZE, height: CANVAS_SIZE, flexShrink: 0 }} />;
}

function SnakeRulesSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ ...TYPE.sectionHeading, color: COLOR.textPrimary, marginBottom: 8 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SnakeRules({ isDesktop = false }: { isDesktop?: boolean }) {
  return (
    <>
      <SnakeRulesSection title="How to play">
        <p>{isDesktop ? "Use arrow keys or WASD to steer the snake." : "Swipe to steer the snake around the board."} Eat the colored dice to collect them into your hand. Once you have a scoring combo, {isDesktop ? "press Space" : "tap the score panel"} to bank your points.</p>
      </SnakeRulesSection>

      <SnakeRulesSection title="Scoring">
        <p>Your hand holds up to 5 dice. When they form a recognized combo, the score panel starts flashing — {isDesktop ? "press Space" : "tap it"} to take the points and clear your hand.</p>
        <div style={{ marginTop: 10 }}>
          <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>3 of a kind</span>
          <span style={{ color: "rgba(255,255,255,0.5)" }}> — sum of all dice</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>4 of a kind</span>
          <span style={{ color: "rgba(255,255,255,0.5)" }}> — sum of all dice</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>Small straight</span>
          <span style={{ color: "rgba(255,255,255,0.5)" }}> — any 4 in a row — 30 pts</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>Full house</span>
          <span style={{ color: "rgba(255,255,255,0.5)" }}> — 3 + 2 of a kind — 25 pts</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>Large straight</span>
          <span style={{ color: "rgba(255,255,255,0.5)" }}> — 1–2–3–4–5 or 2–3–4–5–6 — 40 pts</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>WEETZEE</span>
          <span style={{ color: "rgba(255,255,255,0.5)" }}> — 5 of a kind — 50 pts</span>
        </div>
      </SnakeRulesSection>

      <SnakeRulesSection title="Hazards">
        <p>The snake dies if it hits itself or a moving wall segment. Walls grow longer as the snake gets bigger, so the board gets tighter over time.</p>
      </SnakeRulesSection>

      <SnakeRulesSection title="Holes">
        <p>When enabled, pairs of portals periodically open on the board. Entering one teleports the snake to the other. Holes scale open and closed — you can only pass through when they're fully open.</p>
      </SnakeRulesSection>

      <SnakeRulesSection title="Power-ups">
        <p>Occasionally a hollow die appears on the board. Eat it for an effect. Two types can spawn:</p>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <LegendDie value={4} pulse />
            <div>
              <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>Ghost</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}> — pass through walls and your own tail for 10 seconds.</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <LegendDie value={1} spin />
            <div>
              <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>Diet</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}> — shrinks the snake by 10%. Spins to stand out. Slightly rarer than Ghost.</span>
            </div>
          </div>
        </div>
      </SnakeRulesSection>
    </>
  );
}

type SnakePlayer = { id: number; name: string; color: string };

const EXIT_BTN_STYLE: React.CSSProperties = { position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: 16, background: "none", border: "none", color: COLOR.textPrimary, fontSize: 15, fontFamily: "inherit", cursor: "pointer", padding: 0 };

function PlayerScoreScreen({ player, score, nextPlayer, onContinue, onExit, exiting }: {
  player: SnakePlayer;
  score: number;
  nextPlayer: SnakePlayer;
  onContinue: () => void;
  onExit: () => void;
  exiting: boolean;
}) {
  return (
    <Scrim
      exiting={exiting}
      position="fixed"
      zIndex={Z.interstitial}
      enterDuration={DURATION.modal}
      exitDuration={DURATION.slow}
    >
      <button onClick={onExit} style={EXIT_BTN_STYLE}>Exit</button>
      <div
        className="flex flex-col items-center justify-center"
        style={{
          width: "100%",
          maxWidth: "min(80vw, 80vh, 400px)",
          aspectRatio: "1 / 1",
          borderRadius: 8,
          background: player.color,
          color: COLOR.surfaceBg,
          animation: exiting
            ? `scale-out ${DURATION.slow}ms ${EASE.spring} forwards`
            : `spin-in ${DURATION.expressive}ms ${EASE.standard} 150ms both`,
          gap: 4,
        }}
      >
        <span style={{ ...TYPE.body, fontFamily: "inherit", color: COLOR.surfaceBg }}>{player.name}</span>
        <span style={{ ...TYPE.displayBold, fontFamily: "inherit", fontVariantNumeric: "tabular-nums", color: COLOR.surfaceBg }}>{score}</span>
      </div>
      <button
        onClick={onContinue}
        style={{ background: "none", border: `1px solid ${COLOR.textPrimary}`, color: COLOR.textPrimary, fontFamily: "inherit", fontSize: 15, cursor: "pointer", padding: "10px 24px", borderRadius: 9999, marginTop: 24 }}
      >
        Pass to {nextPlayer.name}
      </button>
    </Scrim>
  );
}

function PlayerInterstitial({ player, exiting }: { player: SnakePlayer; exiting: boolean }) {
  return (
    <Scrim
      exiting={exiting}
      position="absolute"
      zIndex={Z.interstitial}
      enterDuration={DURATION.modal}
      exitDuration={DURATION.slow}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          ...TYPE.headline,
          width: "50vmin",
          height: "50vmin",
          background: player.color,
          color: COLOR.surfaceBg,
          animation: exiting
            ? `scale-out ${DURATION.slow}ms ${EASE.spring} forwards`
            : `spin-in ${DURATION.expressive}ms ${EASE.standard} 150ms both`,
        }}
      >
        {player.name}
      </div>
    </Scrim>
  );
}

const INTANGIBLE_DURATION = 10000;


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
const WALLS_KEY = "weetzee-snake-walls";
const HOLES_KEY = "weetzee-snake-holes";

function SnakePageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const playerCount = Math.min(Math.max(parseInt(params.get("players") ?? "1", 10), 1), 6);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(0);
  const [cols, setCols] = useState(0);
  const [rows, setRows] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [handSlots, setHandSlots] = useState<Array<{ value: number; color: string }>>([]);
  const [popAnim, setPopAnim] = useState<{ score: number; phase: "rise" | "hold" | "exit"; color: string } | null>(null);
  const rafRef = useRef<number>(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const startedRef = useRef(started);
  useEffect(() => { startedRef.current = started; }, [started]);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    setIsDesktop(!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);
  const handleTakeHandRef = useRef<() => void>(() => {});
  const currentPlayerIdxRef = useRef(0);
  const wallsEnabledRenderRef = useRef(false);
  const pausedRenderRef = useRef(false);
  const snakeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const poppedDiceRef = useRef<PoppedDie[]>([]);
  const poppedSegmentsRef = useRef<PoppedSegment[]>([]);
  const prevPowerUpRef = useRef<GameState["powerUp"]>(null);
  const popTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [comboFlash, setComboFlash] = useState<string | null>(null);
  const comboFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiredFoodsRef = useRef<Array<{ x: number; y: number; value: number; color: string }>>([]);
  const removedSegmentsRef = useRef<Array<{ x: number; y: number }>>([]);
  const onFoodEatenRef = useRef<(value: number) => void>(() => {});
  onFoodEatenRef.current = (value: number) => {
    const color = VALUE_COLORS[value] ?? COLOR.textPrimary;
    const next = [{ value, color }, ...handSlots].slice(0, 5);
    const prevValues = handSlots.map(s => s.value);
    const prevCombo = getComboName(prevValues);
    const nextCombo = getComboName([value, ...prevValues].slice(0, 5));
    if (nextCombo && nextCombo !== prevCombo) {
      hapticLight();
      playSelect();
      setComboFlash(nextCombo);
      if (comboFlashTimerRef.current) clearTimeout(comboFlashTimerRef.current);
      comboFlashTimerRef.current = setTimeout(() => setComboFlash(null), 1500);
    }
    setHandSlots(next);
  };

  const [wallsEnabled, setWallsEnabled] = useState(false);
  const [holesEnabled, setHolesEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => { wallsEnabledRenderRef.current = wallsEnabled; }, [wallsEnabled]);
  useEffect(() => { pausedRenderRef.current = paused; }, [paused]);
  useEffect(() => {
    const stored = parseInt(localStorage.getItem(HS_KEY) ?? "0", 10);
    if (!isNaN(stored)) setHighScore(stored);
    const walls = localStorage.getItem(WALLS_KEY);
    if (walls !== null) setWallsEnabled(walls !== "0");
    const holes = localStorage.getItem(HOLES_KEY);
    if (holes !== null) setHolesEnabled(holes !== "0");
  }, []);

  // Countdown before game starts
  useEffect(() => {
    if (countdown === null) return;
    playCountdownTick(countdown);
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

  const { stateRef, prevSnakeRef, lastTickRef, tickDurRef, steer, reset } = useSnakeGame(cols, rows, started && !over, wallsEnabled, holesEnabled, paused, onFoodEatenRef, expiredFoodsRef, removedSegmentsRef);

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
      const t = (s.over || pausedRenderRef.current) ? 1 : Math.min(1, (now - lastTickRef.current) / tickDurRef.current);
      // Detect power-up expiry (disappeared without being eaten by snake head)
      const prev = prevPowerUpRef.current;
      if (prev !== null && s.powerUp === null) {
        const headAtPU = s.snake[0].x === prev.x && s.snake[0].y === prev.y;
        if (!headAtPU) {
          poppedDiceRef.current.push({ x: prev.x, y: prev.y, value: prev.value, color: prev.color, startTime: now });
        }
      }
      prevPowerUpRef.current = s.powerUp;
      // Drain expired food dice into pop animation queue
      const expiredFoods = expiredFoodsRef.current.splice(0);
      expiredFoods.forEach(f => poppedDiceRef.current.push({ ...f, startTime: now }));
      poppedDiceRef.current = poppedDiceRef.current.filter(p => now - p.startTime < POP_DURATION);
      // Drain diet-removed segments into segment pop queue
      const removedSegs = removedSegmentsRef.current.splice(0);
      removedSegs.forEach(seg => poppedSegmentsRef.current.push({ ...seg, startTime: now }));
      poppedSegmentsRef.current = poppedSegmentsRef.current.filter(p => now - p.startTime < SEG_POP_DURATION);
      if (!startedRef.current) {
        ctx!.fillStyle = COLOR.surfaceBg;
        ctx!.fillRect(0, 0, cols * cell, rows * cell);
      } else {
        drawFrame(ctx!, s, prevSnakeRef.current, t, cols, rows, cell, now, snakeCanvas, poppedDiceRef.current, poppedSegmentsRef.current, dpr, wallsEnabledRenderRef.current);
      }
      setScore(s.score);
      if (s.over && !over) {
        setOver(true);
        const finalScore = s.score;
        setHighScore((prev) => {
          const next = Math.max(prev, finalScore);
          localStorage.setItem(HS_KEY, String(next));
          return next;
        });
        if (playerCount > 1) {
          setPlayerScores(prev => {
            const next = [...prev];
            next[currentPlayerIdxRef.current] = finalScore;
            return next;
          });
          const isLast = currentPlayerIdxRef.current === playerCount - 1;
          setTimeout(() => {
            if (!isLast) resetGameState("pause");
            setMpPhase(isLast ? "done" : "score");
          }, 800);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [cell, cols, rows, over]);

  // Keyboard
  useEffect(() => {
    const MAP: Record<string, Dir> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
    };
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") { e.preventDefault(); handleTakeHandRef.current(); return; }
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

  // Multiplayer state
  const players = useMemo<SnakePlayer[]>(
    () => Array.from({ length: playerCount }, (_, i) => ({ id: i, name: `P${i + 1}`, color: PLAYER_COLORS[i] })),
    [playerCount]
  );
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  useEffect(() => { currentPlayerIdxRef.current = currentPlayerIdx; }, [currentPlayerIdx]);
  const [playerScores, setPlayerScores] = useState<number[]>(() => new Array(playerCount).fill(-1));
  const [mpPhase, setMpPhase] = useState<"playing" | "score" | "between" | "done">("playing");
  const [interstitialExiting, setInterstitialExiting] = useState(false);
  const [scoreScreenExiting, setScoreScreenExiting] = useState(false);

  handleTakeHandRef.current = handleTakeHand;
  function handleTakeHand() {
    if (handSlots.length === 0) return;
    const handScore = scoreSnakeHand(handSlots.map(s => s.value));
    stateRef.current = { ...stateRef.current, score: stateRef.current.score + handScore };
    setHandSlots([]);
    popTimersRef.current.forEach(clearTimeout);
    setPopAnim({ score: handScore, phase: "rise", color: COLOR.textPrimary });
    popTimersRef.current = [
      setTimeout(() => setPopAnim(p => p ? { ...p, phase: "hold" } : null), 260),
      setTimeout(() => setPopAnim(p => p ? { ...p, phase: "exit" } : null), 1260),
      setTimeout(() => setPopAnim(null), 1460),
    ];
  }

  function resetGameState(mode: boolean | "pause" = false) {
    setPaused(false);
    reset();
    setOver(false);
    setScore(0);
    setHandSlots([]);
    setPopAnim(null);
    setComboFlash(null);
    popTimersRef.current.forEach(clearTimeout);
    if (comboFlashTimerRef.current) clearTimeout(comboFlashTimerRef.current);
    poppedDiceRef.current = [];
    poppedSegmentsRef.current = [];
    prevPowerUpRef.current = null;
    if (mode === true) {
      setStarted(false);
      setCountdown(3);
    } else if (mode === "pause") {
      setStarted(false);
      setCountdown(null);
    } else {
      setStarted(true);
    }
  }

  function handleRestart() {
    if (playerCount > 1) {
      setCurrentPlayerIdx(0);
      setPlayerScores(new Array(playerCount).fill(-1));
      setMpPhase("playing");
      setInterstitialExiting(false);
      setScoreScreenExiting(false);
    }
    resetGameState(true);
  }

  function handleExitToStart() {
    router.push(`/ruleset?players=${playerCount}`);
  }

  function handlePassToNext() {
    playTap();
    setScoreScreenExiting(true);
    setTimeout(() => {
      setScoreScreenExiting(false);
      setMpPhase("between");
    }, DURATION.slow);
  }

  function handleNextPlayer(nextIdx: number) {
    resetGameState(true);
    setCurrentPlayerIdx(nextIdx);
    setMpPhase("playing");
    setInterstitialExiting(false);
    setScoreScreenExiting(false);
    playTurnChange();
  }

  function handleFinalRestart() {
    setCurrentPlayerIdx(0);
    setPlayerScores(new Array(playerCount).fill(-1));
    setMpPhase("playing");
    setInterstitialExiting(false);
    setScoreScreenExiting(false);
    resetGameState(true);
  }

  // Auto-advance between players
  useEffect(() => {
    if (mpPhase !== "between") return;
    const nextIdx = currentPlayerIdx + 1;
    const exitTimer = setTimeout(() => setInterstitialExiting(true), 1600);
    const advanceTimer = setTimeout(() => handleNextPlayer(nextIdx), 2000);
    return () => { clearTimeout(exitTimer); clearTimeout(advanceTimer); };
  }, [mpPhase, currentPlayerIdx]);

  const currentCombo = getComboName(handSlots.map(s => s.value));
  const currentComboScore = currentCombo ? scoreSnakeHand(handSlots.map(s => s.value)) : null;
  const isEndState = (over && playerCount === 1) || mpPhase === "done" || mpPhase === "score";
  const [showInfo, setShowInfo] = useState(false);
  function openInfo() { if (started && !over) setPaused(true); setShowInfo(true); }
  function closeInfo() { setShowInfo(false); setPaused(false); }
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  return (
    <div
      style={{ height: "100%", background: COLOR.surfaceBg, display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      {/* Info modal */}
      {showInfo && (
        <div className="fixed inset-0 flex flex-col" style={{ zIndex: Z.modal, background: COLOR.surfaceBg, paddingTop: "env(safe-area-inset-top, 0px)", animation: "interstitial-in 200ms ease forwards" }}>
          <div className="relative shrink-0 w-full" style={{ height: 48 }}>
            <button onClick={() => { playTap(); closeInfo(); }} className="absolute flex items-center justify-center pressable" style={{ fontSize: 24, fontWeight: WEIGHT.regular, right: 4, top: 2, padding: "8px 12px", background: "none", border: "none", color: COLOR.textPrimary, lineHeight: 1 }} aria-label="Close">×</button>
          </div>
          <div className="flex-1 overflow-y-auto selectable" style={{ padding: "0 24px 48px", fontSize: 14, lineHeight: 1.6, color: COLOR.textReadable, maxWidth: 640, margin: "0 auto", width: "100%" }}>
            <div style={{ ...TYPE.headline, color: COLOR.textPrimary, paddingBottom: 16, borderBottom: `1px solid ${COLOR.borderSubtle}`, marginBottom: 0 }}>
              Playing Snake Eyes
            </div>
            <SnakeRules isDesktop={isDesktop} />
            <div style={{ marginTop: 32, borderTop: `1px solid ${COLOR.borderSubtle}`, paddingTop: 24 }}>
              <h3 style={{ ...TYPE.headline, color: COLOR.textPrimary, marginBottom: 12 }}>
                House rules
              </h3>
              {[
                { label: "Walls", desc: "Moving wall segments that grow as the snake gets longer.", value: wallsEnabled, toggle: () => { const next = !wallsEnabled; playToggle(next); setWallsEnabled(next); localStorage.setItem(WALLS_KEY, next ? "1" : "0"); } },
                { label: "Holes", desc: "Pairs of portals that open and close at random. Enter one to exit the other.", value: holesEnabled, toggle: () => { const next = !holesEnabled; playToggle(next); setHolesEnabled(next); localStorage.setItem(HOLES_KEY, next ? "1" : "0"); } },
              ].map(({ label, desc, value, toggle }) => (
                <div key={label} onClick={toggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", cursor: "pointer", borderTop: `1px solid ${COLOR.borderSubtle}` }}>
                  <div>
                    <div style={{ ...TYPE.body, color: COLOR.textPrimary }}>{label}</div>
                    <div style={{ ...TYPE.microRegular, color: COLOR.textMuted, marginTop: 2 }}>{desc}</div>
                  </div>
                  <div className="pressable" style={{ width: 40, height: 22, borderRadius: 11, background: value ? "#34c759" : COLOR.borderSubtle, position: "relative", transition: "background 200ms", flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 9, background: COLOR.textPrimary, position: "absolute", top: 2, left: value ? 20 : 2, transition: `left 200ms ${EASE.spring}` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exit confirmation */}
      {showExitConfirm && (
        <Scrim zIndex={Z.modal}>
          <DialogCard>
            <p style={{ ...TYPE.title }}>End this game?</p>
          </DialogCard>
          <div className="flex justify-center" style={{ gap: 16 }}>
            <RoundButton onClick={() => { playTap(); setShowExitConfirm(false); }}>Cancel</RoundButton>
            <RoundButton variant="filled" onClick={() => { playTap(); handleExitToStart(); }}>End game</RoundButton>
          </div>
        </Scrim>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
          <button
            onClick={() => { playTap(); if (started && !over) { setShowExitConfirm(true); } else { router.push(`/ruleset?players=${playerCount}`); } }}
            style={{ background: "none", border: "none", color: COLOR.textPrimary, fontSize: 15, fontFamily: "inherit", cursor: "pointer", padding: 0 }}
          >
            Exit
          </button>
        </div>
        <span style={{ fontFamily: "inherit", fontSize: 13, fontWeight: WEIGHT.semibold, color: COLOR.textPrimary, letterSpacing: "0.06em", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>
          {currentCombo ? `${currentCombo} · ${currentComboScore}pt` : ""}
        </span>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 20 }}>
          {started && !over && (
            <button
              onClick={() => { playTap(); setPaused(p => !p); }}
              style={{ background: "none", border: "none", color: COLOR.textPrimary, fontSize: 13, fontFamily: "inherit", cursor: "pointer", padding: 0, letterSpacing: "0.02em" }}
              aria-label={paused ? "Resume" : "Pause"}
            >
              {paused ? "▶" : "❙❙"}
            </button>
          )}
          <button
            onClick={() => { playTap(); openInfo(); }}
            style={{ background: "none", border: "none", color: COLOR.textPrimary, fontSize: 15, fontFamily: "inherit", cursor: "pointer", padding: 0 }}
            aria-label="Rules"
          >
            i
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", touchAction: "none" }}
      >
        {cell > 0 && (
          <canvas
            ref={canvasRef}
            style={{ display: "block", margin: "0 auto", position: "relative", zIndex: 0 }}
          />
        )}

        {/* Start prompt */}
        {!started && !over && countdown === null && mpPhase === "playing" && (
          <Scrim position="fixed" zIndex={Z.interstitial}>
            <button onClick={() => { playTap(); router.push(`/ruleset?players=${playerCount}`); }} style={EXIT_BTN_STYLE}>Exit</button>
            <button onClick={() => { playTap(); openInfo(); }} style={{ ...EXIT_BTN_STYLE, left: "auto", right: 16 }} aria-label="Rules">i</button>
            <div style={{ position: "relative", width: "100%", maxWidth: "min(80vw, 80vh, 400px)" }}>
              <div className="snake-modal-border" />
              <DialogCard enter="spinIn" style={{ borderRadius: 4, position: "relative" }}>
                <div style={{ ...TYPE.subDisplayBold, fontFamily: "inherit" }}>SNAKE EYES</div>
              </DialogCard>
            </div>
            <RoundButton variant="filled" onClick={() => setCountdown(3)}>
              Start
            </RoundButton>
          </Scrim>
        )}

        {/* Countdown overlay */}
        {countdown !== null && countdown > 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: Z.interstitial }}>
            <div key={countdown} style={{ width: 72, height: 72, borderRadius: "50%", background: "#000", border: `2px solid ${COLOR.textPrimary}`, display: "flex", alignItems: "center", justifyContent: "center", animation: "scale-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards", "--rotate": "360deg" } as React.CSSProperties}>
              <span style={{ fontFamily: "inherit", fontSize: 36, fontWeight: WEIGHT.semibold, color: COLOR.textPrimary, lineHeight: 1 }}>
                {countdown}
              </span>
            </div>
          </div>
        )}

        {/* Single-player game over */}
        {over && playerCount === 1 && (
          <Scrim zIndex={Z.interstitial}>
            <button onClick={() => { playTap(); router.push(`/ruleset?players=${playerCount}`); }} style={EXIT_BTN_STYLE}>Exit</button>
            <button onClick={() => { playTap(); openInfo(); }} style={{ ...EXIT_BTN_STYLE, left: "auto", right: 16 }} aria-label="Rules">i</button>
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
            <div style={{ display: "flex", gap: 16 }}>
              <RoundButton onClick={() => { playTap(); router.push(`/ruleset?players=${playerCount}`); }}>
                New game
              </RoundButton>
              <RoundButton variant="filled" onClick={handleRestart}>
                Play again
              </RoundButton>
            </div>
          </Scrim>
        )}

        {/* Multiplayer: score pause screen before next player */}
        {mpPhase === "score" && (
          <PlayerScoreScreen
            player={players[currentPlayerIdx]}
            score={playerScores[currentPlayerIdx]}
            nextPlayer={players[currentPlayerIdx + 1]}
            onContinue={handlePassToNext}
            onExit={() => { playTap(); router.push(`/ruleset?players=${playerCount}`); }}
            exiting={scoreScreenExiting}
          />
        )}

        {/* Multiplayer: between-player interstitial */}
        {mpPhase === "between" && (
          <PlayerInterstitial
            player={players[currentPlayerIdx + 1]}
            exiting={interstitialExiting}
          />
        )}

        {/* Multiplayer: final scoreboard */}
        {mpPhase === "done" && (() => {
          const ranked = [...playerScores]
            .map((s, i) => ({ score: s, player: players[i] }))
            .sort((a, b) => b.score - a.score);
          const winner = ranked[0];
          return (
            <Scrim zIndex={Z.interstitial}>
              <button onClick={() => { playTap(); router.push(`/ruleset?players=${playerCount}`); }} style={EXIT_BTN_STYLE}>Exit</button>
              <button onClick={() => { playTap(); openInfo(); }} style={{ ...EXIT_BTN_STYLE, left: "auto", right: 16 }} aria-label="Rules">i</button>
              <div style={{ position: "relative", width: "100%", maxWidth: "min(80vw, 80vh, 400px)" }}>
                <div className="snake-modal-border" />
                <DialogCard background={winner.player.color} enter="spinIn" style={{ borderRadius: 4, position: "relative" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ ...TYPE.headline, fontFamily: "inherit", textTransform: "uppercase", color: COLOR.inverse }}>{winner.player.name} wins!</span>
                    <span style={{ ...TYPE.displayBold, fontFamily: "inherit", fontVariantNumeric: "tabular-nums", color: COLOR.inverse }}>{winner.score}</span>
                    {highScore > 0 && (
                      <span style={{ ...TYPE.body, fontFamily: "inherit", fontVariantNumeric: "tabular-nums", color: COLOR.inverse }}>
                        Best {highScore}
                      </span>
                    )}
                  </div>
                  <div style={{ width: "100%", paddingTop: 8 }}>
                    <PlayerChipStrip
                      players={ranked.map(({ score: ps, player }) => ({ id: player.id, name: player.name, color: player.color, score: ps }))}
                      currentIndex={0}
                      variant="light"
                    />
                  </div>
                </DialogCard>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <RoundButton onClick={() => { playTap(); router.push(`/ruleset?players=${playerCount}`); }}>
                  New game
                </RoundButton>
                <RoundButton variant="filled" onClick={handleFinalRestart}>
                  Play again
                </RoundButton>
              </div>
            </Scrim>
          );
        })()}
      </div>

      {/* Below-board zone */}
      <div style={{ background: "#121212", flexShrink: 0, paddingTop: 64, paddingBottom: 16 }}>
      {/* Below-board panel */}
      <div
        onClick={over ? undefined : handleTakeHand}
        style={{ marginLeft: "auto", marginRight: "auto", width: "fit-content", background: "#000000", border: currentCombo ? "none" : `1px solid ${isEndState ? "#000000" : COLOR.textPrimary}`, borderRadius: 8, position: "relative", overflow: "visible", cursor: handSlots.length > 0 ? "pointer" : "default", animation: currentCombo ? "combo-bg-cycle 1.2s linear infinite" : undefined }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: 8, gap: 8 }}>

          {/* Score pill */}
          <div style={{ height: 40, minWidth: 40, paddingLeft: 10, paddingRight: 10, borderRadius: 9999, border: `1px solid ${isEndState ? "#000000" : COLOR.textPrimary}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontWeight: WEIGHT.semibold, fontSize: 13, color: COLOR.textPrimary, fontVariantNumeric: "tabular-nums", fontFamily: "inherit", letterSpacing: "0.05em" }}>
              {String(score).padStart(4, "0")}
            </span>
          </div>

          {/* Die slots */}
          {Array.from({ length: 5 }, (_, i) => {
            const slot = handSlots[i];
            return (
              <div key={i} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {slot ? (
                  <SlotDie value={slot.value} color={slot.color} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: "#121212" }} />
                )}
              </div>
            );
          })}

        </div>

        {/* Tap to take label */}
        {currentCombo && (
          <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 13, fontWeight: WEIGHT.regular, color: COLOR.textPrimary, fontFamily: "inherit", letterSpacing: "0.06em" }}>
            {isDesktop ? "Space to bank" : "Tap to bank"}
          </div>
        )}

        {/* Combo flash label */}
        {comboFlash && (
          <div style={{ position: "absolute", bottom: "calc(100% + 29px)", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 16, fontWeight: WEIGHT.semibold, color: COLOR.textPrimary, fontFamily: "inherit", letterSpacing: "0.06em", animation: "combo-flash 1500ms ease-in-out forwards" }}>
            {comboFlash}
          </div>
        )}

        {/* Score pop animation */}
        {popAnim && (
          <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 32, fontWeight: WEIGHT.semibold, color: popAnim.color, fontFamily: "inherit", animation: popAnim.phase === "rise" ? "bank-score-rise 260ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards" : popAnim.phase === "exit" ? "bank-score-exit 200ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards" : undefined }}>
            {popAnim.score}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default function SnakePage() {
  return (
    <Suspense>
      <SnakePageContent />
    </Suspense>
  );
}
