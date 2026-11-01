// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { CircleAlert, CircleCheck, CircleMinus, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { audit } from "@/lib/audit";
import { IDENTITY_TIERS } from "@/lib/apaar/structure";
import { requirePermission } from "@/lib/auth/guards";
import { dateOnly, dateTime, LEVEL_LABEL } from "@/lib/format";
import { getConsentRequests, getOwnProfile } from "@/lib/queries/student";
import { ensureVerifyCode } from "@/lib/consent/service";
import { CopyButton } from "@/components/guide/copy-button";
import { Hint } from "@/components/guide/hint";
import Link from "next/link";
import { db } from "@/lib/db";
import { FIELDS, type FieldKey } from "@/lib/credentials/claims";

export const metadata = { title: "My academic identity" };
export const dynamic = "force-dynamic";

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 text-[14px] text-navy-900">{value}</dd></div>
);

export default async function StudentHome() {
  const user = await requirePermission("student:self");
  const [p, consents, code] = await Promise.all([getOwnProfile(user), getConsentRequests(user), ensureVerifyCode(user.studentId!)]);
  const waiting = consents.filter((c) => c.status === "PENDING").length;
  const seen = await db.verificationRequest.findMany({ where: { credential: { studentId: user.studentId! } }, orderBy: { createdAt: "desc" }, take: 6, include: { credential: { select: { consentRequest: { select: { verifierOrg: true } } } } } });
  await audit({ actor: user, action: "STUDENT_PROFILE_VIEWED", entityType: "Student", entityId: p.id, institutionId: p.institution.id });
  const current = p.enrolments[0];
  const dup = p.otherRecords.length > 0;
  const tier1 = p.apaarFormat === "WELL_FORMED";
  const steps = IDENTITY_TIERS.map((t) => {
    const r = t.key === "structural" ? (tier1 ? { tone: "green" as const, text: "Well-formed", icon: CircleCheck } : { tone: "amber" as const, text: p.apaarFormat === "MISSING" ? "No ID on file" : "Format invalid", icon: CircleAlert })
      : t.key === "internal" ? (dup ? { tone: "red" as const, text: `Same ID on ${p.otherRecords.length} other record${p.otherRecords.length > 1 ? "s" : ""}`, icon: CircleAlert } : { tone: "green" as const, text: "No other record found", icon: CircleCheck })
      : { tone: "neutral" as const, text: "Not connected", icon: CircleMinus };
    return { ...t, ...r };
  });

  return (
    <>
      <PageHeader title="My academic identity" subtitle="Only you and the institution that admitted you can see these details. Verifiers see only what you consent to." />
      {waiting > 0 && <Link href="/student/requests" className="mb-6 flex items-center justify-between gap-3 rounded-card border border-amber-600/30 bg-amber-100/70 px-5 py-3.5 text-sm text-navy-900 hover:border-amber-600"><span><strong className="font-medium">{waiting} verification request{waiting > 1 ? "s are" : " is"} waiting for you.</strong> Nothing is shared unless you approve.</span><span className="font-medium text-blue-700">Review</span></Link>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <section className="fade-up overflow-hidden rounded-card bg-navy-900 text-white shadow-pop" aria-label="Digital academic identity card">
            <div className="flex items-center justify-between px-6 pt-5"><span className="flex items-center gap-2.5 text-[13px] text-slate-300"><BrandMark size={22} />Digital academic identity</span><Badge tone="neutral" className="bg-white/10 text-slate-200">Demo record</Badge></div>
            <div className="px-6 pb-6 pt-8">
              <p className="font-serif text-[28px] leading-tight">{p.name}</p>
              <p className="mt-1 text-sm text-slate-300">{p.institution.name}</p>
              <p className="mt-6 text-xs text-slate-400">APAAR ID</p>
              <p className="mt-1 font-mono text-[20px] tracking-[0.18em]">{p.apaarMasked ?? "Not provided"}</p>
            </div>
            <div className="h-1 bg-teal-500" aria-hidden />
          </section>
          <Panel title="Your verification code" description="Give this code to an employer or institution so they can ask to verify you.">
            <div className="flex flex-wrap items-center gap-3"><code aria-label="Your verification code" className="rounded-control bg-paper px-4 py-2.5 font-mono text-xl tracking-[0.15em] text-navy-900">{code}</code><CopyButton value={code} label="Copy code" /></div>
            <p className="mt-3 text-[13px] text-slate-600">The code reveals nothing by itself. It only lets someone send you a request, and you decide whether to answer it. <Hint text="Anyone with this code can ask. They cannot see anything unless you approve a request they send." /></p>
          </Panel>
          <Panel title="Enrolment details">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Field label="Student ID" value={<span className="font-mono text-[13px]">{p.localId}</span>} />
              {p.dob && <Field label="Date of birth" value={dateOnly(p.dob)} />}
              {current && <>
                <Field label="Programme" value={<>{current.programme.name} <span className="text-xs text-slate-500">({LEVEL_LABEL[current.programme.level]})</span></>} />
                <Field label="Department" value={current.department.name} />
                <Field label="Admission year" value={current.academicYear} />
                <Field label="Admission category" value={current.category.name} />
                <Field label="Enrolment status" value={<span className="capitalize">{current.status.toLowerCase()}</span>} />
              </>}
            </dl>
          </Panel>
        </div>

        <Panel title="Verification status" description="Three separate checks. A well-formed ID is not a verified student.">
          <ol className="relative space-y-6">
            <span aria-hidden className="absolute bottom-3 left-[15px] top-3 w-px bg-line" />
            {steps.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.key} className="relative flex gap-4">
                  <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-white ${t.tone === "green" ? "bg-green-100 text-green-700" : t.tone === "red" ? "bg-red-100 text-red-700" : t.tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-slate-400/15 text-slate-500"}`}><Icon className="size-[18px]" aria-hidden /></span>
                  <div className="min-w-0 pt-0.5"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-navy-900">{t.label}</p><Badge tone={t.tone}>{t.text}</Badge></div><p className="mt-1 text-[13px] leading-relaxed text-slate-500">{t.detail}</p></div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      {dup && (
        <Panel title="Other records with your APAAR ID" className="mt-6" description="Flagged for human review. Nothing is merged automatically.">
          <ul className="divide-y divide-line rounded-lg border border-line">
            {p.otherRecords.map((o, i) => <li key={i} className="px-4 py-3 text-sm"><p className="font-medium text-navy-900">{o.institution}</p>{o.enrolments.map((e, j) => <p key={j} className="text-slate-600">{e.programme}, admitted {e.ay}, {e.status.toLowerCase()}</p>)}</li>)}
          </ul>
          <p className="mt-3 text-[13px] text-slate-500">If this is wrong, correction requests are not available yet.</p>
        </Panel>
      )}

      <Panel title="Who has looked at your data" description="Every time someone opened one of your verification records, successful or not." className="mt-6" flush={seen.length > 0}>
        {seen.length === 0 ? <Empty icon={ShieldCheck} title="No one has opened your records">When a verifier scans or enters one of your codes, it is listed here with what they could see.</Empty> : (
          <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Who</TableHead><TableHead>Data shared</TableHead><TableHead>Result</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
            <TableBody>{seen.map((v) => <TableRow key={v.id}><TableCell className="text-navy-900">{v.credential?.consentRequest?.verifierOrg ?? "Unknown"}</TableCell><TableCell className="max-w-[260px] text-[13px] text-slate-600">{(v.disclosedFields as string[]).length ? (v.disclosedFields as string[]).map((k) => FIELDS[k as FieldKey]?.label ?? k).join(", ") : "Nothing"}</TableCell><TableCell><Badge tone={v.result === "VALID" ? "green" : "amber"} dot>{v.result === "VALID" ? "Opened" : "Refused"}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs text-slate-600">{dateTime(v.createdAt)}</TableCell></TableRow>)}</TableBody></Table>)}
      </Panel>
      <Panel title="Consent log" description="Your most recent requests. The full permanent record is in Consent history." className="mt-6" flush={consents.length > 0} aside={<Link href="/student/consents" className="text-blue-600 underline-offset-2 hover:underline">Open full history</Link>}>
        {consents.length === 0 ? (
          <Empty icon={ShieldCheck} title="You have not shared anything">No one has asked to verify you yet, so nothing has been shared.</Empty>
        ) : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Requester</TableHead><TableHead>Shared</TableHead><TableHead>Decision</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
            <TableBody>{consents.slice(0, 5).map((c) => (
              <TableRow key={c.id}><TableCell><p className="text-navy-900">{c.verifierOrg}</p><p className="text-xs text-slate-500">{c.purpose}</p></TableCell><TableCell className="max-w-[260px] text-[13px] text-slate-600">{c.approvedFields ? (c.approvedFields as string[]).map((k) => FIELDS[k as FieldKey]?.label ?? k).join(", ") : "Nothing"}</TableCell>
                <TableCell><Badge tone={c.status === "APPROVED" ? "green" : c.status === "PENDING" ? "amber" : c.status === "REJECTED" || c.status === "REVOKED" ? "red" : "neutral"} dot>{({ PENDING: "Waiting for you", APPROVED: "Approved", REJECTED: "Declined", EXPIRED: "Expired", REVOKED: "Withdrawn" } as Record<string, string>)[c.status]}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs text-slate-600">{dateTime(c.createdAt)}</TableCell></TableRow>))}</TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
