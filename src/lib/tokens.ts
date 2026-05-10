/**
 * Layout / structural tokens.
 *
 * - `Z`      — z-index layering, single source of truth.
 * - `RADIUS` — corner radii for cards, buttons, and pill chips.
 *
 * These are intentionally tiny scales. Resist the urge to add new entries
 * unless you genuinely need a new layer or a new shape.
 */

export const Z = {
  /** Sticky table headers / footers within a scroll container. */
  sticky: 3,
  /** In-game interstitials (player turn, Farkle bust, piggyback). */
  interstitial: 50,
  /** Player score bar — must sit above interstitials so it stays visible. */
  playerBar: 55,
  /** Toasts and bottom prompts (UpdatePrompt, InstallPrompt) — must sit
   *  above the player bar so a "Reload" prompt is never hidden behind it. */
  toast: 75,
  /** Top-level modals (Rules, settings sheet, exit confirm). */
  modal: 100,
  /** Modals that sit *above* other modals (Continue prompt, Score confirm). */
  modalAbove: 200,
  /** Splash screen (must cover everything during boot). */
  splash: 9000,
  /** Landscape-lock takeover (highest of all). */
  rotateLock: 9999,
} as const;

export const RADIUS = {
  /** Cards, table cells, modal content cards. */
  sm: 4,
  /** Pills (rule "Change" button, install/update buttons). */
  md: 6,
  /** Difficulty selector chips. */
  lg: 8,
  /** Bottom toast/prompt cards. */
  xl: 12,
} as const;
