"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Share } from "lucide-react";
import { VISIBLE_RULESETS } from "@/lib/rulesets";
import { playTap, playToggle } from "@/lib/sounds";

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
  sequentialTargetsEnabled,
  onToggleSequentialTargets,
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
  onEndGame,
}: {
  showBack?: boolean;
  backLabel?: string;
  rulesetId?: string;
  rulesetName?: string;
  showAllRulesets?: boolean;
  rollBankingEnabled?: boolean;
  onToggleRollBanking?: () => void;
  multipleWeetzeesEnabled?: boolean;
  onToggleMultipleWeetzees?: () => void;
  sequentialTargetsEnabled?: boolean;
  onToggleSequentialTargets?: () => void;
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
  onEndGame?: () => void;
}) {
  const router = useRouter();
  const [showRules, setShowRules] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  function handleBack() {
    playTap();
    if (backLabel === "Exit") {
      setShowExitConfirm(true);
    } else {
      router.push("/");
    }
  }

  return (
    <>
      <div className="relative shrink-0 w-full" style={{ height: 48 }}>
        {showBack && (
          <button
            onClick={handleBack}
            className="absolute flex items-center justify-center pressable"
            style={{
              left: 4,
              top: 2,
              padding: "8px 12px",

              fontSize: 13,
              fontWeight: 500,
              color: "#ffffff",
              background: "none",
              border: "none",
            }}
            aria-label={backLabel}
          >
            {backLabel}
          </button>
        )}
        <p
          className="absolute font-medium text-white text-center"
          style={{
            fontSize: 16,
            left: "50%",
            transform: "translateX(-50%)",
            top: 13.5,

            letterSpacing: 0,
          }}
        >
          {rulesetName ?? "Weetzee"}
        </p>
        <button
          onClick={() => { playTap(); setShowRules(true); }}
          className="absolute flex items-center justify-center pressable"
          style={{
            right: 4,
            top: 2,
            padding: "8px 12px",
            background: "none",
            border: "none",

            fontSize: 13,
            fontWeight: 500,
            fontStyle: "normal",
            color: "#ffffff",
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
          sequentialTargetsEnabled={sequentialTargetsEnabled}
          onToggleSequentialTargets={onToggleSequentialTargets}
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
        />
      )}

      {showExitConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{
            zIndex: 200,
            background: "rgba(0, 0, 0, 0.85)",
            animation: "interstitial-in 200ms ease forwards",
          }}
        >
          <div
            style={{

              textAlign: "center",
              padding: 32,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: "#ffffff", marginBottom: 24 }}>
              End this game?
            </p>
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => { playTap(); setShowExitConfirm(false); }}
                className="flex items-center justify-center rounded-full pressable"
                style={{
                  width: 100,
                  height: 100,
                  outline: "1px solid #ffffff",
                  outlineOffset: -1,
                  background: "transparent",
    
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { playTap(); onEndGame?.(); router.push("/"); }}
                className="flex items-center justify-center rounded-full pressable"
                style={{
                  width: 100,
                  height: 100,
                  outline: "1px solid #ffffff",
                  outlineOffset: -1,
                  background: "#ffffff",
    
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#000000",
                  cursor: "pointer",
                }}
              >
                End game
              </button>
            </div>
          </div>
        </div>
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
        <p style={{ marginTop: 8, color: "#999999" }}>
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

function KeepYourHeadDownRules() {
  return (
    <>
      <Section title="Goal">
        <p>Lowest total score wins. Each round, try to hit a number target as closely as possible.</p>
      </Section>
      <Section title="Targets">
        <p>11 rounds with targets <b>10–20</b>. Each target is used once.</p>
      </Section>
      <Section title="Dice">
        <p>5 dice. Face <b>3 = 0 points</b>; all others score at face value (1, 2, 4, 5, 6).</p>
        <p style={{ marginTop: 8, color: "#999999" }}>The sum of all 5 dice determines your score each round.</p>
      </Section>
      <Section title="Rolling">
        <RuleRow name="Roll all 5" desc="Start each round by rolling all dice" />
        <RuleRow name="Hold & re-roll" desc="Hold any dice, then re-roll the rest" />
        <RuleRow name="Stop anytime" desc="After any roll, you can stop and score" />
        <p style={{ marginTop: 8, color: "#999999" }}>Maximum 3 rolls per round.</p>
      </Section>
      <Section title="Scoring">
        <p>After rolling, choose an unused target to assign your total against.</p>
        <ScoreTable>
          <ScoreRow name="Exact match" value="−3 pts (reward)" />
          <ScoreRow name="Any miss" value="difference × 3 pts" />
        </ScoreTable>
      </Section>
      <Section title="Strategy">
        <p style={{ color: "#999999" }}>Threes are worth 0 — great for low targets, but they make high targets harder to reach.</p>
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
        <p style={{ color: "#999999" }}>
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
    <div style={{ marginTop: 32, borderTop: "1px solid #333333", paddingTop: 24 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#ffffff",
          marginBottom: 4,

        }}
      >
        {name}
      </h2>
      <p style={{ color: "#999999", fontSize: 12, marginBottom: 8 }}>
        {description} — {diceCount} dice
        {id === "farkle" ? "" : ", 3 rolls per turn"}
        {id === "keep-your-head-down" ? ", lowest score wins" : ", highest score wins"}
      </p>
      {id === "weetzee" && <ClassicRules />}
      {id === "keep-your-head-down" && <KeepYourHeadDownRules />}
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
  sequentialTargetsEnabled,
  onToggleSequentialTargets,
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
  sequentialTargetsEnabled?: boolean;
  onToggleSequentialTargets?: () => void;
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
}) {
  const router = useRouter();
  const isAbout = !rulesetId && !showAllRulesets;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 100,
        background: "#000000",
        paddingTop: "env(safe-area-inset-top, 0px)",
        animation: "interstitial-in 200ms ease forwards",
      }}
    >
      {/* Modal header */}
      <div className="relative shrink-0 w-full" style={{ height: 48 }}>
        <p
          className="absolute font-medium text-white text-center"
          style={{
            fontSize: 13,
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
            right: 4,
            top: 2,
            padding: "8px 12px",
            background: "none",
            border: "none",

            fontSize: 20,
            fontWeight: 400,
            color: "#ffffff",
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

          fontSize: 13,
          lineHeight: 1.6,
          color: "#cccccc",
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
                  borderBottom: "1px solid #333333",
                }}
              >
                <div>
                  <span style={{ color: "#999999", fontSize: 12 }}>Playing</span>
                  <span style={{ color: "#ffffff", fontWeight: 500, marginLeft: 8, fontSize: 13 }}>
                    {rulesetName}
                  </span>
                </div>
                <button
                  onClick={() => { playTap(); (onChangeRuleset ?? (() => router.push("/")))(); }}
                  className="pressable"
                  style={{
                    background: "none",
                    outline: "1px solid #666666",
                    outlineOffset: -1,
                    borderRadius: 4,
                    padding: "4px 10px",
    
                    fontSize: 12,
                    color: "#999999",
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
            ) : rulesetId === "keep-your-head-down" ? (
              <KeepYourHeadDownRules />
            ) : rulesetId === "farkle" ? (
              <FarkleRules />
            ) : (
              <ClassicRules />
            )}

            {(onToggleRollBanking || onToggleMultipleWeetzees || onToggleSequentialTargets || onToggleScoringHints || onToggleSixDice !== undefined || onToggleOrderedScoring !== undefined || onToggleOpeningThreshold || onTogglePiggyback) && (
              <div style={{ marginTop: 32, borderTop: "1px solid #333333", paddingTop: 24 }}>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#ffffff",
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
                {sequentialTargetsEnabled !== undefined && (
                  <ToggleRow
                    label="Sequential targets"
                    desc={onToggleSequentialTargets ? "Must score targets in order (10, 11, ... 20)" : "Must score targets in order (set before game starts)"}
                    enabled={!!sequentialTargetsEnabled}
                    onToggle={onToggleSequentialTargets}
                    disabled={!onToggleSequentialTargets}
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

            <InstallSection />
          </>
        )}
      </div>
    </div>
  );
}

function AboutContent() {
  return (
    <>
      <Section title="What is Weetzee?">
        <p>
          Weetzee is a free dice game you can play right from your phone — no app store needed.
          Pass the phone with friends or play solo.
        </p>
      </Section>

      <Section title="How it works">
        <p>
          Pick how many players, choose a game, and start rolling.
          Each turn you get up to 3 rolls — hold the dice you like and re-roll the rest, then pick a
          scoring category. Play through all categories and the highest score wins.
        </p>
      </Section>

      <Section title="Games">
        {VISIBLE_RULESETS.map((r) => (
          <div key={r.id} style={{ marginTop: 10 }}>
            <span style={{ color: "#ffffff", fontWeight: 500 }}>{r.name}</span>
            <span style={{ color: "#999999" }}>
              {r.id === "weetzee" && " — The standard game. 5 dice, 13 categories, highest score wins."}
              {r.id === "keep-your-head-down" && " — Same categories, but lowest score wins. You must use all 3 rolls and score your highest available category."}
              {r.id === "kismet" && " — Dice have colored pips. New color-based categories like flushes and same-color full houses."}
              {r.id === "farkle" && " — Push your luck! Set aside scoring dice and keep rolling, or bank your points. First to 10,000 wins."}
            </span>
          </div>
        ))}
      </Section>

      <InstallSection alwaysShow />
    </>
  );
}

function HouseRulesInfo() {
  return (
    <Section title="House rules">
      <p>Optional rules for Weetzee and Kismet. Toggle them from the settings menu during play.</p>
      <div style={{ marginTop: 10 }}>
        <span style={{ color: "#ffffff", fontWeight: 500 }}>Roll banking</span>
        <span style={{ color: "#999999" }}> — Bank unused rolls for future turns, up to 3 extra.</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={{ color: "#ffffff", fontWeight: 500 }}>Multiple Weetzees</span>
        <span style={{ color: "#999999" }}> — Score extra Weetzees for 100 bonus points each.</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={{ color: "#ffffff", fontWeight: 500 }}>6 dice</span>
        <span style={{ color: "#999999" }}> — Play with 6 dice instead of 5. Must be set before the game starts.</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={{ color: "#ffffff", fontWeight: 500 }}>Ordered scoring</span>
        <span style={{ color: "#999999" }}> — Must score categories from top to bottom. Must be set before the game starts.</span>
      </div>
    </Section>
  );
}

function InstallSection({ alwaysShow = false }: { alwaysShow?: boolean }) {
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
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
    <div style={{ marginTop: 32, borderTop: "1px solid #333333", paddingTop: 24 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#ffffff",
          marginBottom: 12,

        }}
      >
        Add to home screen
      </h3>
      <p style={{ lineHeight: 1.7 }}>
        Play Weetzee like a real app — full screen, no browser bar.
      </p>
      {showIos ? (
        <div style={{ marginTop: 12, color: "#ffffff" }}>
          <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
            1. Tap the <Share size={14} style={{ flexShrink: 0 }} /> share button in Safari
          </p>
          <p style={{ marginTop: 8 }}>
            2. Scroll down and tap <span style={{ fontWeight: 500 }}>&quot;Add to Home Screen&quot;</span>
          </p>
          <p style={{ marginTop: 8 }}>
            3. Tap <span style={{ fontWeight: 500 }}>&quot;Add&quot;</span>
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 12, color: "#ffffff" }}>
          <p>
            1. Tap the <span style={{ fontWeight: 500 }}>⋮</span> menu in your browser
          </p>
          <p style={{ marginTop: 8 }}>
            2. Tap <span style={{ fontWeight: 500 }}>&quot;Add to Home screen&quot;</span> or <span style={{ fontWeight: 500 }}>&quot;Install app&quot;</span>
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
          fontSize: 13,
          fontWeight: 600,
          color: "#ffffff",
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
      <span style={{ color: "#ffffff", fontWeight: 500 }}>{name}</span>
      <span style={{ color: "#999999" }}> — {desc}</span>
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
      <td style={{ color: "#ffffff", fontWeight: 400, padding: "4px 8px 4px 0", fontSize: 13, whiteSpace: "nowrap", borderBottom: "1px solid #1a1a1a" }}>{name}</td>
      <td style={{ color: "#999999", padding: "4px 0", fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", borderBottom: "1px solid #1a1a1a" }}>{value}</td>
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
        <div style={{ color: "#ffffff", fontWeight: 500, fontSize: 13 }}>{label}</div>
        <div style={{ color: "#999999", fontSize: 11, marginTop: 2 }}>{desc}</div>
      </div>
      <div
        className="pressable"
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: enabled ? "#34c759" : "#333333",
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
            background: "#ffffff",
            position: "absolute",
            top: 2,
            left: enabled ? 20 : 2,
            transition: "left 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>
    </div>
  );
}
