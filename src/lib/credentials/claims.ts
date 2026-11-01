// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Selective disclosure: the student decides which of these fields a verifier may see.
export const FIELD_KEYS = ["ENROLMENT_STATUS", "INSTITUTION", "PROGRAMME", "ACADEMIC_YEAR", "VERIFICATION_DATE", "STUDENT_NAME"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];
export const FIELDS: Record<FieldKey, { label: string; plain: string; personal: boolean }> = {
  ENROLMENT_STATUS: { label: "Enrolment status", plain: "Whether you are currently enrolled", personal: false },
  INSTITUTION: { label: "Institution", plain: "The name of your institution", personal: false },
  PROGRAMME: { label: "Programme", plain: "The course you are studying", personal: false },
  ACADEMIC_YEAR: { label: "Academic year", plain: "The year you were admitted", personal: false },
  VERIFICATION_DATE: { label: "Verification date", plain: "The date this check was made", personal: false },
  STUDENT_NAME: { label: "Your name", plain: "Your full name. Only share this if the requester truly needs it", personal: true },
};
export const PURPOSES = ["Employment verification", "Internship or placement", "Admission to another institution", "Scholarship or loan eligibility", "Regulatory check"] as const;
export const isFieldKey = (v: unknown): v is FieldKey => (FIELD_KEYS as readonly string[]).includes(v as string);

export type ClaimSource = { status: string; institutionName: string; programmeName: string; academicYear: string; fullName: string };
export function buildClaims(approved: FieldKey[], s: ClaimSource, now: Date): Record<string, string> {
  const all: Record<FieldKey, string> = {
    ENROLMENT_STATUS: s.status, INSTITUTION: s.institutionName, PROGRAMME: s.programmeName, ACADEMIC_YEAR: s.academicYear,
    VERIFICATION_DATE: now.toISOString().slice(0, 10), STUDENT_NAME: s.fullName,
  };
  return Object.fromEntries(approved.map((k) => [k, all[k]])); // ONLY what was approved. Nothing else is ever copied in.
}
