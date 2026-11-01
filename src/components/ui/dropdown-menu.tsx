// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import * as React from "react";
import * as D from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = D.Root;
export const DropdownMenuTrigger = D.Trigger;
export const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof D.Content>, React.ComponentPropsWithoutRef<typeof D.Content>>(({ className, sideOffset = 8, ...p }, ref) => (
  <D.Portal><D.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 min-w-56 animate-pop-in rounded-card border border-line bg-white p-1.5 shadow-pop", className)} {...p} /></D.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";
export const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof D.Item>, React.ComponentPropsWithoutRef<typeof D.Item>>(({ className, ...p }, ref) => (
  <D.Item ref={ref} className={cn("flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-navy-900 outline-none data-[highlighted]:bg-navy-900/5 [&_svg]:size-4 [&_svg]:text-slate-500", className)} {...p} />
));
DropdownMenuItem.displayName = "DropdownMenuItem";
export const DropdownMenuLabel = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("px-2.5 py-2", className)} {...p} />;
export const DropdownMenuSeparator = ({ className }: { className?: string }) => <D.Separator className={cn("-mx-1.5 my-1.5 h-px bg-line", className)} />;
