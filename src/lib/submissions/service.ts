// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Database-backed submission pipeline: validate an upload, hold the rejected rows, submit the rest idempotently.
import { randomUUID } from "node:crypto";
import { audit } from "@/lib/audit";
import { checkApaarStructure } from "@/lib/apaar/structure";
import { decryptField, encryptField, keyedHash } from "@/lib/crypto";
import { db } from "@/lib/db";
import { maskApaar } from "@/lib/mask";
import { institutionScope, type Actor } from "@/lib/auth/permissions";
import { isValidAY } from "@/lib/years";
import { notifyInstitution, notifyNational } from "@/lib/notify";
import { parseStudentCsv } from "./parse";
import { sha256 } from "@/lib/credentials/sign";
import { matchKeyOf, parseDate, rowKeyOf, validateRows, type ClashInfo, type NormalisedRow, type RowResult, type ValidationContext, type ValidationResult } from "./validate";

export const apaarRequired = () => (process.env.APAAR_REQUIRED ?? "true") !== "false";
const ownInstitution = (a: Actor) => { const id = institutionScope(a).id; if (!id) throw new Error("Institution account required"); return id; };

async function buildContext(institutionId: string, ay: string, rows: Record<string, string>[]): Promise<ValidationContext> {
  const [programmes, categories, intakes, rules, ordinaryRows] = await Promise.all([
    db.programme.findMany({ where: { institutionId } }), db.admissionCategory.findMany(),
    db.approvedIntake.findMany({ where: { institutionId, academicYear: ay } }), db.complianceRule.findMany({ where: { active: true, kind: "SUPERNUMERARY_CAP" } }),
    db.$queryRaw<{ programme_id: string; n: number }[]>`SELECT programme_id, count(*)::int AS n FROM v_enrolment_analytics WHERE institution_id = ${institutionId} AND academic_year = ${ay} AND enrolment_status <> 'WITHDRAWN' AND NOT is_supernumerary GROUP BY programme_id`,
  ]);
  const refs = [...new Set(rows.map((r) => (r.student_ref ?? "").trim()).filter(Boolean))];
  const hmacs = new Set<string>(), matchKeys = new Set<string>();
  for (const r of rows) {
    const s = checkApaarStructure(r.apaar_id); if (s.format === "WELL_FORMED") hmacs.add(keyedHash("apaar", s.normalised!));
    const dob = parseDate((r.date_of_birth ?? "").trim()); if (dob && r.full_name?.trim()) matchKeys.add(matchKeyOf(r.full_name.trim(), dob));
  }
  const hm = [...hmacs], mk = [...matchKeys];
  const activeElsewhere = { institutionId: { not: institutionId }, enrolments: { some: { status: "ENROLLED" as const } } };
  const sel = { apaarHmac: true, matchKey: true, localStudentId: true, institution: { select: { id: true, name: true } }, enrolments: { where: { status: "ENROLLED" as const }, orderBy: { academicYear: "desc" as const }, take: 1, select: { academicYear: true, programme: { select: { name: true } } } } };
  const [mine, sameApaar, crossRows, potentialRows] = await Promise.all([
    refs.length ? db.student.findMany({ where: { institutionId, localStudentId: { in: refs }, enrolments: { some: { academicYear: ay } } }, select: { localStudentId: true, matchKey: true, enrolments: { where: { academicYear: ay }, select: { id: true } } } }) : [],
    hm.length ? db.student.findMany({ where: { institutionId, apaarHmac: { in: hm }, enrolments: { some: { academicYear: ay } } }, select: { apaarHmac: true, localStudentId: true } }) : [],
    hm.length ? db.student.findMany({ where: { ...activeElsewhere, apaarHmac: { in: hm } }, select: sel }) : [],
    mk.length ? db.student.findMany({ where: { ...activeElsewhere, matchKey: { in: mk } }, select: sel }) : [],
  ]);
  const clash = (s: (typeof crossRows)[number]): ClashInfo => ({ institutionId: s.institution.id, institutionName: s.institution.name, programmeName: s.enrolments[0]?.programme.name ?? "a programme", academicYear: s.enrolments[0]?.academicYear ?? "", matchKey: s.matchKey, studentRef: s.localStudentId });
  const group = <T,>(list: T[], key: (t: T) => string | null, val: (t: T) => ClashInfo) => { const m = new Map<string, ClashInfo[]>(); for (const x of list) { const k = key(x); if (k) m.set(k, [...(m.get(k) ?? []), val(x)]); } return m; };
  return {
    academicYear: ay, now: new Date(), institutionId,
    programmes: new Map(programmes.map((p) => [p.code, { id: p.id, departmentId: p.departmentId, name: p.name, level: p.level, durationYears: p.durationYears }])),
    categories: new Map(categories.map((c) => [c.code, { isSupernumerary: c.isSupernumerary }])),
    intake: new Map(intakes.map((i) => [i.programmeId, i.baseIntake])), existingOrdinary: new Map(ordinaryRows.map((r) => [r.programme_id, r.n])),
    existing: new Map(mine.filter((s) => s.enrolments[0]).map((s) => [rowKeyOf(institutionId, s.localStudentId, ay), { matchKey: s.matchKey, enrolmentId: s.enrolments[0].id }])),
    sameInstitutionApaar: new Map(sameApaar.filter((s) => s.apaarHmac).map((s) => [s.apaarHmac!, { studentRef: s.localStudentId }])),
    crossInstitution: group(crossRows, (s) => s.apaarHmac, clash), potentialByMatchKey: group(potentialRows, (s) => s.matchKey, clash),
    caps: rules.map((r) => { const p = r.parameters as { categories: string[]; maxPercentOfBaseIntake: number }; return { code: r.code, name: r.name, categories: p.categories, maxPercent: p.maxPercentOfBaseIntake }; }),
    apaarRequired: apaarRequired(),
  };
}

