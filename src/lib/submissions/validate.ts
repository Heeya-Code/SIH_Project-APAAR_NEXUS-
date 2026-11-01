// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// The five checks, as a pure function over (rows, context). No database, no framework.
//   1 DUPLICATE            repeated records: within the file, and against what is already on file
//   2 APAAR                presence, format, and the (simulated) verification outcome
//   3 INTAKE               ordinary admissions against approved intake; supernumerary caps
//   4 DATA                 missing values, bad formats, contradictory years, implausible dates
//   5 CROSS_INSTITUTION    the same protected identifier (or same person) active at another institution
// Every issue carries a plain-language reason and a suggested fix. Nothing here claims fraud.
import { checkApaarStructure } from "@/lib/apaar/structure";
import { keyedHash } from "@/lib/crypto";
import { executeVerification } from "@/lib/verification/execute";
import { createMockProvider, type MockRegistry } from "@/lib/verification/mock-provider";

export type Severity = "WARNING" | "REQUIRES_REVIEW" | "REJECTED";
export type Outcome = "VALID" | Severity;
export type Category = "DUPLICATE" | "APAAR" | "INTAKE" | "DATA" | "CROSS_INSTITUTION";
export type Issue = { code: string; category: Category; severity: Severity; field?: string; message: string; fixHint: string };

export type ClashInfo = { institutionId: string; institutionName: string; programmeName: string; academicYear: string; matchKey: string | null; studentRef?: string };
export type ProgrammeInfo = { id: string; departmentId: string; name: string; level: string; durationYears: number };
export type Cap = { code: string; name: string; categories: string[]; maxPercent: number };

export type ValidationContext = {
  academicYear: string;
  now: Date;
  institutionId: string;
  programmes: Map<string, ProgrammeInfo>;
  categories: Map<string, { isSupernumerary: boolean }>;
  intake: Map<string, number>;
  existingOrdinary: Map<string, number>;
  /** rowKey -> record already on file for this institution and year */
  existing: Map<string, { matchKey: string | null; enrolmentId: string }>;
  /** apaarHmac -> a different student reference already enrolled here in the same programme and year */
  sameInstitutionApaar: Map<string, { studentRef: string }>;
  /** apaarHmac -> ACTIVE enrolments at other institutions */
  crossInstitution: Map<string, ClashInfo[]>;
  /** matchKey (name + date of birth) -> ACTIVE enrolments at other institutions */
  potentialByMatchKey: Map<string, ClashInfo[]>;
  caps: Cap[];
  apaarRequired: boolean;
};

export type NormalisedRow = {
  studentRef: string; fullName: string; dob: string; gender: "MALE" | "FEMALE" | "OTHER"; apaarRaw: string; apaarNormalised: string | null;
  programmeId: string; programmeCode: string; departmentId: string; academicYear: string; admissionYear: number; categoryCode: string;
  status: "ENROLLED" | "WITHDRAWN" | "GRADUATED"; ordinary: boolean;
};

export type RowResult = {
  rowNumber: number; raw: Record<string, string>; normalised: NormalisedRow | null; issues: Issue[]; outcome: Outcome;
  rowKey: string | null; apaarHmac: string | null; matchKey: string | null; dobKey: string | null;
  disposition: "PENDING" | "HELD" | "SKIPPED"; existingEnrolmentId?: string; clashes: (ClashInfo & { sameIdentity: boolean; kind: "SAME_ID" | "SAME_PERSON" })[];
  apaarState: "MISSING" | "FORMAT_INVALID" | "FORMAT_VALID" | "MOCK_VERIFIED" | "VERIFICATION_PENDING" | "VERIFICATION_UNAVAILABLE" | "MOCK_NOT_FOUND";
};

export type IntakeLine = { programmeId: string; programmeName: string; approved: number; alreadyOnFile: number; inThisFile: number; total: number; remaining: number; overshoot: number; utilisation: number };
export type CapLine = { code: string; name: string; categories: string[]; count: number; allowed: number; excess: number; maxPercent: number; intake: number };
export type ValidationResult = { rows: RowResult[]; submissionIssues: Issue[]; intake: IntakeLine[]; caps: CapLine[]; summary: Summary };
export type Summary = {
  total: number; valid: number; warning: number; requiresReview: number; rejected: number; skipped: number; acceptable: number;
  byCategory: Record<Category, number>; rowsByCategory: Record<Category, number>;
  apaar: { formatValid: number; formatInvalid: number; missing: number; mockVerified: number; pending: number; unavailable: number };
};

