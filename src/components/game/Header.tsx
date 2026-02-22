"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Share } from "lucide-react";
import { ALL_RULESETS } from "@/lib/rulesets";
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
              left: 16,
              top: 10,
              height: 28,

              fontSize: 14,
              fontWeight: 500,
              color: "#ffffff",
              background: "none",
              border: "none",
              padding: 0,
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
          Weetzee
        </p>
        <button
          onClick={() => { playTap(); setShowRules(true); }}
          className="absolute flex items-center justify-center pressable"
          style={{
            right: 16,
            top: 10,
            height: 28,
            background: "none",
            border: "none",

            fontSize: 14,
            fontWeight: 500,
            fontStyle: "normal",
            color: "#ffffff",
            padding: 0,
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
            <p style={{ fontSize: 16, fontWeight: 500, color: "#ffffff", marginBottom: 24 }}>
              End this game?
            </p>
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => { playTap(); setShowExitConfirm(false); }}
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
                onClick={() => { playTap(); onEndGame?.(); router.push("/"); }}
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
        <RuleRow name="Ones – Sixes" desc="Sum of the matching face value" />
        <p style={{ marginTop: 8, color: "#999999" }}>
          Bonus: Score 35 extra points if upper section totals 63 or more.
        </p>
      </Section>
      <Section title="Lower section">
        <RuleRow name="3 of a kind" desc="Sum of all dice (need 3 matching)" />
        <RuleRow name="4 of a kind" desc="Sum of all dice (need 4 matching)" />
        <RuleRow name="Full house" desc="25 pts — three of one + pair of another" />
        <RuleRow name="Sm. straight" desc="30 pts — four sequential dice" />
        <RuleRow name="Lg. straight" desc="40 pts — five sequential dice" />
        <RuleRow name="Chance" desc="Sum of all dice (no requirement)" />
        <RuleRow name="Weetzee" desc="50 pts — all five dice the same" />
      </Section>
    </>
  );
}

function RaceToBottomRules() {
  return (
    <>
      <Section title="Upper section">
        <RuleRow name="Ones – Sixes" desc="Sum of the matching face value" />
        <p style={{ marginTop: 8, color: "#999999" }}>
          Bonus: 35 points if upper section totals 63+. (Works against you here!)
        </p>
      </Section>
      <Section title="Lower section">
        <p>Same categories as Classic, but the lowest total wins.</p>
        <p style={{ marginTop: 8, color: "#999999" }}>
          Strategy: try to score 0 in as many categories as possible.
        </p>
      </Section>
    </>
  );
}

function ALittleHelpRules() {
  return (
    <>
      <Section title="Upper section">
        <RuleRow name="Ones – Sixes" desc="Sum of the matching face value" />
        <p style={{ marginTop: 8, color: "#999999" }}>
          Bonus: Score 35 extra points if upper section totals 63 or more.
        </p>
      </Section>
      <Section title="Lower section">
        <RuleRow name="3 of a kind" desc="Sum of all dice (need 3 matching)" />
        <RuleRow name="4 of a kind" desc="Sum of all dice (need 4 matching)" />
        <RuleRow name="Full house" desc="25 pts — three of one + pair of another" />
        <RuleRow name="Sm. straight" desc="30 pts — four sequential dice" />
        <RuleRow name="Lg. straight" desc="40 pts — five sequential dice" />
        <RuleRow name="Chance" desc="Sum of all dice (no requirement)" />
        <RuleRow name="Weetzee" desc="50 pts — all six dice the same" />
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
        <RuleRow name="Aces – Sixes" desc="Sum of the matching face value" />
        <p style={{ marginTop: 8, color: "#999999" }}>
          Tiered bonus: 35 pts at 63+, 55 pts at 71+, 75 pts at 78+.
        </p>
      </Section>
      <Section title="Kismet section">
        <RuleRow name="2 Pair Same Color" desc="Sum of all dice (two pairs sharing a pip color)" />
        <RuleRow name="3 of a kind" desc="Sum of all dice (need 3 matching)" />
        <RuleRow name="Straight" desc="30 pts — five sequential dice" />
        <RuleRow name="Flush" desc="35 pts — all five dice the same color" />
        <RuleRow name="Full House" desc="Sum + 15 — three of one + pair of another" />
        <RuleRow name="Full House SC" desc="Sum + 20 — full house, all same color" />
        <RuleRow name="4 of a kind" desc="Sum + 25 (need 4 matching)" />
        <RuleRow name="Yarborough" desc="Sum of all dice (no requirement)" />
        <RuleRow name="Kismet" desc="Sum + 50 — all five dice the same" />
      </Section>
    </>
  );
}

