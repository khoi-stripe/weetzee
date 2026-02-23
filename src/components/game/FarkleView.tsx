"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DiceView } from "./DiceView";
import { PlayerBar } from "./PlayerBar";
import type { UseGameReturn } from "@/hooks/useGame";
import type { Player } from "@/lib/types";
import { isValidSelection, scoreDice } from "@/lib/rulesets/farkle";
import { playTap, playTurnChange, playConfirm, playDeselect, getAudioCtx } from "@/lib/sounds";

export function FarkleView({ game }: { game: UseGameReturn }) {
  const { state, roll, toggleHold, setAside, bank } = game;
  const currentPlayer = state.players[state.currentPlayerIndex];

  const [interstitialPlayer, setInterstitialPlayer] = useState<Player | null>(null);
  const [interstitialExiting, setInterstitialExiting] = useState(false);

  const showInterstitial = useCallback((player: Player | null) => {
    if (player) {
      setInterstitialExiting(false);
      setInterstitialPlayer(player);
      playTurnChange();
    } else {
      setInterstitialExiting(true);
      setTimeout(() => {
        setInterstitialPlayer(null);
        setInterstitialExiting(false);
      }, 400);
    }
  }, []);

  const bankTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bankTimer.current) clearTimeout(bankTimer.current);
    };
  }, []);

  function handleBank() {
    if (bankTimer.current) return;
    playConfirm();

    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextPlayerIndex];
    const isSinglePlayer = state.players.length === 1;

    bankTimer.current = setTimeout(() => {
      bank();
      bankTimer.current = null;

      if (!isSinglePlayer) {
        showInterstitial(nextPlayer);
        setTimeout(() => showInterstitial(null), 2000);
      }
    }, 300);
  }

  function handleFarkleContinue() {
    if (bankTimer.current) return;
    playDeselect();

    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextPlayerIndex];
    const isSinglePlayer = state.players.length === 1;

    bankTimer.current = setTimeout(() => {
      bank();
      bankTimer.current = null;

      if (!isSinglePlayer) {
        showInterstitial(nextPlayer);
        setTimeout(() => showInterstitial(null), 2000);
      }
    }, 300);
  }

  const heldDice = state.dice.filter(
    (d) => d.held && !state.setAsideDiceIds.includes(d.id)
  );
  const heldValues = heldDice.map((d) => d.value);
  const selectionValid = heldValues.length > 0 && isValidSelection(heldValues);
  const selectionScore = selectionValid ? scoreDice(heldValues) : 0;

  const hasRolled = state.rollsUsed > 0;

  const hotDice = !state.farkled && state.setAsideDiceIds.length === 0 && state.turnScore > 0 && hasRolled;
  const canSetAside = !state.farkled && selectionValid && hasRolled;
  const canRoll = !state.farkled && !state.mustSetAside && (state.setAsideDiceIds.length > 0 || hotDice) && !heldDice.length;
  const canBank = !state.farkled && !state.mustSetAside && state.turnScore > 0 && hasRolled && !heldDice.length;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      {/* Player bar */}
      <PlayerBar
        players={state.players}
        currentPlayerIndex={state.currentPlayerIndex}
        ruleset={state.ruleset}
      />

      {/* Turn score */}
      <div className="shrink-0 flex items-center justify-center" style={{ padding: "0 16px 8px" }}>
        <div className="flex items-center gap-3">
          <span style={{ color: "#999999", fontSize: 13 }}>Turn</span>
          <span style={{ color: "#ffffff", fontSize: 24, fontWeight: 700 }}>
            {state.turnScore + (selectionValid ? selectionScore : 0)}
          </span>
          {selectionValid && selectionScore > 0 && (
            <span style={{ color: currentPlayer.color, fontSize: 13, fontWeight: 500 }}>
              +{selectionScore}
            </span>
          )}
        </div>
      </div>

      {/* Final round indicator */}
      {state.finalRound && (
        <div className="shrink-0 text-center" style={{ padding: "0 16px 4px" }}>
          <span style={{ color: "#ff6b6b", fontSize: 12, fontWeight: 500 }}>
            Final round
          </span>
        </div>
      )}

      {/* Dice area */}
      <div className="flex-1 min-h-0 relative">
        <DiceView
          dice={state.dice}
          rollsUsed={state.rollsUsed}
          rollsPerTurn={999}
          playerColor={currentPlayer.color}
          onRoll={roll}
          onToggleHold={toggleHold}
          farkleMode
          setAsideDiceIds={state.setAsideDiceIds}
          farkled={state.farkled}
        />
      </div>

      {/* Action buttons */}
      <div className="shrink-0" style={{ padding: "8px 16px 16px" }}>
        {state.farkled ? (
          <FarkleButtons onContinue={handleFarkleContinue} />
        ) : !hasRolled ? (
          <div className="flex gap-3 justify-center">
            <ActionButton
              label="ROLL"
              filled
              color={currentPlayer.color}
              onClick={() => { getAudioCtx(); roll(); }}
            />
          </div>
        ) : (
          <div className="flex gap-3 justify-center">
            {canSetAside && (
              <ActionButton
                label={`SET ASIDE +${selectionScore}`}
                filled={false}
                color={currentPlayer.color}
                onClick={() => { playTap(); setAside(); }}
              />
            )}
            {(canRoll || hotDice) && (
              <ActionButton
                label={hotDice ? "HOT DICE!" : "ROLL"}
                filled
                color={currentPlayer.color}
                onClick={() => { getAudioCtx(); roll(); }}
              />
            )}
            {canBank && (
              <ActionButton
                label={`BANK ${state.turnScore}`}
                filled
                color="#ffffff"
                onClick={handleBank}
              />
            )}
          </div>
        )}
      </div>

      {/* Farkle bust overlay */}
      {state.farkled && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 40 }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#ff4444",
              opacity: 0.7,
              transform: "rotate(-15deg)",
              textShadow: "0 0 40px rgba(255, 68, 68, 0.5)",
              animation: "interstitial-in 300ms ease forwards",
            }}
          >
            FARKLE!
          </span>
        </div>
      )}

      {/* Player interstitial */}
      {interstitialPlayer && (
        <PlayerInterstitial player={interstitialPlayer} exiting={interstitialExiting} />
      )}
    </div>
  );
}

function ActionButton({
  label,
  filled,
  color,
  onClick,
}: {
  label: string;
  filled: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="pressable"
      style={{
        padding: "10px 20px",
        borderRadius: 999,
        border: `1px solid ${color}`,
        background: filled ? color : "transparent",
        color: filled ? "#000000" : color,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function FarkleButtons({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex gap-3 justify-center">
      <ActionButton
        label="CONTINUE"
        filled
        color="#ff4444"
        onClick={onContinue}
      />
    </div>
  );
}

function PlayerInterstitial({ player, exiting }: { player: Player; exiting: boolean }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: "rgba(0, 0, 0, 0.85)",
        zIndex: 50,
        padding: 16,
        animation: exiting
          ? "interstitial-out 400ms ease forwards"
          : "interstitial-in 300ms ease forwards",
      }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          background: player.color,
          fontSize: 20,
          fontWeight: 500,
          color: "#000000",
          animation: exiting
            ? "scale-out 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
            : "spin-in 500ms cubic-bezier(0.22, 1, 0.36, 1) 150ms both",
        }}
      >
        {player.name}
      </div>
    </div>
  );
}
