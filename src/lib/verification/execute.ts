// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Framework-free orchestration: structural pre-check, timeout, error mapping.
import { checkApaarStructure } from "@/lib/apaar/structure";
import type { VerificationAdapter } from "./adapter";
import { VerificationProviderError, type ProviderResult, type VerificationRequest, type VerificationResponse } from "./types";

const stamp = (adapter: VerificationAdapter, requestId: string, r: ProviderResult): VerificationResponse => ({
  ...r, requestId, provider: adapter.info,
  authoritative: adapter.info.mode === "LIVE", // a mock can never be authoritative
  checkedAt: new Date().toISOString(),
});

export async function executeVerification(adapter: VerificationAdapter, req: VerificationRequest, opts: { timeoutMs?: number } = {}): Promise<VerificationResponse> {
  const check = checkApaarStructure(req.apaarId);
  if (check.format !== "WELL_FORMED") {
    return stamp(adapter, req.requestId, {
      status: "INVALID", reasonCode: "STRUCTURE_INVALID",
      message: `${check.reason ?? "The ID is not well-formed."} The provider was not contacted. ${check.fixHint ?? ""}`.trim(),
    });
  }
  const timeoutMs = opts.timeoutMs ?? 5000;
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { ctrl.abort(); reject(new VerificationProviderError("timeout", true)); }, timeoutMs);
  });
  try {
    const result = await Promise.race([adapter.verify({ ...req, apaarId: check.normalised! }, ctrl.signal), timeout]);
    return stamp(adapter, req.requestId, result);
  } catch (e) {
    const timedOut = e instanceof VerificationProviderError && e.message === "timeout";
    return stamp(adapter, req.requestId, {
      status: "UNAVAILABLE",
      reasonCode: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
      message: timedOut ? "The verification provider did not respond in time. Try again shortly." : "The verification provider could not complete the check. Try again shortly.",
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
