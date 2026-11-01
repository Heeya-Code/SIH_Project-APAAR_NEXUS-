// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { db } from "@/lib/db";
import { decryptField } from "@/lib/crypto";
import { ForbiddenError, type Actor } from "@/lib/auth/permissions";

/** A student can only ever load the record bound to their own account. */
export async function getOwnProfile(actor: Actor) {
  if (actor.role !== "STUDENT" || !actor.studentId) throw new ForbiddenError("Student account required");
  const s = await db.student.findUniqueOrThrow({
    where: { id: actor.studentId },
    include: {
      identity: true, institution: true,
      enrolments: { include: { programme: true, department: true, category: true }, orderBy: { academicYear: "desc" } },
    },
  });
  // Tier 2 (internal) signal: the same APAAR ID appears on other records in the repository.
  const sameApaar = s.apaarHmac
    ? await db.student.findMany({
        where: { apaarHmac: s.apaarHmac, id: { not: s.id } },
        select: { institution: { select: { name: true } }, enrolments: { select: { academicYear: true, status: true, programme: { select: { name: true } } } } },
      })
    : [];
  return {
    id: s.id,
    name: s.identity ? decryptField(s.identity.fullNameEnc) : "Unavailable",
    dob: s.identity ? decryptField(s.identity.dobEnc) : null,
    apaarMasked: s.identity?.apaarMasked ?? null,
    localId: s.localStudentId, apaarFormat: s.apaarFormat, verification: s.verification, authoritativeVerified: s.authoritativeVerified,
    gender: s.gender, institution: s.institution, enrolments: s.enrolments,
    otherRecords: sameApaar.map((o) => ({ institution: o.institution.name, enrolments: o.enrolments.map((e) => ({ ay: e.academicYear, status: e.status, programme: e.programme.name })) })),
  };
}

/** The student's consent records, newest first. Empty until consent controls exist. */
export async function getOwnConsents(actor: Actor) {
  if (actor.role !== "STUDENT" || !actor.studentId) throw new ForbiddenError("Student account required");
  return db.consentRecord.findMany({ where: { studentId: actor.studentId }, orderBy: { grantedAt: "desc" }, take: 50 });
}

export async function getConsentRequests(actor: Actor) {
  if (actor.role !== "STUDENT" || !actor.studentId) throw new ForbiddenError("Student account required");
  const { expireStale } = await import("@/lib/consent/service");
  await expireStale({ studentId: actor.studentId });
  return db.consentRequest.findMany({ where: { studentId: actor.studentId }, orderBy: { createdAt: "desc" }, take: 100 });
}
