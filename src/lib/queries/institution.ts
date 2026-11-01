// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Institution-scoped queries. The institutionId ALWAYS comes from the actor, never from request input.
import { db } from "@/lib/db";
import { decryptField } from "@/lib/crypto";
import { ForbiddenError, institutionScope, type Actor } from "@/lib/auth/permissions";

function ownInstitutionId(actor: Actor): string {
  const scope = institutionScope(actor);
  if (!scope.id) throw new ForbiddenError("Institution-level access required");
  return scope.id;
}

export type ProgrammeRow = {
  id: string; code: string; name: string; level: string; department: string;
  intake: number; ordinary: number; nri: number; oci: number; fn: number; tfws: number; remaining: number; utilisation: number | null;
};

export async function getInstitutionOverview(actor: Actor, ay: string) {
  const institutionId = ownInstitutionId(actor);
  const [institution, approval, programmes, intakes, byProgCat, quality, submissions, notifications] = await Promise.all([
    db.institution.findUniqueOrThrow({ where: { id: institutionId } }),
    db.institutionApproval.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: ay } } }),
    db.programme.findMany({ where: { institutionId }, include: { department: true }, orderBy: { code: "asc" } }),
    db.approvedIntake.findMany({ where: { institutionId, academicYear: ay } }),
    db.$queryRaw<{ programme_id: string; category_code: string; n: number }[]>`
      SELECT programme_id, category_code, count(*)::int AS n FROM v_enrolment_analytics
      WHERE institution_id = ${institutionId} AND academic_year = ${ay} AND enrolment_status <> 'WITHDRAWN'
      GROUP BY programme_id, category_code`,
    db.$queryRaw<{ total: number; ok: number; missing: number; invalid: number; awaiting: number; female: number }[]>`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE apaar_format = 'WELL_FORMED')::int AS ok,
        count(*) FILTER (WHERE apaar_format = 'MISSING')::int AS missing,
        count(*) FILTER (WHERE apaar_format = 'INVALID_FORMAT')::int AS invalid,
        count(*) FILTER (WHERE verification IN ('PENDING','UNDER_REVIEW'))::int AS awaiting,
        count(*) FILTER (WHERE gender = 'FEMALE')::int AS female
      FROM v_enrolment_analytics
      WHERE institution_id = ${institutionId} AND academic_year = ${ay} AND enrolment_status <> 'WITHDRAWN'`,
    db.dataSubmission.findMany({ where: { institutionId }, orderBy: [{ academicYear: "desc" }, { version: "desc" }], take: 12 }),
    db.notification.findMany({ where: { user: { institutionId }, readAt: null }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const intakeBy = new Map(intakes.map((i) => [i.programmeId, i.baseIntake]));
  const rows: ProgrammeRow[] = programmes.map((p) => {
    const cats = byProgCat.filter((r) => r.programme_id === p.id);
    const get = (c: string) => cats.find((r) => r.category_code === c)?.n ?? 0;
    const ordinary = ["GEN", "OBC", "SC", "ST", "EWS"].reduce((t, c) => t + get(c), 0);
    const intake = intakeBy.get(p.id) ?? 0;
    return { id: p.id, code: p.code, name: p.name, level: p.level, department: p.department.name, intake, ordinary,
      nri: get("NRI"), oci: get("OCI"), fn: get("FN"), tfws: get("TFWS"), remaining: intake - ordinary, utilisation: intake ? ordinary / intake : null };
  });
  const accepted = submissions.find((s) => s.academicYear === ay && s.status === "ACCEPTED") ?? null;
  return { institution, approval, rows, quality: quality[0], submissions, accepted, notifications };
}

export type StudentListRow = {
  enrolmentId: string; studentId: string; localId: string; name: string; apaarMasked: string; apaarFormat: string;
  verification: string; programme: string; category: string; status: string; gender: string;
};

export async function listInstitutionStudents(actor: Actor, opts: { ay: string; programmeId?: string; apaar?: string; page: number; pageSize: number }) {
  const institutionId = ownInstitutionId(actor);
  const where = {
    institutionId, academicYear: opts.ay,
    ...(opts.programmeId ? { programmeId: opts.programmeId } : {}),
    ...(opts.apaar ? { student: { apaarFormat: opts.apaar as "MISSING" | "INVALID_FORMAT" | "WELL_FORMED" } } : {}),
  };
  const [total, rows] = await Promise.all([
    db.enrolment.count({ where }),
    db.enrolment.findMany({
      where, orderBy: { student: { localStudentId: "asc" } }, skip: (opts.page - 1) * opts.pageSize, take: opts.pageSize,
      include: { student: { include: { identity: true } }, programme: { select: { code: true } } },
    }),
  ]);
  const list: StudentListRow[] = rows.map((e) => ({
    enrolmentId: e.id, studentId: e.studentId, localId: e.student.localStudentId,
    name: e.student.identity ? decryptField(e.student.identity.fullNameEnc) : "Unavailable",
    apaarMasked: e.student.identity?.apaarMasked ?? "Not provided", apaarFormat: e.student.apaarFormat,
    verification: e.student.verification, programme: e.programme.code, category: e.categoryCode, status: e.status, gender: e.student.gender,
  }));
  return { total, rows: list };
}

/** Returns the decrypted APAAR ID, only for a student of the actor's own institution. */
export async function loadApaarForReveal(actor: Actor, studentId: string): Promise<string | null> {
  const institutionId = ownInstitutionId(actor);
  const s = await db.student.findFirst({ where: { id: studentId, institutionId }, include: { identity: true } });
  if (!s) throw new ForbiddenError("Student not found in your institution");
  return s.identity?.apaarEnc ? decryptField(s.identity.apaarEnc) : null;
}
