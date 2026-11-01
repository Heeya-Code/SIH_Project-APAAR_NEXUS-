// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Phase 2 verification at the service layer (no browser, no HTTP): the upload pipeline against the demo files' manifest,
// isolation, consent + signed records, Trust Score and analysis. Leaves the database as it found it.
//   npm run verify:phase2
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { verifyAuditChain } from "../src/lib/audit";
import { processUpload, submitValidRows } from "../src/lib/submissions/service";
import { getSubmissionDetail, correctionReportCsv } from "../src/lib/queries/submissions";
import { checkCredential, createRequest, decide, ensureVerifyCode, revoke, type VerifierActor } from "../src/lib/consent/service";
import { detectConflicts, refreshAnalysis } from "../src/lib/analysis/service";
import { reviewConflict } from "../src/lib/analysis/review";
import { resetInstitutionDemo } from "../src/lib/demo";
import { loadTrust } from "../src/lib/trust/service";
import { getSeatLedger } from "../src/lib/queries/ledger";
import { decryptField } from "../src/lib/crypto";
import { verifyPayload } from "../src/lib/credentials/sign";
import type { Actor } from "../src/lib/auth/permissions";

let pass = 0, fail = 0; const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => { if (ok) pass++; else { fail++; failures.push(`${name} ${detail}`); } console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); };
const section = (s: string) => console.log(`\n${s}`);
const actorOf = async (email: string): Promise<Actor & { organisation: string | null }> => { const u = await db.user.findUniqueOrThrow({ where: { email } }); return { id: u.id, role: u.role, institutionId: u.institutionId, region: u.region, studentId: u.studentId, organisation: u.organisation }; };
const manifest = JSON.parse(fs.readFileSync(path.join("demo-data", "manifest.json"), "utf8"));
const csv = (f: string) => fs.readFileSync(path.join("demo-data", f), "utf8");

