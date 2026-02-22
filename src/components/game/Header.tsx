"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ===== Header =====

export function Header({
  showBack = true,
  rollBankingEnabled,
  onToggleRollBanking,
}: {
  showBack?: boolean;
  rollBankingEnabled?: boolean;
  onToggleRollBanking?: () => void;
}) {
  const router = useRouter();
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <div className="relative shrink-0 w-full" style={{ height: 48 }}>
        {showBack && (
          <button
            onClick={() => router.push("/")}
            className="absolute flex items-center justify-center pressable"
            style={{
              left: 16,
              top: 10,
              height: 28,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 14,
              fontWeight: 500,
              color: "#ffffff",
              background: "none",
              border: "none",
              padding: 0,
            }}
            aria-label="Exit"
          >
            Exit
          </button>
        )}
        <p
          className="absolute font-medium text-white text-center"
          style={{
            fontSize: 16,
            left: "50%",
            transform: "translateX(-50%)",
            top: 13.5,
            fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: 0,
          }}
        >
          Weetzee
        </p>
        <button
          onClick={() => setShowRules(true)}
          className="absolute flex items-center justify-center pressable"
          style={{
            right: 16,
            top: 10,
            height: 28,
            background: "none",
            border: "none",
            fontFamily: '"IBM Plex Mono", monospace',
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
          rollBankingEnabled={rollBankingEnabled}
          onToggleRollBanking={onToggleRollBanking}
        />
      )}
    </>
  );
}

// ===== Rules Modal =====

function RulesModal({
  onClose,
  rollBankingEnabled,
  onToggleRollBanking,
}: {
  onClose: () => void;
  rollBankingEnabled?: boolean;
  onToggleRollBanking?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 100,
        background: "#000000",
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
            fontFamily: '"IBM Plex Mono", monospace',
          }}
        >
          Rules
        </p>
        <button
          onClick={onClose}
          className="absolute flex items-center justify-center pressable"
          style={{
            right: 16,
            top: 10,
            width: 28,
            height: 28,
            background: "none",
            border: "none",
            fontFamily: '"IBM Plex Mono", monospace',
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
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 13,
          lineHeight: 1.6,
          color: "#cccccc",
        }}
      >
        <Section title="Objective">
          Score the most points by rolling five dice across 13 rounds.
        </Section>

        <Section title="Each turn">
          Roll all 5 dice, then optionally hold any dice and re-roll the rest — up to 3 rolls
          total per turn. After rolling, choose a scoring category.
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

        <Section title="Scoring a zero">
          You may place a zero in any unused category if your roll doesn&apos;t qualify.
        </Section>

        {onToggleRollBanking && (
          <div style={{ marginTop: 32, borderTop: "1px solid #333333", paddingTop: 24 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
                marginBottom: 12,
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              House rules
            </h3>
            <div
              onClick={onToggleRollBanking}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ color: "#ffffff", fontWeight: 500, fontSize: 13 }}>
                  Roll banking
                </div>
                <div style={{ color: "#999999", fontSize: 11, marginTop: 2 }}>
                  Bank unused rolls for future turns (max 3)
                </div>
              </div>
              <div
                className="pressable"
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: rollBankingEnabled ? "#34c759" : "#333333",
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
                    left: rollBankingEnabled ? 20 : 2,
                    transition: "left 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                />
              </div>
            </div>
          </div>
        )}
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
          fontFamily: '"IBM Plex Mono", monospace',
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
