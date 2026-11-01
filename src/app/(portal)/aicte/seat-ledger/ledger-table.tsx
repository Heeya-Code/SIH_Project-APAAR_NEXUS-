// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, SearchX } from "lucide-react";
import { SegmentedBar } from "@/components/seat-ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LedgerRow } from "@/lib/queries/ledger";
import { REGION_LABEL } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export function LedgerTable({ rows, ay }: { rows: LedgerRow[]; ay: string }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "overshoot", desc: true }]);
  const [q, setQ] = useState(""), [region, setRegion] = useState(""), [overOnly, setOverOnly] = useState(false);
  const regions = useMemo(() => [...new Set(rows.map((r) => r.region))].sort(), [rows]);
  const data = useMemo(() => rows.filter((r) => (!region || r.region === region) && (!overOnly || r.overshoot > 0) && (!q || `${r.institution} ${r.programme} ${r.programmeCode} ${r.stateName}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, region, overOnly]);
  const columns = useMemo<ColumnDef<LedgerRow>[]>(() => [
    { id: "institution", header: "Institution", accessorFn: (r) => r.institution, cell: ({ row: { original: r } }) => <div className="min-w-[200px]"><p className="font-medium text-navy-900">{r.shortName}</p><p className="text-xs text-slate-500">{r.stateName} · {REGION_LABEL[r.region as keyof typeof REGION_LABEL]}</p></div> },
    { id: "programme", header: "Programme", accessorFn: (r) => r.programme, cell: ({ row: { original: r } }) => <div className="min-w-[180px]"><p className="text-navy-900">{r.programmeCode}</p><p className="text-xs text-slate-500">{r.programme}</p></div> },
    { id: "intake", header: "Approved", accessorFn: (r) => r.intake, meta: { right: true }, cell: ({ getValue }) => <span className="tnum">{getValue<number>()}</span> },
    { id: "ordinary", header: "Filled", accessorFn: (r) => r.ordinary, meta: { right: true }, cell: ({ getValue }) => <span className="tnum">{getValue<number>()}</span> },
    { id: "remaining", header: "Remaining", accessorFn: (r) => r.remaining, meta: { right: true }, cell: ({ getValue }) => <span className="tnum">{getValue<number>()}</span> },
    { id: "utilisation", header: "Use", accessorFn: (r) => r.utilisation ?? -1, cell: ({ row: { original: r } }) => <div className="flex items-center gap-2"><SegmentedBar intake={r.intake} ordinary={r.ordinary} className="w-20" /><span className={cn("tnum text-[13px]", r.overshoot ? "font-medium text-red-700" : "text-slate-600")}>{r.utilisation === null ? "–" : `${(r.utilisation * 100).toFixed(0)}%`}</span></div> },
    { id: "overshoot", header: "Above intake", accessorFn: (r) => r.overshoot, meta: { right: true }, cell: ({ getValue }) => getValue<number>() ? <Badge tone="red">+{getValue<number>()}</Badge> : <span className="text-slate-500">–</span> },
    { id: "supernumerary", header: "Supernumerary", accessorFn: (r) => r.supernumerary, meta: { right: true }, cell: ({ getValue }) => <span className="tnum text-slate-600">{getValue<number>()}</span> },
    { id: "submitted", header: "Submitted", accessorFn: (r) => (r.submitted ? 1 : 0), cell: ({ row: { original: r } }) => r.submitted ? <Badge tone="green" dot>Yes</Badge> : <Badge tone="amber" dot>No</Badge> },
  ], []);
  const t = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 15 } } });
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <label className="relative"><span className="sr-only">Search the ledger</span><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => { setQ(e.target.value); t.setPageIndex(0); }} placeholder="Search institution or programme" className="h-9 w-64 rounded-control border border-line-strong bg-white pl-9 pr-3 text-sm placeholder:text-slate-500" /></label>
        <label className="text-[13px] text-slate-600">Region <select value={region} onChange={(e) => { setRegion(e.target.value); t.setPageIndex(0); }} className="ml-1.5 h-9 rounded-control border border-line-strong bg-white px-2 text-sm"><option value="">All</option>{regions.map((r) => <option key={r} value={r}>{REGION_LABEL[r as keyof typeof REGION_LABEL]}</option>)}</select></label>
        <button type="button" aria-pressed={overOnly} onClick={() => { setOverOnly((v) => !v); t.setPageIndex(0); }} className={cn("h-9 rounded-control border px-3 text-[13px]", overOnly ? "border-red-600/40 bg-red-100 text-red-700" : "border-line-strong bg-white text-slate-600 hover:bg-paper")}>Above intake only</button>
        <p className="ml-auto text-[13px] text-slate-500" aria-live="polite">{data.length} of {rows.length} programmes · {ay}</p>
      </div>
      <Table className="min-w-[980px]">
        <TableHeader>{t.getHeaderGroups().map((hg) => <TableRow key={hg.id} className="hover:bg-transparent">{hg.headers.map((h) => { const dir = h.column.getIsSorted(), right = (h.column.columnDef.meta as { right?: boolean } | undefined)?.right; return (
          <TableHead key={h.id} aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"} className={cn(right && "text-right")}>
            <button type="button" onClick={h.column.getToggleSortingHandler()} className={cn("inline-flex items-center gap-1.5 rounded px-1 py-0.5 hover:text-navy-900", right && "flex-row-reverse", dir && "text-navy-900")}>{flexRender(h.column.columnDef.header, h.getContext())}{dir === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : dir === "desc" ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />}</button></TableHead>); })}</TableRow>)}</TableHeader>
        <TableBody>{t.getRowModel().rows.map((r) => <TableRow key={r.id} className={cn(r.original.overshoot > 0 && "bg-red-100/30")}>{r.getVisibleCells().map((c) => <TableCell key={c.id} className={cn((c.column.columnDef.meta as { right?: boolean } | undefined)?.right && "text-right")}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
      {data.length === 0 && <div className="p-5"><Empty icon={SearchX} title="No programmes match">Clear a filter or search for a different name.</Empty></div>}
      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
        <Button variant="secondary" size="sm" onClick={() => t.previousPage()} disabled={!t.getCanPreviousPage()}><ChevronLeft aria-hidden />Previous</Button>
        <span className="text-slate-500">Page {t.getState().pagination.pageIndex + 1} of {Math.max(1, t.getPageCount())}</span>
        <Button variant="secondary" size="sm" onClick={() => t.nextPage()} disabled={!t.getCanNextPage()}>Next<ChevronRight aria-hidden /></Button>
      </div>
    </div>
  );
}
