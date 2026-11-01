// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Classed (5-step) tile palettes. Steps are spaced so that EVERY step has a text colour
// (white or ink) that meets WCAG AA contrast (>= 4.5:1). A continuous gradient cannot guarantee this,
// because mid-tones sit exactly where white and dark text both fall short.
export type RGB = [number, number, number];

export const SCALES = {
  blue: [[220, 232, 248], [176, 203, 238], [124, 163, 222], [27, 86, 170], [18, 48, 90]] as RGB[],
  teal: [[214, 240, 238], [158, 218, 214], [96, 190, 184], [12, 125, 120], [11, 89, 86]] as RGB[],
};
export type ScaleName = keyof typeof SCALES;

const lum = ([r, g, b]: RGB) => { const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const contrast = (a: RGB, b: RGB) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

export const WHITE: RGB = [255, 255, 255];
export const INK: RGB = [10, 31, 61];
export const MUTED_TEXT: RGB = [71, 88, 113];

/** Maps a 0..1 share of the maximum to one of the five classes. */
export const classify = (k: number) => Math.min(4, Math.max(0, Math.floor(k * 5)));
export const readableOn = (bg: RGB): RGB => (contrast(WHITE, bg) >= contrast(INK, bg) ? WHITE : INK);
export const css = (c: RGB) => `rgb(${c.join(",")})`;
