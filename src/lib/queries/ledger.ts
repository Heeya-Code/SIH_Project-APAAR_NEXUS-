// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Programme-level Live Seat Ledger. Scope is applied once, through institutionScope().
import { db } from "@/lib/db";
import { institutionScope, type Actor } from "@/lib/auth/permissions";

export type LedgerRow = {
  institutionId: string; institution: string; shortName: string; state: string; stateName: string; region: string; programmeId: string; programmeCode: string; programme: string;
  intake: number; ordinary: number; supernumerary: number; remaining: number; overshoot: number; utilisation: number | null; submitted: boolean;
};
export async function getSeatLedger(actor: Actor, ay: string): Promise<LedgerRow[]> {
  const insts = await db.institution.findMany({ where: institutionScope(actor), select: { id: true, name: true, shortName: true, state: true, stateName: true, region: true } });
  const ids = insts.map((i) => i.id), info = new Map(insts.map((i) => [i.id, i]));
  const [rows, subs] = await Promise.all([
    db.$queryRaw<{ id: string; code: string; name: string; institution_id: string; intake: number; ordinary: number; sup: number }[]>`
      SELECT p.id, p.code, p.name, p."institutionId" AS institution_id, COALESCE(ai."baseIntake", 0)::int AS intake,
        (SELECT count(*) FROM v_enrolment_analytics v WHERE v.programme_id = p.id AND v.academic_year = ${ay} AND v.enrolment_status <> 'WITHDRAWN' AND NOT v.is_supernumerary)::int AS ordinary,
        (SELECT count(*) FROM v_enrolment_analytics v WHERE v.programme_id = p.id AND v.academic_year = ${ay} AND v.enrolment_status <> 'WITHDRAWN' AND v.is_supernumerary)::int AS sup
      FROM "Programme" p LEFT JOIN "ApprovedIntake" ai ON ai."programmeId" = p.id AND ai."academicYear" = ${ay}
      WHERE p."institutionId" = ANY(${ids}::text[]) ORDER BY p."institutionId", p.code`,
    db.dataSubmission.findMany({ where: { institutionId: { in: ids }, academicYear: ay, OR: [{ acceptedAt: { not: null } }, { submittedAt: { not: null } }] }, select: { institutionId: true } }),
  ]);
  const submitted = new Set(subs.map((s) => s.institutionId));
  return rows.map((r) => { const i = info.get(r.institution_id)!; return { institutionId: i.id, institution: i.name, shortName: i.shortName, state: i.state, stateName: i.stateName, region: i.region, programmeId: r.id, programmeCode: r.code, programme: r.name,
    intake: r.intake, ordinary: r.ordinary, supernumerary: r.sup, remaining: Math.max(r.intake - r.ordinary, 0), overshoot: Math.max(r.ordinary - r.intake, 0), utilisation: r.intake ? r.ordinary / r.intake : null, submitted: submitted.has(r.institution_id) }; });
}
