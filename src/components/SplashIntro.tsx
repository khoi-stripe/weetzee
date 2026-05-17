"use client";

import { useState, useEffect } from "react";
import { COLOR } from "@/lib/color";
import { EASE } from "@/lib/motion";
import { Z } from "@/lib/tokens";
import { PLAYER_COLORS } from "@/lib/types";

const SESSION_KEY = "weetzee-splash-shown";

// Progressive stagger: each layer waits a bit longer than the previous.
// layerIndex 0 = white (always 0ms), 1..N = colored layers in order.
function layerDelay(index: number): number {
  const STEP = 80;
  return index * STEP;
}
const MAX_LAYER_DELAY = layerDelay(PLAYER_COLORS.length);

function LogoSVG({
  color,
  animationDelay,
  phase,
  withBackground = false,
}: {
  color: string;
  animationDelay: number;
  phase: string;
  withBackground?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        width: "calc(100vw - 80px)",
        height: "calc(100vw - 80px)",
        maxWidth: "calc(100vh - 80px)",
        maxHeight: "calc(100vh - 80px)",
        animation: phase === "intro"
          ? `splash-spin-scale 1600ms ${animationDelay}ms ${EASE.standard} forwards`
          : undefined,
        transform: phase !== "intro" ? "rotate(0deg) scale(1)" : "rotate(-720deg) scale(0)",
        opacity: phase === "intro" ? 0 : 1,
        mixBlendMode: withBackground ? undefined : "screen",
      }}
    >
      {withBackground && <path d="M372 96H140C115.699 96 96 115.699 96 140V372C96 396.301 115.699 416 140 416H372C396.301 416 416 396.301 416 372V140C416 115.699 396.301 96 372 96Z" fill={COLOR.surfaceBg} fillOpacity={1} />}
      <path d="M372 96H140C115.699 96 96 115.699 96 140V372C96 396.301 115.699 416 140 416H372C396.301 416 416 396.301 416 372V140C416 115.699 396.301 96 372 96Z" stroke={color} strokeWidth="5"/>
      <path d="M180 206C194.359 206 206 194.359 206 180C206 165.641 194.359 154 180 154C165.641 154 154 165.641 154 180C154 194.359 165.641 206 180 206Z" fill={color}/>
      <path d="M332 358C346.359 358 358 346.359 358 332C358 317.641 346.359 306 332 306C317.641 306 306 317.641 306 332C306 346.359 317.641 358 332 358Z" fill={color}/>
      <path d="M182.875 364.464L148.798 335.365L152.192 331.971L171.606 348.76L181.834 357.63L182.196 357.268L166.945 333.69L171.199 329.436L194.777 344.687L195.139 344.325L186.269 334.098L169.479 314.683L172.783 311.38L201.882 345.456L196.406 350.932L173.688 335.908L173.326 336.27L188.35 358.988L182.875 364.464ZM210.01 337.328L178.422 305.74L197.881 286.281L201.185 289.584L185.527 305.243L196.162 315.878L211.277 300.762L214.581 304.066L199.465 319.181L210.508 330.223L226.166 314.565L229.469 317.869L210.01 337.328ZM237.145 310.193L205.557 278.605L225.017 259.146L228.32 262.449L212.662 278.107L223.297 288.742L238.412 273.627L241.716 276.931L226.601 292.046L237.643 303.088L253.301 287.43L256.605 290.734L237.145 310.193ZM247.4 243.369L275.684 271.654L271.883 275.455L243.599 247.171L233.054 257.715L229.751 254.412L254.641 229.521L257.945 232.825L247.4 243.369ZM312.323 235.015L289.515 257.823L286.121 254.429L279.106 211.663L262 228.77L258.696 225.466L279.966 204.196L283.36 207.59L290.329 250.402L309.02 231.711L312.323 235.015ZM318.551 228.787L286.963 197.2L306.422 177.74L309.726 181.044L294.068 196.702L304.703 207.337L319.818 192.222L323.121 195.525L308.006 210.64L319.048 221.682L334.707 206.024L338.01 209.328L318.551 228.787ZM345.686 201.652L314.098 170.064L333.558 150.605L336.861 153.908L321.203 169.567L331.838 180.201L346.953 165.086L350.257 168.39L335.142 183.505L346.184 194.547L361.842 178.889L365.145 182.193L345.686 201.652Z" fill={color}/>
    </svg>
  );
}

export function SplashIntro({ forceShow = false }: { forceShow?: boolean }) {
  const [phase, setPhase] = useState<"blank" | "intro" | "hold" | "fade" | "done">("blank");

  useEffect(() => {
    const forceReplay = forceShow || (typeof window !== "undefined" && window.location.hash === "#splash");

    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";
      if (!alreadyShown && !forceReplay) sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}

    if (alreadyShown && !forceReplay) {
      setPhase("done");
      return;
    }

    requestAnimationFrame(() => setPhase("intro"));
    const holdTimer = setTimeout(() => setPhase("hold"), 1600 + MAX_LAYER_DELAY + 400);
    const fadeTimer = setTimeout(() => setPhase("fade"), 3200 + MAX_LAYER_DELAY + 400);
    const doneTimer = setTimeout(() => setPhase("done"), 3900 + MAX_LAYER_DELAY + 400);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z.splash,
        background: COLOR.surfaceBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === "fade" ? 0 : 1,
        transform: phase === "fade" ? "scale(0.95)" : "scale(1)",
        filter: phase === "fade" ? "blur(4px)" : "blur(0px)",
        transition: phase === "fade"
          ? "opacity 600ms ease, transform 600ms ease, filter 600ms ease"
          : undefined,
        pointerEvents: "none",
      }}
    >
      {phase !== "blank" && (
        <div style={{ position: "relative", width: "calc(100vw - 80px)", height: "calc(100vw - 80px)", maxWidth: "calc(100vh - 80px)", maxHeight: "calc(100vh - 80px)" }}>
          {/* Colored layers — rendered first so they sit behind white */}
          {[...PLAYER_COLORS].reverse().map((color, i) => {
            const layerIndex = PLAYER_COLORS.length - i;
            return (
              <LogoSVG key={color} color={color} animationDelay={layerDelay(layerIndex)} phase={phase} />
            );
          })}
          {/* White logo on top */}
          <LogoSVG color="white" animationDelay={0} phase={phase} withBackground />
        </div>
      )}
    </div>
  );
}
