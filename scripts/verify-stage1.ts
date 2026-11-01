// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Stage 1 verification. Run against a seeded database with the app running:
//   npm run build && npm start   (port 3000)   then   npm run verify:stage1
// Sessions are minted directly in the database exactly as the app does (random token,
// SHA-256 stored), so every request below passes through the real route guards.
import "dotenv/config";
import { randomToken, sha256Hex } from "../src/lib/crypto";
import { db } from "../src/lib/db";
import { verifyAuditChain } from "../src/lib/audit";
import { getNationalSnapshot } from "../src/lib/queries/national";
import { listInstitutionStudents, loadApaarForReveal } from "../src/lib/queries/institution";
import { institutionScope, type Actor } from "../src/lib/auth/permissions";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0, fail = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++; else { fail++; failures.push(`${name} ${detail}`); }
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${ok ? "" : `  ${detail}`}`);
}

const created: string[] = [];
async function cookieFor(email: string): Promise<string> {
  const u = await db.user.findUniqueOrThrow({ where: { email } });
  const token = randomToken(32);
  await db.session.create({ data: { userId: u.id, tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + 3600_000) } });
  created.push(sha256Hex(token));
  // The app uses __Host-nexus_session in production builds and nexus_session otherwise; send both.
  return `__Host-nexus_session=${token}; nexus_session=${token}`;
}
async function get(path: string, cookie?: string) {
  const r = await fetch(BASE + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: r.status, location: r.headers.get("location") ?? "", body: r.status === 200 ? await r.text() : "" };
}
const redirectsTo = (r: { status: number; location: string }, p: string) => [301, 302, 303, 307, 308].includes(r.status) && r.location.includes(p);
const actorOf = async (email: string): Promise<Actor> => {
  const u = await db.user.findUniqueOrThrow({ where: { email } });
  return { id: u.id, role: u.role, institutionId: u.institutionId, region: u.region, studentId: u.studentId };
};

async function main() {
  console.log("\n1. Anonymous access");
  for (const p of ["/aicte", "/institution", "/student", "/verifier", "/admin", "/audit"]) check(`anonymous ${p} redirects to /login`, redirectsTo(await get(p), "/login"));
  check("landing page is public", (await get("/")).status === 200);
  check("login page is public", (await get("/login")).status === 200);

  console.log("\n2. Role access matrix (real route guards)");
  type Case = { email: string; ok: string[]; denied: string[] };
  const cases: Case[] = [
    { email: "admin@aicte.demo", ok: ["/aicte", "/audit"], denied: ["/institution", "/institution/students", "/student", "/verifier", "/admin"] },
    { email: "officer.west@aicte.demo", ok: ["/aicte"], denied: ["/audit", "/admin", "/institution", "/student"] },
    { email: "superadmin@nexus.demo", ok: ["/aicte", "/audit", "/admin"], denied: ["/institution", "/student", "/verifier"] },
    { email: "admin@sahyadri.demo", ok: ["/institution", "/institution/students", "/audit"], denied: ["/aicte", "/admin", "/student", "/verifier"] },
    { email: "operator@sahyadri.demo", ok: ["/institution", "/institution/students"], denied: ["/audit", "/aicte", "/admin", "/student"] },
    { email: "student@nexus.demo", ok: ["/student"], denied: ["/aicte", "/institution", "/institution/students", "/admin", "/audit", "/verifier"] },
    { email: "verifier@meridian.demo", ok: ["/verifier"], denied: ["/aicte", "/institution", "/student", "/admin", "/audit"] },
  ];
  const cookies: Record<string, string> = {};
  for (const c of cases) {
    cookies[c.email] = await cookieFor(c.email);
    for (const p of c.ok) check(`${c.email} may open ${p}`, (await get(p, cookies[c.email])).status === 200);
    for (const p of c.denied) check(`${c.email} is denied ${p}`, redirectsTo(await get(p, cookies[c.email]), "/forbidden"));
  }

  console.log("\n3. Data isolation in rendered pages");
  const west = (await get("/aicte", cookies["officer.west@aicte.demo"])).body;
  check("western officer sees Sahyadri, Sabarmati, Konkan", ["Sahyadri", "Sabarmati", "Konkan"].every((n) => west.includes(n)));
  check("western officer does NOT see Aravalli, Gomti, Kaveri", !["Aravalli", "Gomti", "Kaveri"].some((n) => west.includes(n)));
  const nat = (await get("/aicte", cookies["admin@aicte.demo"])).body;
  check("AICTE admin sees institutions from every region", ["Aravalli", "Sahyadri", "Kaveri", "Hooghly"].every((n) => nat.includes(n)));
  const inst = (await get("/institution", cookies["admin@sahyadri.demo"])).body;
  check("Sahyadri admin sees own institution", inst.includes("Sahyadri Institute of Technology"));
  check("Sahyadri admin sees no other institution's name", !["Aravalli", "Gomti", "Kaveri", "Hooghly", "Narmada"].some((n) => inst.includes(n)));
  const studs = (await get("/institution/students?ay=2024-25", cookies["admin@sahyadri.demo"])).body;
  check("student list is masked (no raw 12-digit APAAR in HTML)", !/\b99\d{10}\b/.test(studs) && studs.includes("•••• ••••"));
  check("institution admin sees Reveal control", studs.includes("Reveal"));
  const opStuds = (await get("/institution/students?ay=2024-25", cookies["operator@sahyadri.demo"])).body;
  check("data entry operator has NO Reveal control", !opStuds.includes("Reveal"));
  const own = (await get("/student", cookies["student@nexus.demo"])).body;
  check("student sees own profile with verification tiers", own.includes("Structural check") && own.includes("Authoritative verification") && own.includes("Not connected"));
  check("student page exposes no raw APAAR ID", !/\b99\d{10}\b/.test(own));
  for (const [email, body] of Object.entries({ aicte: nat, west, inst, own })) check(`no raw APAAR IDs in ${email} pages`, !/\b99\d{10}\b/.test(body));

  console.log("\n4. Query-layer isolation (independent of the UI)");
  const sah = await actorOf("admin@sahyadri.demo");
  const sahInst = (await db.institution.findUniqueOrThrow({ where: { slug: "sahyadri" } })).id;
  const list = await listInstitutionStudents(sah, { ay: "2024-25", page: 1, pageSize: 500 });
  const owners = await db.student.findMany({ where: { id: { in: list.rows.map((r) => r.studentId) } }, select: { institutionId: true } });
  check(`student list returns only own institution (${list.rows.length} rows)`, list.rows.length > 0 && owners.every((o) => o.institutionId === sahInst));
  const foreign = await db.student.findFirstOrThrow({ where: { institutionId: { not: sahInst }, apaarHmac: { not: null } } });
  let blocked = false;
  try { await loadApaarForReveal(sah, foreign.id); } catch { blocked = true; }
  check("reveal of ANOTHER institution's student is refused", blocked);
  const ownStudent = await db.student.findFirstOrThrow({ where: { institutionId: sahInst, apaarHmac: { not: null } } });
  const revealed = await loadApaarForReveal(sah, ownStudent.id);
  check("reveal of own student returns the decrypted 12-digit ID", /^\d{12}$/.test(revealed ?? ""));
  let threw = false;
  try { institutionScope(await actorOf("student@nexus.demo")); } catch { threw = true; }
  check("student actor has no institution scope", threw);

  console.log("\n5. Figures derive from records and match the seed's ground truth");
  const admin = await actorOf("admin@aicte.demo");
  const s2526 = await getNationalSnapshot(admin, "2025-26");
  const s2627 = await getNationalSnapshot(admin, "2026-27");
  const overs = (s: typeof s2526) => s.institutions.filter((i) => i.signals.some((x) => x.includes("above intake"))).map((i) => i.slug).sort();
  check("2025-26 over-intake = aravalli, gomti", JSON.stringify(overs(s2526)) === JSON.stringify(["aravalli", "gomti"]), JSON.stringify(overs(s2526)));
  check("2026-27 over-intake = aravalli", JSON.stringify(overs(s2627)) === JSON.stringify(["aravalli"]), JSON.stringify(overs(s2627)));
  check("2026-27 pending submissions = 5", s2627.kpis.pending === 5, String(s2627.kpis.pending));
  check("cross-institution APAAR groups = 44 (38 exact + 6 conflicting)", s2627.kpis.crossMatches === 44, String(s2627.kpis.crossMatches));
  const deccan = s2627.institutions.find((i) => i.slug === "deccan")!;
  check("Deccan has supernumerary admissions but is NOT flagged", deccan.supernumerary > 0 && deccan.signals.length === 0, JSON.stringify(deccan.signals));
  const sub = s2627.institutions.filter((i) => i.submission.status === "ACCEPTED");
  const expectUtil = sub.reduce((t, i) => t + i.ordinary, 0) / sub.reduce((t, i) => t + i.intake, 0);
  check("national utilisation counts only institutions that have submitted", Math.abs((s2627.kpis.utilisation ?? -1) - expectUtil) < 1e-9, `${s2627.kpis.utilisation} vs ${expectUtil}`);
  check("pending institutions show no utilisation figure", s2627.institutions.filter((i) => i.submission.status === "PENDING").every((i) => i.utilisation === null));
  const west2 = await getNationalSnapshot(await actorOf("officer.west@aicte.demo"), "2026-27");
  check("regional officer snapshot limited to western institutions", west2.institutions.length === 3 && west2.institutions.every((i) => ["MH", "GJ", "GA"].includes(i.state)));
  const sabarmati = s2627.institutions.find((i) => i.slug === "sabarmati")!;
  check("Sabarmati NRI admissions (2026-27) far exceed 15% of intake", sabarmati.nri > sabarmati.intake * 0.15, `${sabarmati.nri} vs ${sabarmati.intake}`);

  console.log("\n6. Audit trail integrity");
  const chain = await verifyAuditChain();
  check(`hash chain verifies (${chain.checked} records)`, chain.ok, chain.reason ?? "");
  let tamperBlocked = false;
  try { await db.$executeRawUnsafe(`UPDATE "AuditLog" SET action = 'TAMPERED' WHERE seq = (SELECT min(seq) FROM "AuditLog")`); } catch { tamperBlocked = true; }
  check("database refuses to modify an audit record", tamperBlocked);
  const denied = await db.auditLog.count({ where: { action: "ACCESS_DENIED" } });
  check("denied route attempts were audited", denied > 0, String(denied));
  const views = await db.auditLog.count({ where: { action: "NATIONAL_DASHBOARD_VIEWED" } });
  check("national dashboard views were audited", views > 0);

  console.log("\n7. Session revocation takes effect immediately");
  const c = cookies["student@nexus.demo"];
  check("session works before revocation", (await get("/student", c)).status === 200);
  await db.session.updateMany({ where: { tokenHash: sha256Hex(c.split("=")[1].split(";")[0]) }, data: { revokedAt: new Date() } });
  check("revoked session is rejected", redirectsTo(await get("/student", c), "/login"));
  const u = await db.user.findUniqueOrThrow({ where: { email: "verifier@meridian.demo" } });
  await db.user.update({ where: { id: u.id }, data: { isActive: false } });
  check("deactivated account is rejected on next request", redirectsTo(await get("/verifier", cookies["verifier@meridian.demo"]), "/login"));
  await db.user.update({ where: { id: u.id }, data: { isActive: true } });
}

main()
  .catch((e) => { console.error(e); fail++; failures.push(String(e)); })
  .finally(async () => {
    await db.session.deleteMany({ where: { tokenHash: { in: created } } });
    await db.$disconnect();
    console.log(`\n${pass} passed, ${fail} failed`);
    if (fail) { console.log(failures.map((f) => ` - ${f}`).join("\n")); process.exit(1); }
  });
