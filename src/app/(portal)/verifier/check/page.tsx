// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { CircleAlert, CircleCheck, CircleHelp, Clock, ShieldX } from "lucide-react";
import { Hint } from "@/components/guide/hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { clientMeta } from "@/lib/auth/session";
import { checkCredential, type CheckOutcome } from "@/lib/consent/service";
import { dateTime } from "@/lib/format";
import { QrScanner } from "./qr-scanner";

export const metadata = { title: "Scan or enter a code" };
export const dynamic = "force-dynamic";
const LOOK: Record<CheckOutcome, { title: string; icon: typeof CircleCheck; band: string; text: string }> = {
  VALID: { title: "Verified", icon: CircleCheck, band: "bg-green-600", text: "text-green-700" }, EXPIRED: { title: "Expired", icon: Clock, band: "bg-slate-500", text: "text-slate-700" },
  REVOKED: { title: "Consent withdrawn", icon: ShieldX, band: "bg-red-600", text: "text-red-700" }, NOT_FOUND: { title: "Not found", icon: CircleHelp, band: "bg-amber-600", text: "text-amber-700" },
  SIGNATURE_INVALID: { title: "Record altered", icon: CircleAlert, band: "bg-red-600", text: "text-red-700" }, CONSENT_DENIED: { title: "Not permitted", icon: ShieldX, band: "bg-amber-600", text: "text-amber-700" },
};

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ code?: string; via?: string }> }) {
  const user = await requirePermission("verification:check");
  const { code, via } = await searchParams;
  const res = code ? await checkCredential(user, code, via === "qr" ? "QR_SCAN" : "CREDENTIAL_ID", { ipHash: (await clientMeta()).ipHash }) : null;
  const look = res ? LOOK[res.result] : null, Icon = look?.icon;
  return (
    <>
      <PageHeader title="Scan or enter a code" subtitle="Check a student's verification. You see only what they chose to share, and we check that the record is genuine, current and still has their consent." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <Panel title="Enter the code" description="From the student's QR screen. Capitals, spaces and a pasted link all work.">
            <form method="get" className="space-y-3"><label htmlFor="code" className="block text-[13px] font-medium text-navy-900">Verification code <Hint text="It looks like EV-ABCD-EFGH-JKMN. The student can copy it from My QR verification." /></label>
              <input id="code" name="code" defaultValue={res?.code} required autoComplete="off" placeholder="EV-ABCD-EFGH-JKMN" className="h-11 w-full rounded-control border border-line-strong bg-white px-3.5 font-mono text-[15px] tracking-wide" /><Button type="submit" size="lg" className="w-full">Check this code</Button></form></Panel>
          <Panel title="Or scan the QR code" description="The picture is read in your browser. Only the code inside it is sent."><QrScanner /></Panel>
        </div>
        <div aria-live="polite">
          {!res || !look || !Icon ? <Card className="grid min-h-[280px] place-items-center border-dashed p-8 text-center shadow-none"><div><CircleHelp className="mx-auto size-9 text-slate-500" aria-hidden /><p className="mt-3 font-medium text-navy-900">No code checked yet</p><p className="mt-1 max-w-xs text-sm text-slate-600">Enter a code or scan a QR code and the result appears here.</p></div></Card> : (
            <Card className="overflow-hidden"><div className={`h-1.5 ${look.band}`} />
              <div className="space-y-5 p-6">
                <div className="flex items-start gap-3"><Icon className={`mt-0.5 size-8 shrink-0 ${look.text}`} aria-hidden /><div><h2 className={`font-serif text-2xl ${look.text}`}>{look.title}</h2><p className="mt-1 text-[15px] text-navy-900">{res.message}</p></div></div>
                {res.result === "VALID" && <div><p className="mb-2 text-xs font-medium text-slate-500">What the student shared with you</p><dl className="divide-y divide-line rounded-control border border-line">{res.claims.map((c) => <div key={c.key} className="flex items-baseline justify-between gap-4 px-4 py-2.5"><dt className="text-sm text-slate-600">{c.label}</dt><dd className="text-right text-[15px] font-medium text-navy-900">{c.value}</dd></div>)}</dl><p className="mt-2 text-xs text-slate-500">Nothing else about the student is available to you.</p></div>}
                {(res.consentReference || res.signature) && <dl className="grid gap-x-6 gap-y-3 rounded-control bg-paper px-4 py-3 text-sm sm:grid-cols-2">
                  {res.consentReference && <div><dt className="text-xs text-slate-500">Consent reference</dt><dd className="font-mono text-[13px] text-navy-900">{res.consentReference}</dd></div>}{res.purpose && <div><dt className="text-xs text-slate-500">Purpose approved</dt><dd className="text-navy-900">{res.purpose}</dd></div>}
                  {res.issuedAt && <div><dt className="text-xs text-slate-500">Issued</dt><dd className="text-navy-900">{dateTime(res.issuedAt)}</dd></div>}{res.validUntil && <div><dt className="text-xs text-slate-500">Valid until</dt><dd className="text-navy-900">{dateTime(res.validUntil)}</dd></div>}
                  {res.revokedAt && <div><dt className="text-xs text-slate-500">Withdrawn</dt><dd className="text-red-700">{dateTime(res.revokedAt)}</dd></div>}
                  {res.signature && <div><dt className="text-xs text-slate-500">Digital signature</dt><dd><Badge tone={res.signature.valid ? "green" : "red"} dot>{res.signature.valid ? `Genuine (${res.signature.algorithm}, key ${res.signature.keyId})` : "Does not match"}</Badge></dd></div>}</dl>}
                <p className="flex items-start gap-2 rounded-control bg-amber-100/60 px-3 py-2.5 text-[13px] text-navy-900"><CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />{res.notice}</p>
                <p className="text-sm"><Link href="/verifier/check" className="text-blue-600 underline-offset-2 hover:underline">Check another code</Link></p>
              </div></Card>)}
        </div>
      </div>
    </>
  );
}
