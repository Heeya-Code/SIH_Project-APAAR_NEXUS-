// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// TIER 1 of the identity model: STRUCTURAL validation only.
//   Tier 1  Structural   - is the ID well-formed?                    (real, implemented)
//   Tier 2  Internal     - is it duplicated inside this repository?   (real, Stage 4)
//   Tier 3  Authoritative- does it exist and belong to this person?   (NOT AVAILABLE:
//           requires authorised access to the official APAAR/ABC system. Mock adapter only.)
//
// The pattern is configurable (APAAR_ID_PATTERN) because the exact specification must be
// confirmed against official documentation. The default assumes a 12-digit numeric ID.

export type ApaarFormat = "MISSING" | "INVALID_FORMAT" | "WELL_FORMED";

export type ApaarCheck = {
  format: ApaarFormat;
  normalised: string | null;
  wasNormalised: boolean;
  reason?: string;
  fixHint?: string;
};

const DEFAULT_PATTERN = "^[0-9]{12}$";

export function apaarPattern(): RegExp {
  const src = process.env.APAAR_ID_PATTERN?.slice(0, 200) || DEFAULT_PATTERN;
  try {
    return new RegExp(src);
  } catch {
    return new RegExp(DEFAULT_PATTERN);
  }
}

const DEVANAGARI_ZERO = 0x0966;
const ARABIC_INDIC_ZERO = 0x0660;

/** Strips separators and converts Devanagari / Arabic-Indic digits to ASCII. */
export function normaliseApaar(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let out = "";
  for (const ch of raw.normalize("NFKC")) {
    const cp = ch.codePointAt(0)!;
    if (cp >= DEVANAGARI_ZERO && cp <= DEVANAGARI_ZERO + 9) out += String(cp - DEVANAGARI_ZERO);
    else if (cp >= ARABIC_INDIC_ZERO && cp <= ARABIC_INDIC_ZERO + 9) out += String(cp - ARABIC_INDIC_ZERO);
    else if (/[\s\-._\u200B-\u200D\uFEFF]/.test(ch)) continue;
    else out += ch.toUpperCase();
  }
  return out.length ? out : null;
}

const MISSING_TOKENS = new Set(["NA", "N/A", "NIL", "NULL", "NONE", "PENDING", "NOTAVAILABLE", "TBD"]);

export function checkApaarStructure(raw: string | null | undefined): ApaarCheck {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || MISSING_TOKENS.has(trimmed.replace(/[\s.]/g, "").toUpperCase())) {
    return {
      format: "MISSING",
      normalised: null,
      wasNormalised: false,
      reason: "No APAAR ID was provided for this student.",
      fixHint: "Ask the student to share their APAAR ID from their ABC/DigiLocker account and enter all 12 digits.",
    };
  }
  const normalised = normaliseApaar(trimmed);
  if (!normalised || !apaarPattern().test(normalised)) {
    return {
      format: "INVALID_FORMAT",
      normalised: null,
      wasNormalised: false,
      reason: `The value does not match the expected APAAR ID format (${apaarPattern().source}).`,
      fixHint: "Check for missing or extra digits and for letters typed in place of numbers, then re-enter the ID.",
    };
  }
  return { format: "WELL_FORMED", normalised, wasNormalised: normalised !== trimmed };
}

/** What the UI may and may not claim. Used by dashboards so the wording is consistent. */
export const IDENTITY_TIERS = [
  { tier: 1, key: "structural", label: "Structural check", status: "implemented", detail: "Format of the APAAR ID is validated against a configurable rule." },
  { tier: 2, key: "internal", label: "Internal duplicate check", status: "implemented", detail: "IDs are compared across every institution in this repository using keyed hashes." },
  { tier: 3, key: "authoritative", label: "Authoritative verification", status: "unavailable", detail: "Needs authorised access to the official APAAR system. Not connected in this prototype." },
] as const;
