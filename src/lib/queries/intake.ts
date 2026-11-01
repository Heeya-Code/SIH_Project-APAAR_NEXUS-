// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Approved intake is set PER PROGRAMME, so overshoot is judged per programme. Netting a surplus in one programme against
// a shortfall in another would hide exactly what AICTE needs to see. This is the single definition every screen uses.
import { db } from "@/lib/db";

export type ProgrammeSeat = { programmeId: string; code: string; name: string; intake: number; ordinary: number };
export const seatsOf = (p: ProgrammeSeat[]) => ({
  intake: p.reduce((t, x) => t + x.intake, 0), ordinary: p.reduce((t, x) => t + x.ordinary, 0),
  over: p.reduce((t, x) => t + Math.max(x.ordinary - x.intake, 0), 0), open: p.reduce((t, x) => t + Math.max(x.intake - x.ordinary, 0), 0),
});

/** key = `${institutionId}|${academicYear}` */
export async function loadProgrammeSeats(): Promise<Map<string, ProgrammeSeat[]>> {
  const rows = await db.$queryRaw<{ institution_id: string; ay: string; id: string; code: string; name: string; intake: number; ordinary: number }[]>`
    SELECT p."institutionId" AS institution_id, ai."academicYear" AS ay, p.id, p.code, p.name, ai."baseIntake" AS intake, COALESCE(c.n, 0)::int AS ordinary
    FROM "ApprovedIntake" ai JOIN "Programme" p ON p.id = ai."programmeId"
    LEFT JOIN (SELECT programme_id, academic_year, count(*) AS n FROM v_enrolment_analytics WHERE enrolment_status <> 'WITHDRAWN' AND NOT is_supernumerary GROUP BY 1, 2) c
      ON c.programme_id = ai."programmeId" AND c.academic_year = ai."academicYear"
    ORDER BY p.code`;
  const m = new Map<string, ProgrammeSeat[]>();
  for (const r of rows) { const k = `${r.institution_id}|${r.ay}`; m.set(k, [...(m.get(k) ?? []), { programmeId: r.id, code: r.code, name: r.name, intake: r.intake, ordinary: r.ordinary }]); }
  return m;
}
