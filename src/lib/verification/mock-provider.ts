// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// MOCK provider. It simulates an identity registry using this prototype's own SYNTHETIC records.
// It is NOT connected to APAAR, ABC, DigiLocker or any government system, and its answers are
// never authoritative. Replace it by implementing VerificationAdapter for an authorised service.
import type { VerificationAdapter } from "./adapter";
import { VerificationProviderError, type ProviderInfo, type ProviderResult, type VerificationRequest } from "./types";

export type RegistryIdentity = { fullName: string; dateOfBirth: string };
export interface MockRegistry { find(normalisedApaarId: string): Promise<RegistryIdentity[]> }

/** Reserved test IDs for exercising non-happy paths. */
export const MOCK_TEST_IDS = {
  PENDING: "999999999001",
  PROVIDER_ERROR: "999999999002",
  TIMEOUT: "999999999003",
} as const;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const TAG = "Simulated by the mock provider, not a government check.";

export const MOCK_INFO: ProviderInfo = { id: "mock-registry", name: "Mock verification provider (synthetic data)", mode: "MOCK" };

export function createMockProvider(registry: MockRegistry): VerificationAdapter {
  return {
    info: MOCK_INFO,
    async verify(req: VerificationRequest, signal: AbortSignal): Promise<ProviderResult> {
      if (req.apaarId === MOCK_TEST_IDS.PENDING)
        return { status: "PENDING", reasonCode: "PROCESSING", message: `Request accepted; result not ready. ${TAG}` };
      if (req.apaarId === MOCK_TEST_IDS.PROVIDER_ERROR) throw new VerificationProviderError("simulated failure", true);
      if (req.apaarId === MOCK_TEST_IDS.TIMEOUT)
        return new Promise((_, reject) => signal.addEventListener("abort", () => reject(new VerificationProviderError("aborted", true))));

      const candidates = await registry.find(req.apaarId);
      if (candidates.length === 0) return { status: "INVALID", reasonCode: "NOT_FOUND", message: `No record with this ID was found. ${TAG}` };

      const wantName = req.fullName ? norm(req.fullName) : null;
      const wantDob = req.dateOfBirth ?? null;
      if (!wantName && !wantDob) return { status: "VERIFIED", reasonCode: "MATCH", message: `The ID exists. No name or date of birth was supplied to compare. ${TAG}` };

      const hit = candidates.find((c) => (!wantName || norm(c.fullName) === wantName) && (!wantDob || c.dateOfBirth === wantDob));
      if (hit) return { status: "VERIFIED", reasonCode: "MATCH", message: `The ID exists and the supplied details match. ${TAG}`, matched: { ...(wantName ? { name: true } : {}), ...(wantDob ? { dateOfBirth: true } : {}) } };
      return {
        status: "INVALID", reasonCode: "IDENTITY_MISMATCH", message: `The ID exists but the supplied details do not match. ${TAG}`,
        matched: { ...(wantName ? { name: candidates.some((c) => norm(c.fullName) === wantName) } : {}), ...(wantDob ? { dateOfBirth: candidates.some((c) => c.dateOfBirth === wantDob) } : {}) },
      };
    },
  };
}
