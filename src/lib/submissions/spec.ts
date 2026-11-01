// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// The student-data CSV contract. One place defines the template, the field help, and the parser's expectations.
export type Column = { key: string; label: string; required: boolean; description: string; example: string; why: string };

export const COLUMNS: Column[] = [
  { key: "student_ref", label: "Student reference", required: true, description: "Your own roll or enrolment number. Must be unique within your institution.", example: "SIT26CS0001", why: "Lets you and AICTE point to the same record, and stops the same student being added twice." },
  { key: "full_name", label: "Full name", required: true, description: "The student's name as on admission records.", example: "Aarav Suresh Patil", why: "Used to check that an APAAR ID belongs to the person named. Stored encrypted." },
  { key: "date_of_birth", label: "Date of birth", required: true, description: "YYYY-MM-DD (or DD/MM/YYYY).", example: "2008-03-14", why: "Second check that two records are the same person. Stored encrypted." },
  { key: "gender", label: "Gender", required: true, description: "MALE, FEMALE or OTHER (M, F, O also accepted).", example: "MALE", why: "Needed for gender-wise enrolment statistics only." },
  { key: "apaar_id", label: "APAAR ID", required: true, description: "The student's 12-digit APAAR ID. Spaces and hyphens are fine.", example: "991234567890", why: "The identity link. Only a protected fingerprint is used for matching across institutions." },
  { key: "programme_code", label: "Programme code", required: true, description: "One of your programme codes, e.g. CSE, IT, ME, EC.", example: "CSE", why: "Counts the student against that programme's approved intake." },
  { key: "admission_year", label: "Admission year", required: true, description: "Calendar year of admission, e.g. 2026.", example: "2026", why: "Checked against the academic year so records cannot contradict each other." },
  { key: "academic_year", label: "Academic year", required: true, description: "Must match the year you are uploading for, e.g. 2026-27.", example: "2026-27", why: "Keeps each upload to one year so history stays clean." },
  { key: "category_code", label: "Admission category", required: true, description: "GEN, OBC, SC, ST, EWS (ordinary seats) or NRI, OCI, FN, TFWS (supernumerary).", example: "GEN", why: "Supernumerary categories are checked separately from approved intake." },
  { key: "status", label: "Enrolment status", required: false, description: "ENROLLED (default), WITHDRAWN or GRADUATED.", example: "ENROLLED", why: "Withdrawn students do not count against intake or cause clashes." },
];

export const REQUIRED_KEYS = COLUMNS.filter((c) => c.required).map((c) => c.key);
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 5000;

export const templateCsv = () => `${COLUMNS.map((c) => c.key).join(",")}\n`;
/** Fictional sample rows. The APAAR IDs are synthetic (they begin 99) and belong to no real person. */
export const sampleCsv = () =>
  `${COLUMNS.map((c) => c.key).join(",")}\n` +
  [["SAMPLE0001", "Asha Rajesh Kulkarni", "2008-06-21", "FEMALE", "990000000011", "CSE", "2026", "2026-27", "GEN", "ENROLLED"],
   ["SAMPLE0002", "Rohan Anil Deshmukh", "2008-01-09", "MALE", "990000000022", "IT", "2026", "2026-27", "OBC", "ENROLLED"]].map((r) => r.join(",")).join("\n") + "\n";

/** Neutralises spreadsheet formula injection when values are written back out to CSV. */
export const csvSafe = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvSafe).join(",")).join("\n") + "\n";
