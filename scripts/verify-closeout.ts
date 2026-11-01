// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Phase 1 close-out verification: roles x routes, sidebar, chart data, verification API.
// Run with the production server up on :3000 and a seeded database:  npm run verify:closeout
import "dotenv/config";
import { decryptField, randomToken, sha256Hex } from "../src/lib/crypto";
import { db } from "../src/lib/db";
import { verifyAuditChain } from "../src/lib/audit";
import { getCategoryMix, getTrend } from "../src/lib/queries/charts";
import type { Actor } from "../src/lib/auth/permissions";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0, fail = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass++; else { fail++; failures.push(`${name} ${detail}`); }
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`);
};
const section = (s: string) => console.log(`\n${s}`);

const made: string[] = [];
async function cookieFor(email: string) {
  const u = await db.user.findUniqueOrThrow({ where: { email } });
  const t = randomToken(32);
  await db.session.create({ data: { userId: u.id, tokenHash: sha256Hex(t), expiresAt: new Date(Date.now() + 3600_000) } });
  made.push(sha256Hex(t));
  return `__Host-nexus_session=${t}; nexus_session=${t}`;
}
const actorOf = async (email: string): Promise<Actor> => {
  const u = await db.user.findUniqueOrThrow({ where: { email } });
  return { id: u.id, role: u.role, institutionId: u.institutionId, region: u.region, studentId: u.studentId };
};
async function page(path: string, cookie?: string) {
  const r = await fetch(BASE + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: r.status, location: r.headers.get("location") ?? "", body: r.status === 200 ? await r.text() : "" };
}
async function api(cookie: string | undefined, body: unknown, opts: { headers?: Record<string, string>; raw?: string } = {}) {
  const r = await fetch(`${BASE}/api/v1/verification/apaar`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...opts.headers },
    body: opts.raw ?? JSON.stringify(body),
  });
  const text = await r.text();
  let json: any = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: r.status, json, text, headers: r.headers };
}

const N = ["/aicte", "/aicte/institutions", "/aicte/seat-ledger", "/aicte/regions", "/aicte/trust", "/aicte/alerts", "/aicte/reports"];
const SHARED = ["/notifications", "/profile", "/help"];
const INST = ["/institution", "/institution/students", "/institution/verify", "/institution/upload", "/institution/submissions", "/institution/trust"];
const ROUTES = [...N, "/audit", "/admin", "/admin/users", "/admin/institutions", "/admin/config", ...INST, "/institution/operators", "/student", "/student/requests", "/student/consents", "/student/qr", "/verifier", "/verifier/new", "/verifier/check", "/verifier/history", ...SHARED];
// The first route listed is the role's home page.
const ROLES: { email: string; label: string; allowed: string[] }[] = [
  { email: "superadmin@nexus.demo", label: "SUPER_ADMIN", allowed: ["/admin", ...N, "/audit", "/admin/users", "/admin/institutions", "/admin/config", ...SHARED] },
  { email: "admin@aicte.demo", label: "AICTE_ADMIN", allowed: [...N, "/audit", ...SHARED] },
  { email: "officer.west@aicte.demo", label: "REGIONAL_OFFICER", allowed: [...N, ...SHARED] },
  { email: "admin@sahyadri.demo", label: "INSTITUTION_ADMIN", allowed: [...INST, "/institution/operators", "/audit", ...SHARED] },
  { email: "operator@sahyadri.demo", label: "DATA_ENTRY_OPERATOR", allowed: [...INST, ...SHARED] },
  { email: "student@nexus.demo", label: "STUDENT", allowed: ["/student", "/student/requests", "/student/consents", "/student/qr", ...SHARED] },
  { email: "verifier@meridian.demo", label: "VERIFIER", allowed: ["/verifier", "/verifier/new", "/verifier/check", "/verifier/history", ...SHARED] },
];
const NAV_EXPECTED: Record<string, string[]> = {
  SUPER_ADMIN: ["/admin", "/aicte", "/admin/institutions", "/aicte/alerts", "/admin/users", "/audit", "/admin/config"],
  AICTE_ADMIN: ["/aicte", "/aicte/institutions", "/aicte/seat-ledger", "/aicte/regions", "/aicte/trust", "/aicte/alerts", "/aicte/reports", "/audit"],
  REGIONAL_OFFICER: ["/aicte", "/aicte/institutions", "/aicte/seat-ledger", "/aicte/regions", "/aicte/trust", "/aicte/alerts", "/aicte/reports"],
  INSTITUTION_ADMIN: ["/institution", "/institution/upload", "/institution/submissions", "/institution/students", "/institution/trust", "/institution/verify", "/institution/operators", "/audit"],
  DATA_ENTRY_OPERATOR: ["/institution", "/institution/upload", "/institution/submissions", "/institution/students", "/institution/trust", "/institution/verify"],
  STUDENT: ["/student", "/student/requests", "/student/consents", "/student/qr"], VERIFIER: ["/verifier", "/verifier/new", "/verifier/check", "/verifier/history"],
};

async function main() {
  const cookies: Record<string, string> = {};
  for (const r of ROLES) cookies[r.label] = await cookieFor(r.email);

  section("1. All seven roles x every route (200 only when permitted, otherwise /forbidden)");
  for (const r of ROLES) {
    let good = true; const bad: string[] = [];
    for (const route of ROUTES) {
      const res = await page(route, cookies[r.label]);
      const expectOk = r.allowed.includes(route);
      const okRes = expectOk ? res.status === 200 : res.status >= 300 && res.status < 400 && res.location.includes("/forbidden");
      if (!okRes) { good = false; bad.push(`${route}:${res.status}`); }
    }
    check(`${r.label}: ${r.allowed.length} permitted pages open, ${ROUTES.length - r.allowed.length} refused`, good, bad.join(" "));
  }

  section("2. Sidebar contains only working, authorised links");
  for (const r of ROLES) {
    const home = await page(r.allowed[0], cookies[r.label]);
    const navs = [...home.body.matchAll(/<nav aria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/g)].map((m) => m[1]);
    const hrefs = [...new Set(navs.flatMap((n) => [...n.matchAll(/href="([^"]+)"/g)].map((m) => m[1])))].sort();
    const expected = [...NAV_EXPECTED[r.label]].sort();
    check(`${r.label} sidebar links are exactly ${expected.join(", ")}`, JSON.stringify(hrefs) === JSON.stringify(expected), JSON.stringify(hrefs));
    check(`${r.label} sidebar has no disabled or "Stage N" items`, navs.length > 0 && navs.every((n) => !/aria-disabled|Stage \d/.test(n)));
    let allOpen = true; const broken: string[] = [];
    for (const h of hrefs) { const s = (await page(h, cookies[r.label])).status; if (s !== 200) { allOpen = false; broken.push(`${h}:${s}`); } }
    check(`${r.label} every sidebar link opens (200)`, allOpen, broken.join(" "));
  }

  section("3. Chart data matches independently computed SQL");
  const admin = await actorOf("admin@aicte.demo");
  const trend = await getTrend(admin);
  for (const t of trend) {
    const [{ n }] = await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "Enrolment" WHERE "academicYear" = ${t.ay} AND status <> 'WITHDRAWN'`;
    check(`trend ${t.ay}: ordinary + supernumerary = ${n} enrolments`, t.ordinary + t.supernumerary === n, `${t.ordinary}+${t.supernumerary}`);
  }
  const t2526 = trend.find((t) => t.ay === "2025-26")!, t2627 = trend.find((t) => t.ay === "2026-27")!;
  for (const [t, ay, expectedReporting] of [[t2526, "2025-26", 16], [t2627, "2026-27", 11]] as const) {
    const [{ s, c }] = await db.$queryRaw<{ s: number; c: number }[]>`
      SELECT coalesce(sum(ai."baseIntake"),0)::int AS s, count(DISTINCT ai."institutionId")::int AS c FROM "ApprovedIntake" ai
      WHERE ai."academicYear" = ${ay} AND EXISTS (SELECT 1 FROM "DataSubmission" d WHERE d."institutionId" = ai."institutionId" AND d."academicYear" = ${ay} AND d.status = 'ACCEPTED')`;
    check(`trend ${ay}: intake counts only submitted institutions (${s} across ${c})`, t.intake === s && t.reporting === c && c === expectedReporting, `${t.intake}/${t.reporting}`);
  }
  check("trend: APAAR coverage improves year over year (rollout narrative)", trend[0].apaarCoverage! < trend[1].apaarCoverage! && trend[1].apaarCoverage! < trend[2].apaarCoverage! && trend[2].apaarCoverage! < trend[3].apaarCoverage!);
  const cats = await getCategoryMix(admin, "2026-27");
  const [{ nri }] = await db.$queryRaw<{ nri: number }[]>`SELECT count(*)::int AS nri FROM "Enrolment" WHERE "academicYear" = '2026-27' AND status <> 'WITHDRAWN' AND "categoryCode" = 'NRI'`;
  check(`category mix 2026-27: NRI = ${nri}`, cats.find((c) => c.code === "NRI")!.count === nri);
  check("category mix: shares sum to 100%", Math.abs(cats.reduce((t, c) => t + c.share, 0) - 1) < 1e-9);
  check("category mix: supernumerary flags match the category table", cats.filter((c) => c.supernumerary).map((c) => c.code).sort().join() === "FN,NRI,OCI,TFWS");
  const west = await getTrend(await actorOf("officer.west@aicte.demo"));
  const [{ w }] = await db.$queryRaw<{ w: number }[]>`SELECT count(*)::int AS w FROM "Enrolment" e JOIN "Institution" i ON i.id = e."institutionId" WHERE e."academicYear" = '2025-26' AND e.status <> 'WITHDRAWN' AND i.region = 'WEST'`;
  const w2526 = west.find((t) => t.ay === "2025-26")!;
  check(`regional officer trend equals western institutions only (${w})`, w2526.ordinary + w2526.supernumerary === w && w < t2526.ordinary + t2526.supernumerary);
  const sah = await getTrend(await actorOf("admin@sahyadri.demo"));
  const [{ sn }] = await db.$queryRaw<{ sn: number }[]>`SELECT count(*)::int AS sn FROM "Enrolment" e JOIN "Institution" i ON i.id = e."institutionId" WHERE i.slug = 'sahyadri' AND e."academicYear" = '2025-26' AND e.status <> 'WITHDRAWN'`;
  const s2526 = sah.find((t) => t.ay === "2025-26")!, s2627 = sah.find((t) => t.ay === "2026-27")!;
  check(`institution trend equals own records only (${sn}) and 2026-27 is empty with no intake claim`, s2526.ordinary + s2526.supernumerary === sn && s2627.ordinary + s2627.supernumerary === 0 && s2627.intake === null);
  const natHtml = (await page("/aicte", cookies["AICTE_ADMIN"])).body;
  check("Command Centre renders all four chart figures", ["Admissions by year against approved intake", "APAAR coverage by admission year", "Intake against admissions by institution", "Admissions by category"].every((c) => natHtml.includes(c)));
  const westHtml = (await page("/aicte?ay=2025-26", cookies["REGIONAL_OFFICER"])).body;
  check("regional officer's chart tables show western institutions and no others (2025-26)", !["Aravalli IET", "Gomti TC", "Kaveri CE", "Hooghly EC", "Narmada USE", "Deccan SoM"].some((n) => westHtml.includes(n)) && ["Sahyadri IT", "Sabarmati IT", "Konkan SE"].every((n) => westHtml.includes(n)));
  const west2627 = (await page("/aicte?ay=2026-27", cookies["REGIONAL_OFFICER"])).body;
  check("institutions that have not submitted are left out of the intake comparison (2026-27)", !west2627.includes("Sahyadri IT") && west2627.includes("Sabarmati IT"));
  const instHtml = (await page("/institution", cookies["INSTITUTION_ADMIN"])).body;
  check("Institution dashboard renders trend, category and seat-ledger figures", ["Admissions by year against approved intake", "Admissions by category", "Live seat ledger"].every((c) => instHtml.includes(c)));
  check("Institution dashboard charts expose only own programmes", !instHtml.includes("Aravalli"));

  const sahId = (await db.institution.findUniqueOrThrow({ where: { slug: "sahyadri" } })).id;
  section("3b. Live Seat Ledger figures match independent SQL")
  const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  const nfi = new Intl.NumberFormat("en-IN");
  const [L] = await db.$queryRaw<{ intake: number; ordinary: number; open: number; over: number; sup: number }[]>`
    WITH prog AS (
      SELECT p.id, p."institutionId" AS inst, ai."baseIntake" AS intake,
        (SELECT count(*) FROM "Enrolment" e JOIN "AdmissionCategory" c ON c.code = e."categoryCode" WHERE e."programmeId" = p.id AND e."academicYear" = '2026-27' AND e.status <> 'WITHDRAWN' AND NOT c."isSupernumerary") AS ordinary,
        (SELECT count(*) FROM "Enrolment" e JOIN "AdmissionCategory" c ON c.code = e."categoryCode" WHERE e."programmeId" = p.id AND e."academicYear" = '2026-27' AND e.status <> 'WITHDRAWN' AND c."isSupernumerary") AS sup
      FROM "Programme" p JOIN "ApprovedIntake" ai ON ai."programmeId" = p.id AND ai."academicYear" = '2026-27'
      WHERE EXISTS (SELECT 1 FROM "DataSubmission" d WHERE d."institutionId" = p."institutionId" AND d."academicYear" = '2026-27' AND (d."acceptedAt" IS NOT NULL OR d."submittedAt" IS NOT NULL)))
    SELECT sum(intake)::int AS intake, sum(ordinary)::int AS ordinary, sum(greatest(intake - ordinary, 0))::int AS open, sum(greatest(ordinary - intake, 0))::int AS over, sum(sup)::int AS sup FROM prog`;
  const nat2627 = text((await page("/aicte?ay=2026-27", cookies["AICTE_ADMIN"])).body);
  const has = (label: string, n: number) => new RegExp(`${label}\\s+${nfi.format(n)}(?!\\d)`).test(nat2627);
  check(`national ledger: approved intake ${L.intake}`, has("Approved intake", L.intake));
  check(`national ledger: ordinary seats filled ${L.ordinary}`, has("Ordinary seats filled", L.ordinary));
  check(`national ledger: seats still open ${L.open}`, has("Seats still open", L.open));
  check(`national ledger: filled above intake ${L.over}`, has("Filled above intake", L.over));
  check(`national ledger: supernumerary ${L.sup}, reported separately`, has("Supernumerary", L.sup));
  const progs = await db.$queryRaw<{ name: string; dept: string; intake: number; ordinary: number }[]>`
    SELECT p.name, d.name AS dept, ai."baseIntake" AS intake,
      (SELECT count(*) FROM "Enrolment" e JOIN "AdmissionCategory" c ON c.code = e."categoryCode" WHERE e."programmeId" = p.id AND e."academicYear" = '2025-26' AND e.status <> 'WITHDRAWN' AND NOT c."isSupernumerary")::int AS ordinary
    FROM "Programme" p JOIN "Department" d ON d.id = p."departmentId" JOIN "ApprovedIntake" ai ON ai."programmeId" = p.id AND ai."academicYear" = '2025-26'
    WHERE p."institutionId" = ${sahId} ORDER BY p.code`;
  const sah2526 = text((await page("/institution?ay=2025-26", cookies["INSTITUTION_ADMIN"])).body);
  check(`institution ledger rows match SQL for all ${progs.length} programmes`, progs.every((r) => sah2526.includes(`${r.name} ${r.dept} ${nfi.format(r.intake)} ${nfi.format(r.ordinary)}`)), progs.map((r) => `${r.name}:${r.intake}/${r.ordinary}`).join(" "));

  section("4. Verification API: authentication, permissions, validation");
  const opCookie = cookies["DATA_ENTRY_OPERATOR"], admCookie = cookies["INSTITUTION_ADMIN"];
  const stu = await db.student.findFirstOrThrow({ where: { institutionId: sahId, apaarFormat: "WELL_FORMED" }, include: { identity: true } });
  const realId = decryptField(stu.identity!.apaarEnc!), realName = decryptField(stu.identity!.fullNameEnc), realDob = decryptField(stu.identity!.dobEnc);

  let r = await api(undefined, { apaarId: realId });
  check("no session: 401 UNAUTHENTICATED", r.status === 401 && r.json?.error?.code === "UNAUTHENTICATED");
  for (const role of ["VERIFIER", "STUDENT", "AICTE_ADMIN", "REGIONAL_OFFICER", "SUPER_ADMIN"]) {
    r = await api(cookies[role], { apaarId: realId });
    check(`${role}: 403 FORBIDDEN`, r.status === 403 && r.json?.error?.code === "FORBIDDEN", String(r.status));
  }
  r = await api(opCookie, { apaarId: realId }, { headers: { "content-type": "text/plain" } });
  check("wrong content type: 415", r.status === 415);
  r = await api(opCookie, null, { raw: "{not json" });
  check("malformed JSON: 400 INVALID_JSON", r.status === 400 && r.json?.error?.code === "INVALID_JSON");
  r = await api(opCookie, { apaarId: "SECRET-VALUE-123", dateOfBirth: "2006-13-45" });
  check("bad field: 422 with field list", r.status === 422 && r.json?.error?.code === "VALIDATION_FAILED" && r.json.error.details.some((d: any) => d.field === "dateOfBirth"));
  check("validation errors never echo submitted values", !r.text.includes("SECRET-VALUE-123") && !r.text.includes("2006-13-45"));
  r = await api(opCookie, { apaarId: realId, unexpected: true });
  check("unknown fields are rejected (strict schema)", r.status === 422);
  r = await api(opCookie, { apaarId: realId }, { headers: { origin: "https://evil.example" } });
  check("cross-origin request: 403 CSRF_REJECTED", r.status === 403 && r.json?.error?.code === "CSRF_REJECTED");

  section("5. Mock verification responses");
  r = await api(opCookie, { apaarId: realId, fullName: realName, dateOfBirth: realDob });
  check("real own student + correct details: VERIFIED / MATCH", r.json?.data?.status === "VERIFIED" && r.json.data.reasonCode === "MATCH", r.text);
  check("response envelope: ok, data, meta.requestId = x-request-id header", r.json?.ok === true && r.json.meta.requestId === r.headers.get("x-request-id"));
  check("mock result is labelled MOCK and not authoritative", r.json?.data?.provider?.mode === "MOCK" && r.json.data.authoritative === false);
  check("response never contains the submitted APAAR ID", !r.text.includes(realId));
  r = await api(admCookie, { apaarId: `${realId.slice(0, 4)}-${realId.slice(4, 8)}-${realId.slice(8)}`, fullName: realName.toUpperCase() });
  check("formatted ID with different name case still VERIFIED", r.json?.data?.status === "VERIFIED");
  const wrongDob = realDob === "2001-01-01" ? "2001-01-02" : "2001-01-01";
  r = await api(opCookie, { apaarId: realId, fullName: realName, dateOfBirth: wrongDob });
  check("wrong date of birth: INVALID / IDENTITY_MISMATCH with field flags", r.json?.data?.status === "INVALID" && r.json.data.reasonCode === "IDENTITY_MISMATCH" && r.json.data.matched?.name === true && r.json.data.matched?.dateOfBirth === false);
  r = await api(opCookie, { apaarId: "991010101010" });
  check("unknown well-formed ID: INVALID / NOT_FOUND", r.json?.data?.status === "INVALID" && r.json.data.reasonCode === "NOT_FOUND");
  r = await api(opCookie, { apaarId: "12345" });
  check("malformed ID: INVALID / STRUCTURE_INVALID (provider not contacted)", r.json?.data?.status === "INVALID" && r.json.data.reasonCode === "STRUCTURE_INVALID" && /not contacted/i.test(r.json.data.message));
  r = await api(opCookie, { apaarId: "999999999001" });
  check("reserved ID ...001: PENDING / PROCESSING", r.json?.data?.status === "PENDING" && r.json.data.reasonCode === "PROCESSING");
  r = await api(opCookie, { apaarId: "999999999002" });
  check("reserved ID ...002: UNAVAILABLE / PROVIDER_ERROR", r.json?.data?.status === "UNAVAILABLE" && r.json.data.reasonCode === "PROVIDER_ERROR");
  const t0 = Date.now();
  r = await api(opCookie, { apaarId: "999999999003" });
  check("reserved ID ...003: UNAVAILABLE / PROVIDER_TIMEOUT after ~5s", r.json?.data?.status === "UNAVAILABLE" && r.json.data.reasonCode === "PROVIDER_TIMEOUT" && Date.now() - t0 >= 4800, `${Date.now() - t0}ms`);

  section("6. Audit and safety");
  const rows = await db.auditLog.findMany({ where: { action: "APAAR_VERIFICATION_REQUESTED" }, orderBy: { seq: "desc" }, take: 50 });
  check(`verification requests were audited (${rows.length})`, rows.length >= 8);
  const meta = rows.map((x) => JSON.stringify(x.metadata));
  check("audit metadata has a keyed-hash reference, never a raw ID", meta.every((m) => /"apaarRef":"[0-9a-f]{12}"/.test(m) && !/\b\d{12}\b/.test(m)));
  check("the API denial (403) was audited", (await db.auditLog.count({ where: { action: "ACCESS_DENIED", metadata: { path: ["via"], equals: "api" } } })) >= 5);
  const authoritative = await db.student.count({ where: { authoritativeVerified: true } });
  check("no student record was marked authoritatively verified by the mock", authoritative === 0, String(authoritative));
  let limited: Awaited<ReturnType<typeof api>> | null = null; let n = 0;
  for (; n < 45 && !limited; n++) { const x = await api(admCookie, { apaarId: "12345" }); if (x.status === 429) limited = x; }
  check(`rate limit engages with 429 and Retry-After (after ${n} more calls)`, !!limited && limited.json?.error?.code === "RATE_LIMITED" && !!limited.headers.get("retry-after"));
  const chain = await verifyAuditChain();
  check(`audit hash chain still intact (${chain.checked} records)`, chain.ok, chain.reason ?? "");
}

main()
  .catch((e) => { console.error(e); fail++; failures.push(String(e)); })
  .finally(async () => {
    await db.session.deleteMany({ where: { tokenHash: { in: made } } });
    await db.$disconnect();
    console.log(`\n${pass} passed, ${fail} failed`);
    if (fail) { console.log(failures.map((f) => ` - ${f}`).join("\n")); process.exit(1); }
  });
