// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { CircleAlert, Download, FileSpreadsheet, FlaskConical, Loader2, RotateCcw, UploadCloud, X } from "lucide-react";
import { Hint } from "@/components/guide/hint";
import { Stepper } from "@/components/guide/stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Panel } from "@/components/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UPLOAD_STEPS } from "@/lib/labels";
import { ACADEMIC_YEARS } from "@/lib/years";
import { cn } from "@/lib/utils";

type Column = { key: string; label: string; required: boolean; description: string; example: string; why: string };
const MAX = 2 * 1024 * 1024;
const alias = (h: string) => h.trim().toLowerCase().replace(/^\ufeff/, "").replace(/[\s-]+/g, "_");
const mask = (v: string) => { const d = v.replace(/[\s-]/g, ""); return d ? `•••• •••• ${d.slice(-4)}` : "(missing)"; };

export function UploadWizard({ columns, programmes, defaultYear, canReset }: { columns: Column[]; programmes: { code: string; name: string }[]; defaultYear: string; canReset: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState(defaultYear);
  const [file, setFile] = useState<{ name: string; size: number; text: string; rows: Record<string, string>[]; problem?: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async (f: File) => {
    setError(null);
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") return setFile({ name: f.name, size: f.size, text: "", rows: [], problem: "This is not a CSV file. In Excel choose File, Save As, then CSV (Comma delimited)." });
    if (f.size > MAX) return setFile({ name: f.name, size: f.size, text: "", rows: [], problem: "This file is larger than 2 MB. Split it into smaller files and upload them one at a time." });
    const text = await f.text();
    const res = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy", transformHeader: alias, transform: (v) => v.trim() });
    const have = new Set(res.meta.fields ?? []), missing = columns.filter((c) => c.required && !have.has(c.key));
    setFile({ name: f.name, size: f.size, text, rows: res.data, problem: missing.length ? `The file is missing ${missing.length === 1 ? "a required column" : "required columns"}: ${missing.map((m) => m.label).join(", ")}. Download the template and keep its first row unchanged.` : res.data.length === 0 ? "The file has column names but no student rows." : undefined });
  }, [columns]);

  const send = () => {
    if (!file || file.problem) return;
    setBusy(true); setProgress(0); setError(null);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/submissions");
    xhr.setRequestHeader("content-type", "application/json");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 70));
    xhr.onload = () => {
      setProgress(100); setBusy(false);
      let j: { ok: boolean; data?: { submissionId: string; summary: { total: number; rejected: number } }; error?: { message: string } } | null = null;
      try { j = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (j?.ok && j.data) { toast.success(`Checked ${j.data.summary.total} rows. ${j.data.summary.rejected ? `${j.data.summary.rejected} need correction.` : "No rows need correction."}`); router.push(`/institution/submissions/${j.data.submissionId}`); }
      else setError(j?.error?.message ?? "We could not check this file. Please try again.");
    };
    xhr.onerror = () => { setBusy(false); setError("We could not reach the server. Check your connection and try again."); };
    xhr.send(JSON.stringify({ academicYear: year, fileName: file.name, csv: file.text }));
  };

  const step = busy ? 5 : file && !file.problem ? 4 : file ? 3 : 1;
  return (
    <div className="space-y-6">
      <Panel><Stepper steps={UPLOAD_STEPS.slice(0, 5)} current={step} /></Panel>
      <ol className="grid gap-4 md:grid-cols-3">
        {[["Check every row", "Each row goes through five checks: duplicates, APAAR ID, intake, data consistency and other institutions. Nothing is stored yet."], ["Submit what passed", "Valid rows go to AICTE at once. Rows with errors wait on hold; nothing is thrown away."], ["Fix and resubmit", "Every problem says what happened and how to fix it. Upload the corrected file; records already received are not added twice."]].map(([t, d], i) => (
          <li key={t} className="spot fade-up rounded-card border border-line bg-white p-5 shadow-card"><span className="accent-badge grid size-9 place-items-center rounded-xl text-sm font-bold">{i + 1}</span><p className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-navy-900">{t}</p><p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{d}</p></li>))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="1. Download the template" description="A CSV file with the exact column names we expect. Open it in Excel or Google Sheets.">
          <div className="flex flex-wrap gap-2">
            <Button asChild><a href="/api/v1/templates/students" download><Download aria-hidden />Blank template</a></Button>
            <Button asChild variant="secondary"><a href="/api/v1/templates/students?sample=1" download><FileSpreadsheet aria-hidden />Sample with 2 fictional rows</a></Button>
          </div>
          <p className="mt-4 text-[13px] text-slate-600">Your programme codes: {programmes.map((p) => <span key={p.code} className="mr-1.5 inline-block"><Badge tone="neutral" title={p.name}>{p.code}</Badge></span>)}</p>
        </Panel>
        <Panel title="2. Prepare your records" description="One row per student. Required columns must be filled for every row.">
          <ul className="space-y-1.5 text-[13px] text-slate-600">
            <li>Keep the first row (the column names) exactly as it is.</li>
            <li>Upload one academic year at a time, and use that year in every row.</li>
            <li>Only the student's own details are needed. We do not ask for anything else.</li>
            <li>If you correct and re-upload the same file, records we already hold are recognised and not added twice.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="What each column means" description="Hover the question marks for why we ask." flush>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Column</TableHead><TableHead>Needed?</TableHead><TableHead>What to enter</TableHead><TableHead>Example</TableHead></TableRow></TableHeader>
          <TableBody>{columns.map((c) => (
            <TableRow key={c.key}>
              <TableCell><span className="font-mono text-[12px] text-navy-900">{c.key}</span> <Hint text={c.why} /></TableCell>
              <TableCell>{c.required ? <Badge tone="red">Required</Badge> : <Badge tone="neutral">Optional</Badge>}</TableCell>
              <TableCell className="text-slate-600">{c.description}</TableCell><TableCell className="font-mono text-[12px] text-slate-600">{c.example}</TableCell>
            </TableRow>))}
          </TableBody>
        </Table>
      </Panel>

      <Panel title="Accepted file types" description="Spreadsheet exports and system feeds come later. Today the platform reads CSV.">
        <ul className="flex flex-wrap gap-4">
          {[["CSV", "Supported", true], ["XLS(X)", "Save as CSV first", false], ["JSON, XML, PDF", "Not supported yet", false]].map(([t, note, ok]) => (
            <li key={String(t)} className={cn("flex w-44 flex-col items-center rounded-card border px-4 py-5 text-center", ok ? "accent-border bg-white shadow-card" : "border-line bg-paper/60 text-slate-500")}>
              {ok ? <span className="accent-tile mb-2 grid size-11 place-items-center rounded-xl"><FileSpreadsheet className="size-5" aria-hidden /></span> : <FileSpreadsheet className="mb-2 size-8 opacity-50" aria-hidden />}<p className={cn("text-sm font-semibold", ok ? "text-navy-900" : "text-slate-600")}>{t}</p><p className={cn("mt-0.5 text-xs", ok ? "text-slate-600" : "text-slate-500")}>{note}</p>
            </li>))}
        </ul>
      </Panel>

      <Panel title="3. Upload your file" description="Choose the academic year, then drop the file here or browse.">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-[13px] font-medium text-navy-900" htmlFor="ay">Academic year <Hint text="Every row in the file must belong to this year. Upload other years as separate files." /></label>
          <select id="ay" value={year} onChange={(e) => setYear(e.target.value)} className="h-9 rounded-control border border-line-strong bg-white px-3 text-sm">{ACADEMIC_YEARS.map((y) => <option key={y}>{y}</option>)}</select>
        </div>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void read(f); }}
          className={cn("flex flex-col items-center rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors", drag ? "accent-border bg-white" : "border-line-strong bg-paper/60")}>
          <span className="accent-tile mb-4 grid size-16 place-items-center rounded-2xl"><UploadCloud className="size-7" aria-hidden /></span>
          <p className="text-[17px] font-semibold text-navy-900">Drop your .csv file here</p>
          <p className="mt-1 text-sm text-slate-500">or browse your computer · up to 2 MB</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => input.current?.click()}><FileSpreadsheet aria-hidden />Browse for a file</Button>
        </div>
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} aria-label="CSV file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f); e.target.value = ""; }} />

        {file && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3"><FileSpreadsheet className="size-5 shrink-0 text-teal-600" aria-hidden /><div className="min-w-0"><p className="truncate text-sm font-medium text-navy-900">{file.name}</p><p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB{!file.problem && ` · ${file.rows.length.toLocaleString("en-IN")} rows found`}</p></div></div>
              <Button variant="ghost" size="sm" onClick={() => { setFile(null); setError(null); }} aria-label="Remove file"><X aria-hidden />Remove</Button>
            </div>
            {file.problem ? <p role="alert" className="flex items-start gap-2 rounded-control bg-red-100 px-4 py-3 text-sm text-red-700"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{file.problem}</p> : (
              <>
                <div><p className="mb-2 text-sm font-medium text-navy-900">4. Preview <span className="font-normal text-slate-500">(first {Math.min(8, file.rows.length)} rows; APAAR IDs are masked here)</span></p>
                  <div className="overflow-x-auto rounded-control border border-line"><Table>
                    <TableHeader><TableRow className="hover:bg-transparent">{["student_ref", "full_name", "date_of_birth", "apaar_id", "programme_code", "academic_year", "category_code"].map((h) => <TableHead key={h} className="whitespace-nowrap font-mono text-[11px]">{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>{file.rows.slice(0, 8).map((r, i) => <TableRow key={i}>{["student_ref", "full_name", "date_of_birth", "apaar_id", "programme_code", "academic_year", "category_code"].map((h) => <TableCell key={h} className="whitespace-nowrap text-[13px]">{h === "apaar_id" ? <span className="font-mono">{mask(r[h] ?? "")}</span> : r[h] || <span className="text-slate-500">(empty)</span>}</TableCell>)}</TableRow>)}</TableBody>
                  </Table></div></div>
                {busy && <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Checking your file" className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-teal-600 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>}
                {error && <p role="alert" className="flex items-start gap-2 rounded-control bg-red-100 px-4 py-3 text-sm text-red-700"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{error}</p>}
                <Button size="lg" onClick={send} disabled={busy}>{busy ? <><Loader2 className="animate-spin" aria-hidden />Checking {file.rows.length} rows</> : <>5. Check my file for {year}</>}</Button>
                <p className="text-[13px] text-slate-500">Checking is safe: it only reports problems. You will review the results before anything is submitted.</p>
              </>
            )}
          </div>
        )}
      </Panel>

      {canReset && (
        <Panel title="Demonstration tools" description="Only visible because this installation is in demo mode." aside={<Badge tone="amber"><FlaskConical className="size-3" aria-hidden />Demo only</Badge>}>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="secondary"><RotateCcw aria-hidden />Reset my 2026-27 upload</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Reset the demonstration upload?</AlertDialogTitle>
              <AlertDialogDescription>This removes every 2026-27 submission and student record this institution has uploaded, so you can run the demonstration again from the start. Records from earlier years are not touched. This is recorded in the audit trail.</AlertDialogDescription>
              <AlertDialogFooter><AlertDialogCancel>Keep my data</AlertDialogCancel>
                <AlertDialogAction onClick={async () => { const r = await fetch("/api/v1/demo/reset", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); const j = await r.json(); if (j.ok) { toast.success(`Reset: removed ${j.data.students} records and ${j.data.submissions} submissions.`); router.refresh(); } else toast.error(j.error?.message ?? "Reset failed."); }}>Reset demonstration</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Panel>
      )}
    </div>
  );
}
