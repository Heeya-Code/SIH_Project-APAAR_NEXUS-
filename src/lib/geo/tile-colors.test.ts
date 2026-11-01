// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { classify, contrast, INK, MUTED_TEXT, readableOn, SCALES, type RGB } from "./tile-colors";

test("every step of every palette has a text colour with WCAG AA contrast (>= 4.5)", () => {
  for (const [name, steps] of Object.entries(SCALES)) steps.forEach((bg, i) => {
    const fg = readableOn(bg);
    assert.ok(contrast(fg, bg) >= 4.5, `${name} step ${i}: ${contrast(fg, bg).toFixed(2)}`);
  });
});
test("muted label colour reads on the 'no value' and 'no institutions' tile fills", () => {
  for (const bg of [[238, 242, 248], [230, 237, 246]] as RGB[]) assert.ok(contrast(MUTED_TEXT, bg) >= 4.5);
});
test("palettes get monotonically darker", () => {
  for (const steps of Object.values(SCALES)) for (let i = 1; i < steps.length; i++) assert.ok(steps[i].reduce((a, b) => a + b) < steps[i - 1].reduce((a, b) => a + b));
});
test("classify covers 0..1 with five classes and clamps", () => {
  assert.deepEqual([0, 0.19, 0.2, 0.55, 0.99, 1, 1.4, -1].map(classify), [0, 0, 1, 2, 4, 4, 4, 0]);
});
test("ink is used on light fills and white on dark fills", () => {
  assert.deepEqual(readableOn(SCALES.blue[0]), INK); assert.deepEqual(readableOn(SCALES.blue[4]), [255, 255, 255]);
});
