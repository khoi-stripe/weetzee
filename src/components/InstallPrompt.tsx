"use client";

import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Share } from "lucide-react";

export function InstallPrompt() {
  const { showPrompt, isIOS, install, dismiss } = useInstallPrompt();

  if (!showPrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: "16px",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        background: "linear-gradient(transparent, rgba(0,0,0,0.9) 20%)",
        animation: "interstitial-in 300ms ease forwards",
      }}
    >
      <div
        className={isIOS ? "animate-scale-in" : ""}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 12,
          background: "rgba(30,30,30,0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",

        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#ffffff",
              margin: 0,
            }}
          >
            Install Weetzee
          </p>
          <p style={{ fontSize: 11, color: "#999999", margin: "4px 0 0" }}>
            {isIOS ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                Tap <Share size={12} /> then &quot;Add to Home Screen&quot;
              </span>
            ) : (
              "Add to your home screen for the best experience"
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={dismiss}
            className="pressable"
            style={{
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: "#999999",
              background: "none",
              border: "none",
    
              cursor: "pointer",
            }}
          >
            Later
          </button>
          {!isIOS && (
            <button
              onClick={install}
              className="pressable"
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 500,
                color: "#000000",
                background: "#ffffff",
                border: "none",
                borderRadius: 6,
      
                cursor: "pointer",
              }}
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
