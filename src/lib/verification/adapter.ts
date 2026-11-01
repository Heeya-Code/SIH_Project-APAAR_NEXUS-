// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import type { ProviderInfo, ProviderResult, VerificationRequest } from "./types";

/**
 * Implement this interface to connect an authorised APAAR verification service.
 * `request.apaarId` is already normalised and structurally valid when the provider receives it.
 * Throw VerificationProviderError for failures; the service maps them to UNAVAILABLE.
 * Honour `signal`: it aborts when the service's timeout elapses.
 */
export interface VerificationAdapter {
  readonly info: ProviderInfo;
  verify(request: VerificationRequest, signal: AbortSignal): Promise<ProviderResult>;
}
