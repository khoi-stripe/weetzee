"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Share } from "lucide-react";
import { VISIBLE_RULESETS } from "@/lib/rulesets";
import { AI_DIFFICULTY_LABELS } from "@/lib/types";
import type { AIDifficulty } from "@/lib/types";
import { playTap, playToggle, playConfirm } from "@/lib/sounds";
import { Capacitor } from "@capacitor/core";
import { useSupporter } from "@/hooks/useSupporter";
import { TYPE, SIZE, WEIGHT } from "@/lib/type";
import { COLOR } from "@/lib/color";
import { Scrim } from "@/components/ui/Scrim";
import { DialogCard } from "@/components/ui/DialogCard";
import { RoundButton } from "@/components/ui/RoundButton";
import { EASE } from "@/lib/motion";
import { RADIUS, Z } from "@/lib/tokens";

// ===== Header =====

export function Header({
  showBack = true,
  backLabel = "Exit",
  rulesetId,
  rulesetName,
  showAllRulesets = false,
  rollBankingEnabled,
  onToggleRollBanking,
  multipleWeetzeesEnabled,
  onToggleMultipleWeetzees,
  scoringHintsEnabled,
  onToggleScoringHints,
  sixDiceEnabled,
  onToggleSixDice,
  orderedScoringEnabled,
  onToggleOrderedScoring,
  openingThresholdEnabled,
  onToggleOpeningThreshold,
  piggybackEnabled,
  onTogglePiggyback,
  aiDifficulty,
  onSetAIDifficulty,
  exitWithoutConfirm = false,
  onEndGame,
}: {
  showBack?: boolean;
  backLabel?: string;
  exitWithoutConfirm?: boolean;
  rulesetId?: string;
  rulesetName?: string;
  showAllRulesets?: boolean;
  rollBankingEnabled?: boolean;
  onToggleRollBanking?: () => void;
  multipleWeetzeesEnabled?: boolean;
  onToggleMultipleWeetzees?: () => void;
  scoringHintsEnabled?: boolean;
  onToggleScoringHints?: () => void;
  sixDiceEnabled?: boolean;
  onToggleSixDice?: () => void;
  orderedScoringEnabled?: boolean;
  onToggleOrderedScoring?: () => void;
  openingThresholdEnabled?: boolean;
  onToggleOpeningThreshold?: () => void;
  piggybackEnabled?: boolean;
  onTogglePiggyback?: () => void;
  aiDifficulty?: AIDifficulty;
  onSetAIDifficulty?: (d: AIDifficulty) => void;
  onEndGame?: () => void;
}) {
  const router = useRouter();
  const [showRules, setShowRules] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  function handleBack() {
    playTap();
    if (backLabel === "Exit" && !exitWithoutConfirm) {
      setShowExitConfirm(true);
    } else {
      onEndGame ? onEndGame() : router.push("/");
    }
  }

  return (
    <>
      <div className="shrink-0 w-full flex items-center" style={{ height: 48, position: "relative" }}>
        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center pressable"
            style={{
              ...TYPE.body,
              position: "absolute",
              left: 4,
              padding: "8px 12px",
              color: COLOR.textPrimary,
              background: "none",
              border: "none",
            }}
            aria-label={backLabel}
          >
            {backLabel}
          </button>
        )}
        <p
          className="text-white text-center"
          style={{
            ...TYPE.title,
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {rulesetName ?? "Weetzee"}
        </p>
        <button
          onClick={() => { playTap(); setShowRules(true); }}
          className="flex items-center justify-center pressable"
          style={{
            ...TYPE.body,
            position: "absolute",
            right: 4,
            padding: "8px 12px",
            background: "none",
            border: "none",
            color: COLOR.textPrimary,
          }}
          aria-label="Game rules"
        >
          i
        </button>
      </div>

      {showRules && (
        <RulesModal
          onClose={() => setShowRules(false)}
          onChangeRuleset={() => { setShowRules(false); setShowExitConfirm(true); }}
          rulesetId={rulesetId}
          rulesetName={rulesetName}
          showAllRulesets={showAllRulesets}
          rollBankingEnabled={rollBankingEnabled}
          onToggleRollBanking={onToggleRollBanking}
          multipleWeetzeesEnabled={multipleWeetzeesEnabled}
          onToggleMultipleWeetzees={onToggleMultipleWeetzees}
          scoringHintsEnabled={scoringHintsEnabled}
          onToggleScoringHints={onToggleScoringHints}
          sixDiceEnabled={sixDiceEnabled}
          onToggleSixDice={onToggleSixDice}
          orderedScoringEnabled={orderedScoringEnabled}
          onToggleOrderedScoring={onToggleOrderedScoring}
          openingThresholdEnabled={openingThresholdEnabled}
          onToggleOpeningThreshold={onToggleOpeningThreshold}
          piggybackEnabled={piggybackEnabled}
          onTogglePiggyback={onTogglePiggyback}
          aiDifficulty={aiDifficulty}
          onSetAIDifficulty={onSetAIDifficulty}
        />
      )}

      {showExitConfirm && (
        <Scrim>
          <DialogCard>
            <p style={{ ...TYPE.title }}>End this game?</p>
          </DialogCard>
          <div className="flex justify-center" style={{ gap: 16 }}>
            <RoundButton onClick={() => { playTap(); setShowExitConfirm(false); }}>
              Cancel
            </RoundButton>
            <RoundButton
              variant="filled"
              onClick={() => { playTap(); onEndGame?.(); router.push("/"); }}
            >
              End game
            </RoundButton>
          </div>
        </Scrim>
      )}
    </>
  );
}

