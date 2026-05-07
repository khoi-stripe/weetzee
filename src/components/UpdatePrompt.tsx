"use client";

import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { playTap } from "@/lib/sounds";

export function UpdatePrompt() {
  const { updateReady, applyUpdate, dismiss } = useServiceWorkerUpdate();

  if (!updateReady) return null;

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
          <p style={{ fontSize: 13, fontWeight: 500, color: "#ffffff", margin: 0 }}>
            Update available
          </p>
          <p style={{ fontSize: 11, color: "#999999", margin: "4px 0 0" }}>
            Reload to load the latest version.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => { playTap(); dismiss(); }}
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
          <button
            onClick={() => { playTap(); applyUpdate(); }}
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
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
