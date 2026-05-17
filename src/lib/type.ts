/**
 * Type tokens for Weetzee.
 *
 * Single typeface (IBM Plex Mono, set on <body> in globals.css).
 * 5 sizes × 5 weights, with semantic styles below for the common cases.
 *
 * Use semantic styles by spreading them into an inline style prop:
 *
 *   <p style={{ ...TYPE.body, color: COLOR.textPrimary }}>Hello</p>
 *
 * Drop down to the SIZE / WEIGHT primitives only when you need a one-off
 * combination not covered by a semantic.
 */
import type { CSSProperties } from "react";

export const SIZE = {
  micro: 12, // hints, descriptions, secondary actions, eyebrows
  body: 13, // default body text and button labels
  title: 16, // page titles, modal prompts
  headline: 20, // hero titles in interstitials
  subDisplay: 32, // large labels and interstitial callouts
  display: 48, // giant numeric displays (FarkleBust, GameOver)
} as const;

export const WEIGHT = {
  regular: 400, // table-cell data, glyph icons (× close)
  medium: 500, // standard body and button labels
  semibold: 600, // section headings (h3) and emphasis on data values
  bold: 700, // hero titles
  extrabold: 800, // 48px display numbers only
} as const;

export const TYPE = {
  // ----- Body (13px) -----
  body: { fontSize: SIZE.body, fontWeight: WEIGHT.medium, lineHeight: 1.2 },
  bodyRegular: { fontSize: SIZE.body, fontWeight: WEIGHT.regular, lineHeight: 1.2 },
  bodyEmphasis: { fontSize: SIZE.body, fontWeight: WEIGHT.semibold, lineHeight: 1.2 },

  // ----- Micro (12px) -----
  micro: { fontSize: SIZE.micro, fontWeight: WEIGHT.medium, lineHeight: 1.2 },
  microRegular: { fontSize: SIZE.micro, fontWeight: WEIGHT.regular, lineHeight: 1.2 },

  /** Uppercase label, used as a section eyebrow. */
  eyebrow: {
    fontSize: SIZE.micro,
    fontWeight: WEIGHT.medium,
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: 1.2,
  },

  /** h3 section heading inside modals / settings. */
  sectionHeading: { fontSize: SIZE.body, fontWeight: WEIGHT.semibold, lineHeight: 1.2 },

  // ----- Title (16px) -----
  title: { fontSize: SIZE.title, fontWeight: WEIGHT.medium, lineHeight: 1.2 },
  titleBold: { fontSize: SIZE.title, fontWeight: WEIGHT.bold, lineHeight: 1.2 },

  // ----- Headline (20px) -----
  headline: { fontSize: SIZE.headline, fontWeight: WEIGHT.bold, lineHeight: 1.2 },

  // ----- Sub-display (32px) -----
  subDisplay: { fontSize: SIZE.subDisplay, fontWeight: WEIGHT.extrabold, lineHeight: 1 },
  subDisplayBold: { fontSize: SIZE.subDisplay, fontWeight: WEIGHT.bold, lineHeight: 1 },

  // ----- Display (48px) -----
  display: { fontSize: SIZE.display, fontWeight: WEIGHT.extrabold, lineHeight: 1 },
  displayBold: { fontSize: SIZE.display, fontWeight: WEIGHT.bold, lineHeight: 1 },
} as const satisfies Record<string, CSSProperties>;
