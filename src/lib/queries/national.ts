// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// National Command Centre aggregates. EVERY figure is computed from database rows.
// Scope (all / region / own institution) is applied once, via institutionScope().
import { db } from "@/lib/db";
import { institutionScope, type Actor } from "@/lib/auth/permissions";
import { loadProgrammeSeats, seatsOf } from "@/lib/queries/intake";

export type InstitutionRow = {
  id: string; slug: string; name: string; shortName: string; type: string; state: string; stateName: string; city: string; region: string;
  intake: number; admitted: number; ordinary: number; over: number; open: number; supernumerary: number; nri: number; oci: number; fn: number; tfws: number; withdrawn: number;
  apaarOk: number; missing: number; invalid: number; awaiting: number;
  utilisation: number | null; apaarCoverage: number | null;
  submission: { status: "ACCEPTED" | "PENDING"; version: number | null };
  signals: string[];
};

export type StateRow = {
  code: string; name: string; institutions: number; intake: number; admitted: number; ordinary: number;
  utilisation: number | null; apaarCoverage: number | null; flagged: number; pending: number;
};

export type NationalSnapshot = {
  academicYear: string;
  kpis: {
    institutions: number; onRoll: number; admissions: number; intake: number; utilisation: number | null; supernumerary: number;
    nri: number; oci: number; fn: number; tfws: number; apaarCoverage: number | null; missing: number; invalid: number; awaiting: number;
    crossMatches: number; overIntake: number; pending: number;
  };
  institutions: InstitutionRow[];
  states: StateRow[];
};

