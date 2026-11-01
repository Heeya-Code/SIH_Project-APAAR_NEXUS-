// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type ColumnDef, type FilterFn, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Empty, Meter } from "@/components/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type InstitutionTableRow = {
  id: string; name: string; city: string; stateName: string; typeLabel: string; intake: number; admitted: number; supernumerary: number;
  utilisation: number | null; apaarCoverage: number | null; submitted: boolean; version: number | null; signals: string[]; trust?: number | null;
};
const nf = new Intl.NumberFormat("en-IN");
const nullsLast = (a: number | null, b: number | null) => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : a - b);

const globalFilter: FilterFn<InstitutionTableRow> = (row, _id, value) => {
  const q = String(value).toLowerCase().trim();
  const r = row.original;
  return !q || `${r.name} ${r.city} ${r.stateName}`.toLowerCase().includes(q);
};

export function InstitutionsTable({ data }: { data: InstitutionTableRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "signals", desc: true }, { id: "name", desc: false }]);
  const [query, setQuery] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const rows = useMemo(() => (flaggedOnly ? data.filter((r) => r.signals.length > 0) : data), [data, flaggedOnly]);

  const columns = useMemo<ColumnDef<InstitutionTableRow>[]>(() => [
    { id: "name", header: "Institution", accessorFn: (r) => r.name, cell: ({ row: { original: r } }) => <div className="min-w-[210px]"><Link href={`/aicte/institutions/${r.id}`} className="font-medium text-navy-900 underline-offset-2 hover:text-blue-600 hover:underline">{r.name}</Link><p className="text-xs text-slate-500">{r.city}, {r.stateName}</p></div> },
    { id: "type", header: "Type", accessorFn: (r) => r.typeLabel, cell: ({ getValue }) => <span className="text-slate-600">{getValue<string>()}</span> },
    { id: "intake", header: "Intake", accessorFn: (r) => r.intake, meta: { align: "right" }, cell: ({ getValue }) => <span className="tnum">{nf.format(getValue<number>())}</span> },
    { id: "admitted", header: "Admitted", accessorFn: (r) => r.admitted, meta: { align: "right" }, cell: ({ row: { original: r } }) => <div className="tnum">{nf.format(r.admitted)}{r.supernumerary > 0 && <span className="block text-xs text-slate-500">{nf.format(r.supernumerary)} supernumerary</span>}</div> },
    { id: "utilisation", header: "Seat use", accessorFn: (r) => r.utilisation, sortingFn: (a, b) => nullsLast(a.original.utilisation, b.original.utilisation), sortUndefined: "last", cell: ({ row: { original: r } }) => <Meter value={r.utilisation} compact /> },
    { id: "apaar", header: "APAAR", accessorFn: (r) => r.apaarCoverage, sortingFn: (a, b) => nullsLast(a.original.apaarCoverage, b.original.apaarCoverage), cell: ({ row: { original: r } }) => <Meter value={r.apaarCoverage} tone="teal" compact /> },
    { id: "trust", header: "Trust", accessorFn: (r) => r.trust ?? null, sortingFn: (a, b) => nullsLast(a.original.trust ?? null, b.original.trust ?? null), cell: ({ row: { original: r } }) => r.trust === null || r.trust === undefined ? <span className="text-xs text-slate-500">Not scored</span> : <span className="num text-base text-navy-900">{r.trust}</span> },
    { id: "submission", header: "Submission", accessorFn: (r) => (r.submitted ? 1 : 0), cell: ({ row: { original: r } }) => r.submitted ? <Badge tone="green" dot>Accepted v{r.version}</Badge> : <Badge tone="amber" dot>Pending</Badge> },
    { id: "signals", header: "Signals", accessorFn: (r) => r.signals.length, cell: ({ row: { original: r } }) => r.signals.length ? <ul className="min-w-[150px] space-y-1">{r.signals.map((s) => <li key={s}><Badge tone="red" className="whitespace-normal text-left leading-snug">{s}</Badge></li>)}</ul> : <span className="text-xs text-slate-500">None</span> },
  ], []);

  const table = useReactTable({
    data: rows, columns, state: { sorting, globalFilter: query }, onSortingChange: setSorting, onGlobalFilterChange: setQuery, globalFilterFn: globalFilter,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
  });
  const flaggedCount = data.filter((r) => r.signals.length > 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <label className="relative">
          <span className="sr-only">Search institutions</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, city or state" className="h-9 w-64 rounded-control border border-line-strong bg-white pl-9 pr-3 text-sm placeholder:text-slate-500" />
        </label>
        <button type="button" aria-pressed={flaggedOnly} onClick={() => setFlaggedOnly((v) => !v)}
          className={cn("h-9 rounded-control border px-3 text-[13px] transition-colors", flaggedOnly ? "border-red-600/40 bg-red-100 text-red-700" : "border-line-strong bg-white text-slate-600 hover:bg-paper")}>
          Flagged only ({flaggedCount})
        </button>
        <p className="ml-auto text-[13px] text-slate-500" aria-live="polite">{table.getRowModel().rows.length} of {data.length} institutions</p>
      </div>
      <Table className="min-w-[880px] [&_td]:px-3 [&_th]:px-3">
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((h) => {
                const dir = h.column.getIsSorted();
                const right = (h.column.columnDef.meta as { align?: string } | undefined)?.align === "right";
                return (
                  <TableHead key={h.id} aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"} className={cn(right && "text-right")}>
                    <button type="button" onClick={h.column.getToggleSortingHandler()} className={cn("inline-flex items-center gap-1.5 rounded px-1 py-0.5 hover:text-navy-900", right && "flex-row-reverse", dir && "text-navy-900")}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {dir === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : dir === "desc" ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((r) => (
            <TableRow key={r.id}>
              {r.getVisibleCells().map((c) => <TableCell key={c.id} className={cn((c.column.columnDef.meta as { align?: string } | undefined)?.align === "right" && "text-right")}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {table.getRowModel().rows.length === 0 && <div className="p-5"><Empty icon={SearchX} title="No institutions match">Try a different search or clear the flagged filter.</Empty></div>}
    </div>
  );
}
