// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Tamper-evident audit trail: each row stores hash = SHA-256(prevHash + canonical record).
// The database also blocks UPDATE/DELETE/TRUNCATE on AuditLog (migration 0002).
// Metadata must never contain raw identifiers; likely identifiers are redacted defensively.
import type { Role } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { GENESIS, recordDigest, sanitise } from "@/lib/audit-canonical";

const CHAIN_LOCK_KEY = 7461001;

export type AuditInput = {
  actor?: { id: string; role: Role } | null;
  action: string;
  entityType?: string;
  entityId?: string;
  institutionId?: string | null;
  outcome?: "SUCCESS" | "DENIED" | "FAILURE";
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
};

type Tx = Prisma.TransactionClient;

async function append(tx: Tx, input: AuditInput) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHAIN_LOCK_KEY})`;
  const last = await tx.auditLog.findFirst({ orderBy: { seq: "desc" }, select: { hash: true } });
  const prevHash = last?.hash ?? GENESIS;
  const createdAt = new Date();
  const metadata = input.metadata ? (sanitise(input.metadata) as Record<string, unknown>) : null;
  const rec = {
    createdAt,
    actorUserId: input.actor?.id ?? null,
    actorRole: input.actor?.role ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    institutionId: input.institutionId ?? null,
    outcome: input.outcome ?? "SUCCESS",
    metadata,
    ipHash: input.ipHash ?? null,
  };
  const hash = recordDigest(prevHash, rec);
  await tx.auditLog.create({
    data: { ...rec, metadata: (rec.metadata ?? undefined) as Prisma.InputJsonValue | undefined, prevHash, hash },
  });
}

export async function audit(input: AuditInput, tx?: Tx): Promise<void> {
  if (tx) return append(tx, input);
  await db.$transaction((t) => append(t, input));
}

export type ChainReport = { ok: boolean; checked: number; brokenAtSeq?: string; reason?: string };

export async function verifyAuditChain(): Promise<ChainReport> {
  let prev = GENESIS;
  let checked = 0;
  let cursor: bigint | undefined;
  for (;;) {
    const rows = await db.auditLog.findMany({
      where: cursor === undefined ? {} : { seq: { gt: cursor } },
      orderBy: { seq: "asc" },
      take: 500,
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      if (r.prevHash !== prev) return { ok: false, checked, brokenAtSeq: r.seq.toString(), reason: "Chain link does not match the previous record." };
      const expect = recordDigest(prev, r);
      if (expect !== r.hash) return { ok: false, checked, brokenAtSeq: r.seq.toString(), reason: "Record contents do not match its hash." };
      prev = r.hash;
      checked++;
      cursor = r.seq;
    }
  }
  return { ok: true, checked };
}
