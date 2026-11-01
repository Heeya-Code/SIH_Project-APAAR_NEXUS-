// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { FIELD_KEYS, FIELDS, PURPOSES } from "@/lib/credentials/claims";
import { RequestForm } from "./request-form";

export const metadata = { title: "New verification request" };
export const dynamic = "force-dynamic";

export default async function NewRequest() {
  await requirePermission("consent:request");
  return (
    <>
      <PageHeader title="New verification request" subtitle="Ask a student for permission to confirm their enrolment. Ask only for what you need: the student sees your request, your purpose and every detail you choose, and decides." />
      <RequestForm purposes={[...PURPOSES]} fields={FIELD_KEYS.map((k) => ({ key: k, label: FIELDS[k].label, plain: FIELDS[k].plain, personal: FIELDS[k].personal }))} />
    </>
  );
}
