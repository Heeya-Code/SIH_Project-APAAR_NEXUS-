// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { ROLE_META } from "@/lib/auth/permissions";
import type { Role } from "@/generated/prisma/client";

export const metadata = { title: "Help and guidance" };
const GUIDES: Record<Role, { title: string; steps: string[] }> = {
  SUPER_ADMIN: { title: "Looking after the platform", steps: ["Platform overview shows accounts, open alerts and recent security activity.", "Users and access lets you revoke sessions or deactivate an account. Both are recorded.", "Security and audit lets you check that the audit trail has not been altered (Verify audit chain).", "Configuration shows the settings and thresholds in force. Thresholds are illustrative prototype defaults."] },
  AICTE_ADMIN: { title: "Monitoring enrolment nationally", steps: ["The Command Centre summarises seats, identity quality and what needs attention for a chosen year.", "Live seat ledger compares approved intake with seats actually filled, programme by programme.", "Trust scores explain how reliable each institution's data looks, and what would improve it.", "Alerts and conflicts lists unusual patterns and possible double enrolments. Open one to read why it was raised, then record your decision.", "Reports exports what you can see as CSV or PDF."] },
  REGIONAL_OFFICER: { title: "Watching your region", steps: ["Everything you see is limited to your region. Other regions never appear.", "Use the seat ledger and regional analytics to compare institutions in your region.", "Review alerts for institutions in your region and record a decision with a short note.", "Reports exports only your region's data."] },
  INSTITUTION_ADMIN: { title: "Submitting your student data", steps: ["Open the Upload centre and download the template.", "Add one row per student, then drag the file into the upload area and press Check my file.", "Read the results. Each problem says what happened and how to fix it. Download the correction report if you prefer to work in Excel.", "Press Submit to send the valid rows. Rows with errors stay on hold and nothing is deleted.", "Fix the held rows and upload the corrected file. Records already received are recognised and not added twice.", "Data operators lets you add colleagues who can upload for you."] },
  DATA_ENTRY_OPERATOR: { title: "Preparing and uploading records", steps: ["Download the template from the Upload centre and add your students.", "Upload the file and review the results.", "Download the correction report, fix the rows and upload again.", "Submit the valid rows. Your administrator can see the same history."] },
  STUDENT: { title: "Controlling who can verify you", steps: ["My profile shows your own record and a code you can share so someone can ask to verify you.", "Verification requests lists who is asking, why, and exactly which details. Nothing is shared unless you approve.", "You choose which details to share and for how long. You can decline.", "My QR verification shows approved records as QR codes. Withdraw consent at any time and the code stops working.", "Consent history keeps a permanent record of every request and your decision."] },
  VERIFIER: { title: "Verifying an enrolment with consent", steps: ["New request: enter the student's code, choose the purpose and only the details you need.", "Wait for the student to approve. You are notified.", "Scan or enter a code: enter the verification code or scan the student's QR. You see only what they approved.", "The result tells you if the record is genuine, current, expired, withdrawn or altered.", "Request history lists everything you have asked and checked."] },
};
const TERMS: [string, string][] = [["APAAR ID", "A student's lifelong academic ID. In this prototype it is checked for format and for duplicates, but not against any official government system."], ["Approved intake", "The number of seats approved for a programme."], ["Supernumerary seats", "Extra seats for categories such as NRI, OCI, foreign nationals and fee-waiver students. They are counted separately from approved intake."], ["Trust Score", "A prototype measure of how reliable an institution's submitted data looks. It is not an official AICTE rating."], ["Conflict", "A student who appears to be enrolled at two institutions at once. It is a question for a human to review, not an accusation."], ["Simulated registry", "A demonstration stand-in for an APAAR verification service. It is not connected to any real system."]];

export default async function Help() {
  const user = await requireUser(), g = GUIDES[user.role];
  return (
    <>
      <PageHeader title="Help and guidance" subtitle={`A short guide for ${ROLE_META[user.role].label}s, in plain words.`} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={g.title}><ol className="space-y-3">{g.steps.map((s, i) => <li key={i} className="flex gap-3 text-sm text-slate-700"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol></Panel>
        <Panel title="Words you may see"><dl className="space-y-3">{TERMS.map(([t, d]) => <div key={t}><dt className="text-sm font-medium text-navy-900">{t}</dt><dd className="text-[13px] text-slate-600">{d}</dd></div>)}</dl></Panel>
      </div>
      <p className="mt-6 text-sm text-slate-600">Something not working? Note the request ID shown with any error message and your administrator can trace it in the audit trail. Back to <Link href={ROLE_META[user.role].home} className="text-blue-600 underline-offset-2 hover:underline">your workspace</Link>.</p>
    </>
  );
}
