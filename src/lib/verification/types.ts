// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Contracts for TIER 3 identity checks (authoritative verification).
// The prototype ships ONLY a mock provider. Nothing here talks to the real APAAR / ABC system.

export type VerificationStatus = "VERIFIED" | "INVALID" | "PENDING" | "UNAVAILABLE";

export type ReasonCode =
  | "MATCH"                  // provider confirmed the ID (and any supplied details)
  | "STRUCTURE_INVALID"      // rejected locally by the structural check; provider not contacted
  | "NOT_FOUND"              // provider has no such ID
  | "IDENTITY_MISMATCH"      // ID exists but supplied name / date of birth do not match
  | "PROCESSING"             // provider accepted the request but has not answered yet
  | "PROVIDER_TIMEOUT"       // provider did not answer in time
  | "PROVIDER_ERROR"         // provider failed
  | "NO_PROVIDER_CONFIGURED";

export type ProviderInfo = { id: string; name: string; mode: "MOCK" | "LIVE" | "NONE" };

/** What a caller asks for. The raw ID lives in memory only; it is never logged or stored by this layer. */
export type VerificationRequest = {
  requestId: string;
  apaarId: string;
  fullName?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  purpose: "ADMISSION_CHECK";
};

/** What a provider returns. The service adds requestId, provider, timestamp and the authoritative flag. */
export type ProviderResult = {
  status: VerificationStatus;
  reasonCode: ReasonCode;
  message: string;
  matched?: { name?: boolean; dateOfBirth?: boolean };
};

export type VerificationResponse = ProviderResult & {
  requestId: string;
  provider: ProviderInfo;
  /** True ONLY when a LIVE, authorised provider answered. Always false for the mock. */
  authoritative: boolean;
  checkedAt: string;
};

export class VerificationProviderError extends Error {
  constructor(message: string, public readonly retryable = true) {
    super(message);
    this.name = "VerificationProviderError";
  }
}
