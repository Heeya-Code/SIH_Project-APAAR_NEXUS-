// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// APAAR NEXUS demo seed. Deterministic (fixed PRNG seed). ALL DATA IS SYNTHETIC.
//   npm run db:seed        wipes the database and rebuilds the demo dataset
//
// Every student row is produced through the SAME code the product uses
// (structural APAAR validator, AES-GCM encryption, keyed HMAC), so the seed
// doubles as an integration test of those modules.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "../src/generated/prisma/client";
import { db } from "../src/lib/db";
import { encryptField, keyedHash } from "../src/lib/crypto";
import { checkApaarStructure } from "../src/lib/apaar/structure";
import { maskApaar } from "../src/lib/mask";
import { audit } from "../src/lib/audit";
import { ACADEMIC_YEARS, ayStartYear } from "../src/lib/years";
import { INSTITUTIONS, NAMES, CATEGORIES, RULES, DEPARTMENTS, STATE_REGION, type InstSpec, type ProgSpec } from "./seed-data";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_RESET !== "1") {
  console.error("Refusing to wipe a production database. Set ALLOW_DEMO_RESET=1 to override.");
  process.exit(1);
}

// ----------------------------------------------------------------------------
// Deterministic randomness
// ----------------------------------------------------------------------------
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261030);
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p: number) => rnd() < p;
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const shuffle = <T,>(xs: T[]): T[] => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ----------------------------------------------------------------------------
// In-memory model
// ----------------------------------------------------------------------------
type Person = {
  id: string; inst: InstSpec; prog: ProgSpec; ay: string; category: string; gender: "MALE" | "FEMALE";
  name: string; dobISO: string; rawApaar: string | null; status: "ENROLLED" | "WITHDRAWN" | "GRADUATED";
  localId: string; tags: string[];
};
const persons: Person[] = [];
const usedApaar = new Set<string>();
const usedNameDob = new Set<string>();
const seqCounters = new Map<string, number>();

const normName = (n: string) => n.toLowerCase().replace(/[^a-z]/g, "");
const fn2 = (n: number) => String(n).padStart(2, "0");

function nextLocalId(inst: InstSpec, prog: ProgSpec, ay: string): string {
  const k = `${inst.slug}|${ay}|${prog.code}`;
  const n = (seqCounters.get(k) ?? 0) + 1;
  seqCounters.set(k, n);
  return `${inst.roll}${ay.slice(2, 4)}${prog.code}${String(n).padStart(4, "0")}`;
}

function newApaarId(): string {
  for (;;) {
    let id = "99";
    for (let i = 0; i < 10; i++) id += int(0, 9);
    if (!usedApaar.has(id)) { usedApaar.add(id); return id; }
  }
}

function dobFor(prog: ProgSpec, startYear: number): string {
  const [lo, hi] = prog.level === "DIPLOMA" ? [15.2, 17.4] : prog.level === "UG" ? [17.2, 19.6] : [21.2, 25.5];
  const age = lo + rnd() * (hi - lo);
  return new Date(Date.UTC(startYear, 7, 1) - age * 365.25 * 86_400_000).toISOString().slice(0, 10);
}

function uniqueName(culture: InstSpec["culture"], gender: "MALE" | "FEMALE", dobISO: string): string {
  const pool = NAMES[culture];
  for (let i = 0; i < 50; i++) {
    const name = `${pick(gender === "MALE" ? pool.m : pool.f)} ${pick(pool.m)} ${pick(pool.s)}`;
    const key = `${normName(name)}|${dobISO}`;
    if (!usedNameDob.has(key)) { usedNameDob.add(key); return name; }
  }
  throw new Error("name space exhausted");
}

const BASE_MISSING: Record<string, number> = { "2022-23": 0.30, "2023-24": 0.20, "2024-25": 0.10, "2025-26": 0.045, "2026-27": 0.02 };
const BASE_UTIL: Record<string, number> = { "2022-23": 0.86, "2023-24": 0.90, "2024-25": 0.92, "2025-26": 0.94, "2026-27": 0.95 };
const DEFAULT_MIX: Record<string, number> = { GEN: 0.45, OBC: 0.27, SC: 0.15, ST: 0.075, EWS: 0.105 };

