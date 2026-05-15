"use client";

import { useState } from "react";
import { SplashIntro } from "@/components/SplashIntro";

export default function SplashDevPage() {
  const [key, setKey] = useState(0);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 32 }}>
      <SplashIntro key={key} forceShow />
      <button
        onClick={() => setKey((k) => k + 1)}
        style={{
          position: "relative",
          zIndex: 9999,
          padding: "10px 24px",
          background: "white",
          color: "black",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        Replay
      </button>
    </div>
  );
}
