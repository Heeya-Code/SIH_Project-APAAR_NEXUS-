// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Higher-level building blocks used across every page. API-compatible with the original ui.tsx.
import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, type Tone } from "./badge";
import { Card, CardDescription, CardHeader, CardTitle } from "./card";

export type { Tone };

export function Pill({ tone = "neutral", children, title, dot }: { tone?: Tone; children: ReactNode; title?: string; dot?: boolean }) {
  return <Badge tone={tone} title={title} dot={dot}>{children}</Badge>;
}

export function Panel({ title, description, aside, children, className, flush = false }: {
  title?: ReactNode; description?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; flush?: boolean;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || aside) && (
        <CardHeader className={flush ? "border-b border-line pb-4" : "pb-0"}>
          <div className="min-w-0"><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</div>
          {aside && <div className="shrink-0 text-[13px] text-slate-500">{aside}</div>}
        </CardHeader>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow = "APAAR Nexus · rules flag, people decide" }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  const words = title.split(" "), head = words.slice(0, -1).join(" "), tail = words[words.length - 1];
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="eyebrow mb-2 text-slate-500">{eyebrow}</p>
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-0.035em] text-navy-900 sm:text-[40px]">{head && <>{head} </>}<span className="display-accent">{tail}</span></h1>
        {subtitle && <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex max-w-full items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Horizontal meter with a marker at 100%. Values above 100% are drawn in red. */
export function Meter({ value, tone, label, className, compact = false }: { value: number | null; tone?: Tone; label?: string; className?: string; compact?: boolean }) {
  if (value === null) return <span className="text-slate-500">–</span>;
  const over = value > 1;
  const w = Math.min(value, 1.25) / 1.25;
  const color = over ? "bg-red-600" : tone === "teal" ? "bg-teal-600" : "bg-blue-600";
  return (
    <div className={cn("flex items-center gap-2", className)} role="img" aria-label={label ?? `${(value * 100).toFixed(0)} percent`}>
      <div className={cn("relative h-1.5 rounded-full bg-line", compact ? "w-14" : "w-24")}>
        <div className={cn("bar-grow h-1.5 rounded-full", color)} style={{ width: `${w * 100}%` }} />
        <div className="absolute -top-[3px] h-3 w-px bg-navy-900/50" style={{ left: `${(1 / 1.25) * 100}%` }} />
      </div>
      <span className={cn("tnum w-10 text-right text-[13px]", over ? "font-medium text-red-700" : "text-slate-600")}>{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

export function Empty({ title, children, icon: Icon = Inbox }: { title: string; children?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-paper/60 px-5 py-9 text-center">
      <span className="mb-3 grid size-10 place-items-center rounded-full bg-white text-slate-500 shadow-card"><Icon className="size-5" aria-hidden /></span>
      <p className="font-medium text-navy-900">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{children}</p>}
    </div>
  );
}

export function KeyFact({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "amber" | "green" }) {
  const c = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : tone === "green" ? "text-green-700" : "text-navy-900";
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2.5 last:border-b-0">
      <dt className="text-[13px] text-slate-600">{label}</dt>
      <dd className="text-right"><span className={cn("num text-[20px] leading-none", c)}>{value}</span>{hint && <span className="ml-2 text-xs text-slate-500">{hint}</span>}</dd>
    </div>
  );
}

/** Compact stat card: icon, label, big serif figure, optional hint and trailing visual (e.g. sparkline). */
export function StatCard({ icon: Icon, label, value, hint, tone, children, className, href }: {
  icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "amber" | "green" | "teal"; children?: ReactNode; className?: string; href?: string;
}) {
  const chip = tone === "red" ? "bg-red-100 text-red-700" : tone === "amber" ? "bg-amber-100 text-amber-700" : tone === "green" ? "bg-green-100 text-green-700" : tone === "teal" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700";
  const card = (
    <Card data-tilt className={cn("fade-up h-full p-5", href && "transition-colors hover:border-navy-700", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-slate-600">{label}</p>
          <p className="num mt-1.5 text-[30px] leading-none text-navy-900">{value}</p>
        </div>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", chip)}><Icon className="size-[18px]" aria-hidden /></span>
      </div>
      {hint && <p className="mt-3 text-xs leading-relaxed text-slate-500">{hint}</p>}
      {children}
    </Card>
  );
  return href ? <Link href={href} className="block h-full rounded-card">{card}</Link> : card;
}
