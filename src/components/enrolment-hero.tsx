// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Image 6's signature pieces, on real data: a pictogram hero with the gender split, and category "spread" bars made of people.
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Counter } from "@/components/fx/counter";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Person({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 14 24" aria-hidden className={cn("h-[18px] w-[10px] shrink-0", className)} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
      <circle cx="7" cy="4.5" r="3.2" /><path d="M2 22V12.5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3V22" strokeLinejoin="round" />
    </svg>
  );
}

export type HeroProps = { ay: string; scope: string; total: number; prevTotal: number | null; prevAy: string; male: number; female: number; other: number };

export function EnrolmentHero({ ay, scope, total, prevTotal, prevAy, male, female, other }: HeroProps) {
  const change = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null;
  const known = male + female + other || 1, share = (n: number) => (n / known) * 100;
  const bubble = (label: string, n: number, tone: string) => {
    const size = 84 + Math.round((n / known) * 70);
    return (
      <div className="flex flex-col items-center text-center">
        <div className={cn("grid place-items-center rounded-full text-white shadow-[0_10px_40px_-10px_rgba(80,120,255,0.8)] transition-transform duration-300 hover:scale-105", tone)} style={{ width: size, height: size }}>
          <div><p className="text-[13px] opacity-90">{label}</p><p className="num text-[22px] leading-tight">{share(n).toFixed(1)}%</p></div>
        </div>
        <p className="num mt-2 text-[17px] text-navy-900">{n.toLocaleString("en-IN")}</p>
      </div>
    );
  };
  return (
    <Card className="fade-up relative overflow-hidden p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-[repeat(14,1fr)] content-center gap-x-3 gap-y-2.5 px-5 py-4 text-blue-600/[0.13] [mask-image:linear-gradient(90deg,#000,transparent_75%)]">
        {Array.from({ length: 70 }, (_, i) => <Person key={i} filled={i % 3 !== 0} className="mx-auto" />)}
      </div>
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <div className="relative grid size-[232px] shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#6b7bff,#3157d6_55%,#1d2f8f)] text-center text-white shadow-[0_0_80px_-12px_rgba(80,110,255,0.85)] ring-1 ring-white/20">
          <div>
            <p className="text-[15px] font-medium text-white/90">Total enrolment</p>
            <p className="num text-[44px] leading-none"><Counter value={total} /></p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-0.5 text-[12px] text-white">
              {change === null ? <>no {prevAy} data to compare</> : <>{change >= 0 ? <ArrowUpRight className="size-3.5 text-emerald-300" aria-hidden /> : <ArrowDownRight className="size-3.5 text-red-300" aria-hidden />}{Math.abs(change).toFixed(1)}% vs {prevAy}</>}
            </p>
          </div>
        </div>
        <div>
          <p className="text-[13px] text-slate-600">Admissions in {ay} · {scope}. Withdrawn students are excluded. Change compares the same institutions with last year.</p>
          <div className="mt-5 flex flex-wrap items-end gap-8">
            {bubble("Male", male, "bg-gradient-to-br from-sky-600 to-blue-800")}{bubble("Female", female, "bg-gradient-to-br from-fuchsia-500 to-violet-700")}
            {other > 0 && bubble("Other", other, "bg-gradient-to-br from-teal-500 to-emerald-700")}
          </div>
        </div>
      </div>
    </Card>
  );
}

export type Group = { code: string; name: string; count: number; share: number; supernumerary: boolean };
export function GroupSpread({ groups, ay }: { groups: Group[]; ay: string }) {
  const shown = groups.filter((g) => g.count > 0), max = Math.max(...shown.map((g) => g.share), 0.0001), ICONS = 12;
  return (
    <Card className="fade-up h-full overflow-hidden border-indigo-400/20 bg-gradient-to-b from-indigo-600/90 to-indigo-900/90 p-6 text-white">
      <h2 className="font-serif text-[19px] text-white">Admission category spread</h2>
      <p className="mt-0.5 text-[12px] text-indigo-100/80">Share of {ay} admissions. Each row is 12 people; filled ones show the share relative to the largest group. S marks supernumerary seats, counted outside approved intake.</p>
      <ul className="mt-4 space-y-2">
        {shown.map((g) => {
          const filled = Math.max(1, Math.round((g.share / max) * ICONS));
          return (
            <li key={g.code} aria-label={`${g.name}: ${g.count} admissions, ${(g.share * 100).toFixed(1)} percent`}>
              <div className="flex items-center gap-3">
                <p className="w-12 shrink-0 text-[13px] text-indigo-50" title={g.supernumerary ? `${g.name} (supernumerary)` : g.name}>{g.code}{g.supernumerary && <sup className="ml-0.5 text-[10px] text-indigo-100/80">S</sup>}</p>
                <div className="flex flex-1 gap-[3px] text-white">{Array.from({ length: ICONS }, (_, i) => <Person key={i} filled={i < filled} className={i < filled ? "opacity-95" : "opacity-35"} />)}</div>
                <p className="num w-24 shrink-0 text-right text-[16px] text-white">{g.count.toLocaleString("en-IN")} <span className="text-[11px] text-indigo-100/80">{(g.share * 100).toFixed(1)}%</span></p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