function EverythingInOrderRules() {
  return (
    <>
      <Section title="Constraint">
        <p>You must score categories from top to bottom — no skipping ahead.</p>
        <p style={{ marginTop: 8, color: "#999999" }}>
          Exception: Weetzee may be scored at any time.
        </p>
      </Section>
      <Section title="Upper section">
        <RuleRow name="Ones – Sixes" desc="Sum of the matching face value" />
        <p style={{ marginTop: 8, color: "#999999" }}>
          Bonus: Score 35 extra points if upper section totals 63 or more.
        </p>
      </Section>
      <Section title="Lower section">
        <RuleRow name="3 of a kind" desc="Sum of all dice (need 3 matching)" />
        <RuleRow name="4 of a kind" desc="Sum of all dice (need 4 matching)" />
        <RuleRow name="Full house" desc="25 pts — three of one + pair of another" />
        <RuleRow name="Sm. straight" desc="30 pts — four sequential dice" />
        <RuleRow name="Lg. straight" desc="40 pts — five sequential dice" />
        <RuleRow name="Chance" desc="Sum of all dice (no requirement)" />
        <RuleRow name="Weetzee" desc="50 pts — all five dice the same" />
      </Section>
    </>
  );
}

function GameRulesBlock({ id, name, diceCount, description }: { id: string; name: string; diceCount: number; description: string }) {
  return (
    <div style={{ marginTop: 32, borderTop: "1px solid #333333", paddingTop: 24 }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#ffffff",
          marginBottom: 4,

        }}
      >
        {name}
      </h2>
      <p style={{ color: "#999999", fontSize: 12, marginBottom: 8 }}>
        {description} — {diceCount} dice, 3 rolls per turn
        {id === "race-to-bottom" ? ", lowest score wins" : ", highest score wins"}
      </p>
      {id === "classic" && <ClassicRules />}
      {id === "race-to-bottom" && <RaceToBottomRules />}
      {id === "a-little-help" && <ALittleHelpRules />}
      {id === "kismet" && <KismetRules />}
      {id === "everything-in-order" && <EverythingInOrderRules />}
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
}) {
  const router = useRouter();
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
            fontSize: 16,
            left: "50%",
            transform: "translateX(-50%)",
            top: 13.5,

          }}
        >
          Rules
        </p>
        <button
          onClick={() => { playTap(); onClose(); }}
          className="absolute flex items-center justify-center pressable"
          style={{
            right: 16,
            top: 10,
            width: 28,
            height: 28,
            background: "none",
            border: "none",

            fontSize: 20,
            fontWeight: 400,
            color: "#ffffff",
            padding: 0,
            lineHeight: 1,
          }}
          aria-label="Close rules"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          padding: "0 24px 48px",

          fontSize: 13,
          lineHeight: 1.6,
          color: "#cccccc",
        }}
      >
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
              <span style={{ color: "#ffffff", fontWeight: 500, marginLeft: 8, fontSize: 14 }}>
                {rulesetName}
              </span>
            </div>
            <button
              onClick={() => { playTap(); (onChangeRuleset ?? (() => router.push("/")))(); }}
              className="pressable"
              style={{
                background: "none",
                border: "1px solid #666666",
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

        <Section title="How to play">
          Roll your dice, then optionally hold any and re-roll the rest — up to 3 rolls per turn.
          After rolling, choose a scoring category. You may place a zero in any unused category if
          your roll doesn&apos;t qualify.
        </Section>

        {showAllRulesets ? (
          ALL_RULESETS.map((r) => (
            <GameRulesBlock key={r.id} id={r.id} name={r.name} diceCount={r.diceCount} description={r.description} />
          ))
        ) : rulesetId === "kismet" ? (
          <KismetRules />
        ) : rulesetId === "race-to-bottom" ? (
          <RaceToBottomRules />
        ) : rulesetId === "a-little-help" ? (
          <ALittleHelpRules />
        ) : rulesetId === "everything-in-order" ? (
          <EverythingInOrderRules />
        ) : (
          <ClassicRules />
        )}

        {(onToggleRollBanking || onToggleMultipleWeetzees) && (
          <div style={{ marginTop: 32, borderTop: "1px solid #333333", paddingTop: 24 }}>
            <h3
              style={{
                fontSize: 14,
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
          </div>
        )}

        <InstallSection />
      </div>
    </div>
  );
}

function InstallSection() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div style={{ marginTop: 32, borderTop: "1px solid #333333", paddingTop: 24 }}>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#ffffff",
          marginBottom: 12,

        }}
      >
        Install on your device
      </h3>
      <p style={{ lineHeight: 1.7 }}>
        Play Weetzee like a real app — no browser, works offline.
      </p>
      <div style={{ marginTop: 12, color: "#ffffff" }}>
        <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
          1. Tap the <Share size={14} style={{ flexShrink: 0 }} /> share button
        </p>
        <p style={{ marginTop: 8 }}>
          2. Scroll down and tap <span style={{ fontWeight: 500 }}>&quot;Add to Home Screen&quot;</span>
        </p>
        <p style={{ marginTop: 8 }}>
          3. Tap <span style={{ fontWeight: 500 }}>&quot;Add&quot;</span>
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3
        style={{
          fontSize: 14,
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

function ToggleRow({
  label,
  desc,
  enabled,
  onToggle,
}: {
  label: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={() => { playToggle(!enabled); onToggle(); }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        cursor: "pointer",
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
