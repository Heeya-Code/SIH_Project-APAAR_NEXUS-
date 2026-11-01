// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { buildClaims } from "./claims";
import { canonical, extractCode, newConsentReference, newStudentCode, newVerificationCode, qrSvg, signPayload, verifyPayload } from "./sign";

process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
const payload = () => ({ v: 1, cid: "EV-TEST-TEST-TEST", claims: { ENROLMENT_STATUS: "ENROLLED", PROGRAMME: "B.E. CSE" }, exp: "2027-01-01T00:00:00.000Z" });

test("a signed record verifies; the signature is deterministic for the same payload and key", () => {
  const s = signPayload(payload());
  assert.equal(verifyPayload(payload(), s.signature, s.payloadSha256, s.keyId), "OK");
  assert.equal(signPayload(payload()).signature, s.signature);
});
test("any change to the payload is detected", () => {
  const s = signPayload(payload());
  const tampered = payload(); tampered.claims.ENROLMENT_STATUS = "GRADUATED";
  assert.equal(verifyPayload(tampered, s.signature, s.payloadSha256, s.keyId), "HASH_MISMATCH");
  // an attacker who also recomputes the hash still cannot forge the signature
  const forged = signPayload(tampered);
  assert.equal(verifyPayload(tampered, s.signature, forged.payloadSha256, s.keyId), "BAD_SIGNATURE");
  assert.equal(verifyPayload(payload(), "AAAA", s.payloadSha256, s.keyId), "BAD_SIGNATURE");
});
test("a record signed under a different key is rejected", () => {
  const s = signPayload(payload());
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  assert.equal(verifyPayload(payload(), s.signature, s.payloadSha256, s.keyId), "UNKNOWN_KEY");
});
test("canonical form ignores key order", () => assert.equal(canonical({ b: 1, a: { d: 2, c: 3 } }), canonical({ a: { c: 3, d: 2 }, b: 1 })));
test("selective disclosure: only approved fields appear in the claims", () => {
  const src = { status: "ENROLLED", institutionName: "Sahyadri IT", programmeName: "B.E. CSE", academicYear: "2024-25", fullName: "Asha Kulkarni" };
  const c = buildClaims(["ENROLMENT_STATUS", "PROGRAMME"], src, new Date("2026-10-30"));
  assert.deepEqual(Object.keys(c).sort(), ["ENROLMENT_STATUS", "PROGRAMME"]);
  assert.ok(!JSON.stringify(c).includes("Asha") && !JSON.stringify(c).includes("Sahyadri"));
  assert.equal(buildClaims(["VERIFICATION_DATE"], src, new Date("2026-10-30")).VERIFICATION_DATE, "2026-10-30");
});
test("codes are well formed, unambiguous and unique", () => {
  const v = newVerificationCode(), c = newConsentReference(), s = newStudentCode();
  assert.match(v, /^EV-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/); assert.match(c, /^CR-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/); assert.match(s, /^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
  assert.equal(new Set(Array.from({ length: 2000 }, newVerificationCode)).size, 2000);
});
test("extractCode accepts a bare code, lower case with spaces, and a full scanned URL", () => {
  assert.equal(extractCode("ev-abcd-efgh-jkmn"), "EV-ABCD-EFGH-JKMN");
  assert.equal(extractCode("  EV-ABCD-EFGH-JKMN "), "EV-ABCD-EFGH-JKMN");
  assert.equal(extractCode("https://app.example/verifier/check?code=EV-ABCD-EFGH-JKMN"), "EV-ABCD-EFGH-JKMN");
});
test("QR round trip: the generated QR decodes (with the scanner's own library) to exactly what was encoded", async () => {
  const text = "https://app.example/verifier/check?code=EV-ABCD-EFGH-JKMN";
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size, scale = 8, quiet = 4, side = (n + quiet * 2) * scale;
  const rgba = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
    const i = ((((y + quiet) * scale + dy) * side) + (x + quiet) * scale + dx) * 4; rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
  }
  assert.equal(jsQR(rgba, side, side)?.data, text);
});
test("the QR carries only an opaque code: no APAAR ID, name or claim ever enters it", async () => {
  const svg = await qrSvg("https://app.example/verifier/check?code=EV-ABCD-EFGH-JKMN");
  assert.match(svg, /^<svg/); assert.ok(!/ENROLLED|Kulkarni|\d{12}/.test(svg));
});
