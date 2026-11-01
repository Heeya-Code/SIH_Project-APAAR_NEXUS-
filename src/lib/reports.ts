// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Report builders. Every file states where its numbers come from, and that the data is synthetic.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "@/lib/db";
import { institutionScope, REGION_LABEL, type Actor } from "@/lib/auth/permissions";
import { getSeatLedger } from "@/lib/queries/ledger";
import { BAND_LABEL } from "@/lib/trust/score";
import { loadTrust } from "@/lib/trust/service";
import { toCsv } from "@/lib/submissions/spec";

const PROVENANCE = "EnrolTrust prototype. Synthetic demonstration data; no real students. Calculated live from submitted enrolment records.";
const head = (title: string, ay: string, extra: string[][] = []) => [["Report", title], ["Academic year", ay], ["Generated", new Date().toISOString()], ["Source", PROVENANCE], ...extra, []];

export async function seatLedgerCsv(actor: Actor, ay: string, region?: string) {
  const rows = (await getSeatLedger(actor, ay)).filter((r) => !region || r.region === region);
  return toCsv([...head("Live seat ledger", ay, [["Region filter", region ? REGION_LABEL[region as keyof typeof REGION_LABEL] : "All regions in your scope"], ["Note", "Ordinary seats count against approved intake. Supernumerary admissions are shown separately."]]),
    ["Institution", "State", "Region", "Programme", "Approved intake", "Ordinary seats filled", "Seats remaining", "Above intake", "Utilisation %", "Supernumerary admissions", "Submission received"],
    ...rows.map((r) => [r.institution, r.stateName, r.region, r.programme, r.intake, r.ordinary, r.remaining, r.overshoot, r.utilisation === null ? "" : (r.utilisation * 100).toFixed(1), r.supernumerary, r.submitted ? "Yes" : "No"])]);
}

export async function trustCsv(actor: Actor, ay: string) {
  const [insts, { rows, weights }] = await Promise.all([db.institution.findMany({ where: institutionScope(actor), orderBy: { name: "asc" }, select: { id: true, name: true, stateName: true, region: true } }), loadTrust()]);
  return toCsv([...head("Institution Trust Scores (prototype assessment metric, not an official AICTE rating)", ay, [["Weights", JSON.stringify(weights.weights)]]),
    ["Institution", "State", "Region", "Overall score", "Band", "Identifier completeness", "APAAR format validity", "Duplicate records", "Intake compliance", "Data consistency", "Submission timeliness", "Unresolved conflicts"],
    ...insts.map((i) => { const r = rows.get(`${i.id}|${ay}`)!.result; return r.scored ? [i.name, i.stateName, i.region, r.overall, BAND_LABEL[r.band], ...r.components.map((c) => c.score)] : [i.name, i.stateName, i.region, "Not scored", r.reason]; })]);
}

export async function institutionPdf(actor: Actor, institutionId: string, ay: string): Promise<Uint8Array | null> {
  const inst = await db.institution.findFirst({ where: { id: institutionId, ...institutionScope(actor) } });
  if (!inst) return null;
  const [ledger, { rows }, alerts, conflicts] = await Promise.all([getSeatLedger(actor, ay).then((l) => l.filter((r) => r.institutionId === institutionId)), loadTrust(),
    db.anomalyAlert.findMany({ where: { institutionId, academicYear: ay }, orderBy: { severity: "desc" } }), db.duplicateAlert.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] }, OR: [{ institutionAId: institutionId }, { institutionBId: institutionId }] } })]);
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]), y = 800; const M = 48, navy = rgb(0.04, 0.12, 0.24), grey = rgb(0.34, 0.4, 0.5);
  const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, "?");
  const text = (s: string, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; x?: number; w?: number } = {}) => {
    const size = o.size ?? 10, f = o.f ?? font, words = ascii(s).split(" "), maxW = o.w ?? 500; let line = "";
    const flush = () => { if (y < 60) { page = pdf.addPage([595, 842]); y = 800; } page.drawText(line, { x: o.x ?? M, y, size, font: f, color: o.color ?? navy }); y -= size + 4; line = ""; };
    for (const w of words) { const t = line ? `${line} ${w}` : w; if (f.widthOfTextAtSize(t, size) > maxW && line) { flush(); line = w; } else line = t; }
    if (line) flush();
  };
  text("EnrolTrust (APAAR Nexus) - Institution report", { size: 16, f: bold }); y -= 4;
  text(inst.name, { size: 13, f: bold }); text(`${inst.city}, ${inst.stateName} - AICTE ID ${inst.aicteId} - Academic year ${ay}`, { color: grey }); y -= 6;
  text(PROVENANCE, { size: 8, color: grey }); text("The Trust Score is a transparent PROTOTYPE assessment metric. It is not an AICTE accreditation, approval or rating.", { size: 8, color: grey }); y -= 8;
  const t = rows.get(`${institutionId}|${ay}`)?.result;
  text("Trust Score", { size: 12, f: bold });
  if (t?.scored) { text(`Overall ${t.overall} / 100 (${BAND_LABEL[t.band]})`, { f: bold }); for (const c of t.components) text(`${c.label}: ${c.score} / 100 (weight ${c.weight}%, ${c.pointsLost} points lost). ${c.detail}`, { size: 9 }); }
  else text(t?.reason ?? "Not scored.", { size: 9 });
  y -= 8; text("Live seat ledger", { size: 12, f: bold });
  for (const r of ledger) text(`${r.programme}: approved intake ${r.intake}, ordinary seats filled ${r.ordinary}, remaining ${r.remaining}${r.overshoot ? `, ABOVE INTAKE by ${r.overshoot}` : ""}, supernumerary ${r.supernumerary}`, { size: 9 });
  y -= 8; text(`Alerts for ${ay}`, { size: 12, f: bold });
  if (!alerts.length) text("No open anomaly alerts for this year.", { size: 9 });
  for (const a of alerts) { const e = a.explanation as { headline?: string; why?: string }; text(`[${a.severity}] ${e.headline ?? a.kind} (${a.status.toLowerCase().replace("_", " ")}). ${e.why ?? ""}`, { size: 9 }); }
  y -= 4; text(`Unresolved cross-institution conflicts involving this institution (all years): ${conflicts}. Conflicts are flags for human review, not findings of wrongdoing.`, { size: 9 });
  y -= 10; text(`Generated ${new Date().toISOString()}`, { size: 8, color: grey });
  return pdf.save();
}
