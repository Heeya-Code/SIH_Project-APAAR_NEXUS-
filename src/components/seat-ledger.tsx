// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// The Live Seat Ledger: approved intake against the seats actually filled, from submitted records.
// Ordinary categories count against intake; supernumerary categories (NRI, OCI, FN, TFWS) are shown
// separately and are never treated as intake violations by this view.
import { Layers } from "lucide-react";
import { fmt, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Segments: filled within intake (blue), seats still open (empty track), filled above intake (red). */
export function SegmentedBar({ intake, ordinary, filled: f, open: o, over: x, className, label }: {
  intake?: number; ordinary?: number; filled?: number; open?: number; over?: number; className?: string; label?: string;
}) {
  const filled = f ?? Math.min(ordinary ?? 0, intake ?? 0);
  const open = o ?? Math.max((intake ?? 0) - (ordinary ?? 0), 0);
  const over = x ?? Math.max((ordinary ?? 0) - (intake ?? 0), 0);
  const total = Math.max(filled + open + over, 1);
  return (
    <div role="img" aria-label={label ?? `${fmt(filled + over)} filled of ${fmt(filled + open)} approved seats`} className={cn("flex h-2.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div className="bar-grow h-full bg-blue-600" style={{ width: `${(filled / total) * 100}%` }} />
      <div className="h-full" style={{ width: `${(open / total) * 100}%` }} />
      {over > 0 && <div className="bar-grow h-full bg-red-600" style={{ width: `${(over / total) * 100}%` }} />}
    </div>
  );
}

type Row = { intake: number; ordinary: number; supernumerary: number; over: number; open: number };

export function SeatLedgerSummary({ rows, reporting, total, ay }: { rows: Row[]; reporting: number; total: number; ay: string }) {
  const intake = rows.reduce((t, r) => t + r.intake, 0);
  const ordinary = rows.reduce((t, r) => t + r.ordinary, 0);
  const over = rows.reduce((t, r) => t + r.over, 0), open = rows.reduce((t, r) => t + r.open, 0), filled = ordinary - over; // judged per programme
  const sup = rows.reduce((t, r) => t + r.supernumerary, 0);
  const cell = (label: string, value: number, tone = "text-navy-900", note?: string) => (
    <div className="min-w-0"><p className="text-[13px] text-slate-600">{label}</p><p className={cn("num mt-1 text-[28px] leading-none", tone)}>{fmt(value)}</p>{note && <p className="mt-1.5 text-xs text-slate-500">{note}</p>}</div>
  );
  return (
    <Card className="fade-up">
      <CardHeader>
        <div><CardTitle className="flex items-center gap-2"><Layers className="size-[18px] text-teal-600" aria-hidden />Live seat ledger, {ay}</CardTitle>
          <CardDescription>Recalculated from submitted records every time this page loads. Covers the {reporting} of {total} institutions that have submitted for {ay}.</CardDescription></div>
        <Badge tone="teal" dot>Computed live</Badge>
      </CardHeader>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-5">
          {cell("Approved intake", intake)}
          {cell("Ordinary seats filled", ordinary, "text-navy-900", `${pct(intake ? ordinary / intake : null)} of intake`)}
          {cell("Seats still open", open, "text-blue-700", "in programmes below intake")}
          {cell("Filled above intake", over, over > 0 ? "text-red-700" : "text-navy-900", over > 0 ? "needs regulatory review" : "none")}
          {cell("Supernumerary", sup, "text-teal-700", "reported separately")}
        </div>
        <SegmentedBar filled={filled} open={open} over={over} className="mt-6 h-3" label={`${fmt(filled)} seats filled, ${fmt(open)} open, ${fmt(over)} above intake`} />
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[3px] bg-blue-600" />Filled within intake</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[3px] bg-line" />Open seats</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[3px] bg-red-600" />Filled above intake</li>
        </ul>
      </div>
    </Card>
  );
}

export type LedgerProgramme = { id: string; code: string; name: string; department: string; intake: number; ordinary: number; nri: number; oci: number; fn: number; tfws: number };

export function SeatLedgerTable({ rows, ay }: { rows: LedgerProgramme[]; ay: string }) {
  const intake = rows.reduce((t, r) => t + r.intake, 0);
  const ordinary = rows.reduce((t, r) => t + r.ordinary, 0);
  return (
    <Card className="fade-up overflow-hidden">
      <CardHeader className="border-b border-line pb-4">
        <div><CardTitle className="flex items-center gap-2"><Layers className="size-[18px] text-teal-600" aria-hidden />Live seat ledger, {ay}</CardTitle>
          <CardDescription>Approved intake against ordinary seats filled, programme by programme. Supernumerary admissions are listed separately.</CardDescription></div>
        <div className="text-right"><p className="num text-2xl text-navy-900">{pct(intake ? ordinary / intake : null)}</p><p className="text-xs text-slate-500">{fmt(ordinary)} of {fmt(intake)} seats</p></div>
      </CardHeader>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Programme</TableHead><TableHead className="text-right">Approved intake</TableHead><TableHead className="text-right">Filled</TableHead>
          <TableHead className="min-w-[200px]">Seat use</TableHead><TableHead className="text-right">Open / above</TableHead><TableHead>Supernumerary</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => {
            const gap = r.intake - r.ordinary;
            const sup = [["NRI", r.nri], ["OCI", r.oci], ["FN", r.fn], ["TFWS", r.tfws]] as const;
            return (
              <TableRow key={r.id}>
                <TableCell><p className="font-medium text-navy-900">{r.name}</p><p className="text-xs text-slate-500">{r.department}</p></TableCell>
                <TableCell className="tnum text-right">{fmt(r.intake)}</TableCell>
                <TableCell className="tnum text-right">{fmt(r.ordinary)}</TableCell>
                <TableCell><div className="flex items-center gap-3"><SegmentedBar intake={r.intake} ordinary={r.ordinary} className="max-w-[140px]" /><span className={cn("tnum w-10 text-[13px]", gap < 0 ? "font-medium text-red-700" : "text-slate-600")}>{pct(r.intake ? r.ordinary / r.intake : null)}</span></div></TableCell>
                <TableCell className={cn("tnum text-right", gap < 0 && "font-medium text-red-700")}>{gap < 0 ? `${fmt(-gap)} above` : `${fmt(gap)} open`}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1.5">{sup.filter(([, n]) => n > 0).map(([k, n]) => <Badge key={k} tone="teal">{k} {n}</Badge>)}{sup.every(([, n]) => n === 0) && <span className="text-xs text-slate-500">None</span>}</div></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
