// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Display masking for sensitive identifiers. Masked values are the DEFAULT everywhere.

export function maskApaar(value: string | null | undefined): string {
  if (!value) return "Not provided";
  const digits = value.replace(/\s|-/g, "");
  return `•••• •••• ${digits.slice(-4)}`;
}

export function maskName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w[0]}${"•".repeat(Math.max(2, Math.min(w.length - 1, 5)))}`)
    .join(" ");
}

/** Redacts APAAR-like 12-digit runs from free text/metadata so they can never reach logs. */
export function redactIdentifiers(input: string): string {
  return input.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED-ID]");
}
