// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { Activity, BadgeCheck, Building2, Database, FileSpreadsheet, GraduationCap, KeyRound, Landmark, Layers, Lock, ScanSearch, ScrollText, ShieldCheck, Fingerprint, Eye } from "lucide-react";
import { Wordmark, TAGLINE } from "@/components/brand";
import { TileGrid, type TileDatum } from "@/components/tile-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IDENTITY_TIERS } from "@/lib/apaar/structure";
import { fmt } from "@/lib/format";
import { getPublicStateSummary } from "@/lib/queries/national";
import { CURRENT_AY } from "@/lib/years";

export const dynamic = "force-dynamic";

const STEPS = [
  [FileSpreadsheet, "Institution uploads", "A CSV or Excel file of admitted students, or one record at a time."],
  [Fingerprint, "APAAR checks", "Each ID is checked for format and normalised."],
  [ShieldCheck, "Automated validation", "Missing fields, bad dates, duplicates and intake limits, each with a reason and a fix."],
  [Database, "Central repository", "Accepted records are stored with identity data encrypted and kept separate."],
  [Activity, "Monitoring", "AICTE sees live totals, the seat ledger and compliance signals."],
  [BadgeCheck, "Verification", "Employers confirm a credential only within what the student allows."],
] as const;
const GROUPS = [
  [Landmark, "AICTE administrators", "National view with masked student data"], [Building2, "Institutions", "Their own records, uploads and compliance"],
  [GraduationCap, "Students", "Their own identity and consents"], [ScanSearch, "Employers", "Credential checks within consent"], [Layers, "Regulators", "Region-limited oversight"],
] as const;
const SECURITY = [
  [Lock, "Names, birth dates and APAAR IDs are encrypted at rest (AES-256-GCM)."], [KeyRound, "Matching uses keyed hashes, so raw IDs never appear in analytics or logs."],
  [Eye, "APAAR IDs are masked by default; each reveal is recorded."], [Building2, "Each institution can see only its own records, enforced in every query."],
  [ShieldCheck, "Sessions are stored server-side and can be revoked instantly."], [ScrollText, "The audit trail is append-only and hash-chained, so tampering is detectable."],
] as const;