function rawApaarFor(inst: InstSpec, ay: string): string | null {
  const p = inst.profile;
  const missP = p.missing?.[ay] ?? Math.min(0.6, BASE_MISSING[ay] * (p.missMult ?? 1));
  if (chance(missP)) return pick([null, null, "", "NA", "Pending"]);
  const id = newApaarId();
  if (chance(p.invalidRate ?? 0.012)) {
    usedApaar.delete(id);
    return pick([id.slice(0, 11), id + int(0, 9), id.replace(/0/, "O").replace(/^(.{4})./, "$1O"), id.slice(0, 8)]);
  }
  if (chance(0.03)) return `${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8)}`;
  return id;
}

function allocate(total: number, mix: Record<string, number>): Record<string, number> {
  const entries = Object.entries(mix);
  const sum = entries.reduce((s, [, v]) => s + v, 0);
  const exact = entries.map(([k, v]) => [k, (v / sum) * total] as const);
  const out: Record<string, number> = Object.fromEntries(exact.map(([k, v]) => [k, Math.floor(v)]));
  let left = total - Object.values(out).reduce((s, v) => s + v, 0);
  for (const [k] of [...exact].sort((a, b) => (b[1] % 1) - (a[1] % 1))) { if (left-- <= 0) break; out[k]++; }
  return out;
}

const frac = (v: number | Partial<Record<string, number>> | undefined, ay: string): number =>
  v === undefined ? 0 : typeof v === "number" ? v : (v[ay] ?? v.default ?? 0);

function addPerson(p: Omit<Person, "id" | "localId" | "tags"> & { tags?: string[]; localId?: string }): Person {
  const person: Person = { ...p, id: randomUUID(), tags: p.tags ?? [], localId: p.localId ?? nextLocalId(p.inst, p.prog, p.ay) };
  persons.push(person);
  return person;
}

function statusFor(prog: ProgSpec, ay: string): Person["status"] {
  if (ayStartYear(ay) + prog.years <= 2026) return "GRADUATED";
  return chance(0.03) ? "WITHDRAWN" : "ENROLLED";
}

