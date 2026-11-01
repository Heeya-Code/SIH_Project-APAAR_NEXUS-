// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Additive demo content. NEVER wipes anything, and is safe to run again.
//   npm run db:phase2        (also called at the end of `npm run db:seed`)
// 1. conflict detection and anomaly analysis over the existing records
// 2. student codes and a consent history for the demo students
// 3. three synthetic demonstration CSVs for Sahyadri IT (+ a manifest of what the engine must find in them)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { decryptField, keyedHash } from "../src/lib/crypto";
import { refreshAnalysis } from "../src/lib/analysis/service";
import { checkCredential, createRequest, decide, ensureVerifyCode, revoke, type VerifierActor } from "../src/lib/consent/service";
import { NAMES } from "./seed-data";
import { toCsv } from "../src/lib/submissions/spec";

function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const HEADER = ["student_ref", "full_name", "date_of_birth", "gender", "apaar_id", "programme_code", "admission_year", "academic_year", "category_code", "status"];
type Row = Record<string, string>;
type Defect = "DUP_APAAR" | "DUP_REF" | "APAAR_SHORT" | "APAAR_LETTERS" | "APAAR_LONG" | "APAAR_PLACEHOLDER" | "APAAR_MISSING" | "BAD_DOB_FEB30" | "BAD_DOB_MONTH13" | "UNKNOWN_PROG" | "WRONG_AY" | "BAD_GENDER" | "BAD_CATEGORY" | "YEAR_CONFLICT"
  | "XINST_SAME_PERSON" | "XINST_POTENTIAL" | "XINST_SAME_ID_DIFFERENT" | "AGE_IMPLAUSIBLE" | "APAAR_SEPARATORS";
const REJECTED_DEFECTS: Defect[] = ["DUP_APAAR", "DUP_APAAR", "DUP_REF", "APAAR_SHORT", "APAAR_LETTERS", "APAAR_LONG", "APAAR_PLACEHOLDER", "APAAR_MISSING", "APAAR_MISSING", "BAD_DOB_FEB30", "BAD_DOB_MONTH13", "UNKNOWN_PROG", "WRONG_AY", "BAD_GENDER", "BAD_CATEGORY", "YEAR_CONFLICT", "APAAR_MISSING"];
const REVIEW_DEFECTS: Defect[] = ["XINST_SAME_PERSON", "XINST_SAME_PERSON", "XINST_SAME_PERSON", "XINST_POTENTIAL", "XINST_SAME_ID_DIFFERENT", "AGE_IMPLAUSIBLE", "AGE_IMPLAUSIBLE"];
const WARNING_DEFECTS: Defect[] = ["APAAR_SEPARATORS", "APAAR_SEPARATORS", "APAAR_SEPARATORS"];

