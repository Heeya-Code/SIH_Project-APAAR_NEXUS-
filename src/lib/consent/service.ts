// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Student consent and signed verification records.
//   verifier asks  ->  student sees who/why/which fields  ->  student approves a subset (or rejects)
//   ->  signed record + QR  ->  verifier resolves the code: signature, validity, revocation and consent are all checked.
// Login is never consent. A verifier only ever receives the fields the student approved.
import { randomUUID } from "node:crypto";
import { audit } from "@/lib/audit";
import { decryptField } from "@/lib/crypto";
import { db } from "@/lib/db";
import { notifyUsers } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import type { Actor } from "@/lib/auth/permissions";
import { buildClaims, FIELDS, isFieldKey, PURPOSES, type FieldKey } from "@/lib/credentials/claims";
import { extractCode, newConsentReference, newStudentCode, newVerificationCode, signPayload, verifyPayload } from "@/lib/credentials/sign";

export const REQUEST_VALID_DAYS = 7;
export type VerifierActor = Actor & { organisation: string | null };
const DAY = 864e5;

export async function ensureVerifyCode(studentId: string): Promise<string> {
  const s = await db.student.findUniqueOrThrow({ where: { id: studentId }, select: { verifyCode: true } });
  if (s.verifyCode) return s.verifyCode;
  for (let i = 0; i < 5; i++) { try { return (await db.student.update({ where: { id: studentId }, data: { verifyCode: newStudentCode() }, select: { verifyCode: true } })).verifyCode!; } catch { /* collision: try again */ } }
  throw new Error("Could not create a student code");
}

/** Lazy state changes so nothing depends on a background job. */
export async function expireStale(where: { studentId?: string; verifierUserId?: string } = {}) {
  const now = new Date();
  await db.consentRequest.updateMany({ where: { ...where, status: "PENDING", requestExpiresAt: { lt: now } }, data: { status: "EXPIRED" } });
  await db.consentRequest.updateMany({ where: { ...where, status: "APPROVED", validUntil: { lt: now } }, data: { status: "EXPIRED" } });
}

type Fail = { ok: false; error: string };

export async function createRequest(v: VerifierActor, input: { studentCode: string; purpose: string; fields: string[] }, meta: { ipHash?: string | null } = {}): Promise<{ ok: true; reference: string; requestExpiresAt: Date } | Fail> {
  if (!(PURPOSES as readonly string[]).includes(input.purpose)) return { ok: false, error: "Choose one of the listed purposes. Each request must say why the information is needed." };
  const fields = [...new Set(input.fields)].filter(isFieldKey);
  if (!fields.length) return { ok: false, error: "Choose at least one piece of information to ask for." };
  const rl = rateLimit(`consent:${v.id}`, 15, 10 * 60_000);
  if (!rl.ok) return { ok: false, error: `You have sent many requests recently. Please wait ${rl.retryAfterSec} seconds.` };
  const code = input.studentCode.trim().toUpperCase().replace(/\s+/g, "");
  const student = /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code) ? await db.student.findUnique({ where: { verifyCode: code }, select: { id: true, user: { select: { id: true, isActive: true } } } }) : null;
  if (!student || !student.user?.isActive) { await audit({ actor: v, action: "CONSENT_REQUEST_REJECTED", outcome: "FAILURE", metadata: { reason: "unknown_or_inactive_student_code" }, ipHash: meta.ipHash }); return { ok: false, error: "No student account matches that code. Ask the student to open My academic identity and read out the code shown there." }; }
  await expireStale({ studentId: student.id });
  const dup = await db.consentRequest.findFirst({ where: { verifierUserId: v.id, studentId: student.id, status: "PENDING" } });
  if (dup) return { ok: false, error: `You already have an unanswered request to this student (${dup.reference}). Wait for their reply.` };
  const requestExpiresAt = new Date(Date.now() + REQUEST_VALID_DAYS * DAY), reference = newConsentReference();
  const row = await db.consentRequest.create({ data: { reference, verifierUserId: v.id, verifierOrg: v.organisation ?? "Verifier", studentId: student.id, purpose: input.purpose, requestedFields: fields, requestExpiresAt } });
  await notifyUsers([student.user.id], { kind: "CONSENT", title: `${row.verifierOrg} is asking to verify your enrolment`, body: `Purpose: ${row.purpose}. Nothing is shared unless you approve.`, link: "/student/requests" });
  await audit({ actor: v, action: "CONSENT_REQUESTED", entityType: "ConsentRequest", entityId: row.id, ipHash: meta.ipHash, metadata: { reference, purpose: row.purpose, fields } });
  return { ok: true, reference, requestExpiresAt };
}

