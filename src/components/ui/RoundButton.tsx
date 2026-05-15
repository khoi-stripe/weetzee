"use client";

/**
 * 100×100 round outline button used as the standard interstitial CTA.
 * Supports two variants (outline / filled) and accepts a custom accent
 * color (defaults to white).
 *
 *   <RoundButton onClick={...}>Cancel</RoundButton>            // outline white
 *   <RoundButton variant="filled" onClick={...}>Continue</RoundButton>
 *   <RoundButton color={player.color} variant="filled">Done</RoundButton>
 *
 * Style overrides (e.g. for entry/scale animations) merge over the defaults
 * via the `style` prop. The `pressable` class supplies the `:active` press.
 */

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { COLOR } from "@/lib/color";
import { TYPE } from "@/lib/type";

type Variant = "outline" | "filled";

type RoundButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
  children: ReactNode;
  /** Defaults to "outline". */
  variant?: Variant;
  /** Accent color used for outline + (filled) background. Defaults to white. */
  color?: string;
  /**
   * Text color override. By default outline = `color`, filled = inverse of
   * `color` (assumed dark/light contrast). Override when the accent color
   * doesn't follow the white/black contrast rule.
   */
  textColor?: string;
  /** Override the 100×100 default size (e.g. GameOver uses 109.67). */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function RoundButton({
  children,
  variant = "outline",
  color = COLOR.borderStrong,
  textColor,
  size = 100,
  className,
  style,
  type = "button",
  ...rest
}: RoundButtonProps) {
  const filled = variant === "filled";
  const resolvedTextColor = textColor ?? (filled ? COLOR.inverse : color);
  const background = filled ? color : "transparent";

  return (
    <button
      type={type}
      className={`flex items-center justify-center rounded-full pressable ${className ?? ""}`}
      style={{
        ...TYPE.body,
        textTransform: "uppercase",
        width: size,
        height: size,
        outline: `1px solid ${color}`,
        outlineOffset: -1,
        background,
        color: resolvedTextColor,
        cursor: rest.disabled ? "default" : "pointer",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