type AggRow = {
  institution_id: string; admitted: number; ordinary: number; supernumerary: number; nri: number; oci: number; fn: number; tfws: number;
  withdrawn: number; apaar_ok: number; missing: number; invalid: number; awaiting: number;
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export async function getNationalSnapshot(actor: Actor, academicYear: string): Promise<NationalSnapshot> {
  const insts = await db.institution.findMany({
    where: institutionScope(actor), orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, shortName: true, type: true, state: true, stateName: true, city: true, region: true },
  });
  const ids = insts.map((i) => i.id);

  const seats = await loadProgrammeSeats();
  const [intakes, agg, accepted, cross, onRoll] = await Promise.all([
    db.approvedIntake.groupBy({ by: ["institutionId"], where: { institutionId: { in: ids }, academicYear }, _sum: { baseIntake: true } }),
    db.$queryRaw<AggRow[]>`
      SELECT institution_id,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN')::int AS admitted,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND NOT is_supernumerary)::int AS ordinary,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND is_supernumerary)::int AS supernumerary,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND category_code = 'NRI')::int AS nri,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND category_code = 'OCI')::int AS oci,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND category_code = 'FN')::int AS fn,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND category_code = 'TFWS')::int AS tfws,
        count(*) FILTER (WHERE enrolment_status = 'WITHDRAWN')::int AS withdrawn,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND apaar_format = 'WELL_FORMED')::int AS apaar_ok,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND apaar_format = 'MISSING')::int AS missing,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND apaar_format = 'INVALID_FORMAT')::int AS invalid,
        count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN' AND verification IN ('PENDING','UNDER_REVIEW'))::int AS awaiting
      FROM v_enrolment_analytics
      WHERE academic_year = ${academicYear} AND institution_id = ANY(${ids}::text[])
      GROUP BY institution_id`,
    db.dataSubmission.groupBy({ by: ["institutionId"], where: { institutionId: { in: ids }, academicYear, status: "ACCEPTED" }, _max: { version: true } }),
    db.$queryRaw<{ groups: number }[]>`
      SELECT count(*)::int AS groups FROM (
        SELECT "apaarHmac" FROM "Student" WHERE "apaarHmac" IS NOT NULL
        GROUP BY "apaarHmac"
        HAVING count(DISTINCT "institutionId") > 1 AND bool_or("institutionId" = ANY(${ids}::text[]))
      ) t`,
    db.enrolment.count({ where: { institutionId: { in: ids }, status: "ENROLLED" } }),
  ]);

  const intakeBy = new Map(intakes.map((r) => [r.institutionId, r._sum.baseIntake ?? 0]));
  const aggBy = new Map(agg.map((r) => [r.institution_id, r]));
  const subBy = new Map(accepted.map((r) => [r.institutionId, r._max.version ?? null]));

  const institutions: InstitutionRow[] = insts.map((i) => {
    const a = aggBy.get(i.id);
    const intake = intakeBy.get(i.id) ?? 0;
    const ordinary = a?.ordinary ?? 0;
    const submitted = subBy.has(i.id);
    const apaarCoverage = ratio(a?.apaar_ok ?? 0, a?.admitted ?? 0);
    const signals: string[] = [];
    if (!submitted) signals.push("Submission pending");
    const sx = seatsOf(seats.get(`${i.id}|${academicYear}`) ?? []);
    if (sx.over > 0) signals.push("Ordinary admissions above intake");
    if (submitted && apaarCoverage !== null && apaarCoverage < 0.8) signals.push("APAAR coverage below 80%");
    return {
      ...i, intake, admitted: a?.admitted ?? 0, ordinary, over: sx.over, open: submitted ? sx.open : 0, supernumerary: a?.supernumerary ?? 0,
      nri: a?.nri ?? 0, oci: a?.oci ?? 0, fn: a?.fn ?? 0, tfws: a?.tfws ?? 0, withdrawn: a?.withdrawn ?? 0,
      apaarOk: a?.apaar_ok ?? 0, missing: a?.missing ?? 0, invalid: a?.invalid ?? 0, awaiting: a?.awaiting ?? 0,
      utilisation: submitted ? ratio(ordinary, intake) : null, apaarCoverage,
      submission: submitted ? { status: "ACCEPTED", version: subBy.get(i.id) ?? null } : { status: "PENDING", version: null },
      signals,
    };
  });

  const sum = (f: (r: InstitutionRow) => number) => institutions.reduce((t, r) => t + f(r), 0);
  const admissions = sum((r) => r.admitted);
  const intake = sum((r) => r.intake);

  const stateMap = new Map<string, StateRow>();
  const submittedIntake = new Map<string, number>();
  for (const r of institutions) {
    const s = stateMap.get(r.state) ?? { code: r.state, name: r.stateName, institutions: 0, intake: 0, admitted: 0, ordinary: 0, utilisation: null, apaarCoverage: null, flagged: 0, pending: 0 };
    s.institutions++; s.intake += r.intake; s.admitted += r.admitted; s.ordinary += r.ordinary;
    if (r.submission.status === "ACCEPTED") submittedIntake.set(r.state, (submittedIntake.get(r.state) ?? 0) + r.intake);
    if (r.signals.some((x) => x.includes("above intake"))) s.flagged++;
    if (r.submission.status === "PENDING") s.pending++;
    stateMap.set(r.state, s);
  }
  const states = [...stateMap.values()].map((s) => {
    const rows = institutions.filter((r) => r.state === s.code);
    return { ...s, utilisation: ratio(s.ordinary, submittedIntake.get(s.code) ?? 0), apaarCoverage: ratio(rows.reduce((t, r) => t + r.apaarOk, 0), s.admitted) };
  });

  return {
    academicYear,
    kpis: {
      institutions: institutions.length, onRoll, admissions, intake,
      // Only institutions that have submitted: pending ones would otherwise drag the figure down.
      utilisation: ratio(sum((r) => r.ordinary), institutions.filter((r) => r.submission.status === "ACCEPTED").reduce((t, r) => t + r.intake, 0)),
      supernumerary: sum((r) => r.supernumerary), nri: sum((r) => r.nri), oci: sum((r) => r.oci), fn: sum((r) => r.fn), tfws: sum((r) => r.tfws),
      apaarCoverage: ratio(sum((r) => r.apaarOk), admissions), missing: sum((r) => r.missing), invalid: sum((r) => r.invalid), awaiting: sum((r) => r.awaiting),
      crossMatches: cross[0]?.groups ?? 0,
      overIntake: institutions.filter((r) => r.signals.some((x) => x.includes("above intake"))).length,
      pending: institutions.filter((r) => r.submission.status === "PENDING").length,
    },
    institutions, states,
  };
}

/** Public, aggregate-only view for the landing page. No institution names, no student data. */
export async function getPublicStateSummary(academicYear: string) {
  const rows = await db.$queryRaw<{ state: string; admitted: number; institutions: number }[]>`
    SELECT state, count(*) FILTER (WHERE enrolment_status <> 'WITHDRAWN')::int AS admitted,
           count(DISTINCT institution_id)::int AS institutions
    FROM v_enrolment_analytics WHERE academic_year = ${academicYear} GROUP BY state`;
  const total = await db.institution.count();
  return { rows, institutions: total };
}