/** The simulated registry used for uploads: it "knows" synthetic IDs (prefix 99). It is NOT any real system. */
export const syntheticRegistry: MockRegistry = { async find(id) { return id.startsWith("99") ? [{ fullName: "", dateOfBirth: "" }] : []; } };
const adapter = createMockProvider(syntheticRegistry);

const GENDERS: Record<string, NormalisedRow["gender"]> = { M: "MALE", MALE: "MALE", F: "FEMALE", FEMALE: "FEMALE", O: "OTHER", OTHER: "OTHER" };
const STATUSES = ["ENROLLED", "WITHDRAWN", "GRADUATED"] as const;
export const ayOf = (startYear: number) => `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
const normName = (n: string) => n.toLowerCase().replace(/[^a-z]/g, "");

export const rowKeyOf = (institutionId: string, studentRef: string, ay: string) => keyedHash("match", `rowkey|${institutionId}|${studentRef.toLowerCase()}|${ay}`);
export const matchKeyOf = (fullName: string, dob: string) => keyedHash("match", `${normName(fullName)}|${dob}`);

/** Accepts YYYY-MM-DD or DD/MM/YYYY and returns a real calendar date as YYYY-MM-DD, or null. */
export function parseDate(s: string): string | null {
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s), dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const issue = (i: Issue) => i;
const sevRank: Record<Outcome, number> = { VALID: 0, WARNING: 1, REQUIRES_REVIEW: 2, REJECTED: 3 };
export const worst = (issues: Issue[]): Outcome => issues.reduce<Outcome>((w, i) => (sevRank[i.severity] > sevRank[w] ? i.severity : w), "VALID");

export async function validateRows(rawRows: Record<string, string>[], ctx: ValidationContext): Promise<ValidationResult> {
  const results: RowResult[] = [];
  const seenApaar = new Map<string, number>();
  const seenRef = new Map<string, number>();
  const validProgrammes = [...ctx.programmes.keys()].sort().join(", ");
  const startYear = Number(ctx.academicYear.slice(0, 4));

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const rowNumber = idx + 2; // row 1 of the file is the header
    const issues: Issue[] = [];
    const g = (k: string) => (raw[k] ?? "").trim();
    const need = (k: string, label: string) => { if (!g(k)) issues.push(issue({ code: "DATA_MISSING_FIELD", category: "DATA", severity: "REJECTED", field: k, message: `${label} is empty.`, fixHint: `Fill in ${label.toLowerCase()} for this student.` })); return g(k); };

    // ---- Check 4: data consistency -------------------------------------------------
    const studentRef = need("student_ref", "Student reference");
    const fullName = need("full_name", "Full name");
    const dobRaw = need("date_of_birth", "Date of birth");
    const genderRaw = need("gender", "Gender");
    const programmeCode = need("programme_code", "Programme code").toUpperCase();
    const admissionYearRaw = need("admission_year", "Admission year");
    const academicYear = need("academic_year", "Academic year");
    const categoryCode = need("category_code", "Admission category").toUpperCase();
    const statusRaw = (g("status") || "ENROLLED").toUpperCase();

    const dob = dobRaw ? parseDate(dobRaw) : null;
    if (dobRaw && !dob) issues.push(issue({ code: "DATA_BAD_DATE", category: "DATA", severity: "REJECTED", field: "date_of_birth", message: `"${dobRaw}" is not a real date.`, fixHint: "Write the date as YYYY-MM-DD, for example 2008-03-14." }));
    const gender = genderRaw ? GENDERS[genderRaw.toUpperCase()] : undefined;
    if (genderRaw && !gender) issues.push(issue({ code: "DATA_BAD_GENDER", category: "DATA", severity: "REJECTED", field: "gender", message: `"${genderRaw}" is not a recognised value.`, fixHint: "Use MALE, FEMALE or OTHER." }));
    const programme = programmeCode ? ctx.programmes.get(programmeCode) : undefined;
    if (programmeCode && !programme) issues.push(issue({ code: "DATA_UNKNOWN_PROGRAMME", category: "DATA", severity: "REJECTED", field: "programme_code", message: `"${programmeCode}" is not one of your institution's programmes.`, fixHint: `Use one of: ${validProgrammes}.` }));
    const category = categoryCode ? ctx.categories.get(categoryCode) : undefined;
    if (categoryCode && !category) issues.push(issue({ code: "DATA_BAD_CATEGORY", category: "DATA", severity: "REJECTED", field: "category_code", message: `"${categoryCode}" is not a recognised admission category.`, fixHint: `Use one of: ${[...ctx.categories.keys()].join(", ")}.` }));
    if (!(STATUSES as readonly string[]).includes(statusRaw)) issues.push(issue({ code: "DATA_BAD_STATUS", category: "DATA", severity: "REJECTED", field: "status", message: `"${statusRaw}" is not a valid enrolment status.`, fixHint: "Use ENROLLED, WITHDRAWN or GRADUATED, or leave it empty for ENROLLED." }));

    const admissionYear = /^\d{4}$/.test(admissionYearRaw) ? Number(admissionYearRaw) : NaN;
    if (admissionYearRaw && Number.isNaN(admissionYear)) issues.push(issue({ code: "DATA_BAD_YEAR", category: "DATA", severity: "REJECTED", field: "admission_year", message: `"${admissionYearRaw}" is not a four-digit year.`, fixHint: "Write the calendar year of admission, for example 2026." }));
    else if (!Number.isNaN(admissionYear) && (admissionYear < 2010 || admissionYear > startYear + 1)) issues.push(issue({ code: "DATA_YEAR_RANGE", category: "DATA", severity: "REJECTED", field: "admission_year", message: `Admission year ${admissionYear} is outside the expected range.`, fixHint: `Use a year between 2010 and ${startYear + 1}.` }));
    if (academicYear && academicYear !== ctx.academicYear) issues.push(issue({ code: "DATA_YEAR_MISMATCH", category: "DATA", severity: "REJECTED", field: "academic_year", message: `This row says academic year ${academicYear}, but you are uploading for ${ctx.academicYear}.`, fixHint: `Change it to ${ctx.academicYear}, or upload this row in a file for ${academicYear}.` }));
    else if (academicYear && !Number.isNaN(admissionYear) && ayOf(admissionYear) !== academicYear) issues.push(issue({ code: "DATA_YEAR_CONFLICT", category: "DATA", severity: "REJECTED", field: "admission_year", message: `Admission year ${admissionYear} does not belong to academic year ${academicYear} (it should be ${ayOf(admissionYear)}).`, fixHint: `Make the two columns agree: admission year ${startYear} for academic year ${ctx.academicYear}.` }));
    if (dob && !Number.isNaN(admissionYear)) {
      const age = admissionYear - Number(dob.slice(0, 4));
      if (age < 14 || age > 45) issues.push(issue({ code: "DATA_AGE_IMPLAUSIBLE", category: "DATA", severity: "REQUIRES_REVIEW", field: "date_of_birth", message: `The date of birth implies the student was ${age} at admission, which is unusual.`, fixHint: "Check the date of birth. If it is correct, no change is needed and AICTE will review it." }));
    }
    if (programme && !Number.isNaN(admissionYear) && (STATUSES as readonly string[]).includes(statusRaw)) {
      const finished = admissionYear + programme.durationYears <= 2026;
      if (statusRaw === "GRADUATED" && !finished) issues.push(issue({ code: "DATA_STATUS_CONFLICT", category: "DATA", severity: "REQUIRES_REVIEW", field: "status", message: `Marked GRADUATED, but a ${programme.durationYears}-year programme started in ${admissionYear} is not complete.`, fixHint: "Use ENROLLED, or correct the admission year." }));
    }

    // ---- Check 2: APAAR ------------------------------------------------------------
    const apaarRaw = g("apaar_id");
    const structure = checkApaarStructure(apaarRaw);
    let apaarState: RowResult["apaarState"] = "FORMAT_VALID";
    let apaarHmac: string | null = null;
    if (structure.format === "MISSING") {
      apaarState = "MISSING";
      issues.push(issue({ code: "APAAR_MISSING", category: "APAAR", severity: ctx.apaarRequired ? "REJECTED" : "WARNING", field: "apaar_id", message: "No APAAR ID was given for this student.", fixHint: "Ask the student for their APAAR ID (from their ABC / DigiLocker account) and enter all 12 digits." }));
    } else if (structure.format === "INVALID_FORMAT") {
      apaarState = "FORMAT_INVALID";
      issues.push(issue({ code: "APAAR_FORMAT", category: "APAAR", severity: "REJECTED", field: "apaar_id", message: "The APAAR ID could not be verified because it is not in the expected format.", fixHint: structure.fixHint ?? "Check for missing or extra digits and letters typed instead of numbers." }));
    } else {
      apaarHmac = keyedHash("apaar", structure.normalised!);
      if (structure.wasNormalised) issues.push(issue({ code: "APAAR_NORMALISED", category: "APAAR", severity: "WARNING", field: "apaar_id", message: "Spaces or hyphens were removed from the APAAR ID.", fixHint: "No action needed. Next time you can enter just the 12 digits." }));
      const v = await executeVerification(adapter, { requestId: `row-${rowNumber}`, purpose: "ADMISSION_CHECK", apaarId: structure.normalised! });
      if (v.status === "VERIFIED") apaarState = "MOCK_VERIFIED";
      else if (v.status === "PENDING") { apaarState = "VERIFICATION_PENDING"; issues.push(issue({ code: "APAAR_VERIFICATION_PENDING", category: "APAAR", severity: "WARNING", field: "apaar_id", message: "Verification of this ID is still pending in the simulated registry.", fixHint: "No action needed. The record can be submitted and verified later." })); }
      else if (v.status === "UNAVAILABLE") { apaarState = "VERIFICATION_UNAVAILABLE"; issues.push(issue({ code: "APAAR_VERIFICATION_UNAVAILABLE", category: "APAAR", severity: "WARNING", field: "apaar_id", message: "Verification was unavailable for this ID. It was not checked.", fixHint: "No action needed. Try again later." })); }
      else { apaarState = "MOCK_NOT_FOUND"; issues.push(issue({ code: "APAAR_NOT_FOUND", category: "APAAR", severity: "REQUIRES_REVIEW", field: "apaar_id", message: "This ID is correctly formatted but was not found in the simulated registry.", fixHint: "Check the ID with the student. If it is correct, AICTE will review it." })); }
    }

    const ok = !!(studentRef && fullName && dob && gender && programme && category && academicYear === ctx.academicYear && !Number.isNaN(admissionYear));
    const matchKey = fullName && dob ? matchKeyOf(fullName, dob) : null;
    const dobKey = dob ? keyedHash("dob", dob) : null;
    const rowKey = studentRef ? rowKeyOf(ctx.institutionId, studentRef, ctx.academicYear) : null;

    // ---- Check 1: duplicates -------------------------------------------------------
    if (studentRef) {
      const first = seenRef.get(studentRef.toLowerCase());
      if (first !== undefined) issues.push(issue({ code: "DUP_IN_FILE_REF", category: "DUPLICATE", severity: "REJECTED", field: "student_ref", message: `The student reference "${studentRef}" already appears on row ${first}.`, fixHint: "Give each student a unique reference, or delete the repeated row." }));
      else seenRef.set(studentRef.toLowerCase(), rowNumber);
    }
    if (apaarHmac) {
      const first = seenApaar.get(apaarHmac);
      if (first !== undefined) issues.push(issue({ code: "DUP_IN_FILE_APAAR", category: "DUPLICATE", severity: "REJECTED", field: "apaar_id", message: `This APAAR ID is the same as the one on row ${first}, so the same student seems to be listed twice.`, fixHint: "Delete the repeated row, or correct the ID if the two rows are different students." }));
      else seenApaar.set(apaarHmac, rowNumber);
    }
    let disposition: RowResult["disposition"] = "PENDING";
    let existingEnrolmentId: string | undefined;
    const existing = rowKey ? ctx.existing.get(rowKey) : undefined;
    if (existing) {
      if (matchKey && existing.matchKey === matchKey) {
        disposition = "SKIPPED"; existingEnrolmentId = existing.enrolmentId;
        issues.push(issue({ code: "DUP_ALREADY_RECEIVED", category: "DUPLICATE", severity: "WARNING", field: "student_ref", message: "This record was already received earlier and is unchanged.", fixHint: "No action needed. It was not added a second time." }));
      } else issues.push(issue({ code: "DUP_REF_CONFLICT", category: "DUPLICATE", severity: "REJECTED", field: "student_ref", message: `The reference "${studentRef}" is already on file for a student with different name or date of birth details.`, fixHint: "Use a new reference for a new student, or correct the details if this is the same student." }));
    } else if (apaarHmac && ctx.sameInstitutionApaar.has(apaarHmac) && programme) {
      const other = ctx.sameInstitutionApaar.get(apaarHmac)!;
      if (other.studentRef.toLowerCase() !== studentRef.toLowerCase()) issues.push(issue({ code: "DUP_ENROLMENT_EXISTS", category: "DUPLICATE", severity: "REJECTED", field: "apaar_id", message: `This APAAR ID is already enrolled at your institution under reference "${other.studentRef}".`, fixHint: "Use the existing reference for this student, or correct the APAAR ID." }));
    }

    // ---- Check 5: cross-institution -----------------------------------------------
    const clashes: RowResult["clashes"] = [];
    if (!existing) {
      if (apaarHmac) for (const c of ctx.crossInstitution.get(apaarHmac) ?? []) clashes.push({ ...c, sameIdentity: !!matchKey && c.matchKey === matchKey, kind: "SAME_ID" });
      if (matchKey) for (const c of ctx.potentialByMatchKey.get(matchKey) ?? []) if (!clashes.some((x) => x.institutionId === c.institutionId)) clashes.push({ ...c, sameIdentity: true, kind: "SAME_PERSON" });
    }
    if (statusRaw === "ENROLLED" && clashes.length) {
      const c = clashes[0];
      const detail = c.kind === "SAME_ID" ? (c.sameIdentity ? "The name and date of birth also match." : "The name or date of birth is different, so this may be a typing error.") : "The APAAR ID is different or missing, but the name and date of birth match.";
      issues.push(issue({ code: c.kind === "SAME_ID" ? "XINST_ACTIVE_CLASH" : "XINST_POTENTIAL_MATCH", category: "CROSS_INSTITUTION", severity: "REQUIRES_REVIEW", field: c.kind === "SAME_ID" ? "apaar_id" : "full_name",
        message: `${c.kind === "SAME_ID" ? "This APAAR ID" : "A student with this name and date of birth"} is currently enrolled at ${c.institutionName} (${c.programmeName}, ${c.academicYear}). ${detail}`,
        fixHint: "Check whether the student has moved. If they have, ask the other institution to mark the earlier enrolment as WITHDRAWN. The record can still be submitted; AICTE will review the clash, which is not an accusation." }));
    }

    const outcome = worst(issues);
    const normalised: NormalisedRow | null = ok ? {
      studentRef, fullName, dob: dob!, gender: gender!, apaarRaw, apaarNormalised: structure.normalised, programmeId: programme!.id, programmeCode, departmentId: programme!.departmentId,
      academicYear: ctx.academicYear, admissionYear, categoryCode, status: (STATUSES as readonly string[]).includes(statusRaw) ? (statusRaw as NormalisedRow["status"]) : "ENROLLED", ordinary: !category!.isSupernumerary,
    } : null;
    if (outcome === "REJECTED") disposition = "HELD";
    results.push({ rowNumber, raw, normalised, issues, outcome, rowKey, apaarHmac, matchKey, dobKey, disposition, existingEnrolmentId, clashes, apaarState });
  }

  // ---- Check 3: intake (submission level) ----------------------------------------
  const submissionIssues: Issue[] = [];
  const incoming = results.filter((r) => r.disposition === "PENDING" && r.normalised);
  const intake: IntakeLine[] = [];
  for (const [code, p] of ctx.programmes) {
    const inFile = incoming.filter((r) => r.normalised!.programmeCode === code && r.normalised!.ordinary && r.normalised!.status !== "WITHDRAWN").length;
    const already = ctx.existingOrdinary.get(p.id) ?? 0;
    const approved = ctx.intake.get(p.id) ?? 0;
    if (!approved && !inFile && !already) continue;
    const total = already + inFile;
    const line: IntakeLine = { programmeId: p.id, programmeName: p.name, approved, alreadyOnFile: already, inThisFile: inFile, total, remaining: Math.max(approved - total, 0), overshoot: Math.max(total - approved, 0), utilisation: approved ? total / approved : 0 };
    intake.push(line);
    if (line.overshoot > 0) submissionIssues.push(issue({ code: "INTAKE_OVERSHOOT", category: "INTAKE", severity: "REQUIRES_REVIEW",
      message: `${p.name}: approved intake is ${approved}, submitted enrolment would be ${total}, which is ${line.overshoot} above intake (${(line.utilisation * 100).toFixed(1)}% utilisation).`,
      fixHint: "Check that every student is in the right programme. If the numbers are right, the extra students need regulatory review. Supernumerary categories (NRI, OCI, FN, TFWS) are counted separately." }));
  }
  const capLines: CapLine[] = [];
  const totalIntake = [...ctx.programmes.values()].reduce((t, p) => t + (ctx.intake.get(p.id) ?? 0), 0);
  for (const cap of ctx.caps) {
    const count = incoming.filter((r) => r.normalised!.status !== "WITHDRAWN" && cap.categories.includes(r.normalised!.categoryCode)).length;
    const allowed = Math.floor((totalIntake * cap.maxPercent) / 100);
    if (!count) continue;
    const line: CapLine = { code: cap.code, name: cap.name, categories: cap.categories, count, allowed, excess: Math.max(count - allowed, 0), maxPercent: cap.maxPercent, intake: totalIntake };
    capLines.push(line);
    if (line.excess > 0) submissionIssues.push(issue({ code: "INTAKE_CAP_EXCEEDED", category: "INTAKE", severity: "REQUIRES_REVIEW",
      message: `${cap.name}: ${count} admissions in this file against an illustrative allowance of ${allowed} (${cap.maxPercent}% of ${totalIntake} approved seats), which is ${line.excess} over.`,
      fixHint: "Check the category on these rows. The allowance is a configurable prototype setting, so AICTE will review the numbers rather than treat them as a violation." }));
  }

  // ---- summary --------------------------------------------------------------------
  const byCategory: Record<Category, number> = { DUPLICATE: 0, APAAR: 0, INTAKE: 0, DATA: 0, CROSS_INSTITUTION: 0 };
  const rowsByCategory: Record<Category, number> = { ...byCategory };
  for (const r of results) { const cats = new Set<Category>(); for (const i of r.issues) { if (i.severity === "WARNING" && (i.code === "APAAR_NORMALISED" || i.code === "DUP_ALREADY_RECEIVED" || i.code.startsWith("APAAR_VERIFICATION"))) continue; byCategory[i.category]++; cats.add(i.category); } for (const c of cats) rowsByCategory[c]++; }
  for (const i of submissionIssues) byCategory[i.category]++;
  const count = (o: Outcome) => results.filter((r) => r.outcome === o && r.disposition !== "SKIPPED").length;
  const summary: Summary = {
    total: results.length, valid: count("VALID"), warning: count("WARNING"), requiresReview: count("REQUIRES_REVIEW"), rejected: results.filter((r) => r.outcome === "REJECTED").length,
    skipped: results.filter((r) => r.disposition === "SKIPPED").length, acceptable: results.filter((r) => r.disposition === "PENDING").length, byCategory, rowsByCategory,
    apaar: {
      formatValid: results.filter((r) => r.apaarHmac).length, formatInvalid: results.filter((r) => r.apaarState === "FORMAT_INVALID").length, missing: results.filter((r) => r.apaarState === "MISSING").length,
      mockVerified: results.filter((r) => r.apaarState === "MOCK_VERIFIED").length, pending: results.filter((r) => r.apaarState === "VERIFICATION_PENDING").length, unavailable: results.filter((r) => r.apaarState === "VERIFICATION_UNAVAILABLE").length,
    },
  };
  return { rows: results, submissionIssues, intake, caps: capLines, summary };
}