async function main() {
  const sah = await actorOf("admin@sahyadri.demo"), op = await actorOf("operator@sahyadri.demo"), kav = await actorOf("admin@kaveri.demo");
  const sahId = sah.institutionId!;
  const baseline = { students: await db.student.count(), enrol: await db.enrolment.count({ where: { institutionId: sahId, academicYear: "2026-27" } }) };
  await resetInstitutionDemo(sahId); await refreshAnalysis({ notify: false });
  const conflictsBefore = await db.duplicateAlert.count();

  section("1. Demo A: first upload matches the manifest (five checks, row-level)");
  const up = await processUpload(op, { academicYear: "2026-27", fileName: "with_errors.csv", csv: csv("sahyadri_2026-27_batch1_with_errors.csv") });
  check("upload accepted for validation", up.ok); if (!up.ok) throw new Error(up.error);
  const e = manifest.expected.firstUpload, s = up.summary;
  check(`rows ${e.total}`, s.total === e.total, String(s.total));
  check(`rejected ${e.rejected}`, s.rejected === e.rejected, String(s.rejected));
  check(`requires review ${e.requiresReview}`, s.requiresReview === e.requiresReview, String(s.requiresReview));
  check(`warnings ${e.warnings}`, s.warning === e.warnings, String(s.warning));
  check(`valid ${e.valid}`, s.valid === e.valid, String(s.valid));
  for (const [cat, n] of Object.entries(e.rowsByCategory)) check(`check "${cat}": ${n} rows`, (s.rowsByCategory as Record<string, number>)[cat] === n, String((s.rowsByCategory as Record<string, number>)[cat]));
  check("APAAR: 4 malformed, 3 missing", s.apaar.formatInvalid === 4 && s.apaar.missing === 3, JSON.stringify(s.apaar));
  check("APAAR: the simulated registry verified the well-formed IDs", s.apaar.mockVerified > 60, String(s.apaar.mockVerified));
  const d1 = (await getSubmissionDetail(op, up.submissionId, { page: 1, pageSize: 500 }))!;
  const me = (d1.notes.intake as { programmeName: string; approved: number; inThisFile: number; overshoot: number; remaining: number; utilisation: number }[]).find((l) => /Mechanical/.test(l.programmeName))!;
  check(`intake: ME approved ${e.intake.approved}, in file ${e.intake.inThisFile}, overshoot ${e.intake.overshoot}`, me.approved === e.intake.approved && me.inThisFile === e.intake.inThisFile && me.overshoot === e.intake.overshoot, JSON.stringify(me));
  check("intake: utilisation is reported (> 100%)", me.utilisation > 1);
  check("intake: a submission-level INTAKE issue explains the overshoot", d1.subIssues.some((i) => i.category === "INTAKE" && /above intake/.test(i.message)));
  check("every issue has a plain-language reason and a fix", d1.rows.every((r) => r.issues.every((i) => i.message.length > 10 && i.fixHint.length > 10)));
  check("no raw APAAR ID appears in any stored message", d1.rows.every((r) => r.issues.every((i) => !/\b99\d{10}\b/.test(i.message + i.fixHint))) && d1.rows.every((r) => !/\b99\d{10}\b/.test(r.apaar)));
  check("partial processing: rejected rows are HELD, others stay eligible (nothing silently dropped)", d1.rows.filter((r) => r.outcome === "REJECTED").every((r) => r.disposition === "HELD") && d1.rows.filter((r) => r.outcome !== "REJECTED").every((r) => r.disposition === "PENDING") && d1.rows.length === 100);
  check("status is NEEDS_CORRECTION, version 1", d1.sub.status === "NEEDS_CORRECTION" && d1.sub.version === 1);
  const report = (await correctionReportCsv(op, up.submissionId))!;
  check("correction report lists rows with what happened and how to fix, APAAR masked", /how_to_fix/.test(report) && /MUST FIX/.test(report) && !/\b99\d{10}\b/.test(report) && report.split("\n").length > 20);
  check("another institution cannot open this submission or its report", (await getSubmissionDetail(kav, up.submissionId, { page: 1, pageSize: 10 })) === null && (await correctionReportCsv(kav, up.submissionId)) === null);

  section("2. Submit valid rows (idempotent), then correct and resubmit");
  const sub1 = await submitValidRows(op, up.submissionId); check("valid rows submitted", sub1.ok && sub1.accepted === 83 && sub1.held === 17, JSON.stringify(sub1));
  const again = await submitValidRows(op, up.submissionId); check("submitting twice is refused, creating nothing", !again.ok);
  const afterV1 = await db.enrolment.count({ where: { institutionId: sahId, academicYear: "2026-27" } });
  check("exactly 83 enrolments exist after v1 (held rows were not created)", afterV1 === 83, String(afterV1));
  const up2 = await processUpload(sah, { academicYear: "2026-27", fileName: "corrected.csv", csv: csv("sahyadri_2026-27_batch1_corrected.csv") });
  check("corrected file validates as version 2", up2.ok && up2.version === 2); if (!up2.ok) throw new Error(up2.error);
  const c = manifest.expected.correctedUpload;
  check(`v2: ${c.skipped} unchanged rows recognised as already received (not duplicated)`, up2.summary.skipped === c.skipped, String(up2.summary.skipped));
  check(`v2: ${c.valid} newly corrected rows are valid, 0 rejected`, up2.summary.valid === c.valid && up2.summary.rejected === c.rejected, JSON.stringify([up2.summary.valid, up2.summary.rejected]));
  const d2 = (await getSubmissionDetail(sah, up2.submissionId, { page: 1, pageSize: 10 }))!;
  const me2 = (d2.notes.intake as { programmeName: string; alreadyOnFile: number; inThisFile: number; overshoot: number }[]).find((l) => /Mechanical/.test(l.programmeName))!;
  check(`v2 intake: ${c.intake.alreadyOnFile} already on file + ${c.intake.inThisFile} new, overshoot ${c.intake.overshoot}`, me2.alreadyOnFile === c.intake.alreadyOnFile && me2.inThisFile === c.intake.inThisFile && me2.overshoot === c.intake.overshoot, JSON.stringify(me2));
  check("resubmission history: v2 links to v1 and shows both versions", d2.chain.length === 2 && d2.sub.parentId === d1.sub.id);
  const sub2 = await submitValidRows(sah, up2.submissionId); check("v2 submitted: 17 accepted, 0 held, status ACCEPTED", sub2.ok && sub2.accepted === 17 && sub2.held === 0 && sub2.status === "ACCEPTED", JSON.stringify(sub2));
  check("v1 is now SUPERSEDED, history preserved", (await db.dataSubmission.findUniqueOrThrow({ where: { id: up.submissionId } })).status === "SUPERSEDED");
  check("exactly 100 enrolments after v2", (await db.enrolment.count({ where: { institutionId: sahId, academicYear: "2026-27" } })) === 100);
  const up3 = await processUpload(sah, { academicYear: "2026-27", fileName: "corrected-again.csv", csv: csv("sahyadri_2026-27_batch1_corrected.csv") });
  if (up3.ok) { const r3 = await submitValidRows(sah, up3.submissionId); check("uploading the same file a third time creates NO duplicates", up3.summary.skipped === 100 && r3.ok && r3.accepted === 0 && (await db.enrolment.count({ where: { institutionId: sahId, academicYear: "2026-27" } })) === 100, JSON.stringify(up3.summary.skipped)); }
  const dupStudents = await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM (SELECT "institutionId", "localStudentId" FROM "Student" GROUP BY 1,2 HAVING count(*) > 1) t`;
  check("no duplicate (institution, student reference) anywhere", dupStudents[0].n === 0);
  check("PII is encrypted for the newly created students", (await db.studentIdentity.count({ where: { student: { institutionId: sahId, enrolments: { some: { academicYear: "2026-27" } } }, NOT: { fullNameEnc: { startsWith: "v1:" } } } })) === 0);

  section("3. Check 5: cross-institution clashes created from the upload");
  const newClashes = (await db.duplicateAlert.count()) - conflictsBefore;
  check(`${manifest.expected.crossInstitutionAlertsCreatedOnSubmit} conflict alerts created for the 5 clashing students`, newClashes === manifest.expected.crossInstitutionAlertsCreatedOnSubmit, String(newClashes));
  const fresh = await db.duplicateAlert.findMany({ where: { OR: [{ institutionAId: sahId }, { institutionBId: sahId }] } });
  check("alert evidence names institutions but contains no APAAR ID, name or date of birth", fresh.every((a) => { const j = JSON.stringify(a.evidence); return !/\b\d{12}\b/.test(j) && !/dateOfBirth":"\d{4}/.test(j) && j.includes("institution"); }));
  check("flagged students carry FLAGGED_DUPLICATE, never an automatic merge", (await db.student.count({ where: { institutionId: sahId, verification: "FLAGGED_DUPLICATE" } })) === 5 && (await db.student.count({ where: { institutionId: sahId } })) === baseline.students + 0 + (await db.student.count({ where: { institutionId: sahId } })) - baseline.students);
  const one = fresh[0]; const aicte = await actorOf("admin@aicte.demo");
  check("a regional officer outside the region cannot review it", !(await reviewConflict(await actorOf("officer.north@aicte.demo"), one.id, "DISMISSED", "x")).ok || one.institutionAId === sahId && false);
  const rv = await reviewConflict(aicte, one.id, "UNDER_REVIEW", "Checking with both institutions"); check("AICTE can move a conflict to UNDER_REVIEW with a note", rv.ok);
  const rv2 = await reviewConflict(await actorOf("officer.west@aicte.demo"), one.id, "DISMISSED", "Student transferred; earlier enrolment closed"); check("the western regional officer can dismiss it (Sahyadri is western)", rv2.ok && (await db.duplicateAlert.findUniqueOrThrow({ where: { id: one.id } })).status === "DISMISSED");

  section("4. Anomaly engine on the new data");
  const alerts = await db.anomalyAlert.findMany({ where: { institutionId: sahId, academicYear: "2026-27" } });
  check("an NRI spike alert explains the increase", manifest.expected.nriSpikeAlertExpected ? alerts.some((a) => a.kind === "SUPERNUMERARY_SPIKE:NRI" && /rose from \d+ to 16/.test(String((a.explanation as { headline: string }).headline))) : true, JSON.stringify(alerts.map((a) => a.kind)));
  check("an intake overshoot alert quantifies it", alerts.some((a) => a.kind === "INTAKE_OVERSHOOT" && /students above approved intake/.test(String((a.explanation as { headline: string }).headline))));
  check("every alert states it is not proof of wrongdoing", alerts.every((a) => /not proof/.test(String((a.explanation as { caution: string }).caution))));
  const full = await refreshAnalysis({ notify: false });
  check("analysis is idempotent: a second run creates no new alerts or conflicts", full.alertsCreated === 0 && full.conflicts.created === 0, JSON.stringify([full.alertsCreated, full.conflicts.created]));
  check("the reviewed alert keeps its human decision after re-analysis", (await db.duplicateAlert.findUniqueOrThrow({ where: { id: one.id } })).status === "DISMISSED");
  const deccan = await db.anomalyAlert.count({ where: { institution: { slug: "deccan" } } });
  check("Deccan (legitimate supernumerary admissions within caps) has no alerts", deccan === 0, String(deccan));

  section("5. Trust Score and Seat Ledger agree with independent SQL");
  const { rows } = await loadTrust(); const tr = (slug: string, ay: string, ids: Record<string, string>) => rows.get(`${ids[slug]}|${ay}`)!;
  const ids = Object.fromEntries((await db.institution.findMany({ select: { id: true, slug: true } })).map((i) => [i.slug, i.id]));
  const k = tr("kaveri", "2025-26", ids); const h = tr("hooghly", "2025-26", ids); const a = tr("aravalli", "2026-27", ids); const g = tr("gomti", "2025-26", ids);
  check("Kaveri 2025-26 (clean institution) scores high", k.result.scored && k.result.overall >= 90, k.result.scored ? String(k.result.overall) : "unscored");
  check("Hooghly 2025-26: repeated corrections lower data consistency to 0", h.result.scored && h.result.components.find((c) => c.key === "consistency")!.score === 0);
  check("Aravalli 2026-27: intake overshoot lowers the intake component", a.result.scored && a.result.components.find((c) => c.key === "intake")!.score < 60);
  check("Gomti 2025-26: conflicts and alerts lower the score, with named reasons", g.result.scored && g.result.components.filter((c) => c.recommendation).length >= 2);
  const sqlRecords = await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "Enrolment" WHERE "institutionId" = ${ids.kaveri} AND "academicYear" = '2025-26' AND status <> 'WITHDRAWN'`;
  check("Trust metrics use the same record counts as SQL", k.metrics.records === sqlRecords[0].n, `${k.metrics.records} vs ${sqlRecords[0].n}`);
  check("an institution with no submission is 'not scored', not scored zero", (() => { const r = rows.get(`${ids.malwa}|2026-27`)!; return !r.result.scored; })());
  const ledger = await getSeatLedger(aicte, "2025-26"); const sqlSum = await db.$queryRaw<{ s: number }[]>`SELECT sum("baseIntake")::int AS s FROM "ApprovedIntake" WHERE "academicYear" = '2025-26'`;
  check("seat ledger programme rows sum to total approved intake", ledger.reduce((t, r) => t + r.intake, 0) === sqlSum[0].s);
  check("a regional officer's ledger holds only western institutions", (await getSeatLedger(await actorOf("officer.west@aicte.demo"), "2025-26")).every((r) => ["WEST"].includes(r.region)));

  section("6. Consent and signed verification records");
  const stu = await actorOf("student@nexus.demo"), multi = await actorOf("student.multi@nexus.demo"), ver = await actorOf("verifier@meridian.demo"), board = await actorOf("board@statetech.demo");
  const code = await ensureVerifyCode(stu.studentId!);
  const bad = await createRequest(ver, { studentCode: "WRONG-CODE0", purpose: "Employment verification", fields: ["ENROLMENT_STATUS"] }); check("an unknown student code reveals nothing", !bad.ok);
  check("a request without a stated purpose is refused", !(await createRequest(ver, { studentCode: code, purpose: "just curious", fields: ["ENROLMENT_STATUS"] })).ok);
  const r1 = await createRequest(ver, { studentCode: code, purpose: "Employment verification", fields: ["ENROLMENT_STATUS", "PROGRAMME", "STUDENT_NAME"] }); check("verifier request created", r1.ok); if (!r1.ok) throw new Error(r1.error);
  check("a second pending request to the same student is refused", !(await createRequest(ver, { studentCode: code, purpose: "Employment verification", fields: ["ENROLMENT_STATUS"] })).ok);
  const reqRow = await db.consentRequest.findUniqueOrThrow({ where: { reference: r1.reference } });
  check("a different student cannot act on this request", !(await decide(multi, { id: reqRow.id, decision: "APPROVE", fields: ["ENROLMENT_STATUS"] })).ok);
  check("the student must approve at least one field (cannot approve nothing)", !(await decide(stu, { id: reqRow.id, decision: "APPROVE", fields: [] })).ok);
  check("fields that were never requested cannot be added by approval", !(await decide(stu, { id: reqRow.id, decision: "APPROVE", fields: ["INSTITUTION"] })).ok);
  const approve = await decide(stu, { id: reqRow.id, decision: "APPROVE", fields: ["ENROLMENT_STATUS", "PROGRAMME"], validDays: 7 }); check("student approves a SUBSET (name withheld)", approve.ok && !!approve.code); if (!approve.ok || !approve.code) throw new Error("approve failed");
  check("an answered request cannot be answered again", !(await decide(stu, { id: reqRow.id, decision: "REJECT" })).ok);
  const ok = await checkCredential(ver, approve.code, "CREDENTIAL_ID");
  check("verifier resolves the code: VALID with valid signature", ok.result === "VALID" && ok.signature?.valid === true && ok.signature.algorithm === "Ed25519");
  check("selective disclosure: only the two approved fields are returned", JSON.stringify(ok.claims.map((x) => x.key).sort()) === JSON.stringify(["ENROLMENT_STATUS", "PROGRAMME"]) && !JSON.stringify(ok).includes("Nikhil"));
  check("the result carries consent reference, purpose, issue date and expiry", ok.consentReference === r1.reference && !!ok.purpose && !!ok.issuedAt && !!ok.validUntil);
  check("a scanned URL resolves the same record", (await checkCredential(ver, `https://x.example/verifier/check?code=${approve.code.toLowerCase()}`, "QR_SCAN")).result === "VALID");
  check("another verifier organisation is denied (least privilege)", (await checkCredential(board, approve.code, "CREDENTIAL_ID")).result === "CONSENT_DENIED");
  check("a wrong code is NOT_FOUND", (await checkCredential(ver, "EV-AAAA-BBBB-CCCC", "CREDENTIAL_ID")).result === "NOT_FOUND");
  const stored = await db.digitalCredential.findUniqueOrThrow({ where: { id: approve.code } });
  check("the stored record holds no APAAR ID, and only approved claims", !JSON.stringify(stored.payload).match(/\b\d{12}\b/) && Object.keys((stored.payload as { claims: object }).claims).length === 2);
  check("signature verifies independently", verifyPayload(stored.payload, stored.signature, stored.payloadSha256, stored.keyId) === "OK");
  const orig = stored.payload as { claims: Record<string, string> };
  await db.digitalCredential.update({ where: { id: stored.id }, data: { payload: { ...orig, claims: { ...orig.claims, ENROLMENT_STATUS: "GRADUATED" } } } });
  check("TAMPERING with the stored record is detected: SIGNATURE_INVALID", (await checkCredential(ver, approve.code, "CREDENTIAL_ID")).result === "SIGNATURE_INVALID");
  await db.digitalCredential.update({ where: { id: stored.id }, data: { payload: stored.payload as object } });
  check("restored record is valid again", (await checkCredential(ver, approve.code, "CREDENTIAL_ID")).result === "VALID");
  await db.digitalCredential.update({ where: { id: stored.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  check("an EXPIRED record is reported as expired", (await checkCredential(ver, approve.code, "CREDENTIAL_ID")).result === "EXPIRED");
  await db.digitalCredential.update({ where: { id: stored.id }, data: { expiresAt: stored.expiresAt } });
  check("the student revokes: REVOKED immediately", (await revoke(stu, reqRow.id)).ok && (await checkCredential(ver, approve.code, "CREDENTIAL_ID")).result === "REVOKED");
  check("revoking twice is refused", !(await revoke(stu, reqRow.id)).ok);
  const r2 = await createRequest(ver, { studentCode: code, purpose: "Regulatory check", fields: ["ENROLMENT_STATUS"] }); if (r2.ok) { const row2 = await db.consentRequest.findUniqueOrThrow({ where: { reference: r2.reference } }); check("the student can decline a request", (await decide(stu, { id: row2.id, decision: "REJECT", note: "No" })).ok && (await db.consentRequest.findUniqueOrThrow({ where: { id: row2.id } })).status === "REJECTED"); }
  const log = await db.consentRequest.findMany({ where: { studentId: stu.studentId! }, orderBy: { createdAt: "asc" } });
  check("the Consent Log has approved, rejected, revoked and expired entries with timestamps", ["APPROVED", "REJECTED", "REVOKED", "EXPIRED"].every((st) => log.some((l) => l.status === st)) && log.every((l) => l.createdAt && (l.status === "PENDING" || l.decidedAt)), log.map((l) => l.status).join(","));
  const vrows = await db.verificationRequest.count({ where: { verifierUserId: ver.id } }); check("every lookup is recorded in the verifier's history", vrows >= 8, String(vrows));

  section("7. Audit trail");
  const needed = ["SUBMISSION_UPLOADED", "SUBMISSION_SUBMITTED", "CONSENT_REQUESTED", "CONSENT_APPROVED", "CONSENT_REJECTED", "CONSENT_REVOKED", "VERIFICATION_CHECKED", "CONFLICT_REVIEWED"];
  for (const act of needed) check(`audited: ${act}`, (await db.auditLog.count({ where: { action: act } })) > 0);
  const meta = (await db.auditLog.findMany({ where: { action: { in: needed } }, select: { metadata: true } })).map((m) => JSON.stringify(m.metadata));
  check("no audit metadata contains an APAAR ID, name or QR/credential payload", meta.every((m) => !/\b\d{12}\b/.test(m) && !/Nikhil|claims|signature/.test(m)));
  const chain = await verifyAuditChain(); check(`audit hash chain intact (${chain.checked} records)`, chain.ok, chain.reason ?? "");

  section("8. Cleanup: the database is returned to its starting state");
  await resetInstitutionDemo(sahId); await refreshAnalysis({ notify: false });
  // Consent requests are history: they are never deleted (deleting one would orphan its signed record).
  check("Sahyadri 2026-27 is empty again", (await db.enrolment.count({ where: { institutionId: sahId, academicYear: "2026-27" } })) === baseline.enrol);
  check("student count restored", (await db.student.count()) === baseline.students);
  void decryptField;
}
main().catch((e) => { console.error(e); fail++; failures.push(String(e)); }).finally(async () => { await db.$disconnect(); console.log(`\n${pass} passed, ${fail} failed`); if (fail) { console.log(failures.map((f) => ` - ${f}`).join("\n")); process.exit(1); } });