async function demoFiles(outDir: string) {
  const rnd = mulberry32(26102026), int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1)), pick = <T,>(x: readonly T[]) => x[Math.floor(rnd() * x.length)];
  const inst = await db.institution.findUniqueOrThrow({ where: { slug: "sahyadri" }, include: { programmes: true } });
  const used = new Set((await db.student.findMany({ where: { apaarHmac: { not: null } }, select: { apaarHmac: true } })).map((s) => s.apaarHmac!));
  const usedIds = new Set<string>();
  const newId = () => { for (;;) { let id = "99"; for (let i = 0; i < 10; i++) id += int(0, 9); if (id.startsWith("9999999999")) continue; if (!usedIds.has(id) && !used.has(keyedHash("apaar", id))) { usedIds.add(id); return id; } } };
  const prevNri = (await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM v_enrolment_analytics WHERE institution_id = ${inst.id} AND academic_year = '2025-26' AND category_code = 'NRI' AND enrolment_status <> 'WITHDRAWN'`)[0].n;
  const nriCount = Math.max(8, 3 * prevNri + 1), meCount = 100 - nriCount;
  const names = new Set<string>(), culture = NAMES.marathi;
  const person = (age: [number, number]) => { for (;;) { const gender = rnd() < 0.34 ? "FEMALE" : "MALE", name = `${pick(gender === "MALE" ? culture.m : culture.f)} ${pick(culture.m)} ${pick(culture.s)}`; const dob = new Date(Date.UTC(2026, 7, 1) - (age[0] + rnd() * (age[1] - age[0])) * 365.25 * 864e5).toISOString().slice(0, 10); if (!names.has(`${name}|${dob}`)) { names.add(`${name}|${dob}`); return { name, dob, gender }; } } };
  const ordinaryCat = () => { const r = rnd(); return r < 0.45 ? "GEN" : r < 0.72 ? "OBC" : r < 0.86 ? "SC" : r < 0.93 ? "ST" : "EWS"; };

  // other institutions' active students, used to build genuine cross-institution clashes (one query per institution)
  const fromSlug = async (slug: string, n: number) => (await db.student.findMany({ where: { institution: { slug }, apaarFormat: "WELL_FORMED", enrolments: { some: { status: "ENROLLED", academicYear: "2025-26" } } }, include: { identity: true }, orderBy: { localStudentId: "asc" }, take: n + 3 }))
    .filter((c) => c.identity?.apaarEnc).slice(0, n).map((c) => ({ apaar: decryptField(c.identity!.apaarEnc!), name: decryptField(c.identity!.fullNameEnc), dob: decryptField(c.identity!.dobEnc) }));
  const samePerson = await fromSlug("kaveri", 3), potential = await fromSlug("periyar", 1), sameIdDifferent = await fromSlug("chilika", 1);

  const progs = inst.programmes, byCode = new Map(progs.map((p) => [p.code, p]));
  const nonMe = ["CSE", "IT", "EC"], seq = new Map<string, number>(); const ref = (code: string) => { const n = (seq.get(code) ?? 0) + 1; seq.set(code, n); return `SIT26${code}${String(n).padStart(4, "0")}`; };
  const base: Row[] = []; const programmeFor = (i: number) => (i < nriCount ? nonMe[i % 3] : "ME");
  for (let i = 0; i < 100; i++) { const code = programmeFor(i), p = person([17.2, 19.5]); base.push({ student_ref: ref(code), full_name: p.name, date_of_birth: p.dob, gender: p.gender, apaar_id: newId(), programme_code: code, admission_year: "2026", academic_year: "2026-27", category_code: i < nriCount ? "NRI" : ordinaryCat(), status: "ENROLLED" }); }
  // defects go on MECHANICAL rows only (so the intake overshoot is exact) and never on the first few rows
  const meIdx = base.map((r, i) => (r.programme_code === "ME" && i >= nriCount + 5 ? i : -1)).filter((i) => i >= 0);
  const order = [...meIdx].sort(() => rnd() - 0.5), all: Defect[] = [...REJECTED_DEFECTS, ...REVIEW_DEFECTS, ...WARNING_DEFECTS];
  const assigned = new Map<number, Defect>(); all.forEach((d, k) => assigned.set(order[k], d));
  const withErrors = base.map((r) => ({ ...r })), corrected = base.map((r) => ({ ...r }));
  const earlier = (i: number) => base.map((r, k) => ({ r, k })).filter((x) => x.k < i && x.k >= nriCount && !assigned.has(x.k));
  let sp = 0, pot = 0, sid = 0;
  for (const [i, d] of [...assigned.entries()].sort((a, b) => a[0] - b[0])) {
    const r = withErrors[i], fix = corrected[i];
    switch (d) {
      case "DUP_APAAR": { const src = pick(earlier(i)); r.apaar_id = base[src.k].apaar_id; break; }
      case "DUP_REF": { const src = pick(earlier(i)); r.student_ref = base[src.k].student_ref; break; }
      case "APAAR_SHORT": r.apaar_id = r.apaar_id.slice(0, 11); break;
      case "APAAR_LETTERS": r.apaar_id = r.apaar_id.slice(0, 4) + "AB" + r.apaar_id.slice(6); break;
      case "APAAR_LONG": r.apaar_id = r.apaar_id + "7"; break;
      case "APAAR_PLACEHOLDER": r.apaar_id = "ABC123"; break;
      case "APAAR_MISSING": r.apaar_id = ""; break;
      case "BAD_DOB_FEB30": r.date_of_birth = "30/02/2008"; break;
      case "BAD_DOB_MONTH13": r.date_of_birth = "2008-13-40"; break;
      case "UNKNOWN_PROG": r.programme_code = "XYZ"; break;
      case "WRONG_AY": r.academic_year = "2025-26"; break;
      case "BAD_GENDER": r.gender = "X"; break;
      case "BAD_CATEGORY": r.category_code = "VIP"; break;
      case "YEAR_CONFLICT": r.admission_year = "2025"; break;
      case "XINST_SAME_PERSON": { const c = samePerson[sp++]; for (const row of [r, fix]) Object.assign(row, { apaar_id: c.apaar, full_name: c.name, date_of_birth: c.dob }); break; }
      case "XINST_POTENTIAL": { const c = potential[pot++]; for (const row of [r, fix]) Object.assign(row, { full_name: c.name, date_of_birth: c.dob }); break; }
      case "XINST_SAME_ID_DIFFERENT": { const c = sameIdDifferent[sid++]; for (const row of [r, fix]) row.apaar_id = c.apaar; break; }
      case "AGE_IMPLAUSIBLE": for (const row of [r, fix]) row.date_of_birth = "1975-04-12"; break;
      case "APAAR_SEPARATORS": for (const row of [r, fix]) row.apaar_id = `${row.apaar_id.slice(0, 4)}-${row.apaar_id.slice(4, 8)}-${row.apaar_id.slice(8)}`; break;
    }
  }
  // The corrected file starts from the clean base rows, so rejected rows are fixed simply by not applying their defect;
  // review and warning rows were applied to both files and stay exactly as they were (so they are recognised as already received).

  const clean: Row[] = Array.from({ length: 20 }, (_, i) => { const code = nonMe[i % 3], p = person([17.2, 19.5]); return { student_ref: `SIT26X${code}${String(i + 1).padStart(3, "0")}`, full_name: p.name, date_of_birth: p.dob, gender: p.gender, apaar_id: newId(), programme_code: code, admission_year: "2026", academic_year: "2026-27", category_code: ordinaryCat(), status: "ENROLLED" }; });
  const write = (name: string, rows: Row[]) => fs.writeFileSync(path.join(outDir, name), toCsv([HEADER, ...rows.map((r) => HEADER.map((h) => r[h] ?? ""))]));
  fs.mkdirSync(outDir, { recursive: true });
  write("sahyadri_2026-27_batch1_with_errors.csv", withErrors); write("sahyadri_2026-27_batch1_corrected.csv", corrected); write("sahyadri_2026-27_clean_20_rows.csv", clean);
  const unk = [...assigned.values()].filter((d) => d === "UNKNOWN_PROG").length;
  const meRejected = [...assigned.entries()].filter(([i, d]) => REJECTED_DEFECTS.includes(d) && withErrors[i].programme_code === "ME").length;
  const mePendingV1 = meCount - unk - meRejected, ME_INTAKE = 60;
  const manifest = {
    note: "Synthetic data only. 'expected' is what the validation engine must report for these files on a freshly seeded database.",
    institution: "Sahyadri Institute of Technology (admin@sahyadri.demo), academic year 2026-27", rows: 100, nriRows: nriCount, previousYearNri: prevNri, mechanicalRows: meCount,
    expected: {
      firstUpload: { total: 100, rejected: 17, requiresReview: 7, warnings: 3, valid: 73, skipped: 0, rowsByCategory: { DUPLICATE: 3, APAAR: 7, DATA: 9, CROSS_INSTITUTION: 5 }, intake: { programme: "ME", approved: ME_INTAKE, inThisFile: mePendingV1, overshoot: Math.max(mePendingV1 - ME_INTAKE, 0) } },
      correctedUpload: { total: 100, rejected: 0, skipped: 83, valid: 17, finalStatus: "ACCEPTED", intake: { programme: "ME", alreadyOnFile: mePendingV1, inThisFile: 17, overshoot: Math.max(meCount - ME_INTAKE, 0) } },
      crossInstitutionAlertsCreatedOnSubmit: 5, nriSpikeAlertExpected: nriCount >= 8 && nriCount >= 3 * Math.max(prevNri, 1),
    },
    defects: Object.fromEntries([...new Set(all)].map((d) => [d, [...assigned.values()].filter((x) => x === d).length])),
  };
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outDir, "README.md"), `# Demonstration CSV files (synthetic)\n\nAll names and APAAR-like IDs are synthetic (IDs begin 99). Use them with **admin@sahyadri.demo** or **operator@sahyadri.demo**, academic year **2026-27**.\n\n| File | Use |\n|---|---|\n| sahyadri_2026-27_batch1_with_errors.csv | Demo A step 4: 100 rows with deliberate problems in all five checks |\n| sahyadri_2026-27_batch1_corrected.csv | Demo A step 12: the same file after fixing the rejected rows |\n| sahyadri_2026-27_clean_20_rows.csv | A small file with no problems |\n\nmanifest.json lists exactly what the engine is expected to find. Reset the demo any time from the Upload Centre (DEMO_MODE) or with \`npm run demo:reset\`.\n`);
  return manifest;
}

