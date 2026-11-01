// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import * as React from "react";
import * as T from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <T.Provider delayDuration={250} skipDelayDuration={100}>{children}</T.Provider>;
export const Tooltip = T.Root;
export const TooltipTrigger = T.Trigger;
export const TooltipContent = React.forwardRef<React.ElementRef<typeof T.Content>, React.ComponentPropsWithoutRef<typeof T.Content>>(({ className, sideOffset = 8, ...p }, ref) => (
  <T.Portal><T.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 max-w-xs animate-pop-in rounded-md bg-navy-900 px-2.5 py-1.5 text-xs text-white shadow-pop", className)} {...p} /></T.Portal>
));
TooltipContent.displayName = "TooltipContent";
