// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-slate-400/15 text-slate-600", blue: "bg-blue-100 text-blue-700", teal: "bg-teal-100 text-teal-700",
      amber: "bg-amber-100 text-amber-700", red: "bg-red-100 text-red-700", green: "bg-green-100 text-green-700",
    },
  },
  defaultVariants: { tone: "neutral" },
});
const DOT: Record<string, string> = { neutral: "bg-slate-400", blue: "bg-blue-600", teal: "bg-teal-600", amber: "bg-amber-600", red: "bg-red-600", green: "bg-green-600" };

export type Tone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> { dot?: boolean }

export function Badge({ className, tone, dot, children, ...p }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...p}>{dot && <span aria-hidden className={cn("size-1.5 rounded-full", DOT[tone ?? "neutral"])} />}{children}</span>;
}