async function consentHistory() {
  const verifiers = await db.user.findMany({ where: { role: "VERIFIER" }, orderBy: { email: "asc" } });
  const students = await db.user.findMany({ where: { role: "STUDENT", studentId: { not: null } }, orderBy: { email: "asc" } });
  const v = (u: (typeof verifiers)[number]): VerifierActor => ({ id: u.id, role: u.role, institutionId: null, region: null, studentId: null, organisation: u.organisation });
  const s = (u: (typeof students)[number]) => ({ id: u.id, role: u.role, institutionId: null, region: null, studentId: u.studentId });
  const out: string[] = [];
  for (const u of students) {
    const code = await ensureVerifyCode(u.studentId!); out.push(`${u.email}: student code ${code}`);
    if ((await db.consentRequest.count({ where: { studentId: u.studentId! } })) > 0) continue;
    const meridian = verifiers.find((x) => x.email.includes("meridian"))!, board = verifiers.find((x) => x.email.includes("statetech"))!;
    const ask = async (who: typeof meridian, purpose: string, fields: string[]) => { const r = await createRequest(v(who), { studentCode: code, purpose, fields }); if (!r.ok) throw new Error(r.error); return (await db.consentRequest.findUniqueOrThrow({ where: { reference: r.reference } })).id; };
    const approved = await ask(meridian, "Employment verification", ["ENROLMENT_STATUS", "INSTITUTION", "PROGRAMME", "ACADEMIC_YEAR"]);
    await decide(s(u), { id: approved, decision: "APPROVE", fields: ["ENROLMENT_STATUS", "INSTITUTION", "PROGRAMME"], validDays: 30 });
    const declined = await ask(board, "Regulatory check", ["STUDENT_NAME", "ENROLMENT_STATUS"]); await decide(s(u), { id: declined, decision: "REJECT", note: "I would rather not share my name." });
    const withdrawn = await ask(meridian, "Internship or placement", ["ENROLMENT_STATUS", "PROGRAMME"]); await decide(s(u), { id: withdrawn, decision: "APPROVE", fields: ["ENROLMENT_STATUS"], validDays: 7 }); await revoke(s(u), withdrawn);
    const lapsed = await ask(board, "Scholarship or loan eligibility", ["ENROLMENT_STATUS", "INSTITUTION"]); await decide(s(u), { id: lapsed, decision: "APPROVE", fields: ["ENROLMENT_STATUS", "INSTITUTION"], validDays: 1 });
    const past = new Date(Date.now() - 3 * 864e5), row = await db.consentRequest.findUniqueOrThrow({ where: { id: lapsed } });
    await db.consentRequest.update({ where: { id: lapsed }, data: { validUntil: past, status: "EXPIRED" } }); if (row.credentialId) await db.digitalCredential.update({ where: { id: row.credentialId }, data: { expiresAt: past } });
    if (u.email.includes("multi")) await ask(meridian, "Admission to another institution", ["ENROLMENT_STATUS", "PROGRAMME", "ACADEMIC_YEAR"]); // left pending so the student sees a live request
    const ok = await db.consentRequest.findUniqueOrThrow({ where: { id: approved } }); if (ok.credentialId) await checkCredential(v(meridian), ok.credentialId, "CREDENTIAL_ID");
  }
  return out;
}

async function main() {
  console.log("Analysing existing records...");
  const a = await refreshAnalysis({ notify: true });
  console.log(`  conflicts created ${a.conflicts.created} (${JSON.stringify(a.conflicts.byKind)}), alerts created ${a.alertsCreated}`);
  console.log("Preparing consent history...");
  for (const line of await consentHistory()) console.log("  " + line);
  const dir = path.join(process.cwd(), "demo-data");
  const m = await demoFiles(dir);
  console.log(`Demo CSVs written to demo-data/ (NRI rows ${m.nriRows}, expected first upload: ${JSON.stringify(m.expected.firstUpload)})`);
}
main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
