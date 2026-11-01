// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { db } from "@/lib/db";
import { institutionScope, type Actor } from "@/lib/auth/permissions";

export async function listUsersWithSessions() {
  const [users, sessions] = await Promise.all([
    db.user.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }], include: { institution: { select: { shortName: true } } } }),
    db.session.groupBy({ by: ["userId"], where: { revokedAt: null, expiresAt: { gt: new Date() } }, _count: { _all: true } }),
  ]);
  const active = new Map(sessions.map((s) => [s.userId, s._count._all]));
  return users.map((u) => ({
    id: u.id, email: u.email, name: u.name, role: u.role, isActive: u.isActive, lastLoginAt: u.lastLoginAt,
    scope: u.institution?.shortName ?? u.region ?? u.organisation ?? "National", activeSessions: active.get(u.id) ?? 0,
    locked: !!u.lockedUntil && u.lockedUntil > new Date(),
  }));
}

/** Audit visibility: national roles see everything; institution admins see only their own institution's events. */
export async function listAudit(actor: Actor, opts: { action?: string; limit: number }) {
  const where = actor.role === "SUPER_ADMIN" || actor.role === "AICTE_ADMIN"
    ? {}
    : { institutionId: institutionScope(actor).id ?? "__none__" };
  const rows = await db.auditLog.findMany({
    where: { ...where, ...(opts.action ? { action: opts.action } : {}) },
    orderBy: { seq: "desc" }, take: opts.limit,
  });
  const userIds = [...new Set(rows.map((r) => r.actorUserId).filter((x): x is string => !!x))];
  const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } });
  const emailBy = new Map(users.map((u) => [u.id, u.email]));
  const actions = await db.auditLog.findMany({ where, distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } });
  return {
    actions: actions.map((a) => a.action),
    rows: rows.map((r) => ({
      seq: r.seq.toString(), at: r.createdAt, actor: r.actorUserId ? (emailBy.get(r.actorUserId) ?? "unknown") : "system / anonymous",
      role: r.actorRole, action: r.action, outcome: r.outcome, entity: r.entityType ? `${r.entityType}` : "", metadata: r.metadata,
    })),
  };
}