// ===== Rules Modal =====

function ClassicRules() {
  return (
    <>
      <Section title="Upper section">
        <ScoreTable>
          <ScoreRow name="Ones – Sixes" value="Sum of matching face" />
        </ScoreTable>
        <p style={{ marginTop: 8, color: COLOR.textMuted }}>
          Bonus: Score 35 extra points if upper section totals 63 or more.
        </p>
      </Section>
      <Section title="Lower section">
        <ScoreTable>
          <ScoreRow name="3 of a kind" value="Sum of all dice" />
          <ScoreRow name="4 of a kind" value="Sum of all dice" />
          <ScoreRow name="Full house" value="25 pts" />
          <ScoreRow name="Sm. straight" value="30 pts" />
          <ScoreRow name="Lg. straight" value="40 pts" />
          <ScoreRow name="Chance" value="Sum of all dice" />
          <ScoreRow name="Weetzee" value="50 pts" />
        </ScoreTable>
      </Section>
    </>
  );
}

function KismetRules() {
  return (
    <>
      <Section title="Colored pips">
        <RuleRow name="1, 2" desc="White" />
        <RuleRow name="3, 4" desc="Red" />
        <RuleRow name="5, 6" desc="Green" />
      </Section>
      <Section title="Basic section">
        <ScoreTable>
          <ScoreRow name="Aces – Sixes" value="Sum of matching face" />
        </ScoreTable>
      </Section>
      <Section title="Upper section bonus">
        <ScoreTable>
          <ScoreRow name="63+ total" value="35 pts" />
          <ScoreRow name="71+ total" value="55 pts" />
          <ScoreRow name="78+ total" value="75 pts" />
        </ScoreTable>
      </Section>
      <Section title="Kismet section">
        <ScoreTable>
          <ScoreRow name="2 pair same color" value="Sum of all dice" />
          <ScoreRow name="3 of a kind" value="Sum of all dice" />
          <ScoreRow name="Straight" value="30 pts" />
          <ScoreRow name="Flush" value="35 pts" />
          <ScoreRow name="Full house" value="Sum + 15" />
          <ScoreRow name="Full house same color" value="Sum + 20" />
          <ScoreRow name="4 of a kind" value="Sum + 25" />
          <ScoreRow name="Yarborough" value="Sum of all dice" />
          <ScoreRow name="Kismet" value="Sum + 50" />
        </ScoreTable>
      </Section>
    </>
  );
}

