// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
export const CATEGORY_LABEL: Record<string, string> = { DUPLICATE: "Duplicate records", APAAR: "APAAR ID problems", INTAKE: "Intake overshoot", DATA: "Inconsistent data", CROSS_INSTITUTION: "Cross-institution clashes" };
export const CATEGORY_HELP: Record<string, string> = {
  DUPLICATE: "The same student appears more than once, in your file or already on record.", APAAR: "The APAAR ID is missing, in the wrong format, or could not be checked.",
  INTAKE: "More students than the approved seats for a programme.", DATA: "A value is missing, impossible, or contradicts another value.", CROSS_INSTITUTION: "The same student looks enrolled at another institution at the same time.",
};
export const SUBMISSION_STATUS: Record<string, { label: string; tone: "green" | "amber" | "blue" | "neutral" | "red" }> = {
  ACCEPTED: { label: "Accepted", tone: "green" }, NEEDS_CORRECTION: { label: "Needs correction", tone: "amber" }, VALIDATED: { label: "Checked, not yet submitted", tone: "blue" },
  SUPERSEDED: { label: "Replaced by a newer file", tone: "neutral" }, REJECTED: { label: "Rejected", tone: "red" }, UPLOADED: { label: "Uploaded", tone: "blue" }, VALIDATING: { label: "Checking", tone: "blue" },
};
export const OUTCOME_LABEL: Record<string, { label: string; tone: "green" | "amber" | "blue" | "red" }> = {
  VALID: { label: "Valid", tone: "green" }, WARNING: { label: "Note", tone: "blue" }, REQUIRES_REVIEW: { label: "Accepted, flagged for review", tone: "amber" }, REJECTED: { label: "Must be corrected", tone: "red" },
};
export const UPLOAD_STEPS = ["Download template", "Prepare records", "Upload file", "Preview", "Validate", "Review errors", "Submit valid rows", "Track status"];
