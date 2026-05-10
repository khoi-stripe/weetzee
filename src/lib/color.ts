/**
 * Color tokens for Weetzee.
 *
 * The hex values here mirror the CSS custom properties in globals.css
 * (--surface-*, --text-*, --border-*). For inline styles we use the TS
 * constants directly (cheaper than var() lookups), and for class-based
 * styles we use the CSS vars.
 *
 * Example:
 *   <div style={{ background: COLOR.surfaceRaised, color: COLOR.textMuted }}>
 *
 * Player colors (--p1..p4) live in the dynamic `player.color` field, not
 * here, since they're shuffled per game.
 */

export const COLOR = {
  // ----- Surfaces -----
  /** Page background. */
  surfaceBg: "#000000",
  /** Sticky table headers, sidebar cells, raised tiles. */
  surfaceRaised: "#1a1a1a",
  /** Backdrop scrim behind interstitial dialogs. */
  surfaceOverlay: "rgba(0, 0, 0, 0.85)",

  // ----- Borders -----
  /** Outlined buttons, table grid, primary dividers on dark surfaces. */
  borderStrong: "#ffffff",
  /** Section dividers, subtle separators on raised surfaces. */
  borderSubtle: "#333333",

  // ----- Text -----
  /** Default body text on dark surface. Also the canvas color. */
  textPrimary: "#ffffff",
  /** Long-form readable copy (rules, descriptions). */
  textReadable: "#cccccc",
  /** Secondary descriptions and microcopy. */
  textMuted: "#999999",
  /** Disabled / tertiary (restore-purchase, etc.). */
  textDisabled: "#666666",

  // ----- Inverse (used on light/colored surfaces) -----
  /** Text/icon color used on white or player-color backgrounds. */
  inverse: "#000000",
} as const;
