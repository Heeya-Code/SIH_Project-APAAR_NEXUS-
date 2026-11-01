// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { Skeleton } from "@/components/ui/skeleton";

function Head({ wide = false }: { wide?: boolean }) {
  return <div className="space-y-2"><Skeleton className="h-8 w-72" /><Skeleton className={wide ? "h-4 w-[30rem] max-w-full" : "h-4 w-96 max-w-full"} /></div>;
}
const Wrap = ({ children }: { children: React.ReactNode }) => <div role="status" aria-label="Loading page" className="space-y-6">{children}<span className="sr-only">Loading…</span></div>;

export function DashboardSkeleton() {
  return (
    <Wrap><Head wide />
      <Skeleton className="h-44 rounded-card" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[136px] rounded-card" />)}</div>
      <Skeleton className="h-80 rounded-card" />
      <div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-[340px] rounded-card" /><Skeleton className="h-[340px] rounded-card" /></div>
    </Wrap>
  );
}
export function TableSkeleton() {
  return <Wrap><Head /><Skeleton className="h-20 rounded-card" /><Skeleton className="h-[460px] rounded-card" /></Wrap>;
}
export function FormSkeleton() {
  return <Wrap><Head /><div className="grid gap-6 lg:grid-cols-[2fr_3fr]"><Skeleton className="h-80 rounded-card" /><Skeleton className="h-80 rounded-card" /></div></Wrap>;
}
export function ProfileSkeleton() {
  return <Wrap><Head /><div className="grid gap-6 lg:grid-cols-[3fr_2fr]"><div className="space-y-6"><Skeleton className="h-52 rounded-card" /><Skeleton className="h-64 rounded-card" /></div><Skeleton className="h-96 rounded-card" /></div></Wrap>;
}
