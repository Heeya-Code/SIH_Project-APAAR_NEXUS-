// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Pure canonicalisation for the audit hash chain (no database), so it can be unit tested.
// RULE: what is hashed at write time must equal what verification reconstructs from the stored JSON.
// JSON storage drops keys whose value is undefined, so they must be dropped BEFORE hashing, never hashed as null.
import { sha256Hex, stableStringify } from "@/lib/crypto";
import { redactIdentifiers } from "@/lib/mask";

export const GENESIS = "0".repeat(64);

export function sanitise(v: unknown): unknown {
  if (typeof v === "string") return redactIdentifiers(v);
  if (Array.isArray(v)) return v.map(sanitise);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).map(([k, x]) => [k, sanitise(x)]));
  return v;
}

export type AuditFields = {
  createdAt: Date; actorUserId: string | null; actorRole: string | null; action: string; entityType: string | null; entityId: string | null;
  institutionId: string | null; outcome: string; metadata: unknown; ipHash: string | null;
};
export function recordDigest(prevHash: string, r: AuditFields): string {
  return sha256Hex(stableStringify([prevHash, r.createdAt.toISOString(), r.actorUserId, r.actorRole, r.action, r.entityType, r.entityId, r.institutionId, r.outcome, r.metadata ?? null, r.ipHash]));
}
