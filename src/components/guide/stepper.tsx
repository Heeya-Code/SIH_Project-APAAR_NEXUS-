// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Numbered progress for multi-step tasks. `current` is 1-based; earlier steps show a tick. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol aria-label="Progress" className="flex flex-wrap gap-x-2 gap-y-3">
      {steps.map((s, idx) => {
        const n = idx + 1, done = n < current, active = n === current;
        return (
          <li key={s} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
            <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold", done ? "bg-teal-600 text-white" : active ? "bg-navy-900 text-white" : "bg-navy-900/10 text-slate-600")}>{done ? <Check className="size-3.5" aria-hidden /> : n}</span>
            <span className={cn("text-[13px]", active ? "font-medium text-navy-900" : "text-slate-600")}>{s}</span>
            {n < steps.length && <span aria-hidden className="mx-1 hidden h-px w-5 bg-line-strong sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}
