"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Die } from "./Die";
import type { Die as DieType, Player } from "@/lib/types";
import type { ScoreCategory } from "@/lib/types";
import { getAvailableScores, getMappedDiceSum } from "@/lib/engine";
import { getRulesetBonus, getRulesetTotal } from "@/lib/rulesets";
import { EXTRA_WEETZEE_VALUE } from "@/lib/rulesets/classic";
import { computeTargetPenalty } from "@/lib/rulesets/keep-your-head-down";
import { rollValue } from "@/lib/engine";
import { playSelect, playDeselect, playConfirm, playTap } from "@/lib/sounds";
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
  multipleWeetzeesEnabled,
  hideMiniDice = false,
  landscapeHeader = false,
  sequentialTargetsEnabled = false,
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
  multipleWeetzeesEnabled?: boolean;
  hideMiniDice?: boolean;
  landscapeHeader?: boolean;
  sequentialTargetsEnabled?: boolean;
}) {
  const currentPlayer = players[currentPlayerIndex];
  const diceValues = dice.map((d) => d.value);

  const isTargetMode = !!ruleset.targetAssignment;

  const allRollsUsed = rollsUsed >= rollsPerTurn;
  const canScore = isTargetMode
    ? rollsUsed > 0
    : ruleset.forcedRolls ? allRollsUsed : rollsUsed > 0;

  const categories = ruleset.categories.filter((c) => c.id !== "bonus");

  const rawScores = canScore
    ? getAvailableScores(diceValues, ruleset, currentPlayer.scores)
    : {};

  const selectableScores = (() => {
    if (isTargetMode) {
      if (!sequentialTargetsEnabled) return rawScores;
      const nextCat = categories.find((c) => currentPlayer.scores[c.id] === undefined && rawScores[c.id] !== undefined);
      if (!nextCat) return {};
      return { [nextCat.id]: rawScores[nextCat.id] };
    }
    if (!ruleset.highestScoreOnly || Object.keys(rawScores).length === 0) return rawScores;
    const maxScore = Math.max(...Object.values(rawScores));
    const filtered: Record<string, number> = {};
    for (const [id, score] of Object.entries(rawScores)) {
      if (score === maxScore || id === ruleset.alwaysAvailableId) filtered[id] = score;
    }
    return filtered;
  })();

  const bestCategoryId = isTargetMode
    ? (Object.keys(selectableScores).length > 0
        ? Object.entries(selectableScores).reduce((best, [id, score]) =>
            score < best[1] ? [id, score] : best
          )[0]
        : null)
    : (Object.keys(selectableScores).length > 0
        ? Object.entries(selectableScores).reduce((best, [id, score]) =>
            score > best[1] ? [id, score] : best
          )[0]
        : null);

  const locked = justScoredCategoryId != null;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [pendingTarget, setPendingTarget] = useState<{ catId: string; target: number; sum: number; penalty: number } | null>(null);

  useEffect(() => {
    setSelectedCategoryId(null);
    setPendingTarget(null);
  }, [turn, currentPlayerIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const th = el.querySelectorAll("thead th")[currentPlayerIndex + 1];
    if (!th) return;

    const containerRect = el.getBoundingClientRect();
    const thRect = th.getBoundingClientRect();
    const stickyColWidth = 141;
    const visibleLeft = containerRect.left + stickyColWidth;
    const visibleRight = containerRect.right;

    if (thRect.left < visibleLeft) {
      el.scrollTo({ left: el.scrollLeft + (thRect.left - visibleLeft), behavior: "smooth" });
    } else if (thRect.right > visibleRight) {
      el.scrollTo({ left: el.scrollLeft + (thRect.right - visibleRight), behavior: "smooth" });
    }
  }, [currentPlayerIndex]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef<{ top: number; left: number } | null>(null);
  const [showFade, setShowFade] = useState(false);
  const [scrolledX, setScrolledX] = useState(false);

  const checkFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 2;
    setShowFade(el.scrollHeight > el.clientHeight && !atBottom);
    setScrolledX(el.scrollLeft > 0);
  }, []);

  const scrollLock = useRef<{ axis: "x" | "y" | null; startX: number; startY: number; scrollX: number; scrollY: number }>({
    axis: null, startX: 0, startY: 0, scrollX: 0, scrollY: 0,
  });
  const LOCK_THRESHOLD = 4;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkFade();
    el.addEventListener("scroll", checkFade, { passive: true });
    const ro = new ResizeObserver(checkFade);
    ro.observe(el);

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      scrollLock.current = { axis: null, startX: t.clientX, startY: t.clientY, scrollX: el!.scrollLeft, scrollY: el!.scrollTop };
    }

    function onTouchMove(e: TouchEvent) {
      const lock = scrollLock.current;
      const t = e.touches[0];
      const dx = t.clientX - lock.startX;
      const dy = t.clientY - lock.startY;

      if (!lock.axis) {
        if (Math.abs(dx) > LOCK_THRESHOLD || Math.abs(dy) > LOCK_THRESHOLD) {
          lock.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        } else {
          return;
        }
      }

      e.preventDefault();
      if (lock.axis === "x") {
        el!.scrollLeft = lock.scrollX - dx;
      } else {
        el!.scrollTop = lock.scrollY - dy;
      }
    }

    function onTouchEnd() {
      scrollLock.current.axis = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("scroll", checkFade);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      ro.disconnect();
    };
  }, [checkFade]);

  useLayoutEffect(() => {
    if (savedScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = savedScroll.current.top;
      scrollRef.current.scrollLeft = savedScroll.current.left;
      savedScroll.current = null;
    }
  });

  function saveScroll() {
    const el = scrollRef.current;
    if (el) savedScroll.current = { top: el.scrollTop, left: el.scrollLeft };
  }

  const currentDiceSum = isTargetMode ? getMappedDiceSum(diceValues, ruleset.dieValueMap) : 0;

  return (
    <div className="flex flex-col w-full flex-1 min-h-0" style={{ padding: landscapeHeader ? "16px 16px 16px" : "0 16px 16px", gap: 16 }}>

      {/* Scrollable table with fade */}
      <div className="relative min-h-0">
        <div
          ref={scrollRef}
          className="min-h-0 overflow-y-auto overflow-x-auto rounded scrollbar-visible"
          style={{ border: "1px solid #ffffff", maxHeight: "100%" }}
        >
          {isTargetMode ? (
            <TargetTable
              categories={categories}
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              currentDiceSum={currentDiceSum}
              canScore={canScore}
              selectableScores={selectableScores}
              bestCategoryId={bestCategoryId}
              selectedCategoryId={null}
              locked={locked}
              landscapeHeader={landscapeHeader}
              justScoredCategoryId={justScoredCategoryId ?? null}
              justScoredPlayerIndex={justScoredPlayerIndex ?? null}
              ruleset={ruleset}
              onSelect={(id) => {
                if (!locked && selectableScores[id] !== undefined) {
                  playSelect();
                  const target = parseInt(categories.find((c) => c.id === id)?.name ?? "0");
                  const penalty = computeTargetPenalty(currentDiceSum, target);
                  setPendingTarget({ catId: id, target, sum: currentDiceSum, penalty });
                }
              }}
            />
          ) : (
            <table
              className="border-collapse"
              style={{
                tableLayout: "fixed",
                minWidth: players.length > 3 ? `${140 + players.length * 64}px` : "100%",
                width: "100%",
              }}
            >
              <colgroup>
                <col style={{ width: 140 }} />
                {players.map((p) => (
                  <col key={p.id} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <Th style={{ position: "sticky", top: 0, left: 0, zIndex: 3, background: "#000000" }}>{""}</Th>
                  {players.map((p, i) => {
                    const isActive = landscapeHeader && i === currentPlayerIndex;
                    return (
                      <Th
                        key={p.id}
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
                          color: isActive ? "#000000" : p.color,
                          background: isActive ? p.color : "#000000",
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {p.name}
                      </Th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const isSelectable = selectableScores[cat.id] !== undefined;
                  return (
                    <ScoreRow
                      key={cat.id}
                      category={cat}
                      players={players}
                      currentPlayerIndex={currentPlayerIndex}
                      availableScore={rawScores[cat.id]}
                      isSelectable={isSelectable}
                      isBestChoice={cat.id === bestCategoryId}
                      selected={cat.id === selectedCategoryId}
                      onScore={() => {
                        if (!locked && isSelectable) {
                          saveScroll();
                          const deselecting = cat.id === selectedCategoryId;
                          setSelectedCategoryId(deselecting ? null : cat.id);
                          if (deselecting) playDeselect(); else playSelect();
                        }
                      }}
                      justScored={cat.id === justScoredCategoryId}
                      justScoredPlayerIndex={justScoredPlayerIndex ?? null}
                    />
                  );
                })}
                <BonusRow players={players} ruleset={ruleset} />
                {multipleWeetzeesEnabled && <WeetzeeBonusRow players={players} />}
              </tbody>
              <tfoot>
                <TotalRow players={players} ruleset={ruleset} />
              </tfoot>
            </table>
          )}
        </div>
        <div
          style={{
            position: "absolute",
            top: 1,
            bottom: 1,
            left: 141,
            width: 1,
            background: "#ffffff",
            pointerEvents: "none",
            zIndex: 4,
            opacity: scrolledX ? 1 : 0,
            transition: "opacity 200ms",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 38,
            left: 1,
            right: 1,
            height: 40,
            background: "linear-gradient(to bottom, transparent, #000000)",
            pointerEvents: "none",
            opacity: showFade ? 1 : 0,
            transition: "opacity 200ms",
          }}
        />
      </div>

      {!isTargetMode && (
        <button
          onClick={selectedCategoryId && !locked ? () => {
            saveScroll();
            playConfirm();
            onScoreCategory(selectedCategoryId);
            setSelectedCategoryId(null);
          } : undefined}
          className="shrink-0 w-full pressable"
          style={{
            padding: "12px 0",
            border: "1px solid #ffffff",
            borderRadius: 4,
            background: "#ffffff",
            fontSize: 14,
            fontWeight: 500,
            color: "#000000",
            cursor: "pointer",
            opacity: selectedCategoryId && !locked ? 1 : 0,
            pointerEvents: selectedCategoryId && !locked ? "auto" : "none",
            transition: "opacity 150ms",
          }}
        >
          Done
        </button>
      )}

      {pendingTarget && createPortal(
        <TargetConfirmModal
          sum={pendingTarget.sum}
          target={pendingTarget.target}
          penalty={pendingTarget.penalty}
          playerColor={playerColor}
          onCancel={() => { playDeselect(); setPendingTarget(null); }}
          onConfirm={() => {
            saveScroll();
            playConfirm();
            onScoreCategory(pendingTarget.catId);
            setPendingTarget(null);
          }}
        />,
        document.body,
      )}

      {!hideMiniDice && (
        <MiniDiceStrip
          dice={dice}
          rollsUsed={rollsUsed}
          rollsPerTurn={rollsPerTurn}
          playerColor={playerColor}
          coloredPips={!!ruleset.pipColors}
          onRoll={onRoll}
          onToggleHold={onToggleHold}
          dieValueMap={ruleset.dieValueMap}
        />
      )}
    </div>
  );
}

// ===== Target Table (Keep Your Head Down) =====

function penaltyColor(penalty: number): string {
  if (penalty < 0) return "#34c759";
  if (penalty <= 9) return "#ffcc00";
  return "#ff453a";
}

function penaltyLabel(penalty: number): string {
  if (penalty < 0) return `${penalty}`;
  return `+${penalty}`;
}

function TargetTable({
  categories,
  players,
  currentPlayerIndex,
  currentDiceSum,
  canScore,
  selectableScores,
  bestCategoryId,
  selectedCategoryId,
  locked,
  landscapeHeader,
  justScoredCategoryId,
  justScoredPlayerIndex,
  ruleset,
  onSelect,
}: {
  categories: ScoreCategory[];
  players: Player[];
  currentPlayerIndex: number;
  currentDiceSum: number;
  canScore: boolean;
  selectableScores: Record<string, number>;
  bestCategoryId: string | null;
  selectedCategoryId: string | null;
  locked: boolean;
  landscapeHeader: boolean;
  justScoredCategoryId: string | null;
  justScoredPlayerIndex: number | null;
  ruleset: Ruleset;
  onSelect: (id: string) => void;
}) {
  return (
    <table
      className="border-collapse"
      style={{
        tableLayout: "fixed",
        minWidth: players.length > 3 ? `${80 + players.length * 64}px` : "100%",
        width: "100%",
      }}
    >
      <colgroup>
        <col style={{ width: 80 }} />
        {players.map((p) => (
          <col key={p.id} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <Th style={{ position: "sticky", top: 0, left: 0, zIndex: 3, background: "#000000" }}>Target</Th>
          {players.map((p, i) => {
            const isActive = landscapeHeader && i === currentPlayerIndex;
            return (
              <Th
                key={p.id}
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  color: isActive ? "#000000" : p.color,
                  background: isActive ? p.color : "#000000",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {p.name}
              </Th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {categories.map((cat) => {
          const targetNum = parseInt(cat.name);
          const penalty = canScore ? selectableScores[cat.id] : undefined;
          const isSelectable = penalty !== undefined;
          const isBest = cat.id === bestCategoryId;
          const isSelected = cat.id === selectedCategoryId;
          const isJustScored = cat.id === justScoredCategoryId;
          const isExact = canScore && currentDiceSum === targetNum;

          return (
            <tr
              key={cat.id}
              onClick={isSelectable && !locked ? () => onSelect(cat.id) : undefined}
              style={{ cursor: isSelectable && !locked ? "pointer" : "default" }}
            >
              <td
                style={{
                  padding: "8px 16px",
                  borderBottom: "1px solid #ffffff",
                  borderRight: "1px solid #ffffff",
                  background: "#1a1a1a",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#ffffff",
                  position: "sticky",
                  left: 0,
                  zIndex: 1,
                }}
              >
                {cat.name}
              </td>
              {players.map((player, i) => {
                const isCurrent = i === currentPlayerIndex;
                const scored = player.scores[cat.id];
                const isJustScoredCell = isJustScored && i === justScoredPlayerIndex;
                const isSelectedCell = isSelected && isCurrent;
                const showPreview = isCurrent && scored === undefined && isSelectable && !isJustScored && !isSelected;

                const bg = isSelectedCell
                  ? player.color
                  : isJustScoredCell
                    ? player.color
                    : showPreview && isBest
                      ? `${player.color}33`
                      : "#000000";

                const displayPenalty = isSelectedCell ? penalty : showPreview ? penalty : scored;

                return (
                  <td
                    key={player.id}
                    style={{
                      padding: "8px 16px",
                      borderBottom: "1px solid #ffffff",
                      borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
                      background: bg,
                      fontSize: 14,
                      fontWeight: isSelectedCell || isJustScoredCell ? 500 : 400,
                      color: isSelectedCell || isJustScoredCell
                        ? "#000000"
                        : showPreview
                          ? player.color
                          : scored !== undefined && scored !== null
                            ? "#ffffff"
                            : "#333333",
                      transition: "background 150ms, color 150ms",
                    }}
                  >
                    {isSelectedCell ? (
                      penaltyLabel(penalty!)
                    ) : showPreview ? (
                      <span
                        className={`pressable${isBest ? " shimmer-fast" : ""}`}
                        style={{ display: "inline-block" }}
                      >
                        {penaltyLabel(penalty!)}
                      </span>
                    ) : isJustScoredCell && penalty !== undefined ? (
                      penaltyLabel(penalty)
                    ) : scored !== undefined && scored !== null ? (
                      penaltyLabel(scored)
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <TotalRow players={players} ruleset={ruleset} />
      </tfoot>
    </table>
  );
}

// ===== Target Confirm Modal =====

function TargetConfirmModal({
  sum,
  target,
  penalty,
  playerColor,
  onCancel,
  onConfirm,
}: {
  sum: number;
  target: number;
  penalty: number;
  playerColor: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const diff = Math.abs(sum - target);
  const exact = diff === 0;
  const color = penaltyColor(penalty);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 200,
        background: "rgba(0, 0, 0, 0.85)",
        animation: "interstitial-in 200ms ease forwards",
        padding: 16,
      }}
    >
      <div
        className="flex flex-col items-center"
        style={{ gap: 24, width: "100%", padding: 16 }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "calc(100dvh - 100px - 24px - 32px)",
            aspectRatio: "1 / 1",
          }}
        >
          <div
            className="w-full h-full flex flex-col justify-center"
            style={{
              background: playerColor,
              borderRadius: 4,
              border: `1px solid ${playerColor}`,
              color: "#000000",
              padding: "10%",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {sum >= target ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Rolled</span>
                  <span>{sum}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingBottom: 8, borderBottom: "1px solid rgba(0,0,0,0.3)" }}>
                  <span>Target</span>
                  <span>−{target}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Target</span>
                  <span>{target}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingBottom: 8, borderBottom: "1px solid rgba(0,0,0,0.3)" }}>
                  <span>Rolled</span>
                  <span>−{sum}</span>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span>Difference</span>
              <span>{diff}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingBottom: 8, borderBottom: "1px solid rgba(0,0,0,0.3)" }}>
              <span>Penalty</span>
              <span>×3</span>
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              <span>{exact ? "Exact match!" : "Score"}</span>
              <span>{penaltyLabel(penalty)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 justify-center">
          <button
            onClick={onCancel}
            className="flex items-center justify-center rounded-full pressable"
            style={{
              width: 100,
              height: 100,
              border: "1px solid #ffffff",
              background: "transparent",
              fontSize: 14,
              fontWeight: 500,
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center justify-center rounded-full pressable"
            style={{
              width: 100,
              height: 100,
              border: "1px solid #ffffff",
              background: "#ffffff",
              fontSize: 14,
              fontWeight: 500,
              color: "#000000",
              cursor: "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Score Row =====

function ScoreRow({
  category,
  players,
  currentPlayerIndex,
  availableScore,
  isSelectable = true,
  isBestChoice = false,
  selected = false,
  onScore,
  justScored,
  justScoredPlayerIndex,
}: {
  category: ScoreCategory;
  players: Player[];
  currentPlayerIndex: number;
  availableScore: number | undefined;
  isSelectable?: boolean;
  isBestChoice?: boolean;
  selected?: boolean;
  onScore: () => void;
  justScored: boolean;
  justScoredPlayerIndex: number | null;
}) {
  const currentPlayer = players[currentPlayerIndex];
  const alreadyScored = currentPlayer.scores[category.id] !== undefined;
  const isScoreable = !alreadyScored && availableScore !== undefined && isSelectable && !justScored;
  const hasPreview = !alreadyScored && availableScore !== undefined && !justScored;

  return (
    <tr
      onClick={isScoreable ? onScore : undefined}
      style={{ cursor: isScoreable ? "pointer" : "default" }}
    >
      <td
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #ffffff",
          borderRight: "1px solid #ffffff",
          background: "#1a1a1a",

          fontSize: 14,
          color: "#ffffff",
          fontWeight: 400,
          transition: "background 150ms, color 150ms",
          position: "sticky",
          left: 0,
          zIndex: 1,
        }}
      >
        {category.name}
      </td>
      {players.map((player, i) => {
        const scored = player.scores[category.id];
        const isCurrent = i === currentPlayerIndex;
        const isJustScoredCell = justScored && i === justScoredPlayerIndex;
        const isSelectedCell = selected && isCurrent;
        const showPreview = isCurrent && hasPreview && !selected;
        const bg = isSelectedCell
          ? player.color
          : isJustScoredCell
            ? player.color
            : showPreview && isSelectable
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
  
              fontSize: 14,
              fontWeight: isSelectedCell || isJustScoredCell ? 500 : 400,
              color: isSelectedCell || isJustScoredCell
                ? "#000000"
                : showPreview
                  ? isSelectable ? player.color : `${player.color}55`
                  : "#ffffff",
              transition: "background 150ms, color 150ms",
            }}
          >
            {isSelectedCell ? (
              availableScore
            ) : showPreview ? (
              isSelectable ? (
                <span className={`pressable${isBestChoice ? " shimmer-fast" : ""}`} style={{ display: "inline-block" }}>
                  {availableScore}
                </span>
              ) : (
                availableScore
              )
            ) : (
              scored !== undefined ? scored : isJustScoredCell ? availableScore : ""
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Bonus Row =====

function BonusRow({ players, ruleset }: { players: Player[]; ruleset: Ruleset }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 16px",
          borderRight: "1px solid #ffffff",
          background: "#1a1a1a",

          fontSize: 14,
          color: "#ffffff",
          position: "sticky",
          left: 0,
          zIndex: 1,
        }}
      >
        Bonus
      </td>
      {players.map((player, i) => {
        const bonus = getRulesetBonus(ruleset, player.scores);
        return (
          <td
            key={player.id}
            style={{
              padding: "8px 16px",
              borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              background: "#000000",
  
              fontSize: 14,
              color: bonus > 0 ? player.color : "#ffffff",
            }}
          >
            {bonus > 0 ? bonus : "—"}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Weetzee Bonus Row =====

function WeetzeeBonusRow({ players }: { players: Player[] }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 16px",
          borderRight: "1px solid #ffffff",
          background: "#1a1a1a",

          fontSize: 14,
          color: "#ffffff",
          position: "sticky",
          left: 0,
          zIndex: 1,
        }}
      >
        Weetzee+
      </td>
      {players.map((player, i) => {
        const count = player.extraWeetzees;
        const points = count * EXTRA_WEETZEE_VALUE;
        return (
          <td
            key={player.id}
            style={{
              padding: "8px 16px",
              borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              background: "#000000",
  
              fontSize: 14,
              color: count > 0 ? player.color : "#ffffff",
            }}
          >
            {count > 0 ? points : "—"}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Total Row =====

function TotalRow({ players, ruleset }: { players: Player[]; ruleset: Ruleset }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 16px",
          borderRight: "1px solid #ffffff",
          background: "#000000",

          fontSize: 14,
          fontWeight: 600,
          color: "#ffffff",
          boxShadow: "inset 0 1px 0 #ffffff",
          position: "sticky",
          left: 0,
          bottom: 0,
          zIndex: 3,
        }}
      >
        Total
      </td>
      {players.map((player, i) => {
        const total = getRulesetTotal(ruleset, player.scores, player.extraWeetzees);
        return (
          <td
            key={player.id}
            style={{
              padding: "8px 16px",
              borderRight: i < players.length - 1 ? "1px solid #ffffff" : "none",
              boxShadow: "inset 0 1px 0 #ffffff",
              background: player.color,
  
              fontSize: 14,
              fontWeight: 600,
              color: "#000000",
              position: "sticky",
              bottom: 0,
              zIndex: 2,
            }}
          >
            {total}
          </td>
        );
      })}
    </tr>
  );
}

// ===== Mini Dice Strip =====

const MINI_CYCLE_INTERVAL = 50;
const MINI_CYCLE_DURATION = 350;

function MiniDiceStrip({
  dice,
  rollsUsed,
  rollsPerTurn,
  playerColor,
  coloredPips = false,
  onRoll,
  onToggleHold,
  dieValueMap,
}: {
  dice: DieType[];
  rollsUsed: number;
  rollsPerTurn: number;
  playerColor: string;
  coloredPips?: boolean;
  onRoll: () => void;
  onToggleHold: (id: number) => void;
  dieValueMap?: Record<number, number>;
}) {
  const heldCount = dice.filter((d) => d.held).length;
  const allHeld = heldCount >= dice.length;
  const canRoll = rollsUsed < rollsPerTurn && !allHeld;
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
        for (const idx of unheldIndices) next[idx] = rollValue();
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
            coloredPips={coloredPips}
            onClick={canHold ? () => { playTap(); onToggleHold(die.id); } : undefined}
            disabled={!canHold}
            rolling={rollingDice.has(i)}
            flash={flashDice.has(i)}
            label={rollsUsed === 0 ? "Roll" : undefined}
            dieValueMap={dieValueMap}
          />
        </div>
      ))}
      <div className="flex-1 min-w-0 aspect-square" style={{ containerType: "inline-size" }}>
        <button
          onClick={canRoll ? onRoll : undefined}
          disabled={!canRoll}
          className="w-full h-full flex items-center justify-center rounded-full pressable"
          style={{
            border: "1px solid #ffffff",
            background: "transparent",
            fontSize: "clamp(9px, 18cqi, 14px)",
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
        borderRight: "1px solid #ffffff",
        background: "#000000",

        fontSize: 14,
        fontWeight: 400,
        color: "#ffffff",
        textAlign: "left",
        boxShadow: "inset 0 -1px 0 #ffffff",
        ...style,
      }}
    >
      {children}
    </th>
  );
}
