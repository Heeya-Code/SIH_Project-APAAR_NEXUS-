// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Field-level encryption (AES-256-GCM) and keyed hashing (HMAC-SHA256).
// Deliberately free of framework imports so seed scripts and tests can use it.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const b64u = (b: Buffer) => b.toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

function dataKey(): Buffer {
  const k = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes, base64 encoded (openssl rand -base64 32)");
  }
  return k;
}

function pepper(): Buffer {
  const k = Buffer.from(process.env.HMAC_PEPPER ?? "", "base64");
  if (k.length < 32) throw new Error("HMAC_PEPPER must be at least 32 bytes, base64 encoded");
  return k;
}

/** Encrypts a string. Output format: "v1:<iv>.<tag>.<ciphertext>" (base64url). */
export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${b64u(iv)}.${b64u(cipher.getAuthTag())}.${b64u(ct)}`;
}

export function decryptField(enc: string): string {
  if (!enc.startsWith("v1:")) throw new Error("Unsupported ciphertext version");
  const [iv, tag, ct] = enc.slice(3).split(".");
  if (!iv || !tag || !ct) throw new Error("Malformed ciphertext");
  const d = createDecipheriv("aes-256-gcm", dataKey(), fromB64u(iv));
  d.setAuthTag(fromB64u(tag));
  return Buffer.concat([d.update(fromB64u(ct)), d.final()]).toString("utf8");
}

export type HmacPurpose = "apaar" | "match" | "dob" | "ip" | "email";

/** Domain-separated keyed hash. Same input under different purposes never collides. */
export function keyedHash(purpose: HmacPurpose, value: string): string {
  return createHmac("sha256", pepper()).update(`${purpose}\u0000${value}`).digest("hex");
}

export const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Deterministic JSON with sorted keys (needed for hash chaining across JSONB round trips). */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(",")}}`;
}
