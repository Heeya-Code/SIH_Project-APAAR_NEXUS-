// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Who is enrolled: total, change on last year for the same institutions, and the gender split. Scope is applied by the caller's id list.
import { db } from "@/lib/db";
import { ayOf } from "@/lib/submissions/validate";

export type HeroStats = { total: number; prevTotal: number | null; male: number; female: number; other: number; prevAy: string };
export async function getHeroStats(institutionIds: string[], ay: string): Promise<HeroStats> {
  const prevAy = ayOf(Number(ay.slice(0, 4)) - 1);
  const rows = institutionIds.length ? await db.$queryRaw<{ ay: string; gender: string; n: number }[]>`
    SELECT e."academicYear" AS ay, s.gender::text AS gender, count(*)::int AS n FROM "Enrolment" e JOIN "Student" s ON s.id = e."studentId"
    WHERE e."institutionId" = ANY(${institutionIds}::text[]) AND e."academicYear" IN (${ay}, ${prevAy}) AND e.status <> 'WITHDRAWN' GROUP BY 1, 2` : [];
  const cur = rows.filter((r) => r.ay === ay), prev = rows.filter((r) => r.ay === prevAy), n = (list: typeof rows, g: string) => list.find((r) => r.gender === g)?.n ?? 0;
  const prevTotal = prev.reduce((t, r) => t + r.n, 0);
  return { total: cur.reduce((t, r) => t + r.n, 0), prevTotal: prevTotal > 0 ? prevTotal : null, male: n(cur, "MALE"), female: n(cur, "FEMALE"), other: n(cur, "OTHER"), prevAy };
}
