// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { db } from "@/lib/db";
import { decryptField } from "@/lib/crypto";
import { maskApaar } from "@/lib/mask";
import { institutionScope, type Actor } from "@/lib/auth/permissions";
import { toCsv } from "@/lib/submissions/spec";

const ownInstitution = (a: Actor) => { const id = institutionScope(a).id; if (!id) throw new Error("Institution account required"); return id; };

export async function listSubmissions(actor: Actor) {
  return db.dataSubmission.findMany({ where: { institutionId: ownInstitution(actor) }, orderBy: [{ academicYear: "desc" }, { version: "desc" }], take: 60 });
}

export type RowView = { rowNumber: number; outcome: string; disposition: string; studentRef: string; name: string; programme: string; apaar: string; issues: { id: string; category: string; severity: string; code: string; field: string | null; message: string; fixHint: string }[] };

export async function getSubmissionDetail(actor: Actor, id: string, opts: { category?: string; outcome?: string; page: number; pageSize: number }) {
  const institutionId = ownInstitution(actor);
  const sub = await db.dataSubmission.findFirst({ where: { id, institutionId }, include: { institution: { select: { name: true } } } }); // ownership is part of the query
  if (!sub) return null;
  const where = { submissionId: id, ...(opts.outcome ? { outcome: opts.outcome as "VALID" } : {}), ...(opts.category ? { issues: { some: { category: opts.category } } } : {}) };
  const [total, staged, chain, subIssues, held, notes] = await Promise.all([
    db.stagedRecord.count({ where }),
    db.stagedRecord.findMany({ where, orderBy: { rowNumber: "asc" }, skip: (opts.page - 1) * opts.pageSize, take: opts.pageSize, include: { issues: { orderBy: { severity: "desc" } } } }),
    db.dataSubmission.findMany({ where: { institutionId, academicYear: sub.academicYear }, orderBy: { version: "asc" }, select: { id: true, version: true, status: true, rowCount: true, rejectedCount: true, createdAt: true, submittedAt: true } }),
    db.validationIssue.findMany({ where: { submissionId: id, stagedRecordId: null }, select: { id: true, category: true, severity: true, code: true, message: true, fixHint: true } }),
    db.stagedRecord.count({ where: { submissionId: id, disposition: "HELD" } }),
    Promise.resolve(sub.notes ? (JSON.parse(sub.notes) as Record<string, unknown>) : {}),
  ]);
  const rows: RowView[] = staged.map((s) => {
    const p = JSON.parse(decryptField(s.payloadEnc)) as { raw: Record<string, string> };
    return { rowNumber: s.rowNumber, outcome: s.outcome, disposition: s.disposition, studentRef: p.raw.student_ref ?? "", name: p.raw.full_name ?? "", programme: p.raw.programme_code ?? "", apaar: p.raw.apaar_id ? maskApaar(p.raw.apaar_id.replace(/[\s-]/g, "")) : "Not provided",
      issues: s.issues.map((i) => ({ id: i.id, category: i.category, severity: i.severity, code: i.code, field: i.field, message: i.message, fixHint: i.fixHint })) };
  });
  return { sub, rows, total, chain, subIssues, held, notes };
}

/** CSV the institution downloads to fix its file. APAAR IDs are masked: they already hold the originals in their own file. */
export async function correctionReportCsv(actor: Actor, id: string): Promise<string | null> {
  const institutionId = ownInstitution(actor);
  const sub = await db.dataSubmission.findFirst({ where: { id, institutionId } });
  if (!sub) return null;
  const staged = await db.stagedRecord.findMany({ where: { submissionId: id, issues: { some: { severity: { in: ["REJECTED", "REQUIRES_REVIEW"] } } } }, orderBy: { rowNumber: "asc" }, include: { issues: true } });
  const out: unknown[][] = [["file_row", "student_ref", "full_name", "programme_code", "apaar_id_masked", "result", "check", "what_happened", "how_to_fix", "status"]];
  for (const s of staged) {
    const p = JSON.parse(decryptField(s.payloadEnc)) as { raw: Record<string, string> };
    for (const i of s.issues.filter((x) => x.severity !== "WARNING")) out.push([s.rowNumber, p.raw.student_ref, p.raw.full_name, p.raw.programme_code, p.raw.apaar_id ? maskApaar(p.raw.apaar_id.replace(/[\s-]/g, "")) : "(missing)", i.severity === "REJECTED" ? "MUST FIX" : "FOR REVIEW", i.category, i.message, i.fixHint, s.disposition === "ACCEPTED" ? "accepted, flagged for AICTE review" : s.disposition === "HELD" ? "held until corrected" : s.disposition.toLowerCase()]);
  }
  for (const i of await db.validationIssue.findMany({ where: { submissionId: id, stagedRecordId: null } })) out.push(["(whole file)", "", "", "", "", "FOR REVIEW", i.category, i.message, i.fixHint, ""]);
  return toCsv(out);
}
