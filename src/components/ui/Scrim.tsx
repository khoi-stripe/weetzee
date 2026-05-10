"use client";

/**
 * Full-bleed dark scrim used behind interstitial dialogs. Centers its
 * children with a vertical gap so a square card can sit above a row of
 * action buttons.
 *
 * Animations: fade in/out via the `interstitial-in` / `interstitial-out`
 * keyframes in globals.css. Pass `exiting` to play the exit animation.
 */

import type { CSSProperties, ReactNode } from "react";
import { COLOR } from "@/lib/color";
import { DURATION } from "@/lib/motion";
import { Z } from "@/lib/tokens";

type ScrimProps = {
  children: ReactNode;
  exiting?: boolean;
  /** Defaults to `Z.modalAbove`. Use `Z.interstitial` for in-game overlays. */
  zIndex?: number;
  /** Override scrim background. Defaults to the standard 85% black. */
  background?: string;
  /**
   * "fixed"    — covers the viewport. Use for top-level modals (default).
   * "absolute" — covers the nearest positioned ancestor. Use when the scrim
   *              should only cover the game viewport (Farkle bust, piggyback).
   */
  position?: "fixed" | "absolute";
  /** Customize entry duration (default: `DURATION.base`). */
  enterDuration?: number;
  /** Customize exit duration (default: `DURATION.modal`). */
  exitDuration?: number;
  className?: string;
  style?: CSSProperties;
};

export function Scrim({
  children,
  exiting = false,
  zIndex = Z.modalAbove,
  background = COLOR.surfaceOverlay,
  position = "fixed",
  enterDuration = DURATION.base,
  exitDuration = DURATION.modal,
  className,
  style,
}: ScrimProps) {
  return (
    <div
      className={`${position} inset-0 flex flex-col items-center justify-center ${className ?? ""}`}
      style={{
        zIndex,
        background,
        padding: 16,
        gap: 24,
        animation: exiting
          ? `interstitial-out ${exitDuration}ms ease forwards`
          : `interstitial-in ${enterDuration}ms ease forwards`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
