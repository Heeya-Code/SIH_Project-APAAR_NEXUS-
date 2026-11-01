// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin } from "lucide-react";
import { TileGrid, TileLegend, type TileDatum } from "@/components/tile-grid";
import { Badge } from "@/components/ui/badge";

type S = { code: string; name: string; institutions: number; intake: number; admitted: number; utilisation: number | null; apaarCoverage: number | null; flagged: number; pending: number };
type I = { id: string; name: string; city: string; state: string; admitted: number; intake: number; utilisation: number | null; apaarCoverage: number | null; signals: string[] };
type Metric = "admitted" | "utilisation" | "apaar";

const METRICS: { key: Metric; label: string; scale: "blue" | "teal" }[] = [
  { key: "admitted", label: "Admissions", scale: "blue" },
  { key: "utilisation", label: "Intake utilisation", scale: "blue" },
  { key: "apaar", label: "APAAR coverage", scale: "teal" },
];
const n = new Intl.NumberFormat("en-IN");
const p = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)}%`);

export function CommandMap({ states, institutions, ay }: { states: S[]; institutions: I[]; ay: string }) {
  const [metric, setMetric] = useState<Metric>("admitted");
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const m = METRICS.find((x) => x.key === metric)!;
  const val = (s: S) => (metric === "admitted" ? s.admitted : metric === "utilisation" ? s.utilisation : s.apaarCoverage);

  const { data, max } = useMemo(() => {
    const d: Record<string, TileDatum> = {};
    let mx = 0;
    for (const s of states) {
      const v = val(s);
      if (v !== null) mx = Math.max(mx, v);
      d[s.code] = { value: v, ring: s.flagged > 0, dot: s.pending > 0, caption: metric === "admitted" ? `${n.format(s.admitted)} admissions` : p(v) };
    }
    return { data: d, max: metric === "admitted" ? mx : Math.max(1, mx) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states, metric]);

  const active = hover ?? selected;
  const st = states.find((s) => s.code === active);
  const list = institutions.filter((i) => i.state === active);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div>
        <fieldset className="mb-5 inline-flex gap-1 rounded-control bg-navy-900/[0.05] p-1">
          <legend className="sr-only">Map measure</legend>
          {METRICS.map((x) => (
            <label key={x.key} className="relative cursor-pointer">
              <input type="radio" name="map-measure" value={x.key} checked={metric === x.key} onChange={() => setMetric(x.key)} className="peer sr-only" />
              <span className="block rounded-[6px] px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:text-navy-900 peer-checked:bg-white peer-checked:text-navy-900 peer-checked:shadow-card peer-focus-visible:outline-2 peer-focus-visible:outline-teal-500">{x.label}</span>
            </label>
          ))}
        </fieldset>
        <div className="mx-auto max-w-[540px]"><TileGrid data={data} scale={m.scale} max={max} selected={selected} onSelect={(c) => setSelected((s) => (s === c ? null : c))} onHover={setHover} /></div>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
          <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-3 rounded-[3px]" style={{ boxShadow: "inset 0 0 0 2px #b42318" }} />Institution above approved intake</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2 rounded-full bg-amber-600" />Submission pending for {ay}</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-3 rounded-[3px] bg-[#eef2f8]" style={{ boxShadow: "inset 0 0 0 1.5px #8a99b0" }} />Institutions present, no data for this measure</li>
          <li className="flex items-center gap-2"><TileLegend scale={m.scale} /></li>
          <li>Tiles are equal in size by design.</li>
        </ul>
      </div>
      <div className="min-h-[300px] rounded-card border border-line bg-paper/70 p-5" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {st ? (
            <motion.div key={st.code} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              <h3 className="text-xl text-navy-900">{st.name}</h3>
              <p className="mb-4 mt-0.5 text-[13px] text-slate-500">{st.institutions} institution{st.institutions === 1 ? "" : "s"} · {n.format(st.admitted)} admissions against {n.format(st.intake)} approved intake</p>
              <ul className="divide-y divide-line rounded-lg border border-line bg-white">
                {list.map((i) => (
                  <li key={i.id} className="px-4 py-3">
                    <p className="text-[14px] font-medium text-navy-900">{i.name}</p>
                    <p className="text-xs text-slate-500">{i.city}</p>
                    <p className="tnum mt-1.5 text-[13px] text-slate-600">{n.format(i.admitted)} admitted · intake use {p(i.utilisation)} · APAAR coverage {p(i.apaarCoverage)}</p>
                    {i.signals.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{i.signals.map((s) => <Badge key={s} tone="red">{s}</Badge>)}</div>}
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <span className="mb-3 grid size-10 place-items-center rounded-full bg-white text-slate-500 shadow-card"><MapPin className="size-5" aria-hidden /></span>
              <p className="font-serif text-lg text-navy-900">Select a state</p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">Hover or press a tile to see its institutions, intake use and APAAR coverage for {ay}. Greyed tiles have no institutions in this view.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
