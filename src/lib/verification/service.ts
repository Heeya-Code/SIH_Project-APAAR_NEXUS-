// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Entry point for application code. Selects the provider, runs the check and writes the audit entry.
import { audit } from "@/lib/audit";
import { decryptField, keyedHash } from "@/lib/crypto";
import { db } from "@/lib/db";
import type { Actor } from "@/lib/auth/permissions";
import type { VerificationAdapter } from "./adapter";
import { executeVerification } from "./execute";
import { createMockProvider, MOCK_INFO, type MockRegistry } from "./mock-provider";
import type { ProviderInfo, VerificationResponse } from "./types";

/** The mock's "registry" is this prototype's synthetic repository. */
const repositoryRegistry: MockRegistry = {
  async find(id) {
    const rows = await db.student.findMany({ where: { apaarHmac: keyedHash("apaar", id) }, include: { identity: true }, take: 5 });
    return rows.filter((r) => r.identity).map((r) => ({ fullName: decryptField(r.identity!.fullNameEnc), dateOfBirth: decryptField(r.identity!.dobEnc) }));
  },
};

const NONE: ProviderInfo = { id: "none", name: "No provider configured", mode: "NONE" };

/** APAAR_VERIFICATION_PROVIDER=mock (default). A real provider would be registered here once authorised access exists. */
export function selectProvider(): VerificationAdapter | null {
  const choice = (process.env.APAAR_VERIFICATION_PROVIDER ?? "mock").toLowerCase();
  if (choice === "mock") return createMockProvider(repositoryRegistry);
  return null;
}
export const providerInfo = (): ProviderInfo => selectProvider()?.info ?? NONE;

export async function runApaarVerification(
  actor: Actor,
  input: { apaarId: string; fullName?: string; dateOfBirth?: string },
  requestId: string,
  adapterOverride?: VerificationAdapter,
): Promise<VerificationResponse> {
  const adapter = adapterOverride ?? selectProvider();
  const response: VerificationResponse = adapter
    ? await executeVerification(adapter, { requestId, purpose: "ADMISSION_CHECK", ...input })
    : { requestId, status: "UNAVAILABLE", reasonCode: "NO_PROVIDER_CONFIGURED", message: "No verification provider is configured.", provider: NONE, authoritative: false, checkedAt: new Date().toISOString() };

  await audit({
    actor, action: "APAAR_VERIFICATION_REQUESTED", entityType: "VerificationCheck", entityId: requestId, institutionId: actor.institutionId,
    outcome: response.status === "UNAVAILABLE" ? "FAILURE" : "SUCCESS",
    metadata: {
      provider: response.provider.id, mode: response.provider.mode, status: response.status, reasonCode: response.reasonCode,
      // Keyed-hash reference only: lets an investigator correlate repeat lookups without the ID ever being logged.
      apaarRef: keyedHash("apaar", input.apaarId.replace(/[\s-]/g, "")).slice(0, 12),
      nameSupplied: !!input.fullName, dobSupplied: !!input.dateOfBirth,
    },
  });
  // NOTE: Student.authoritativeVerified is deliberately never written here. Only a LIVE provider may do that.
  return response;
}

export { MOCK_INFO };