function FarkleRules() {
  return (
    <>
      <Section title="Goal">
        <p>First player to reach <b>10,000 points</b> triggers the final round. Everyone else gets one more turn to beat them.</p>
      </Section>
      <Section title="Rolling">
        <RuleRow name="Roll all 6" desc="Start each turn by rolling all dice" />
        <RuleRow name="Set aside" desc="Select scoring dice to keep, then roll the rest" />
        <RuleRow name="Bank" desc="Stop anytime and add your turn score to your total" />
        <RuleRow name="Farkle" desc="If a roll produces no scoring dice, you lose all points for that turn" />
        <RuleRow name="Hot dice" desc="If all 6 dice are set aside, roll all 6 again and keep going" />
      </Section>
      <Section title="Scoring">
        <ScoreTable>
          <ScoreRow name="Single 1" value="100 pts" />
          <ScoreRow name="Single 5" value="50 pts" />
          <ScoreRow name="Three 1s" value="1,000 pts" />
          <ScoreRow name="Three 2s–6s" value="Face × 100" />
          <ScoreRow name="4 of a kind" value="1,000 pts" />
          <ScoreRow name="5 of a kind" value="2,000 pts" />
          <ScoreRow name="6 of a kind" value="3,000 pts" />
          <ScoreRow name="1-2-3-4-5-6" value="2,500 pts" />
          <ScoreRow name="3 pairs" value="1,500 pts" />
        </ScoreTable>
      </Section>
      <Section title="Strategy">
        <p style={{ color: COLOR.textMuted }}>
          Set aside high-scoring dice, then decide whether to push your luck
          or bank what you have. A farkle wipes your entire turn.
        </p>
      </Section>
      <Section title="Piggybacking (house rule)">
        <RuleRow name="Inherit" desc="After a player banks, the next player can piggyback their remaining dice and score" />
        <RuleRow name="Fresh roll" desc="Or start your turn normally with all 6 dice" />
        <RuleRow name="Hot dice" desc="If the previous player used all 6 dice, you still roll all 6 but inherit their banked score" />
        <RuleRow name="Farkle risk" desc="If you farkle while piggybacking, you lose both the inherited score and your own" />
      </Section>
    </>
  );
}

function GameRulesBlock({ id, name, diceCount, description }: { id: string; name: string; diceCount: number; description: string }) {
  return (
    <div style={{ marginTop: 32, borderTop: `1px solid ${COLOR.borderSubtle}`, paddingTop: 24 }}>
      <h2
        style={{
          ...TYPE.sectionHeading,
          color: COLOR.textPrimary,
          marginBottom: 4,
        }}
      >
        {name}
      </h2>
      <p style={{ ...TYPE.microRegular, color: COLOR.textMuted, marginBottom: 8 }}>
        {description} — {diceCount} dice
        {id === "farkle" ? "" : ", 3 rolls per turn"}
        {", highest score wins"}
      </p>
      {id === "weetzee" && <ClassicRules />}
      {id === "kismet" && <KismetRules />}
      {id === "farkle" && <FarkleRules />}
    </div>
  );
}