export type UploadResult = { ok: true; submissionId: string; version: number; summary: ValidationResult["summary"] } | { ok: false; error: string };

export async function processUpload(actor: Actor, input: { academicYear: string; fileName: string; csv: string }, meta: { ipHash?: string | null } = {}): Promise<UploadResult> {
  const institutionId = ownInstitution(actor);
  if (!isValidAY(input.academicYear)) return { ok: false, error: "Choose the academic year this file is for." };
  const parsed = parseStudentCsv(input.csv);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const ctx = await buildContext(institutionId, input.academicYear, parsed.rows);
  const res = await validateRows(parsed.rows, ctx);
  const last = await db.dataSubmission.findFirst({ where: { institutionId, academicYear: input.academicYear }, orderBy: { version: "desc" } });
  const version = (last?.version ?? 0) + 1, submissionId = randomUUID(), s = res.summary;
  const notes = JSON.stringify({ intake: res.intake, caps: res.caps, apaar: s.apaar, byCategory: s.byCategory, rowsByCategory: s.rowsByCategory, skipped: s.skipped, extraColumns: parsed.extraColumns, simulated: "APAAR checks use a simulated registry" });
  const staged = res.rows.map((r) => ({ id: randomUUID(), r }));
  const fileName = input.fileName.replace(/[^\w.\- ]/g, "_").slice(0, 120) || "upload.csv";
  await db.$transaction(async (tx) => {
    await tx.dataSubmission.create({ data: { id: submissionId, institutionId, academicYear: input.academicYear, version, parentId: last?.id ?? null, status: s.rejected > 0 ? "NEEDS_CORRECTION" : "VALIDATED", fileName, fileSha256: sha256(input.csv), rowCount: s.total,
      validCount: s.valid, warningCount: s.warning, reviewCount: s.requiresReview, rejectedCount: s.rejected, uploadedById: actor.id, notes, validatedAt: new Date() } });
    for (let i = 0; i < staged.length; i += 500) await tx.stagedRecord.createMany({ data: staged.slice(i, i + 500).map(({ id, r }) => ({
      id, submissionId, rowNumber: r.rowNumber, outcome: r.outcome, disposition: r.disposition, rowKey: r.rowKey, enrolmentId: r.existingEnrolmentId ?? null,
      payloadEnc: encryptField(JSON.stringify({ raw: r.raw, normalised: r.normalised, apaarHmac: r.apaarHmac, matchKey: r.matchKey, dobKey: r.dobKey, apaarState: r.apaarState, clashes: r.clashes })) })) });
    const issues = [
      ...staged.flatMap(({ id, r }) => r.issues.map((i) => ({ submissionId, stagedRecordId: id, severity: i.severity, category: i.category, code: i.code, field: i.field ?? null, message: i.message, fixHint: i.fixHint }))),
      ...res.submissionIssues.map((i) => ({ submissionId, stagedRecordId: null, severity: i.severity, category: i.category, code: i.code, field: null, message: i.message, fixHint: i.fixHint })),
    ];
    for (let i = 0; i < issues.length; i += 1000) await tx.validationIssue.createMany({ data: issues.slice(i, i + 1000) });
  }, { timeout: 60_000 });
  await audit({ actor, action: "SUBMISSION_UPLOADED", entityType: "DataSubmission", entityId: submissionId, institutionId, ipHash: meta.ipHash, metadata: { academicYear: input.academicYear, version, rows: s.total, valid: s.valid, rejected: s.rejected, requiresReview: s.requiresReview, skipped: s.skipped } });
  return { ok: true, submissionId, version, summary: s };
}

export type SubmitResult = { ok: true; accepted: number; held: number; skipped: number; status: string } | { ok: false; error: string };