export default async function Landing() {
  const sum = await getPublicStateSummary(CURRENT_AY);
  const data: Record<string, TileDatum> = Object.fromEntries(sum.rows.map((r) => [r.state, { value: r.admitted, caption: `${fmt(r.admitted)} admissions` }]));
  const max = Math.max(1, ...sum.rows.map((r) => r.admitted));
  const total = sum.rows.reduce((t, r) => t + r.admitted, 0);
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Wordmark />
          <nav aria-label="Site" className="flex items-center gap-6 text-sm text-slate-300">
            <a href="#how" className="hidden transition-colors hover:text-white sm:inline">How it works</a>
            <a href="#identity" className="hidden transition-colors hover:text-white sm:inline">Identity checks</a>
            <a href="#security" className="hidden transition-colors hover:text-white sm:inline">Security</a>
            <Button asChild variant="secondary" size="sm"><Link href="/login">Sign in</Link></Button>
          </nav>
        </div>
      </header>

      <section className="bg-navy-950 pb-20 pt-14 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="fade-up">
            <Badge tone="teal" className="bg-teal-500/15 text-teal-100">EnrolTrust · SIH26263 prototype</Badge>
            <h1 className="mt-5 text-[40px] leading-[1.12] sm:text-5xl">{TAGLINE}</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-slate-300">APAAR NEXUS brings student-level admission data from every approved institution into one secure repository, checks it as it arrives, and lets AICTE see problems while there is still time to fix them.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="teal" size="lg"><Link href="/login">Sign in to the platform</Link></Button>
              <Button asChild variant="ghost" size="lg" className="border border-white/25 text-white hover:bg-white/10 hover:text-white"><a href="#how">See how it works</a></Button>
            </div>
            <p className="mt-6 text-sm text-slate-400">Prototype for Smart India Hackathon 2026. Every record shown is synthetic.</p>
          </div>
          <div>
            <TileGrid data={data} max={max} />
            <p className="mt-3 text-sm text-slate-400">{fmt(total)} demo admissions for {CURRENT_AY} across {sum.institutions} fictional institutions. Each tile is one state or union territory; darker means more admissions.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="max-w-2xl text-[30px] leading-tight text-navy-900">Today, AICTE learns about problems after the admissions are over.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[["Data arrives in two shapes", "PGDM institutions send student-level records. Everyone else sends enrolment counts at approval time, so most students cannot be checked individually."], ["Duplicates stay invisible", "Without a shared identity, one student enrolled at two institutions looks like two students."], ["Intake is checked late", "Admissions above approved intake surface only in later reviews, and supernumerary seats are hard to tell apart from violations."]].map(([t, d]) => (
            <div key={t} className="rounded-card border border-line bg-white p-6 shadow-card"><h3 className="text-[18px] text-navy-900">{t}</h3><p className="mt-2 text-[15px] leading-relaxed text-slate-600">{d}</p></div>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-line bg-paper py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-[30px] text-navy-900">From upload to verified record</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {STEPS.map(([Icon, t, d], i) => (
              <li key={t} className="rounded-card border border-line bg-white p-5 shadow-card">
                <div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-lg bg-teal-100 text-teal-700"><Icon className="size-[18px]" aria-hidden /></span><span className="num text-lg text-slate-400">{i + 1}</span></div>
                <h3 className="mt-4 text-[15px] text-navy-900">{t}</h3><p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="identity" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-[30px] text-navy-900">Three identity checks, kept honestly apart</h2>
        <p className="mt-3 max-w-2xl text-slate-600">A well-formed ID is not a verified student. The platform reports each level separately and never claims more than it has done.</p>
        <div className="mt-10 divide-y divide-line overflow-hidden rounded-card border border-line shadow-card">
          {IDENTITY_TIERS.map((t) => (
            <div key={t.key} className="grid gap-2 bg-white p-5 sm:grid-cols-[220px_1fr_auto] sm:items-center">
              <h3 className="text-[17px] text-navy-900">{t.label}</h3><p className="text-[15px] text-slate-600">{t.detail}</p>
              <Badge tone={t.status === "implemented" ? "green" : "amber"} dot>{t.status === "implemented" ? "Working in this prototype" : "Needs official API access"}</Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-paper py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-[30px] text-navy-900">Five groups, five separate workspaces</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {GROUPS.map(([Icon, t, d]) => (
              <Link href="/login" key={t} className="group rounded-card border border-line bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-pop">
                <span className="grid size-9 place-items-center rounded-lg bg-blue-100 text-blue-700"><Icon className="size-[18px]" aria-hidden /></span>
                <h3 className="mt-4 text-[16px] text-navy-900">{t}</h3><p className="mt-1 text-[13px] text-slate-600">{d}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-[30px] text-navy-900">Security built in from the first screen</h2>
        <ul className="mt-10 grid gap-x-12 gap-y-5 md:grid-cols-2">
          {SECURITY.map(([Icon, x]) => <li key={x} className="flex gap-3.5 text-[15px] text-slate-700"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700"><Icon className="size-4" aria-hidden /></span><span className="pt-1">{x}</span></li>)}
        </ul>
        <p className="mt-8 text-sm text-slate-500">In progress: consent management and signed, QR-verifiable credentials.</p>
      </section>

      <footer className="bg-navy-950 py-9 text-sm text-slate-400">
        <div className="mx-auto max-w-6xl px-6">APAAR NEXUS is a hackathon prototype and not an official AICTE or Government of India system. It has no live connection to APAAR or AICTE databases, and all records are synthetic.</div>
      </footer>
    </div>
  );
}
