// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { FileUp, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { dateTime, fmt } from "@/lib/format";
import { SUBMISSION_STATUS } from "@/lib/labels";
import { listSubmissions } from "@/lib/queries/submissions";

export const metadata = { title: "Submissions" };
export const dynamic = "force-dynamic";

export default async function Submissions() {
  const user = await requirePermission("submissions:view");
  const subs = await listSubmissions(user);
  return (
    <>
      <PageHeader title="Submission history" subtitle="Every file you have sent, newest first. Open one to see what we found, row by row." actions={<Button asChild><Link href="/institution/upload"><FileUp aria-hidden />Upload a file</Link></Button>} />
      <Panel flush={subs.length > 0} title={`${subs.length} submission${subs.length === 1 ? "" : "s"}`}>
        {subs.length === 0 ? <Empty icon={Inbox} title="You have not uploaded anything yet">Download the template in the Upload centre, add your students and upload it. We will check it and tell you what to fix.</Empty> : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Year</TableHead><TableHead>Version</TableHead><TableHead>File</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Rows</TableHead><TableHead className="text-right">Flagged</TableHead><TableHead className="text-right">To correct</TableHead><TableHead>Uploaded</TableHead></TableRow></TableHeader>
            <TableBody>{subs.map((s) => { const st = SUBMISSION_STATUS[s.status]; return (
              <TableRow key={s.id}>
                <TableCell>{s.academicYear}</TableCell><TableCell>v{s.version}</TableCell>
                <TableCell><Link href={`/institution/submissions/${s.id}`} className="text-blue-600 underline-offset-2 hover:underline">{s.fileName ?? "file"}</Link></TableCell>
                <TableCell><Badge tone={st.tone} dot>{st.label}</Badge></TableCell>
                <TableCell className="tnum text-right">{fmt(s.rowCount)}</TableCell><TableCell className="tnum text-right">{fmt(s.reviewCount)}</TableCell>
                <TableCell className={`tnum text-right ${s.rejectedCount ? "font-medium text-red-700" : ""}`}>{fmt(s.rejectedCount)}</TableCell><TableCell className="whitespace-nowrap text-slate-600">{dateTime(s.createdAt)}</TableCell>
              </TableRow>); })}</TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