export async function decide(s: Actor, input: { id: string; decision: "APPROVE" | "REJECT"; fields?: string[]; validDays?: number; note?: string }, meta: { ipHash?: string | null } = {}): Promise<{ ok: true; status: string; code?: string } | Fail> {
  if (!s.studentId) return { ok: false, error: "Student account required." };
  await expireStale({ studentId: s.studentId });
  const req = await db.consentRequest.findFirst({ where: { id: input.id, studentId: s.studentId } }); // a student can only act on their own requests
  if (!req) return { ok: false, error: "That request was not found." };
  if (req.status !== "PENDING") return { ok: false, error: req.status === "EXPIRED" ? "This request has expired. Ask the requester to send a new one." : "This request has already been answered." };
  const verifier = await db.user.findUnique({ where: { id: req.verifierUserId }, select: { id: true } });
  if (input.decision === "REJECT") {
    await db.consentRequest.update({ where: { id: req.id }, data: { status: "REJECTED", decidedAt: new Date(), decisionNote: input.note?.slice(0, 300) || null } });
    if (verifier) await notifyUsers([verifier.id], { kind: "CONSENT", title: `Request ${req.reference} was declined`, body: "The student chose not to share this information.", link: "/verifier/history" });
    await audit({ actor: s, action: "CONSENT_REJECTED", entityType: "ConsentRequest", entityId: req.id, ipHash: meta.ipHash, metadata: { reference: req.reference } });
    return { ok: true, status: "REJECTED" };
  }
  const requested = (req.requestedFields as string[]).filter(isFieldKey);
  const approved = [...new Set(input.fields ?? [])].filter((f): f is FieldKey => isFieldKey(f) && requested.includes(f));
  if (!approved.length) return { ok: false, error: "Choose at least one item to share, or decline the request." };
  const days = [1, 7, 30].includes(input.validDays ?? 7) ? (input.validDays ?? 7) : 7;
  const enrol = await db.enrolment.findFirst({ where: { studentId: s.studentId }, orderBy: [{ status: "asc" }, { academicYear: "desc" }], include: { institution: { select: { name: true } }, programme: { select: { name: true } }, student: { include: { identity: true } } } });
  if (!enrol) return { ok: false, error: "No enrolment was found for your record, so there is nothing to verify." };
  const now = new Date(), exp = new Date(now.getTime() + days * DAY), code = newVerificationCode();
  const claims = buildClaims(approved, { status: enrol.status, institutionName: enrol.institution.name, programmeName: enrol.programme.name, academicYear: enrol.academicYear, fullName: enrol.student.identity ? decryptField(enrol.student.identity.fullNameEnc) : "" }, now);
  const payload = { v: 1, typ: "EnrolTrust verification record (prototype)", cid: code, consent: req.reference, issuedTo: req.verifierOrg, iat: now.toISOString(), exp: exp.toISOString(), claims, basis: "Structural and internal duplicate checks on synthetic records. This is not an official APAAR verification.", simulated: true };
  const sig = signPayload(payload);
  await db.$transaction(async (tx) => {
    await tx.digitalCredential.create({ data: { id: code, studentId: s.studentId!, enrolmentId: enrol.id, institutionId: enrol.institutionId, kind: "ENROLMENT_VERIFICATION", payload, payloadSha256: sig.payloadSha256, signature: sig.signature, keyId: sig.keyId, expiresAt: exp, isDemo: true } });
    await tx.consentRequest.update({ where: { id: req.id }, data: { status: "APPROVED", approvedFields: approved, decidedAt: now, validUntil: exp, credentialId: code, decisionNote: input.note?.slice(0, 300) || null } });
  });
  if (verifier) await notifyUsers([verifier.id], { kind: "CONSENT", title: `Request ${req.reference} was approved`, body: "Ask the student for their QR code, or enter the verification code they share.", link: "/verifier/history" });
  await audit({ actor: s, action: "CONSENT_APPROVED", entityType: "ConsentRequest", entityId: req.id, ipHash: meta.ipHash, metadata: { reference: req.reference, approved, requested, validDays: days, credential: code, keyId: sig.keyId } });
  return { ok: true, status: "APPROVED", code };
}

export async function revoke(s: Actor, id: string, meta: { ipHash?: string | null } = {}): Promise<{ ok: true } | Fail> {
  if (!s.studentId) return { ok: false, error: "Student account required." };
  const req = await db.consentRequest.findFirst({ where: { id, studentId: s.studentId } });
  if (!req) return { ok: false, error: "That record was not found." };
  if (req.status !== "APPROVED") return { ok: false, error: "Only an approved verification can be revoked." };
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.consentRequest.update({ where: { id }, data: { status: "REVOKED", revokedAt: now } });
    if (req.credentialId) await tx.digitalCredential.update({ where: { id: req.credentialId }, data: { revokedAt: now, revokeReason: "Consent withdrawn by the student" } });
  });
  await notifyUsers([req.verifierUserId], { kind: "CONSENT", title: `Verification ${req.reference} was withdrawn`, body: "The student withdrew consent. The verification code no longer works.", link: "/verifier/history" });
  await audit({ actor: s, action: "CONSENT_REVOKED", entityType: "ConsentRequest", entityId: id, ipHash: meta.ipHash, metadata: { reference: req.reference } });
  return { ok: true };
}

