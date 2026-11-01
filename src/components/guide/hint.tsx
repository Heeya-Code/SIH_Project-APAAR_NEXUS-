// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Contextual help: a small question-mark that explains a field or term in plain words. Keyboard accessible. */
export function Hint({ text, label = "More information" }: { text: string; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><button type="button" aria-label={`${label}: ${text}`} className="inline-grid size-4 translate-y-px place-items-center rounded-full text-slate-500 hover:text-navy-900"><CircleHelp className="size-3.5" aria-hidden /></button></TooltipTrigger>
      <TooltipContent className="max-w-[260px] leading-relaxed">{text}</TooltipContent>
    </Tooltip>
  );
}
