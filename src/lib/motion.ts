/**
 * Motion tokens — easing curves and durations used across animations.
 *
 * Inline-style usage:
 *   transition: `transform ${DURATION.slow}ms ${EASE.spring}`
 *
 * Keep `EASE` and `DURATION` thin and curated. If you find yourself adding
 * a one-off curve, consider whether it should replace one of these instead.
 */

export const EASE = {
  /** Playful overshoot pop. Use for "appear" and dice/button entries. */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  /** Gentle ease-out. Use for fades and most opacity transitions. */
  standard: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Symmetric ease-in-out. Use for offscreen exits and panel slides. */
  exit: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  /** Soft compress for `.pressable:active` style press-and-release feel. */
  pressable: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  /** Same shape as `pressable` but tuned for finer adjustments. */
  pressableSettle: "cubic-bezier(0.23, 1, 0.32, 1)",
} as const;

export const DURATION = {
  /** Hover/press color flickers and table-cell transitions. */
  fast: 150,
  /** Default UI transition (background, opacity, color swaps). */
  base: 200,
  /** Modal scrim fade-in, scoring sheet enter. */
  modal: 300,
  /** Page-level transitions and interstitial cards. */
  slow: 400,
  /** Fully expressive entries (dice spin-in, modal scale-in pop). */
  expressive: 500,
} as const;