function RulesModal({
  onClose,
  onChangeRuleset,
  rulesetId,
  rulesetName,
  showAllRulesets = false,
  rollBankingEnabled,
  onToggleRollBanking,
  multipleWeetzeesEnabled,
  onToggleMultipleWeetzees,
  scoringHintsEnabled,
  onToggleScoringHints,
  sixDiceEnabled,
  onToggleSixDice,
  orderedScoringEnabled,
  onToggleOrderedScoring,
  openingThresholdEnabled,
  onToggleOpeningThreshold,
  piggybackEnabled,
  onTogglePiggyback,
  aiDifficulty,
  onSetAIDifficulty,
}: {
  onClose: () => void;
  onChangeRuleset?: () => void;
  rulesetId?: string;
  rulesetName?: string;
  showAllRulesets?: boolean;
  rollBankingEnabled?: boolean;
  onToggleRollBanking?: () => void;
  multipleWeetzeesEnabled?: boolean;
  onToggleMultipleWeetzees?: () => void;
  scoringHintsEnabled?: boolean;
  onToggleScoringHints?: () => void;
  sixDiceEnabled?: boolean;
  onToggleSixDice?: () => void;
  orderedScoringEnabled?: boolean;
  onToggleOrderedScoring?: () => void;
  openingThresholdEnabled?: boolean;
  onToggleOpeningThreshold?: () => void;
  piggybackEnabled?: boolean;
  onTogglePiggyback?: () => void;
  aiDifficulty?: AIDifficulty;
  onSetAIDifficulty?: (d: AIDifficulty) => void;
}) {
  const router = useRouter();
  const isAbout = !rulesetId && !showAllRulesets;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: Z.modal,
        background: COLOR.surfaceBg,
        paddingTop: "env(safe-area-inset-top, 0px)",
        animation: "interstitial-in 200ms ease forwards",
      }}
    >
      {/* Modal header */}
      <div className="relative shrink-0 w-full" style={{ height: 48 }}>
        <p
          className="absolute text-white text-center"
          style={{
            ...TYPE.body,
            left: "50%",
            transform: "translateX(-50%)",
            top: 13.5,
          }}
        >
          {isAbout ? "About" : "Rules"}
        </p>
        <button
          onClick={() => { playTap(); onClose(); }}
          className="absolute flex items-center justify-center pressable"
          style={{
            fontSize: SIZE.headline,
            fontWeight: WEIGHT.regular,
            right: 4,
            top: 2,
            padding: "8px 12px",
            background: "none",
            border: "none",
            color: COLOR.textPrimary,
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto selectable"
        style={{
          padding: "0 24px 48px",

          fontSize: SIZE.body,
          lineHeight: 1.6,
          color: COLOR.textReadable,
          maxWidth: 640,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {isAbout ? (
          <AboutContent />
        ) : (
          <>
            {rulesetName && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 16,
                  padding: "12px 0",
                  borderBottom: `1px solid ${COLOR.borderSubtle}`,
                }}
              >
                <div>
                  <span style={{ ...TYPE.microRegular, color: COLOR.textMuted }}>Playing</span>
                  <span style={{ ...TYPE.body, color: COLOR.textPrimary, marginLeft: 8 }}>
                    {rulesetName}
                  </span>
                </div>
                <button
                  onClick={() => { playTap(); (onChangeRuleset ?? (() => router.push("/")))(); }}
                  className="pressable"
                  style={{
                    ...TYPE.microRegular,
                    background: "none",
                    outline: `1px solid ${COLOR.textDisabled}`,
                    outlineOffset: -1,
                    borderRadius: RADIUS.sm,
                    padding: "4px 10px",
                    color: COLOR.textMuted,
                    cursor: "pointer",
                  }}
                >
                  Change
                </button>
              </div>
            )}

            {rulesetId !== "farkle" && (
              <Section title="How to play">
                Roll your dice, then optionally hold any and re-roll the rest — up to 3 rolls per turn.
                After rolling, choose a scoring category. You may place a zero in any unused category if
                your roll doesn&apos;t qualify.
              </Section>
            )}

            {showAllRulesets ? (
              <>
                <HouseRulesInfo />
                {VISIBLE_RULESETS.map((r) => (
                  <GameRulesBlock key={r.id} id={r.id} name={r.name} diceCount={r.diceCount} description={r.description} />
                ))}
              </>
            ) : rulesetId === "kismet" ? (
              <KismetRules />
            ) : rulesetId === "farkle" ? (
              <FarkleRules />
            ) : (
              <ClassicRules />
            )}

            {(onToggleRollBanking || onToggleMultipleWeetzees || onToggleScoringHints || onToggleSixDice !== undefined || onToggleOrderedScoring !== undefined || onToggleOpeningThreshold || onTogglePiggyback) && (
              <div style={{ marginTop: 32, borderTop: `1px solid ${COLOR.borderSubtle}`, paddingTop: 24 }}>
                <h3
                  style={{
                    ...TYPE.sectionHeading,
                    color: COLOR.textPrimary,
                    marginBottom: 12,
                  }}
                >
                  House rules
                </h3>
                {onToggleRollBanking && (
                  <ToggleRow
                    label="Roll banking"
                    desc="Bank unused rolls for future turns (max 3)"
                    enabled={!!rollBankingEnabled}
                    onToggle={onToggleRollBanking}
                  />
                )}
                {onToggleMultipleWeetzees && (
                  <ToggleRow
                    label="Multiple Weetzees"
                    desc="Score extra Weetzees for 100 pts each"
                    enabled={!!multipleWeetzeesEnabled}
                    onToggle={onToggleMultipleWeetzees}
                  />
                )}
                {onToggleScoringHints && (
                  <ToggleRow
                    label="Scoring hints"
                    desc="Show available scoring combos on the score sheet"
                    enabled={!!scoringHintsEnabled}
                    onToggle={onToggleScoringHints}
                  />
                )}
                {onTogglePiggyback && (
                  <ToggleRow
                    label="Piggybacking"
                    desc="Next player can inherit the previous player's remaining dice and score"
                    enabled={!!piggybackEnabled}
                    onToggle={onTogglePiggyback}
                  />
                )}
                {sixDiceEnabled !== undefined && (
                  <ToggleRow
                    label="6 dice"
                    desc={onToggleSixDice ? "Play with 6 dice instead of 5" : "Play with 6 dice instead of 5 (set before game starts)"}
                    enabled={!!sixDiceEnabled}
                    onToggle={onToggleSixDice}
                    disabled={!onToggleSixDice}
                  />
                )}
                {orderedScoringEnabled !== undefined && (
                  <ToggleRow
                    label="Ordered scoring"
                    desc={onToggleOrderedScoring ? "Must score categories from top to bottom" : "Must score categories from top to bottom (set before game starts)"}
                    enabled={!!orderedScoringEnabled}
                    onToggle={onToggleOrderedScoring}
                    disabled={!onToggleOrderedScoring}
                  />
                )}
                {onToggleOpeningThreshold && (
                  <ToggleRow
                    label="Opening threshold"
                    desc="Must score 500+ in a turn before you can start banking"
                    enabled={!!openingThresholdEnabled}
                    onToggle={onToggleOpeningThreshold}
                  />
                )}
              </div>
            )}

            {onSetAIDifficulty && aiDifficulty && (
              <div style={{ marginTop: 32, borderTop: `1px solid ${COLOR.borderSubtle}`, paddingTop: 24 }}>
                <h3
                  style={{
                    ...TYPE.sectionHeading,
                    color: COLOR.textPrimary,
                    marginBottom: 4,
                  }}
                >
                  CPU difficulty
                </h3>
                <p style={{ ...TYPE.microRegular, color: COLOR.textMuted, marginBottom: 16 }}>
                  Changes how the computer players make decisions
                </p>
                <div className="flex gap-2">
                  {(["easy", "medium", "hard"] as AIDifficulty[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => { playTap(); onSetAIDifficulty!(level); }}
                      className="pressable"
                      style={{
                        ...TYPE.micro,
                        flex: 1,
                        height: 36,
                        borderRadius: RADIUS.lg,
                        border: "none",
                        cursor: "pointer",
                        transition: "background 150ms, color 150ms",
                        background: aiDifficulty === level ? COLOR.textPrimary : COLOR.surfaceRaised,
                        color: aiDifficulty === level ? COLOR.surfaceBg : COLOR.textMuted,
                      }}
                    >
                      {AI_DIFFICULTY_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <SupportSection />
            <InstallSection />
          </>
        )}
      </div>
    </div>
  );
}

function SupportSection({ position = "bottom" }: { position?: "top" | "bottom" }) {
  const { isSupporter, purchase, restore, reset, loading, isNative } = useSupporter();
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const router = useRouter();

  if (!isNative) return null;

  async function handlePurchase() {
    playTap();
    await purchase();
  }

  async function handleRestore() {
    playTap();
    const ok = await restore();
    if (ok) {
      playConfirm();
      setRestoreMsg("Purchases restored!");
    } else {
      setRestoreMsg("No purchases found");
    }
    setTimeout(() => setRestoreMsg(null), 3000);
  }

  return (
    <div style={{
      marginTop: position === "top" ? 8 : 32,
      borderTop: position === "bottom" ? `1px solid ${COLOR.borderSubtle}` : undefined,
      paddingTop: position === "bottom" ? 24 : 0,
      borderBottom: position === "top" ? `1px solid ${COLOR.borderSubtle}` : undefined,
      paddingBottom: position === "top" ? 24 : 0,
    }}>
      <h3 style={{ ...TYPE.sectionHeading, color: COLOR.textPrimary, marginBottom: 8 }}>
        {isSupporter ? "Supporter" : "Support Weetzee"}
      </h3>
      {isSupporter ? (
        <>
          <p style={{ ...TYPE.microRegular, color: COLOR.textMuted, marginBottom: 16 }}>
            Thanks for keeping the dice rolling. Snake Eyes is all yours.
          </p>
          <div className="support-border-ring" style={{ opacity: 1 }}>
            <button
              onClick={() => { playTap(); router.push("/snake"); }}
              className="flex items-center justify-center rounded-full pressable"
              style={{
                ...TYPE.bodyEmphasis,
                width: "100%",
                height: 48,
                background: COLOR.surfaceBg,
                color: COLOR.textPrimary,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Play Snake Eyes
            </button>
          </div>
          <button
            onClick={() => { playTap(); reset(); }}
            style={{
              ...TYPE.microRegular,
              display: "block",
              marginTop: 12,
              background: "none",
              border: "none",
              color: COLOR.textDisabled,
              cursor: "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            Reset supporter status
          </button>
        </>
      ) : (
        <>
          <p style={{ ...TYPE.microRegular, color: COLOR.textMuted, marginBottom: 16 }}>
            Hungry snake. Hungry dice. Support Weetzee to unlock Snake Eyes, a bonus game hiding inside the app.
          </p>
          <div className="support-border-ring" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 150ms" }}>
            <button
              onClick={handlePurchase}
              disabled={loading}
              className="flex items-center justify-center rounded-full pressable"
              style={{
                ...TYPE.bodyEmphasis,
                width: "100%",
                height: 48,
                background: COLOR.surfaceBg,
                color: COLOR.textPrimary,
                border: "none",
                cursor: loading ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "Loading..." : "Support Weetzee — $2.99"}
            </button>
          </div>
          <button
            onClick={handleRestore}
            disabled={loading}
            style={{
              ...TYPE.microRegular,
              display: "block",
              marginTop: 12,
              background: "none",
              border: "none",
              color: COLOR.textDisabled,
              cursor: loading ? "default" : "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            Restore Purchases
          </button>
          {restoreMsg && (
            <p style={{ ...TYPE.microRegular, color: COLOR.textMuted, marginTop: 6 }}>{restoreMsg}</p>
          )}
        </>
      )}
    </div>
  );
}

function AboutContent() {
  return (
    <>
      <SupportSection position="top" />
      <Section title="What is Weetzee?">
        <p>
          Weetzee is a collection of dice games — pass-and-play with friends or
          solo against the CPU. Pick a ruleset, roll, score, and try to beat
          everyone else.
        </p>
      </Section>

      <Section title="Games">
        {VISIBLE_RULESETS.map((r) => (
          <div key={r.id} style={{ marginTop: 10 }}>
            <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>{r.name}</span>
            <span style={{ color: COLOR.textMuted }}>
              {r.id === "weetzee" && " — The standard game. 5 dice, 13 categories, highest score wins."}
              {r.id === "kismet" && " — Dice have colored pips. New color-based categories like flushes and same-color full houses."}
              {r.id === "farkle" && " — Push your luck! Set aside scoring dice and keep rolling, or bank your points. First to 10,000 wins."}
            </span>
          </div>
        ))}
      </Section>

      <Section title="CPU players">
        <p>
          Long-press any die on the player select screen to toggle it as a computer opponent.
          CPU players take their turns automatically.
        </p>
        <p style={{ marginTop: 10 }}>
          You can change the CPU difficulty (Easy, Medium, or Hard) mid-game from the settings menu.
          Easy makes occasional mistakes, Medium plays smart, and Hard plays to win.
        </p>
      </Section>

      <InstallSection alwaysShow />

      <p
        style={{
          ...TYPE.microRegular,
          color: COLOR.textDisabled,
          textAlign: "center",
          marginTop: 24,
        }}
      >
        Weetzee v{process.env.NEXT_PUBLIC_APP_VERSION}
      </p>
    </>
  );
}

function HouseRulesInfo() {
  return (
    <Section title="House rules">
      <p>Optional rules for Weetzee and Kismet. Toggle them from the settings menu during play.</p>
      <div style={{ marginTop: 10 }}>
        <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>Roll banking</span>
        <span style={{ color: COLOR.textMuted }}> — Bank unused rolls for future turns, up to 3 extra.</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>Multiple Weetzees</span>
        <span style={{ color: COLOR.textMuted }}> — Score extra Weetzees for 100 bonus points each.</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>6 dice</span>
        <span style={{ color: COLOR.textMuted }}> — Play with 6 dice instead of 5. Must be set before the game starts.</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>Ordered scoring</span>
        <span style={{ color: COLOR.textMuted }}> — Must score categories from top to bottom. Must be set before the game starts.</span>
      </div>
    </Section>
  );
}

function InstallSection({ alwaysShow = false }: { alwaysShow?: boolean }) {
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || window.matchMedia("(display-mode: standalone)").matches) {
      setStandalone(true);
      return;
    }
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) { setPlatform("ios"); return; }
    if (/Android/.test(ua)) { setPlatform("android"); return; }
  }, []);

  if (standalone) return null;
  if (!platform && !alwaysShow) return null;

  const showIos = platform === "ios" || (!platform && alwaysShow);

  return (
    <div style={{ marginTop: 32, borderTop: `1px solid ${COLOR.borderSubtle}`, paddingTop: 24 }}>
      <h3
        style={{
          ...TYPE.sectionHeading,
          color: COLOR.textPrimary,
          marginBottom: 12,
        }}
      >
        Add to home screen
      </h3>
      <p style={{ lineHeight: 1.7 }}>
        Play Weetzee like a real app — full screen, no browser bar.
      </p>
      {showIos ? (
        <div style={{ marginTop: 12, color: COLOR.textPrimary }}>
          <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
            1. Tap the <Share size={14} style={{ flexShrink: 0 }} /> share button in Safari
          </p>
          <p style={{ marginTop: 8 }}>
            2. Scroll down and tap <span style={{ fontWeight: WEIGHT.medium }}>&quot;Add to Home Screen&quot;</span>
          </p>
          <p style={{ marginTop: 8 }}>
            3. Tap <span style={{ fontWeight: WEIGHT.medium }}>&quot;Add&quot;</span>
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 12, color: COLOR.textPrimary }}>
          <p>
            1. Tap the <span style={{ fontWeight: WEIGHT.medium }}>⋮</span> menu in your browser
          </p>
          <p style={{ marginTop: 8 }}>
            2. Tap <span style={{ fontWeight: WEIGHT.medium }}>&quot;Add to Home screen&quot;</span> or <span style={{ fontWeight: WEIGHT.medium }}>&quot;Install app&quot;</span>
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3
        style={{
          ...TYPE.sectionHeading,
          color: COLOR.textPrimary,
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function RuleRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div style={{ marginTop: 6 }}>
      <span style={{ color: COLOR.textPrimary, fontWeight: WEIGHT.medium }}>{name}</span>
      <span style={{ color: COLOR.textMuted }}> — {desc}</span>
    </div>
  );
}

function ScoreTable({ children }: { children: React.ReactNode }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
      <tbody>{children}</tbody>
    </table>
  );
}

function ScoreRow({ name, value }: { name: string; value: string }) {
  return (
    <tr>
      <td style={{ ...TYPE.bodyRegular, color: COLOR.textPrimary, padding: "4px 8px 4px 0", whiteSpace: "nowrap", borderBottom: `1px solid ${COLOR.surfaceRaised}` }}>{name}</td>
      <td style={{ ...TYPE.bodyRegular, color: COLOR.textMuted, padding: "4px 0", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", borderBottom: `1px solid ${COLOR.surfaceRaised}` }}>{value}</td>
    </tr>
  );
}

function ToggleRow({
  label,
  desc,
  enabled,
  onToggle,
  disabled = false,
}: {
  label: string;
  desc: string;
  enabled: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={() => { if (disabled || !onToggle) return; playToggle(!enabled); onToggle(); }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div>
        <div style={{ ...TYPE.body, color: COLOR.textPrimary }}>{label}</div>
        <div style={{ ...TYPE.microRegular, color: COLOR.textMuted, marginTop: 2 }}>{desc}</div>
      </div>
      <div
        className="pressable"
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: enabled ? "#34c759" : COLOR.borderSubtle,
          position: "relative",
          transition: "background 200ms",
          flexShrink: 0,
          marginLeft: 16,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: COLOR.textPrimary,
            position: "absolute",
            top: 2,
            left: enabled ? 20 : 2,
            transition: `left 200ms ${EASE.spring}`,
          }}
        />
      </div>
    </div>
  );
}
