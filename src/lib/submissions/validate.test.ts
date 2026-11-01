// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { keyedHash } from "@/lib/crypto";
import { matchKeyOf, parseDate, rowKeyOf, validateRows, type ValidationContext } from "./validate";
import { parseStudentCsv } from "./parse";
import { COLUMNS, csvSafe, sampleCsv, templateCsv } from "./spec";

process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.HMAC_PEPPER = randomBytes(32).toString("base64");

const INST = "inst-1";
const ctx = (over: Partial<ValidationContext> = {}): ValidationContext => ({
  academicYear: "2026-27", now: new Date("2026-10-30"), institutionId: INST,
  programmes: new Map([["CSE", { id: "p-cse", departmentId: "d1", name: "B.E. Computer Science", level: "UG", durationYears: 4 }], ["ME", { id: "p-me", departmentId: "d2", name: "B.E. Mechanical", level: "UG", durationYears: 4 }]]),
  categories: new Map([["GEN", { isSupernumerary: false }], ["OBC", { isSupernumerary: false }], ["NRI", { isSupernumerary: true }]]),
  intake: new Map([["p-cse", 5], ["p-me", 3]]), existingOrdinary: new Map(), existing: new Map(), sameInstitutionApaar: new Map(),
  crossInstitution: new Map(), potentialByMatchKey: new Map(), caps: [{ code: "NRI", name: "NRI quota cap", categories: ["NRI"], maxPercent: 15 }], apaarRequired: true, ...over,
});
const row = (o: Record<string, string> = {}) => ({ student_ref: "R1", full_name: "Asha Rajesh Kulkarni", date_of_birth: "2008-06-21", gender: "FEMALE", apaar_id: "990000000011", programme_code: "CSE", admission_year: "2026", academic_year: "2026-27", category_code: "GEN", status: "ENROLLED", ...o });
const codes = async (r: Record<string, string>, c = ctx()) => (await validateRows([r], c)).rows[0].issues.map((i) => i.code);

