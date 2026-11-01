// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Chart data. Every series is computed from enrolment rows, approved intakes and submissions.
// Scope is applied via institutionScope(), the same single rule used by every other query.
import { db } from "@/lib/db";
import { institutionScope, type Actor } from "@/lib/auth/permissions";
import { ACADEMIC_YEARS } from "@/lib/years";

export type TrendPoint = {
  ay: string; ordinary: number; supernumerary: number;
  /** Approved intake of institutions that have an accepted submission for that year (like-for-like with admissions). */
  intake: number | null; apaarCoverage: number | null; reporting: number;
};
export type CategoryPoint = { code: string; name: string; count: number; share: number; supernumerary: boolean };

async function scopedIds(actor: Actor): Promise<string[]> {
  const rows = await db.institution.findMany({ where: institutionScope(actor), select: { id: true } });
  return rows.map((r) => r.id);
}

export async function getTrend(actor: Actor): Promise<TrendPoint[]> {
  const ids = await scopedIds(actor);
  const [counts, intakes, accepted] = await Promise.all([
    db.$queryRaw<{ ay: string; ordinary: number; supernumerary: number; apaar_ok: number }[]>`
      SELECT academic_year AS ay,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND NOT is_supernumerary)::int AS ordinary,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND is_supernumerary)::int AS supernumerary,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND apaar_format = 'WELL_FORMED')::int AS apaar_ok
      FROM v_enrolment_analytics WHERE institution_id = ANY(${ids}::text[]) GROUP BY academic_year`,
    db.approvedIntake.groupBy({ by: ["academicYear", "institutionId"], where: { institutionId: { in: ids } }, _sum: { baseIntake: true } }),
    db.dataSubmission.groupBy({ by: ["academicYear", "institutionId"], where: { institutionId: { in: ids }, status: "ACCEPTED" } }),
  ]);
  const acceptedKey = new Set(accepted.map((a) => `${a.academicYear}|${a.institutionId}`));
  return ACADEMIC_YEARS.map((ay) => {
    const c = counts.find((x) => x.ay === ay);
    const reportingIntakes = intakes.filter((i) => i.academicYear === ay && acceptedKey.has(`${ay}|${i.institutionId}`));
    const admitted = (c?.ordinary ?? 0) + (c?.supernumerary ?? 0);
    return {
      ay, ordinary: c?.ordinary ?? 0, supernumerary: c?.supernumerary ?? 0,
      intake: reportingIntakes.length ? reportingIntakes.reduce((t, i) => t + (i._sum.baseIntake ?? 0), 0) : null,
      apaarCoverage: admitted > 0 ? (c?.apaar_ok ?? 0) / admitted : null,
      reporting: reportingIntakes.length,
    };
  });
}

export async function getCategoryMix(actor: Actor, ay: string): Promise<CategoryPoint[]> {
  const ids = await scopedIds(actor);
  const [rows, cats] = await Promise.all([
    db.$queryRaw<{ code: string; n: number }[]>`
      SELECT category_code AS code, count(*)::int AS n FROM v_enrolment_analytics
      WHERE academic_year = ${ay} AND enrolment_status <> 'WITHDRAWN' AND institution_id = ANY(${ids}::text[]) GROUP BY category_code`,
    db.admissionCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const total = rows.reduce((t, r) => t + r.n, 0);
  return cats.map((c) => {
    const n = rows.find((r) => r.code === c.code)?.n ?? 0;
    return { code: c.code, name: c.name, count: n, share: total ? n / total : 0, supernumerary: c.isSupernumerary };
  });
}
