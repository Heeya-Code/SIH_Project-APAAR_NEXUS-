// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-navy-900/[0.07]", className)} {...p} />;
}