test("a clean row is VALID, PENDING and has no issues apart from none", async () => {
  const res = await validateRows([row()], ctx());
  assert.equal(res.rows[0].outcome, "VALID"); assert.equal(res.rows[0].disposition, "PENDING"); assert.equal(res.rows[0].apaarState, "MOCK_VERIFIED");
  assert.equal(res.summary.valid, 1); assert.equal(res.summary.acceptable, 1);
});
test("check 4: missing values, bad formats and contradictory years are REJECTED with fixes", async () => {
  assert.deepEqual(await codes(row({ full_name: "" })), ["DATA_MISSING_FIELD"]);
  assert.ok((await codes(row({ date_of_birth: "31/02/2008" }))).includes("DATA_BAD_DATE"));
  assert.ok((await codes(row({ gender: "X" }))).includes("DATA_BAD_GENDER"));
  assert.ok((await codes(row({ programme_code: "ZZZ" }))).includes("DATA_UNKNOWN_PROGRAMME"));
  assert.ok((await codes(row({ category_code: "VIP" }))).includes("DATA_BAD_CATEGORY"));
  assert.ok((await codes(row({ academic_year: "2025-26" }))).includes("DATA_YEAR_MISMATCH"));
  assert.ok((await codes(row({ admission_year: "2025" }))).includes("DATA_YEAR_CONFLICT"));
  assert.ok((await codes(row({ status: "GONE" }))).includes("DATA_BAD_STATUS"));
  const bad = (await validateRows([row({ programme_code: "ZZZ" })], ctx())).rows[0];
  assert.match(bad.issues[0].fixHint, /CSE, ME/); assert.equal(bad.disposition, "HELD");
});
test("check 4: implausible age and status conflicts are flagged for review, not rejected", async () => {
  const r = (await validateRows([row({ date_of_birth: "1960-01-01" })], ctx())).rows[0];
  assert.equal(r.outcome, "REQUIRES_REVIEW"); assert.equal(r.disposition, "PENDING");
  assert.ok((await codes(row({ status: "GRADUATED" }))).includes("DATA_STATUS_CONFLICT"));
});
test("check 4: DD/MM/YYYY dates are accepted and normalised", async () => {
  assert.equal(parseDate("21/06/2008"), "2008-06-21"); assert.equal(parseDate("2008-6-1"), "2008-06-01"); assert.equal(parseDate("2008-13-01"), null);
  assert.equal((await validateRows([row({ date_of_birth: "21/06/2008" })], ctx())).rows[0].normalised?.dob, "2008-06-21");
});
test("check 2: APAAR missing and malformed are REJECTED; separators only warn", async () => {
  assert.ok((await codes(row({ apaar_id: "" }))).includes("APAAR_MISSING"));
  assert.ok((await codes(row({ apaar_id: "12345" }))).includes("APAAR_FORMAT"));
  const sep = (await validateRows([row({ apaar_id: "9900-0000-0011" })], ctx())).rows[0];
  assert.ok(sep.issues.some((i) => i.code === "APAAR_NORMALISED")); assert.equal(sep.outcome, "WARNING"); assert.equal(sep.disposition, "PENDING");
  const optional = (await validateRows([row({ apaar_id: "" })], ctx({ apaarRequired: false }))).rows[0];
  assert.equal(optional.outcome, "WARNING");
});
test("check 2: the simulated registry distinguishes verified, not found, pending and unavailable", async () => {
  const states = async (id: string) => (await validateRows([row({ apaar_id: id })], ctx())).rows[0].apaarState;
  assert.equal(await states("990000000011"), "MOCK_VERIFIED"); assert.equal(await states("123456789012"), "MOCK_NOT_FOUND");
  assert.equal(await states("999999999001"), "VERIFICATION_PENDING"); assert.equal(await states("999999999002"), "VERIFICATION_UNAVAILABLE");
  assert.equal((await validateRows([row({ apaar_id: "123456789012" })], ctx())).rows[0].outcome, "REQUIRES_REVIEW");
});
test("error messages never contain the submitted APAAR ID", async () => {
  const res = await validateRows([row({ apaar_id: "12345" }), row({ student_ref: "R2", apaar_id: "990000000011" }), row({ student_ref: "R3", apaar_id: "990000000011" })], ctx());
  for (const r of res.rows) for (const i of r.issues) assert.ok(!i.message.includes("990000000011") && !i.message.includes("12345") && !i.fixHint.includes("990000000011"));
});
test("check 1: repeated student and repeated APAAR within a file are REJECTED, the first kept", async () => {
  const res = await validateRows([row(), row({ student_ref: "R2" }), row({ student_ref: "R1", apaar_id: "990000000022" })], ctx());
  assert.equal(res.rows[0].outcome, "VALID");
  assert.ok(res.rows[1].issues.some((i) => i.code === "DUP_IN_FILE_APAAR" && /row 2/.test(i.message)));
  assert.ok(res.rows[2].issues.some((i) => i.code === "DUP_IN_FILE_REF"));
  assert.equal(res.summary.rowsByCategory.DUPLICATE, 2);
});
test("check 1: re-sending an unchanged record is skipped (idempotent), a changed one is rejected", async () => {
  const mk = matchKeyOf("Asha Rajesh Kulkarni", "2008-06-21");
  const existing = new Map([[rowKeyOf(INST, "R1", "2026-27"), { matchKey: mk, enrolmentId: "e1" }]]);
  const same = (await validateRows([row()], ctx({ existing }))).rows[0];
  assert.equal(same.disposition, "SKIPPED"); assert.equal(same.existingEnrolmentId, "e1"); assert.equal(same.outcome, "WARNING");
  const changed = (await validateRows([row({ full_name: "Someone Else Entirely" })], ctx({ existing }))).rows[0];
  assert.ok(changed.issues.some((i) => i.code === "DUP_REF_CONFLICT")); assert.equal(changed.disposition, "HELD");
});
test("check 1: an APAAR ID already enrolled here under another reference is REJECTED", async () => {
  const sameInstitutionApaar = new Map([[keyedHash("apaar", "990000000011"), { studentRef: "OLD9" }]]);
  assert.ok((await codes(row(), ctx({ sameInstitutionApaar }))).includes("DUP_ENROLMENT_EXISTS"));
});
test("check 5: an active enrolment elsewhere is a REQUIRES_REVIEW clash that is not an accusation", async () => {
  const clash = { institutionId: "other", institutionName: "Kaveri College of Engineering", programmeName: "B.E. Civil", academicYear: "2025-26", matchKey: matchKeyOf("Asha Rajesh Kulkarni", "2008-06-21") };
  const crossInstitution = new Map([[keyedHash("apaar", "990000000011"), [clash]]]);
  const r = (await validateRows([row()], ctx({ crossInstitution }))).rows[0];
  assert.equal(r.outcome, "REQUIRES_REVIEW"); assert.equal(r.disposition, "PENDING"); assert.equal(r.clashes[0].sameIdentity, true);
  const i = r.issues.find((x) => x.code === "XINST_ACTIVE_CLASH")!;
  assert.match(i.message, /Kaveri College/); assert.match(i.message, /name and date of birth also match/); assert.match(i.fixHint, /not an accusation/);
  const differentPerson = (await validateRows([row({ full_name: "Different Person Name" })], ctx({ crossInstitution }))).rows[0];
  assert.match(differentPerson.issues.find((x) => x.code === "XINST_ACTIVE_CLASH")!.message, /may be a typing error/);
});
test("check 5: same name and date of birth with a different or missing APAAR ID is a potential match", async () => {
  const mk = matchKeyOf("Asha Rajesh Kulkarni", "2008-06-21");
  const potentialByMatchKey = new Map([[mk, [{ institutionId: "other", institutionName: "Narmada USE", programmeName: "B.Tech IT", academicYear: "2025-26", matchKey: mk }]]]);
  const r = (await validateRows([row({ apaar_id: "990000000099" })], ctx({ potentialByMatchKey }))).rows[0];
  assert.ok(r.issues.some((i) => i.code === "XINST_POTENTIAL_MATCH")); assert.equal(r.outcome, "REQUIRES_REVIEW");
});
test("check 5: a WITHDRAWN record raises no clash", async () => {
  const crossInstitution = new Map([[keyedHash("apaar", "990000000011"), [{ institutionId: "o", institutionName: "X", programmeName: "Y", academicYear: "2025-26", matchKey: null }]]]);
  assert.ok(!(await codes(row({ status: "WITHDRAWN" }), ctx({ crossInstitution }))).includes("XINST_ACTIVE_CLASH"));
});
test("check 3: intake overshoot reports approved, submitted, remaining, overshoot and utilisation", async () => {
  const rows = Array.from({ length: 7 }, (_, i) => row({ student_ref: `M${i}`, apaar_id: `99000000010${i}`, programme_code: "ME", full_name: `Student Number${"abcdefg"[i]} Test`, date_of_birth: `2008-0${i + 1}-15` }));
  const res = await validateRows(rows, ctx());
  const me = res.intake.find((l) => l.programmeId === "p-me")!;
  assert.deepEqual([me.approved, me.inThisFile, me.total, me.remaining, me.overshoot], [3, 7, 7, 0, 4]);
  assert.ok(Math.abs(me.utilisation - 7 / 3) < 1e-9);
  assert.ok(res.submissionIssues.some((i) => i.code === "INTAKE_OVERSHOOT" && /4 above intake/.test(i.message)));
  assert.ok(res.rows.every((r) => r.outcome === "VALID"), "overshoot is flagged for review, it does not reject the students");
});
test("check 3: records already on file count toward intake and supernumerary seats do not", async () => {
  const res = await validateRows([row(), row({ student_ref: "N1", apaar_id: "990000000033", category_code: "NRI", full_name: "Nri Student One", date_of_birth: "2008-02-02" })], ctx({ existingOrdinary: new Map([["p-cse", 4]]) }));
  const cse = res.intake.find((l) => l.programmeId === "p-cse")!;
  assert.deepEqual([cse.alreadyOnFile, cse.inThisFile, cse.total, cse.remaining, cse.overshoot], [4, 1, 5, 0, 0]);
});
test("check 3: supernumerary cap is checked separately, as a review item", async () => {
  const rows = Array.from({ length: 4 }, (_, i) => row({ student_ref: `N${i}`, apaar_id: `99000000020${i}`, category_code: "NRI", full_name: `Nri Person${"abcd"[i]} X`, date_of_birth: `2008-0${i + 1}-10` }));
  const res = await validateRows(rows, ctx());
  const cap = res.caps[0]; assert.deepEqual([cap.count, cap.allowed, cap.excess], [4, 1, 3]);
  assert.ok(res.submissionIssues.some((i) => i.code === "INTAKE_CAP_EXCEEDED" && /illustrative/.test(i.message)));
});
test("summary counts categories and keeps skipped rows apart", async () => {
  const res = await validateRows([row(), row({ student_ref: "R2", apaar_id: "12345" }), row({ student_ref: "R3", apaar_id: "", programme_code: "ZZZ" })], ctx());
  assert.equal(res.summary.total, 3); assert.equal(res.summary.rejected, 2); assert.equal(res.summary.acceptable, 1);
  assert.equal(res.summary.apaar.formatInvalid, 1); assert.equal(res.summary.apaar.missing, 1); assert.equal(res.summary.rowsByCategory.DATA, 1);
});
test("CSV: template, sample, header aliases, BOM and friendly file-level errors", () => {
  assert.equal(templateCsv().trim().split(",").length, COLUMNS.length);
  const ok = parseStudentCsv(sampleCsv()); assert.ok(ok.ok && ok.rows.length === 2 && ok.rows[0].student_ref === "SAMPLE0001");
  const aliased = parseStudentCsv("\ufeffStudent Ref,Full-Name,date_of_birth,gender,apaar_id,programme_code,admission_year,academic_year,category_code\nA,B,C,D,E,F,G,H,I\n");
  assert.ok(aliased.ok && aliased.rows[0].student_ref === "A" && aliased.rows[0].full_name === "B");
  const missing = parseStudentCsv("student_ref,full_name\nA,B\n"); assert.ok(!missing.ok && /missing required columns/.test(missing.error) && /Date of birth/.test(missing.error));
  assert.ok(!parseStudentCsv("").ok); assert.ok(!parseStudentCsv(templateCsv()).ok);
});
test("CSV export neutralises formula injection", () => {
  assert.equal(csvSafe("=cmd|' /C calc'!A0"), "'=cmd|' /C calc'!A0"); assert.equal(csvSafe("a,b"), '"a,b"'); assert.equal(csvSafe("-5"), "'-5"); assert.equal(csvSafe("plain"), "plain");
});
