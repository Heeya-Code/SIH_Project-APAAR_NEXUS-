// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;
export const SheetTitle = D.Title;
export const SheetDescription = D.Description;
export const SheetContent = React.forwardRef<React.ElementRef<typeof D.Content>, React.ComponentPropsWithoutRef<typeof D.Content>>(({ className, children, ...p }, ref) => (
  <D.Portal>
    <D.Overlay className="fixed inset-0 z-40 animate-fade-in bg-navy-950/50" />
    <D.Content ref={ref} className={cn("fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] animate-slide-in-left bg-navy-900 shadow-pop outline-none", className)} {...p}>{children}</D.Content>
  </D.Portal>
));
SheetContent.displayName = "SheetContent";
