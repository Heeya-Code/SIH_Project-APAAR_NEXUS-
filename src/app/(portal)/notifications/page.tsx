// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { BellOff } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { MarkAllRead } from "./mark-read";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function Notifications() {
  const user = await requireUser();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60 });
  const unread = items.filter((i) => !i.readAt).length;
  return (
    <>
      <PageHeader title="Notifications" subtitle="Things that happened that you may need to act on." actions={unread > 0 ? <MarkAllRead /> : undefined} />
      <Panel flush={items.length > 0} title={unread ? `${unread} unread` : "All caught up"}>
        {items.length === 0 ? <Empty icon={BellOff} title="Nothing here yet">When a submission is checked, a request arrives or an alert needs review, it will appear here.</Empty> : (
          <ul className="divide-y divide-line">{items.map((n) => (
            <li key={n.id} className="flex gap-3 px-5 py-4"><span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-blue-600"}`} />
              <div className="min-w-0 flex-1"><p className={`text-sm ${n.readAt ? "text-slate-600" : "font-medium text-navy-900"}`}>{n.title}{!n.readAt && <span className="sr-only"> (unread)</span>}</p><p className="mt-0.5 text-[13px] text-slate-600">{n.body}</p><p className="mt-1 text-xs text-slate-500">{dateTime(n.createdAt)}</p></div>
              {n.link && <Link href={n.link} className="shrink-0 self-center text-sm text-blue-600 underline-offset-2 hover:underline">Open</Link>}</li>))}</ul>
        )}
      </Panel>
    </>
  );
}
