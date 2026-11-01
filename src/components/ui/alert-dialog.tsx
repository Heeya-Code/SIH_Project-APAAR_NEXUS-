// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import * as React from "react";
import * as A from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export const AlertDialog = A.Root;
export const AlertDialogTrigger = A.Trigger;
export const AlertDialogContent = React.forwardRef<React.ElementRef<typeof A.Content>, React.ComponentPropsWithoutRef<typeof A.Content>>(({ className, ...p }, ref) => (
  <A.Portal>
    <A.Overlay className="fixed inset-0 z-40 animate-fade-in bg-navy-950/50" />
    <A.Content ref={ref} className={cn("fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 animate-pop-in rounded-card border border-line bg-white p-6 shadow-pop outline-none", className)} {...p} />
  </A.Portal>
));
AlertDialogContent.displayName = "AlertDialogContent";
export const AlertDialogTitle = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof A.Title>) => <A.Title className={cn("font-serif text-xl text-navy-900", className)} {...p} />;
export const AlertDialogDescription = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof A.Description>) => <A.Description className={cn("mt-2 text-sm text-slate-600", className)} {...p} />;
export const AlertDialogFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("mt-6 flex justify-end gap-2", className)} {...p} />;
export const AlertDialogCancel = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof A.Cancel>) => <A.Cancel className={cn(buttonVariants({ variant: "secondary" }), className)} {...p} />;
export const AlertDialogAction = ({ className, variant = "destructive", ...p }: React.ComponentPropsWithoutRef<typeof A.Action> & { variant?: "destructive" | "default" }) => <A.Action className={cn(buttonVariants({ variant }), className)} {...p} />;