export async function submitValidRows(actor: Actor, submissionId: string, meta: { ipHash?: string | null } = {}): Promise<SubmitResult> {
  const institutionId = ownInstitution(actor);
  const sub = await db.dataSubmission.findFirst({ where: { id: submissionId, institutionId }, include: { institution: { select: { name: true } } } });
  if (!sub) return { ok: false, error: "That submission was not found." };
  if (sub.submittedAt) return { ok: false, error: "This submission has already been submitted. Upload a corrected file to send the remaining rows." };
  if (sub.status === "SUPERSEDED") return { ok: false, error: "A newer file has replaced this one. Open the latest submission." };
  const pending = await db.stagedRecord.findMany({ where: { submissionId, disposition: "PENDING", NOT: { outcome: "REJECTED" } }, orderBy: { rowNumber: "asc" } });
  const rows = pending.map((p) => ({ p, d: JSON.parse(decryptField(p.payloadEnc)) as { normalised: NormalisedRow; apaarHmac: string | null; matchKey: string; dobKey: string; clashes: RowResult["clashes"] } }));
  const refs = rows.map((r) => r.d.normalised.studentRef);
  const taken = new Set((await db.student.findMany({ where: { institutionId, localStudentId: { in: refs } }, select: { localStudentId: true } })).map((s) => s.localStudentId));
  const newStudentIds: string[] = []; let accepted = 0;
  await db.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += 250) {
      const chunk = rows.slice(i, i + 250).filter((r) => !taken.has(r.d.normalised.studentRef)); // another submit won the race: never create a second student
      const plan = chunk.map((r) => ({ ...r, studentId: randomUUID(), enrolmentId: randomUUID() }));
      await tx.student.createMany({ data: plan.map(({ d, studentId }) => { const n = d.normalised; return { id: studentId, institutionId, localStudentId: n.studentRef, apaarHmac: d.apaarHmac, apaarFormat: "WELL_FORMED" as const, apaarNormalised: n.apaarRaw !== n.apaarNormalised,
        verification: d.clashes.length ? ("FLAGGED_DUPLICATE" as const) : ("STRUCTURALLY_VALID" as const), gender: n.gender, birthYear: Number(n.dob.slice(0, 4)), matchKey: d.matchKey, dobKey: d.dobKey, isDemo: true }; }) });
      await tx.studentIdentity.createMany({ data: plan.map(({ d, studentId }) => { const n = d.normalised; return { studentId, fullNameEnc: encryptField(n.fullName), dobEnc: encryptField(n.dob), apaarEnc: n.apaarNormalised ? encryptField(n.apaarNormalised) : null, apaarSubmittedEnc: n.apaarRaw ? encryptField(n.apaarRaw) : null, apaarMasked: n.apaarNormalised ? maskApaar(n.apaarNormalised) : null }; }) });
      await tx.enrolment.createMany({ data: plan.map(({ d, studentId, enrolmentId }) => { const n = d.normalised; return { id: enrolmentId, studentId, institutionId, programmeId: n.programmeId, departmentId: n.departmentId, academicYear: n.academicYear, admissionYear: n.admissionYear, categoryCode: n.categoryCode, status: n.status, submissionId }; }) });
      for (const x of plan) await tx.stagedRecord.update({ where: { id: x.p.id }, data: { disposition: "ACCEPTED", enrolmentId: x.enrolmentId } });
      newStudentIds.push(...plan.map((x) => x.studentId)); accepted += plan.length;
    }
  }, { timeout: 120_000 });
  const held = await db.stagedRecord.count({ where: { submissionId, disposition: "HELD" } });
  const skipped = await db.stagedRecord.count({ where: { submissionId, disposition: "SKIPPED" } });
  const status = held > 0 ? "NEEDS_CORRECTION" : "ACCEPTED";
  await db.dataSubmission.update({ where: { id: submissionId }, data: { status, submittedAt: new Date(), acceptedAt: status === "ACCEPTED" ? new Date() : null } });
  await db.dataSubmission.updateMany({ where: { institutionId, academicYear: sub.academicYear, version: { lt: sub.version }, status: { in: ["NEEDS_CORRECTION", "VALIDATED", "ACCEPTED"] } }, data: { status: "SUPERSEDED" } });
  await audit({ actor, action: "SUBMISSION_SUBMITTED", entityType: "DataSubmission", entityId: submissionId, institutionId, ipHash: meta.ipHash, metadata: { academicYear: sub.academicYear, version: sub.version, accepted, held, skipped, status } });
  // Analysis hooks run after the data is safely stored; a failure here must not undo an accepted submission.
  try { const { afterSubmission } = await import("@/lib/analysis/service"); await afterSubmission({ institutionId, academicYear: sub.academicYear, submissionId, newStudentIds, rowCount: sub.rowCount }); } catch (e) { console.error("[analysis]", e instanceof Error ? e.name : "error"); }
  await notifyInstitution(institutionId, { kind: "SUBMISSION", title: status === "ACCEPTED" ? `Submission v${sub.version} for ${sub.academicYear} accepted` : `Submission v${sub.version} for ${sub.academicYear} needs corrections`, body: `${accepted} new records were accepted${held ? `, ${held} are waiting for correction` : ""}${skipped ? `, ${skipped} were already on file` : ""}.`, link: `/institution/submissions/${submissionId}` });
  await notifyNational({ kind: "SUBMISSION", title: `${sub.institution.name} submitted ${sub.academicYear} (v${sub.version})`, body: `${accepted} records accepted${held ? `, ${held} held for correction` : ""}.`, link: "/aicte/institutions" }, { institutionId });
  return { ok: true, accepted, held, skipped, status };
}