// ----------------------------------------------------------------------------
// Baseline generation
// ----------------------------------------------------------------------------
function generateBaseline() {
  for (const inst of INSTITUTIONS) {
    const jitter = (rnd() - 0.5) * 0.06;
    for (const ay of ACADEMIC_YEARS) {
      if (inst.profile.pending?.includes(ay)) continue;
      const start = ayStartYear(ay);
      for (const prog of inst.programmes) {
        const util = inst.profile.util?.[ay] ?? Math.min(0.975, BASE_UTIL[ay] + jitter);
        const ordinary = allocate(Math.round(prog.intake * util), inst.profile.mix?.[ay] ?? DEFAULT_MIX);
        const cats: [string, number][] = [
          ...Object.entries(ordinary),
          ["NRI", Math.round(prog.intake * frac(inst.profile.nri, ay))],
          ["OCI", Math.round(prog.intake * frac(inst.profile.oci, ay))],
          ["FN", Math.round(prog.intake * frac(inst.profile.fn, ay))],
          ["TFWS", Math.round(prog.intake * frac(inst.profile.tfws, ay))],
        ];
        for (const [category, n] of cats) {
          for (let i = 0; i < n; i++) {
            const female = chance(inst.profile.femaleShare ?? 0.32);
            const gender = female ? "FEMALE" : "MALE";
            const dobISO = dobFor(prog, start);
            addPerson({
              inst, prog, ay, category, gender, dobISO,
              name: uniqueName(inst.culture, gender, dobISO),
              rawApaar: rawApaarFor(inst, ay),
              status: statusFor(prog, ay),
            });
          }
        }
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Planted scenarios (recorded in the manifest as ground truth for later engines)
// ----------------------------------------------------------------------------
const planted = { exactPairs: [] as string[][], potentialPairs: [] as { kind: string; ids: string[] }[], conflictingPairs: [] as string[][], withinInstitution: [] as string[][] };
const byLocal = (p: Person) => p.localId;
const isWell = (p: Person) => checkApaarStructure(p.rawApaar).format === "WELL_FORMED";

function nameVariant(name: string, i: number): string {
  const [first, mid, last] = name.split(" ");
  const v = [
    `${first.replace(/a/i, "aa")} ${mid} ${last}`, `${first} ${last}`, `${first.replace(/i/, "y")} ${mid} ${last}`,
    `${first} ${mid[0]}. ${last}`, `${first}${first.endsWith("h") ? "" : "h"} ${mid} ${last}`,
  ][i % 5];
  return v === name ? `${name}h` : v;
}

function transposeNearEnd(id: string): string {
  for (let tries = 0; tries < 20; tries++) {
    const i = int(id.length - 4, id.length - 2);
    if (id[i] === id[i + 1]) continue;
    const out = id.slice(0, i) + id[i + 1] + id[i] + id.slice(i + 2);
    if (!usedApaar.has(out)) { usedApaar.add(out); return out; }
  }
  throw new Error("could not transpose");
}

function plantScenarios() {
  const narmada = INSTITUTIONS.find((i) => i.slug === "narmada")!;
  const gomti = INSTITUTIONS.find((i) => i.slug === "gomti")!;
  const tunga = INSTITUTIONS.find((i) => i.slug === "tungabhadra")!;
  const gomtiProg = (code: string) => gomti.programmes.find((p) => p.code === code)!;
  const ordinaryCat = () => pick(["GEN", "GEN", "OBC", "OBC", "SC", "EWS"]);

  const pool = shuffle(persons.filter((p) => p.inst.slug === "narmada" && p.ay === "2024-25" && p.status === "ENROLLED" && !p.category.match(/NRI|OCI|FN|TFWS/) && isWell(p)));
  if (pool.length < 38 + 14 + 6) throw new Error(`not enough Narmada candidates: ${pool.length}`);
  let cursor = 0;
  const take = (n: number) => pool.slice(cursor, (cursor += n));

  // (1) 38 exact APAAR matches: same person at Narmada (2024-25) and Gomti (2025-26).
  take(38).forEach((src, i) => {
    if (i % 2 === 0) src.status = "WITHDRAWN"; // 19 look like genuine transfers; 19 remain double enrolments
    const clone = addPerson({ inst: gomti, prog: gomtiProg(i % 3 === 0 ? "IT" : "CSE"), ay: "2025-26", category: ordinaryCat(), gender: src.gender, name: src.name, dobISO: src.dobISO, rawApaar: src.rawApaar, status: "ENROLLED", tags: ["planted:exact"] });
    src.tags.push("planted:exact");
    planted.exactPairs.push([byLocal(src), byLocal(clone)]);
  });

  // (2) 14 potential duplicates (no exact APAAR match; secondary fields agree).
  take(14).forEach((src, i) => {
    const kind = i < 5 ? "NAME_VARIANT_APAAR_MISSING" : i < 10 ? "APAAR_DIGITS_TRANSPOSED" : "BOTH_APAAR_MISSING";
    let raw: string | null;
    let name = src.name;
    if (kind === "NAME_VARIANT_APAAR_MISSING") { raw = null; name = nameVariant(src.name, i); }
    else if (kind === "APAAR_DIGITS_TRANSPOSED") raw = transposeNearEnd(checkApaarStructure(src.rawApaar).normalised!);
    else { src.rawApaar = null; raw = null; }
    const clone = addPerson({ inst: gomti, prog: gomtiProg("CSE"), ay: "2025-26", category: ordinaryCat(), gender: src.gender, name, dobISO: src.dobISO, rawApaar: raw, status: "ENROLLED", tags: [`planted:potential:${kind}`] });
    src.tags.push(`planted:potential:${kind}`);
    planted.potentialPairs.push({ kind, ids: [byLocal(src), byLocal(clone)] });
  });

  // (3) 6 conflicting identities: same APAAR ID, different person.
  take(6).forEach((src) => {
    const g = chance(0.5) ? "MALE" : "FEMALE";
    const dobISO = dobFor(gomtiProg("ME"), 2025);
    const clone = addPerson({ inst: gomti, prog: gomtiProg("ME"), ay: "2025-26", category: ordinaryCat(), gender: g, name: uniqueName(gomti.culture, g, dobISO), dobISO, rawApaar: src.rawApaar, status: "ENROLLED", tags: ["planted:conflict"] });
    src.tags.push("planted:conflict");
    planted.conflictingPairs.push([byLocal(src), byLocal(clone)]);
  });

  // (4) 12 within-institution duplicates at Tungabhadra (same student entered twice, 2025-26).
  shuffle(persons.filter((p) => p.inst.slug === "tungabhadra" && p.ay === "2025-26" && p.status === "ENROLLED" && !p.category.match(/NRI|OCI|FN|TFWS/) && isWell(p)))
    .slice(0, 12)
    .forEach((src) => {
      const clone = addPerson({ inst: tunga, prog: src.prog, ay: src.ay, category: src.category, gender: src.gender, name: src.name, dobISO: src.dobISO, rawApaar: src.rawApaar, status: "ENROLLED", tags: ["planted:within-institution"] });
      src.tags.push("planted:within-institution");
      planted.withinInstitution.push([byLocal(src), byLocal(clone)]);
    });
}

// ----------------------------------------------------------------------------
// Persistence helpers
// ----------------------------------------------------------------------------
async function chunked<T>(rows: T[], size: number, fn: (c: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function wipe() {
  const tables = (await db.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`,
  )).map((t) => `"${t.tablename}"`);
  await db.$executeRawUnsafe(`ALTER TABLE "AuditLog" DISABLE TRIGGER USER`);
  try { await db.$executeRawUnsafe(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`); }
  finally { await db.$executeRawUnsafe(`ALTER TABLE "AuditLog" ENABLE TRIGGER USER`); }
}

async function main() {
  const t0 = Date.now();
  console.log("Wiping database...");
  await wipe();

  console.log("Generating baseline cohort...");
  generateBaseline();
  console.log("Planting scenarios...");
  plantScenarios();

  // --- reference data -------------------------------------------------------
  await db.admissionCategory.createMany({ data: CATEGORIES.map((c) => ({ ...c })) });
  await db.complianceRule.createMany({ data: RULES.map((r) => ({ ...r, parameters: r.parameters as Prisma.InputJsonValue })) });

  // --- institutions and structure -------------------------------------------
  type InstIds = { id: string; deptIds: Map<string, string>; progIds: Map<string, string> };
  const ids = new Map<string, InstIds>();
  let n = 0;
  for (const spec of INSTITUTIONS) {
    n++;
    const id = randomUUID();
    const deptIds = new Map<string, string>();
    const progIds = new Map<string, string>();
    await db.institution.create({
      data: {
        id, slug: spec.slug, aicteId: `1-99${String(n).padStart(6, "0")}`, name: spec.name, shortName: spec.short,
        type: spec.type, state: spec.state, stateName: spec.stateName, city: spec.city, district: spec.district,
        region: STATE_REGION[spec.state], establishedYear: spec.est,
      },
    });
    for (const dept of new Set(spec.programmes.map((p) => p.dept))) {
      const did = randomUUID(); deptIds.set(dept, did);
      await db.department.create({ data: { id: did, institutionId: id, code: dept, name: DEPARTMENTS[dept] } });
    }
    for (const p of spec.programmes) {
      const pid = randomUUID(); progIds.set(p.code, pid);
      await db.programme.create({ data: { id: pid, institutionId: id, departmentId: deptIds.get(p.dept)!, code: p.code, name: p.name, level: p.level, durationYears: p.years } });
      await db.approvedIntake.createMany({
        data: ACADEMIC_YEARS.map((ay) => ({ institutionId: id, programmeId: pid, academicYear: ay, baseIntake: p.intake, approvalRef: `DEMO/${spec.state}/${ay}/${spec.roll}-${p.code}` })),
      });
    }
    await db.institutionApproval.createMany({
      data: ACADEMIC_YEARS.map((ay) => {
        const conditional = spec.slug === "brahmaputra" && ay === "2026-27";
        return {
          institutionId: id, academicYear: ay, status: conditional ? ("CONDITIONAL" as const) : ("APPROVED" as const),
          referenceNo: `DEMO/APPR/${spec.state}/${ay}/${String(n).padStart(3, "0")}`,
          validFrom: new Date(Date.UTC(ayStartYear(ay), 3, 1)), validTo: new Date(Date.UTC(ayStartYear(ay) + 1, 2, 31)),
          remarks: conditional ? "Conditional on improving APAAR ID coverage (demo remark)." : null,
        };
      }),
    });
    ids.set(spec.slug, { id, deptIds, progIds });
  }

  // --- staff, regulator and verifier accounts -------------------------------
  const pw = process.env.DEMO_PASSWORD ?? "Nexus@Demo2026";
  const passwordHash = await bcrypt.hash(pw, 12);
  const mk = (email: string, name: string, role: Prisma.UserCreateManyInput["role"], extra: Partial<Prisma.UserCreateManyInput> = {}): Prisma.UserCreateManyInput =>
    ({ email, name, role, passwordHash, ...extra });
  const users: Prisma.UserCreateManyInput[] = [
    mk("superadmin@nexus.demo", "Platform Super Admin", "SUPER_ADMIN"),
    mk("admin@aicte.demo", "AICTE Administrator", "AICTE_ADMIN"),
    mk("officer.west@aicte.demo", "Regional Officer, Western Region", "REGIONAL_OFFICER", { region: "WEST" }),
    mk("officer.north@aicte.demo", "Regional Officer, Northern Region", "REGIONAL_OFFICER", { region: "NORTH" }),
    ...INSTITUTIONS.map((s) => mk(`admin@${s.slug}.demo`, `Institution Admin, ${s.short}`, "INSTITUTION_ADMIN", { institutionId: ids.get(s.slug)!.id })),
    mk("operator@sahyadri.demo", "Data Entry Operator, Sahyadri IT", "DATA_ENTRY_OPERATOR", { institutionId: ids.get("sahyadri")!.id }),
    mk("verifier@meridian.demo", "Talent Verification Desk", "VERIFIER", { organisation: "Meridian Talent Partners (DEMO)" }),
    mk("board@statetech.demo", "Credential Verification Cell", "VERIFIER", { organisation: "State Technical Education Board (DEMO)" }),
  ];
  await db.user.createMany({ data: users });
  const staffByInst = new Map<string, string>();
  for (const u of await db.user.findMany({ where: { role: "INSTITUTION_ADMIN" }, select: { id: true, institutionId: true } })) staffByInst.set(u.institutionId!, u.id);

  // --- convert people into rows ---------------------------------------------
  console.log(`Building ${persons.length.toLocaleString()} student rows (encrypting PII)...`);
  const sRows: Prisma.StudentCreateManyInput[] = [];
  const iRows: Prisma.StudentIdentityCreateManyInput[] = [];
  const eRows: (Prisma.EnrolmentCreateManyInput & { _key: string })[] = [];
  const counts = new Map<string, { n: number; valid: number; warn: number; review: number }>();

  for (const p of persons) {
    const check = checkApaarStructure(p.rawApaar);
    const norm = check.normalised;
    const inst = ids.get(p.inst.slug)!;
    const nameKey = `${normName(p.name)}|${p.dobISO}`;
    sRows.push({
      id: p.id, institutionId: inst.id, localStudentId: p.localId,
      apaarHmac: check.format === "WELL_FORMED" ? keyedHash("apaar", norm!) : null,
      apaarFormat: check.format, apaarNormalised: check.wasNormalised,
      verification: check.format === "WELL_FORMED" ? "STRUCTURALLY_VALID" : "PENDING",
      gender: p.gender, birthYear: Number(p.dobISO.slice(0, 4)),
      matchKey: keyedHash("match", nameKey), dobKey: keyedHash("dob", p.dobISO),
    });
    iRows.push({
      studentId: p.id, fullNameEnc: encryptField(p.name), dobEnc: encryptField(p.dobISO),
      apaarEnc: norm ? encryptField(norm) : null,
      apaarSubmittedEnc: p.rawApaar ? encryptField(p.rawApaar) : null,
      apaarMasked: norm ? maskApaar(norm) : null,
    });
    const key = `${p.inst.slug}|${p.ay}`;
    eRows.push({
      id: randomUUID(), studentId: p.id, institutionId: inst.id, programmeId: inst.progIds.get(p.prog.code)!,
      departmentId: inst.deptIds.get(p.prog.dept)!, academicYear: p.ay, admissionYear: ayStartYear(p.ay),
      categoryCode: p.category, status: p.status, _key: key,
    });
    const c = counts.get(key) ?? { n: 0, valid: 0, warn: 0, review: 0 };
    c.n++;
    if (check.format === "WELL_FORMED") (check.wasNormalised ? c.warn++ : c.valid++); else c.review++;
    counts.set(key, c);
  }

  // --- submissions (one accepted submission per institution-year that has data) ----
  const submissionByKey = new Map<string, string>();
  for (const [key, c] of counts) {
    const [slug, ay] = key.split("|");
    const inst = ids.get(slug)!;
    const start = ayStartYear(ay);
    const when = (d: number) => new Date(Date.UTC(start, 8, d));
    const finalVersion = slug === "hooghly" && ay === "2025-26" ? 4 : 1;
    let parent: string | null = null;
    if (finalVersion > 1) {
      const rejected = [61, 38, 17];
      for (let v = 1; v < finalVersion; v++) {
        const sid = randomUUID();
        await db.dataSubmission.create({ data: {
          id: sid, institutionId: inst.id, academicYear: ay, version: v, parentId: parent, status: "SUPERSEDED",
          fileName: `hooghly_${ay}_v${v}.csv`, rowCount: c.n, rejectedCount: rejected[v - 1], validCount: c.n - rejected[v - 1],
          uploadedById: staffByInst.get(inst.id), notes: "Seeded submission history (illustrative counts for a repeated-correction scenario).",
          createdAt: when(10 + v * 3), validatedAt: when(10 + v * 3),
        } });
        parent = sid;
      }
    }
    const sid = randomUUID();
    await db.dataSubmission.create({ data: {
      id: sid, institutionId: inst.id, academicYear: ay, version: finalVersion, parentId: parent, status: "ACCEPTED",
      fileName: `${slug}_${ay}_v${finalVersion}.csv`, rowCount: c.n, validCount: c.valid, warningCount: c.warn, reviewCount: c.review, rejectedCount: 0,
      uploadedById: staffByInst.get(inst.id), createdAt: when(20), validatedAt: when(20), acceptedAt: when(22),
    } });
    submissionByKey.set(key, sid);
  }

  console.log("Inserting students, identities and enrolments...");
  await chunked(sRows, 2000, (c) => db.student.createMany({ data: c }));
  await chunked(iRows, 2000, (c) => db.studentIdentity.createMany({ data: c }));
  await chunked(eRows.map(({ _key, ...e }) => ({ ...e, submissionId: submissionByKey.get(_key)! })), 2000, (c) => db.enrolment.createMany({ data: c }));

  // --- student demo accounts ----------------------------------------------------
  const demoStudent = persons.find((p) => p.inst.slug === "sahyadri" && p.ay === "2024-25" && p.prog.code === "CSE" && p.status === "ENROLLED" && isWell(p) && p.tags.length === 0)!;
  const multiPair = planted.exactPairs.map(([a, b]) => ({ a: persons.find((p) => p.localId === a)!, b: persons.find((p) => p.localId === b)! })).find((x) => x.a.status === "WITHDRAWN")!;
  await db.user.createMany({ data: [
    mk("student@nexus.demo", "Demo Student (Sahyadri IT)", "STUDENT", { studentId: demoStudent.id }),
    mk("student.multi@nexus.demo", "Demo Student (Gomti TC, previously Narmada USE)", "STUDENT", { studentId: multiPair.b.id }),
  ] });

  // --- notifications --------------------------------------------------------------
  const pendingNotes = INSTITUTIONS.filter((s) => s.profile.pending?.includes("2026-27")).map((s) => ({
    userId: staffByInst.get(ids.get(s.slug)!.id)!, kind: "SUBMISSION_DUE", title: "2026-27 student data submission is pending",
    body: "No accepted submission is on file for academic year 2026-27. Upload your student records to remain compliant.", link: "/institution",
  }));
  await db.notification.createMany({ data: pendingNotes });

  await audit({ action: "DEMO_SEED_COMPLETED", outcome: "SUCCESS", metadata: { students: persons.length, institutions: INSTITUTIONS.length } });

  // --- manifest (ground truth for later engine tests) --------------------------------
  const byInstAy: Record<string, Record<string, { admitted: number; ordinary: number; byCategory: Record<string, number>; missing: number; invalid: number }>> = {};
  for (const p of persons) {
    if (p.status === "WITHDRAWN") continue;
    const f = checkApaarStructure(p.rawApaar).format;
    const row = ((byInstAy[p.inst.slug] ??= {})[p.ay] ??= { admitted: 0, ordinary: 0, byCategory: {}, missing: 0, invalid: 0 });
    row.admitted++;
    if (!/NRI|OCI|FN|TFWS/.test(p.category)) row.ordinary++;
    row.byCategory[p.category] = (row.byCategory[p.category] ?? 0) + 1;
    if (f === "MISSING") row.missing++;
    if (f === "INVALID_FORMAT") row.invalid++;
  }
  const intakeByInst = Object.fromEntries(INSTITUTIONS.map((s) => [s.slug, s.programmes.reduce((t, p) => t + p.intake, 0)]));
  const ordinaryOver: { institution: string; ay: string; ordinary: number; intake: number }[] = [];
  for (const [slug, years] of Object.entries(byInstAy)) for (const [ay, r] of Object.entries(years)) if (r.ordinary > intakeByInst[slug]) ordinaryOver.push({ institution: slug, ay, ordinary: r.ordinary, intake: intakeByInst[slug] });

  fs.mkdirSync(path.join(process.cwd(), ".seed"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), ".seed/manifest.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    totals: { institutions: INSTITUTIONS.length, students: persons.length },
    intakeByInstitution: intakeByInst,
    pendingSubmissions: Object.fromEntries(INSTITUTIONS.filter((s) => s.profile.pending).map((s) => [s.slug, s.profile.pending])),
    perInstitutionYear: byInstAy,
    plantedExpectations: {
      exactApaarPairs: planted.exactPairs.length,
      potentialPairs: planted.potentialPairs.length,
      potentialByKind: planted.potentialPairs.reduce<Record<string, number>>((m, x) => ((m[x.kind] = (m[x.kind] ?? 0) + 1), m), {}),
      conflictingIdentityPairs: planted.conflictingPairs.length,
      withinInstitutionDuplicates: planted.withinInstitution.length,
      ordinaryOverIntake: ordinaryOver,
    },
    plantedLocalIds: planted,
  }, null, 2));

  const total = persons.length;
  const missing = persons.filter((p) => checkApaarStructure(p.rawApaar).format === "MISSING").length;
  const invalid = persons.filter((p) => checkApaarStructure(p.rawApaar).format === "INVALID_FORMAT").length;
  console.log(`\nSeed complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  institutions: ${INSTITUTIONS.length}   users: ${users.length + 2}   students/enrolments: ${total.toLocaleString()}`);
  console.log(`  APAAR missing: ${missing}   invalid format: ${invalid}`);
  console.log(`  planted: ${planted.exactPairs.length} exact, ${planted.potentialPairs.length} potential, ${planted.conflictingPairs.length} conflicting, ${planted.withinInstitution.length} within-institution`);
  console.log(`  ordinary-over-intake: ${ordinaryOver.map((o) => `${o.institution} ${o.ay} (${o.ordinary}/${o.intake})`).join(", ")}`);
  console.log(`  demo password: ${pw}`);
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
