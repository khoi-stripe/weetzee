"use client";

import { useEffect, useRef, useState } from "react";
import { Die } from "./Die";
import type { Die as DieType, Player } from "@/lib/types";
import type { ScoreCategory } from "@/lib/types";
import { getAvailableScores } from "@/lib/engine";
import { getBonusScore, getFullTotal, getUpperTotal, UPPER_BONUS_THRESHOLD } from "@/lib/rulesets/yahtzee";
import type { Ruleset } from "@/lib/types";

// ===== ScorecardView =====
// Scorecard table + mini dice strip at bottom.
// No longer includes its own PlayerBar — that's now shared in GameView.

export function ScorecardView({
  players,
  currentPlayerIndex,
  dice,
  ruleset,
  turn,
  rollsUsed,
  rollsPerTurn,
  playerColor,
  onScoreCategory,
  onRoll,
  onToggleHold,
  justScoredCategoryId,
  justScoredPlayerIndex,
}: {
  players: Player[];
  currentPlayerIndex: number;
  dice: DieType[];
  ruleset: Ruleset;
  turn: number;
  rollsUsed: number;
  rollsPerTurn: number;
  playerColor: string;
  onScoreCategory: (id: string) => void;
  onRoll: () => void;
  onToggleHold: (id: number) => void;
  justScoredCategoryId?: string | null;
  justScoredPlayerIndex?: number | null;
}) {
  const currentPlayer = players[currentPlayerIndex];
  const diceValues = dice.map((d) => d.value);

  const availableScores = getAvailableScores(
    diceValues,
    ruleset,
    currentPlayer.scores
  );

  const categories = ruleset.categories.filter((c) => c.id !== "bonus");

  const locked = justScoredCategoryId != null;

  return (
    <div className="flex flex-col w-full flex-1 min-h-0" style={{ padding: "0 16px 16px", gap: 16 }}>
      {/* Scrollable table */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded"
        style={{ border: "1px solid #ffffff" }}
      >
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "38%" }} />
            {players.map((p) => (
              <col key={p.id} style={{ width: `${62 / players.length}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <Th>Player</Th>
              {players.map((p) => (
                <Th key={p.id} style={{ color: p.color }}>
                  {p.name}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <ScoreRow
                key={cat.id}
                category={cat}
                players={players}
                currentPlayerIndex={currentPlayerIndex}
                availableScore={availableScores[cat.id]}
                onScore={() => { if (!locked) onScoreCategory(cat.id); }}
                justScored={cat.id === justScoredCategoryId}
                justScoredPlayerIndex={justScoredPlayerIndex ?? null}
              />
            ))}
            <BonusRow players={players} />
          </tbody>
        </table>
      </div>

      {/* Interactive mini dice strip + roll button */}
      <MiniDiceStrip
        dice={dice}
        rollsUsed={rollsUsed}
        rollsPerTurn={rollsPerTurn}
        playerColor={playerColor}
        onRoll={onRoll}
        onToggleHold={onToggleHold}
      />
    </div>
  );
}

// ===== Score Row =====

function ScoreRow({
  category,
  players,
  currentPlayerIndex,
  availableScore,
  onScore,
  justScored,
  justScoredPlayerIndex,
}: {
  category: ScoreCategory;
  players: Player[];
  currentPlayerIndex: number;
  availableScore: number | undefined;
  onScore: () => void;
  justScored: boolean;
  justScoredPlayerIndex: number | null;
}) {
  const currentPlayer = players[currentPlayerIndex];
  const alreadyScored = currentPlayer.scores[category.id] !== undefined;
  const isScoreable = !alreadyScored && availableScore !== undefined && !justScored;

  return (
    <tr
      className={isScoreable ? "pressable" : ""}
      onClick={isScoreable ? onScore : undefined}
      style={{ cursor: isScoreable ? "pointer" : "default" }}
    >
      <td
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #ffffff",
          borderRight: "1px solid #ffffff",
          background: "#000000",
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 14,
          color: "#ffffff",
          fontWeight: 400,
        }}
      >
        {category.name}
      </td>
      {players.map((player, i) => {
        const scored = player.scores[category.id];
        const isCurrent = i === currentPlayerIndex;
        const isJustScoredCell = justScored && i === justScoredPlayerIndex;
        const showPreview = isCurrent && !alreadyScored && availableScore !== undefined && !justScored;
        const bg = isJustScoredCell
          ? player.color
          : showPreview
            ? `${player.color}33`
            : "#000000";

        return (
          <td
            key={player.id}
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid #ffffff",
              borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              background: bg,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 14,
              fontWeight: isJustScoredCell ? 500 : 400,
              color: isJustScoredCell ? "#000000" : showPreview ? player.color : "#ffffff",
              transition: "background 150ms, color 150ms",
            }}
          >
            {scored !== undefined ? scored : (showPreview || isJustScoredCell) ? availableScore : ""}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Bonus Row =====

function BonusRow({ players }: { players: Player[] }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 16px",
          borderRight: "1px solid #ffffff",
          background: "#000000",
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 14,
          color: "#ffffff",
        }}
      >
        Bonus
      </td>
      {players.map((player, i) => {
        const upperTotal = getUpperTotal(player.scores);
        const bonus = getBonusScore(player.scores);
        const progress = Math.min(upperTotal, UPPER_BONUS_THRESHOLD);
        const label = bonus > 0 ? bonus : `${progress}/${UPPER_BONUS_THRESHOLD}`;
        return (
          <td
            key={player.id}
            style={{
              padding: "8px 16px",
              borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              background: "#000000",
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 14,
              color: bonus > 0 ? player.color : "#ffffff",
            }}
          >
            {label}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Mini Dice Strip =====

const MINI_CYCLE_INTERVAL = 50;
const MINI_CYCLE_DURATION = 350;

function randomValue(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function MiniDiceStrip({
  dice,
  rollsUsed,
  rollsPerTurn,
  playerColor,
  onRoll,
  onToggleHold,
}: {
  dice: DieType[];
  rollsUsed: number;
  rollsPerTurn: number;
  playerColor: string;
  onRoll: () => void;
  onToggleHold: (id: number) => void;
}) {
  const canRoll = rollsUsed < rollsPerTurn;
  const canHold = rollsUsed > 0;

  const rollLabel = rollsUsed === 0
    ? `${1}/${rollsPerTurn}`
    : `${Math.min(rollsUsed + 1, rollsPerTurn)}/${rollsPerTurn}`;

  // --- Mini rolling animation ---
  const [displayValues, setDisplayValues] = useState<number[]>(() => dice.map((d) => d.value));
  const [rollingDice, setRollingDice] = useState<Set<number>>(new Set());
  const [flashDice, setFlashDice] = useState<Set<number>>(new Set());
  const prevRollsUsed = useRef(rollsUsed);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const justRolled = rollsUsed > prevRollsUsed.current && rollsUsed > 0;
    prevRollsUsed.current = rollsUsed;

    if (!justRolled) {
      setDisplayValues(dice.map((d) => d.value));
      return;
    }

    const unheldIndices = dice.map((d, i) => (!d.held ? i : -1)).filter((i) => i !== -1);
    if (unheldIndices.length === 0) {
      setDisplayValues(dice.map((d) => d.value));
      return;
    }

    setRollingDice(new Set(unheldIndices));

    if (cycleRef.current) clearInterval(cycleRef.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);

    cycleRef.current = setInterval(() => {
      setDisplayValues((prev) => {
        const next = [...prev];
        for (const idx of unheldIndices) next[idx] = randomValue();
        return next;
      });
      setFlashDice(() => {
        const flashing = new Set<number>();
        for (const idx of unheldIndices) {
          if (Math.random() < 0.2) flashing.add(idx);
        }
        return flashing;
      });
    }, MINI_CYCLE_INTERVAL);

    settleTimer.current = setTimeout(() => {
      if (cycleRef.current) clearInterval(cycleRef.current);
      cycleRef.current = null;
      setDisplayValues(dice.map((d) => d.value));
      setRollingDice(new Set());
      setFlashDice(new Set());
    }, MINI_CYCLE_DURATION);

    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollsUsed, dice]);

  return (
    <div className="flex gap-3 w-full shrink-0">
      {dice.map((die, i) => (
        <div key={die.id} className="flex-1 min-w-0">
          <Die
            value={displayValues[i] ?? die.value}
            size="sm"
            held={die.held}
            heldColor={playerColor}
            onClick={canHold ? () => onToggleHold(die.id) : undefined}
            disabled={!canHold}
            rolling={rollingDice.has(i)}
            flash={flashDice.has(i)}
          />
        </div>
      ))}
      <button
        onClick={canRoll ? onRoll : undefined}
        disabled={!canRoll}
        className="flex-1 min-w-0 flex items-center justify-center rounded-full aspect-square pressable"
        style={{
          border: "1px solid #ffffff",
          background: "transparent",
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10,
          fontWeight: 500,
          color: "#ffffff",
          opacity: canRoll ? 1 : 0.35,
          cursor: canRoll ? "pointer" : "default",
          transition: "opacity 200ms",
          padding: 0,
        }}
      >
        {rollLabel}
      </button>
    </div>
  );
}

// ===== Table Header Cell =====

function Th({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        padding: "8px 16px",
        borderBottom: "1px solid #ffffff",
        borderRight: "1px solid #ffffff",
        background: "#000000",
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 14,
        fontWeight: 400,
        color: "#ffffff",
        textAlign: "left",
        ...style,
      }}
    >
      {children}
    </th>
  );
}
