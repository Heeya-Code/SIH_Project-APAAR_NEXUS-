// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { headers } from "next/headers";
import { QrCode } from "lucide-react";
import { CopyButton } from "@/components/guide/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { FIELDS, type FieldKey } from "@/lib/credentials/claims";
import { qrSvg } from "@/lib/credentials/sign";
import { dateTime } from "@/lib/format";
import { getConsentRequests } from "@/lib/queries/student";
import { RevokeButton } from "./revoke-button";

export const metadata = { title: "My QR verification" };
export const dynamic = "force-dynamic";

export default async function MyQr() {
  const user = await requirePermission("consent:decide");
  const active = (await getConsentRequests(user)).filter((r) => r.status === "APPROVED" && r.credentialId);
  const h = await headers(), origin = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const cards = await Promise.all(active.map(async (r) => ({ r, svg: await qrSvg(`${origin}/verifier/check?code=${r.credentialId}`) })));
  return (
    <>
      <PageHeader title="My QR verification" subtitle="Show the QR code, or read out the code, to the person you approved. It works only for them, only for the details you chose, and only until it expires or you withdraw it." />
      {cards.length === 0 ? <Empty icon={QrCode} title="No active verification">When you approve a request, your signed verification record and QR code appear here.</Empty> : (
        <ul className="grid gap-4 lg:grid-cols-2">{cards.map(({ r, svg }) => (
          <li key={r.id}><Card className="fade-up p-6"><div className="flex gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt={`QR code for verification ${r.credentialId}`} className="size-40 shrink-0 rounded-control border border-line bg-white p-1" />
            <div className="min-w-0"><Badge tone="green" dot>Active</Badge><p className="mt-2 font-serif text-lg text-navy-900">{r.verifierOrg}</p><p className="text-sm text-slate-600">{r.purpose}</p>
              <p className="mt-3 text-xs text-slate-500">Verification code</p><p className="font-mono text-[15px] tracking-wide text-navy-900">{r.credentialId}</p><div className="mt-2"><CopyButton value={r.credentialId!} label="Copy code" /></div></div></div>
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm"><div><dt className="text-xs font-medium text-slate-500">Shared with them</dt><dd className="mt-1 flex flex-wrap gap-1.5">{(r.approvedFields as string[]).map((k) => <Badge key={k} tone="teal">{FIELDS[k as FieldKey]?.label ?? k}</Badge>)}</dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Valid until</dt><dd className="mt-0.5 text-navy-900">{r.validUntil ? dateTime(r.validUntil) : "-"}</dd></div></dl>
            <div className="mt-4"><RevokeButton id={r.id} reference={r.reference} /></div>
            <p className="mt-3 text-xs text-slate-500">The QR contains only this code. It holds none of your details, and your APAAR ID is never in it.</p></Card></li>))}</ul>
      )}
    </>
  );
}