export type CheckOutcome = "VALID" | "EXPIRED" | "REVOKED" | "NOT_FOUND" | "SIGNATURE_INVALID" | "CONSENT_DENIED";
export type CheckResult = {
  result: CheckOutcome; code: string; message: string; claims: { key: string; label: string; value: string }[]; consentReference?: string; purpose?: string; issuedAt?: string; validUntil?: string;
  revokedAt?: string; signature: { algorithm: "Ed25519"; keyId: string; valid: boolean } | null; simulated: true; notice: string;
};
const NOTICE = "Prototype record on synthetic data. It reflects structural and internal duplicate checks only and is not an official APAAR verification.";
const MESSAGES: Record<CheckOutcome, string> = {
  VALID: "This verification is genuine and current. You can see only what the student agreed to share.",
  EXPIRED: "This verification has expired. Ask the student to approve a new request.",
  REVOKED: "The student withdrew consent for this verification. Do not rely on it.",
  NOT_FOUND: "No verification matches this code. Check it for typing mistakes, or ask the student to show the QR code again.",
  SIGNATURE_INVALID: "This record failed its integrity check and may have been altered. Do not rely on it.",
  CONSENT_DENIED: "This verification was granted to a different requester, so you cannot open it. Send your own request to the student.",
};

export async function checkCredential(v: VerifierActor, raw: string, method: "QR_SCAN" | "CREDENTIAL_ID", meta: { ipHash?: string | null } = {}): Promise<CheckResult> {
  const code = extractCode(raw).slice(0, 40);
  const rl = rateLimit(`check:${v.id}`, 40, 10 * 60_000);
  const done = async (result: CheckOutcome, extra: Partial<CheckResult> = {}, credentialId: string | null = null): Promise<CheckResult> => {
    const out: CheckResult = { result, code, message: MESSAGES[result], claims: [], signature: null, simulated: true, notice: NOTICE, ...extra };
    await db.verificationRequest.create({ data: { verifierUserId: v.id, credentialId, credentialIdQuery: code, method, result, disclosedFields: out.claims.map((c) => c.key), purpose: out.purpose ?? null, ipHash: meta.ipHash ?? null } });
    await audit({ actor: v, action: "VERIFICATION_CHECKED", outcome: result === "VALID" ? "SUCCESS" : "FAILURE", entityType: "DigitalCredential", entityId: credentialId ?? undefined, ipHash: meta.ipHash, metadata: { result, method, consent: out.consentReference } });
    return out;
  };
  if (!rl.ok) return { result: "NOT_FOUND", code, message: `Too many lookups. Please wait ${rl.retryAfterSec} seconds.`, claims: [], signature: null, simulated: true, notice: NOTICE };
  const cred = /^EV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) ? await db.digitalCredential.findUnique({ where: { id: code }, include: { consentRequest: true } }) : null;
  if (!cred || !cred.consentRequest) return done("NOT_FOUND");
  const c = cred.consentRequest;
  if (c.verifierUserId !== v.id && !(v.organisation && c.verifierOrg === v.organisation)) return done("CONSENT_DENIED", {}, cred.id); // least privilege: only the requester may resolve it
  const sigState = verifyPayload(cred.payload, cred.signature, cred.payloadSha256, cred.keyId);
  const signature = { algorithm: "Ed25519" as const, keyId: cred.keyId, valid: sigState === "OK" };
  const base = { consentReference: c.reference, purpose: c.purpose, issuedAt: cred.issuedAt.toISOString(), validUntil: cred.expiresAt?.toISOString(), signature };
  if (!signature.valid) return done("SIGNATURE_INVALID", base, cred.id);
  if (cred.revokedAt || c.status === "REVOKED") return done("REVOKED", { ...base, revokedAt: (cred.revokedAt ?? c.revokedAt)?.toISOString() }, cred.id);
  if (c.status !== "APPROVED") return done("CONSENT_DENIED", base, cred.id);
  if (cred.expiresAt && cred.expiresAt.getTime() < Date.now()) return done("EXPIRED", base, cred.id);
  const claims = Object.entries((cred.payload as { claims: Record<string, string> }).claims).filter(([k]) => isFieldKey(k) && (c.approvedFields as string[]).includes(k)).map(([key, value]) => ({ key, label: FIELDS[key as FieldKey].label, value }));
  return done("VALID", { ...base, claims }, cred.id);
}
