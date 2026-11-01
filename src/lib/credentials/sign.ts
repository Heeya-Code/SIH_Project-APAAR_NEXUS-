// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Signed verification records. Ed25519 over a canonical JSON payload. The key is derived from a server secret,
// so no extra setup is needed; set CREDENTIAL_SIGNING_SEED (base64, 32 bytes) to use a dedicated key.
import { createHash, createPrivateKey, createPublicKey, hkdfSync, randomInt, sign as edSign, verify as edVerify, type KeyObject } from "node:crypto";
import QRCode from "qrcode";
import { stableStringify } from "@/lib/crypto";

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function seed(): Buffer {
  const explicit = process.env.CREDENTIAL_SIGNING_SEED ? Buffer.from(process.env.CREDENTIAL_SIGNING_SEED, "base64") : null;
  if (explicit) { if (explicit.length !== 32) throw new Error("CREDENTIAL_SIGNING_SEED must be 32 bytes, base64 encoded"); return explicit; }
  const master = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "", "base64");
  if (master.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  return Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), "enroltrust-credential-signing-v1", 32));
}
export function keys(): { priv: KeyObject; pub: KeyObject; keyId: string } {
  const priv = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, seed()]), format: "der", type: "pkcs8" });
  const pub = createPublicKey(priv);
  const keyId = createHash("sha256").update(pub.export({ type: "spki", format: "der" })).digest("hex").slice(0, 12);
  return { priv, pub, keyId };
}

export const canonical = (payload: unknown) => stableStringify(payload);
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function signPayload(payload: unknown) {
  const { priv, keyId } = keys();
  const text = canonical(payload);
  return { signature: edSign(null, Buffer.from(text), priv).toString("base64url"), payloadSha256: sha256(text), keyId };
}
export type SignatureCheck = "OK" | "BAD_SIGNATURE" | "HASH_MISMATCH" | "UNKNOWN_KEY";
export function verifyPayload(payload: unknown, signature: string, payloadSha256: string, keyId: string): SignatureCheck {
  const { pub, keyId: current } = keys();
  if (keyId !== current) return "UNKNOWN_KEY";
  const text = canonical(payload);
  if (sha256(text) !== payloadSha256) return "HASH_MISMATCH";
  try { return edVerify(null, Buffer.from(text), pub, Buffer.from(signature, "base64url")) ? "OK" : "BAD_SIGNATURE"; } catch { return "BAD_SIGNATURE"; }
}

// Unambiguous alphabet (no 0/O, 1/I/L). 12 characters is about 58 bits: unguessable, easy to read aloud.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const chunk = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const newVerificationCode = () => `EV-${chunk(4)}-${chunk(4)}-${chunk(4)}`;
export const newConsentReference = () => `CR-${chunk(4)}-${chunk(4)}`;
export const newStudentCode = () => `${chunk(5)}-${chunk(5)}`;
/** Normalises what a person types or a scanner returns (case, spaces, a full URL) back to a bare code. */
export function extractCode(input: string): string {
  const m = /(EV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})/i.exec(input.trim()) ;
  return (m ? m[1] : input.trim()).toUpperCase().replace(/\s+/g, "");
}

export const qrSvg = (text: string) => QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a1f3d", light: "#ffffff" } });
