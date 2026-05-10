"use client";

/**
 * Square content card used inside a `<Scrim>`. Maxes out at the smaller of
 * 80vw / 80vh / 400px and is always 1:1, so the card looks the same on
 * portrait phones, landscape tablets, and desktop.
 *
 * Pair with `<Scrim>` and `<RoundButton>` to compose the standard
 * "square card with CTAs outside" interstitial:
 *
 *   <Scrim>
 *     <DialogCard>...</DialogCard>
 *     <div className="flex justify-center" style={{ gap: 16 }}>
 *       <RoundButton ... />
 *       <RoundButton ... />
 *     </div>
 *   </Scrim>
 */

import type { CSSProperties, ReactNode } from "react";
import { COLOR } from "@/lib/color";
import { DURATION, EASE } from "@/lib/motion";
import { RADIUS } from "@/lib/tokens";

type DialogCardProps = {
  children: ReactNode;
  /** Background of the card. Defaults to white. Use `player.color` for
   *  player-themed cards (Farkle bust, GameOver winner). */
  background?: string;
  /** Text color inside the card. Defaults to black. */
  color?: string;
  /** Set when an exit animation is in progress to swap the card animation. */
  exiting?: boolean;
  /**
   * "fade"   — card simply appears (default; relies on the parent Scrim
   *            for the visible animation).
   * "spinIn" — card spins+scales in for a more dramatic entry. Used for
   *            FarkleBust, GameOver, piggyback interstitial.
   */
  enter?: "fade" | "spinIn";
  /** Inner content padding. Defaults to "10%". */
  padding?: string | number;
  /** Vertical gap between content children. Defaults to 8. */
  gap?: number;
  /** Centers text by default. Override if you need left-aligned content. */
  textAlign?: CSSProperties["textAlign"];
  /** Override the default `min(80vw, 80vh, 400px)` outer max-width. */
  maxWidth?: string | number;
  className?: string;
  style?: CSSProperties;
};

export function DialogCard({
  children,
  background = COLOR.textPrimary,
  color = COLOR.inverse,
  exiting = false,
  enter = "fade",
  padding = "10%",
  gap = 8,
  textAlign = "center",
  maxWidth = "min(80vw, 80vh, 400px)",
  className,
  style,
}: DialogCardProps) {
  let animation: string | undefined;
  if (enter === "spinIn") {
    animation = exiting
      ? `scale-out ${DURATION.slow}ms ${EASE.spring} forwards`
      : `spin-in ${DURATION.expressive}ms ${EASE.standard} 150ms both`;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth,
        aspectRatio: "1 / 1",
      }}
    >
      <div
        className={`w-full h-full flex flex-col justify-center ${className ?? ""}`}
        style={{
          background,
          borderRadius: RADIUS.sm,
          color,
          padding,
          gap,
          textAlign,
          animation,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
