// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollRegion } from "@/components/ui/scroll-region";

export const Table = ({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <ScrollRegion className="w-full overflow-x-auto"><table className={cn("w-full caption-bottom text-left text-sm", className)} {...p} /></ScrollRegion>
);
export const TableHeader = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className={cn("border-b border-line bg-paper/70 text-xs text-slate-500", className)} {...p} />;
export const TableBody = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody className={cn("divide-y divide-line", className)} {...p} />;
export const TableRow = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => <tr className={cn("transition-colors hover:bg-paper/60", className)} {...p} />;
export const TableHead = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className={cn("px-4 py-2.5 font-medium first:pl-5 last:pr-5", className)} {...p} />;
export const TableCell = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn("px-4 py-3 align-top first:pl-5 last:pr-5", className)} {...p} />;
