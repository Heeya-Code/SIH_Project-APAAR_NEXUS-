// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ACADEMIC_YEARS } from "@/lib/years";

/** Segmented control of plain links: works without JavaScript and is shareable by URL. */
export function YearSwitcher({ basePath, current }: { basePath: string; current: string }) {
  return (
    <nav aria-label="Academic year" className="flex max-w-full overflow-x-auto rounded-control border border-line-strong bg-white p-0.5 shadow-card text-[13px]">
      {ACADEMIC_YEARS.map((y) => (
        <Link key={y} href={`${basePath}?ay=${y}`} aria-current={y === current ? "page" : undefined}
          className={cn("whitespace-nowrap rounded-[6px] px-3 py-1.5 transition-colors", y === current ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-navy-900/5 hover:text-navy-900")}>{y}</Link>
      ))}
    </nav>
  );
}
