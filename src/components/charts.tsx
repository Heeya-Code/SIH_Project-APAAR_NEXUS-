// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export const CHART = { blue: "#4d86e6", teal: "#14a59f", navy: "var(--chart-ref)", grey: "var(--chart-open)", red: "#e5483b", axis: "var(--chart-axis)", grid: "var(--chart-grid)" };
const nf = new Intl.NumberFormat("en-IN");
const tick = { fontSize: 12, fill: CHART.axis };

function useMounted() { const [m, setM] = useState(false); useEffect(() => setM(true), []); return m; }

type LegendItem = { label: string; color: string; dashed?: boolean };
function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.dashed ? <span aria-hidden className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} /> : <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: i.color }} />}{i.label}
        </li>
      ))}
    </ul>
  );
}

/** One tooltip style for every chart. */
function ChartTip({ active, payload, label, unit = "", title }: { active?: boolean; payload?: { name?: string; value?: number | string | null; color?: string; fill?: string; payload?: { name?: string; share?: number } }[]; label?: string | number; unit?: string; title?: (p: NonNullable<typeof payload>) => string | undefined }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== null && p.value !== undefined);
  return (
    <div className="animate-pop-in rounded-lg border border-line bg-white px-3 py-2 text-[13px] shadow-pop">
      <p className="mb-1 font-medium text-navy-900">{title?.(payload) ?? label}</p>
      {rows.map((p, i) => (
        <p key={i} className="flex items-center justify-between gap-6 text-slate-600">
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full" style={{ background: p.color ?? p.fill }} />{p.name}</span>
          <span className="tnum font-medium text-navy-900">{typeof p.value === "number" ? nf.format(p.value) : p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}

function Figure({ title, caption, height, legend, children, table }: {
  title: string; caption?: string; height: number; legend: LegendItem[]; children: React.ReactNode; table: { head: string[]; rows: (string | number)[][] };
}) {
  const mounted = useMounted();
  return (
    <figure aria-label={title} className="m-0">
      <div style={{ height }} aria-hidden="true">{mounted ? children : <Skeleton className="size-full rounded-lg" />}</div>
      <Legend items={legend} />
      {caption && <figcaption className="mt-2 text-xs leading-relaxed text-slate-500">{caption}</figcaption>}
      {/* Screen-reader data table. Wrapped in a div because tables ignore overflow clipping. */}
      <div className="sr-only"><table><caption>{title}</caption><thead><tr>{table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
    </figure>
  );
}

export function TrendChart({ data }: { data: { ay: string; ordinary: number; supernumerary: number; intake: number | null }[] }) {
  return (
    <Figure title="Admissions by year against approved intake" caption="Intake counts only institutions with an accepted submission for that year." height={264}
      legend={[{ label: "Ordinary admissions", color: CHART.blue }, { label: "Supernumerary", color: CHART.teal }, { label: "Approved intake", color: CHART.navy, dashed: true }]}
      table={{ head: ["Year", "Ordinary", "Supernumerary", "Approved intake"], rows: data.map((d) => [d.ay, d.ordinary, d.supernumerary, d.intake ?? "no submissions"]) }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="ay" tick={tick} tickLine={false} axisLine={{ stroke: CHART.grid }} />
          <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => nf.format(v)} width={52} />
          <Tooltip content={<ChartTip />} cursor={{ fill: "#f1f5fa" }} />
          <Bar isAnimationActive={false} dataKey="ordinary" name="Ordinary admissions" stackId="a" fill={CHART.blue} maxBarSize={52} />
          <Bar isAnimationActive={false} dataKey="supernumerary" name="Supernumerary" stackId="a" fill={CHART.teal} maxBarSize={52} radius={[4, 4, 0, 0]} />
          <Line isAnimationActive={false} dataKey="intake" name="Approved intake" stroke={CHART.navy} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export function ApaarTrendChart({ data }: { data: { ay: string; apaarCoverage: number | null }[] }) {
  const rows = data.map((d) => ({ ay: d.ay, pct: d.apaarCoverage === null ? null : Math.round(d.apaarCoverage * 1000) / 10 }));
  return (
    <Figure title="APAAR coverage by admission year" caption="Share of admissions with a well-formed APAAR ID (structural check only)." height={264}
      legend={[{ label: "APAAR coverage", color: CHART.teal }]}
      table={{ head: ["Year", "Coverage %"], rows: rows.map((r) => [r.ay, r.pct ?? "none"]) }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart accessibilityLayer={false} data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="ay" tick={tick} tickLine={false} axisLine={{ stroke: CHART.grid }} />
          <YAxis domain={[0, 100]} tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={44} />
          <Tooltip content={<ChartTip unit="%" />} cursor={{ stroke: CHART.grid }} />
          <Line isAnimationActive={false} dataKey="pct" name="APAAR coverage" stroke={CHART.teal} strokeWidth={2.5} dot={{ r: 4, fill: "#fff", stroke: CHART.teal, strokeWidth: 2 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export type CompareRow = { label: string; ordinary: number; supernumerary: number; intake: number };

/** Horizontal comparison of approved intake with actual admissions. Ordinary bars turn red when they exceed intake. */
export function CompareChart({ rows, title, caption }: { rows: CompareRow[]; title: string; caption?: string }) {
  const h = Math.max(220, rows.length * 46 + 24);
  return (
    <Figure title={title} caption={caption} height={h}
      legend={[{ label: "Approved intake", color: CHART.grey }, { label: "Ordinary admissions", color: CHART.blue }, { label: "Above intake", color: CHART.red }, { label: "Supernumerary", color: CHART.teal }]}
      table={{ head: ["Name", "Approved intake", "Ordinary admissions", "Supernumerary"], rows: rows.map((r) => [r.label, r.intake, r.ordinary, r.supernumerary]) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart accessibilityLayer={false} data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barGap={2} barCategoryGap={10}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" horizontal={false} />
          <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => nf.format(v)} />
          <YAxis type="category" dataKey="label" tick={{ ...tick, fill: CHART.navy }} tickLine={false} axisLine={false} width={118} />
          <Tooltip content={<ChartTip />} cursor={{ fill: "#f1f5fa" }} />
          <Bar isAnimationActive={false} dataKey="intake" name="Approved intake" fill={CHART.grey} barSize={9} radius={[0, 4, 4, 0]} />
          <Bar isAnimationActive={false} dataKey="ordinary" name="Ordinary admissions" fill={CHART.blue} barSize={9} radius={[0, 4, 4, 0]}>
            {rows.map((r) => <Cell key={r.label} fill={r.ordinary > r.intake ? CHART.red : CHART.blue} />)}
          </Bar>
          <Bar isAnimationActive={false} dataKey="supernumerary" name="Supernumerary" fill={CHART.teal} barSize={9} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export function CategoryChart({ rows }: { rows: { code: string; name: string; count: number; share: number; supernumerary: boolean }[] }) {
  return (
    <Figure title="Admissions by category" caption="Ordinary categories count against intake; supernumerary categories are reported separately." height={264}
      legend={[{ label: "Ordinary category", color: CHART.blue }, { label: "Supernumerary category", color: CHART.teal }]}
      table={{ head: ["Category", "Admissions", "Share %"], rows: rows.map((r) => [r.name, r.count, (r.share * 100).toFixed(1)]) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart accessibilityLayer={false} data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="code" tick={tick} tickLine={false} axisLine={{ stroke: CHART.grid }} />
          <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => nf.format(v)} width={52} />
          <Tooltip cursor={{ fill: "#f1f5fa" }} content={<ChartTip title={(p) => p[0]?.payload?.name} />} />
          <Bar isAnimationActive={false} dataKey="count" name="Admissions" maxBarSize={40} radius={[4, 4, 0, 0]}>
            {rows.map((r) => <Cell key={r.code} fill={r.supernumerary ? CHART.teal : CHART.blue} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}

/** Tiny trend line for stat cards. Decorative: the numbers are in the card text. */
export function Sparkline({ values, color = CHART.blue }: { values: (number | null)[]; color?: string }) {
  const mounted = useMounted();
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div aria-hidden="true" className="mt-3 h-9">
      {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart accessibilityLayer={false} data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <Line dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Trust Score over the years (years without an accepted submission are simply absent, never drawn as zero). */
export function TrustTrendChart({ data }: { data: { ay: string; overall: number | null }[] }) {
  return (
    <Figure title="Trust Score by academic year" caption="A prototype assessment metric. Years with no accepted submission are not scored." height={220} legend={[{ label: "Overall Trust Score", color: CHART.blue }]}
      table={{ head: ["Year", "Trust Score"], rows: data.map((d) => [d.ay, d.overall ?? "not scored"]) }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="ay" tick={tick} tickLine={false} axisLine={{ stroke: CHART.grid }} />
          <YAxis domain={[0, 100]} tick={tick} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<ChartTip />} cursor={{ stroke: CHART.grid }} />
          <Line isAnimationActive={false} dataKey="overall" name="Trust Score" stroke={CHART.blue} strokeWidth={2.5} dot={{ r: 4, fill: "#fff", stroke: CHART.blue, strokeWidth: 2 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </Figure>
  );
}
