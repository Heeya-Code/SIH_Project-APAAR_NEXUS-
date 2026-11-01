// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { clientMeta } from "@/lib/auth/session";
import { createRequest } from "@/lib/consent/service";

export const dynamic = "force-dynamic";
const schema = z.object({ studentCode: z.string().min(5).max(20), purpose: z.string().max(80), fields: z.array(z.string().max(30)).min(1).max(8) }).strict();
/** POST /api/v1/consent/requests : a verifier asks a student for permission. The student must approve before anything is shared. */
export const POST = apiRoute({ permission: "consent:request", schema,
  handler: async ({ user, input, requestId }) => { const r = await createRequest(user, input, { ipHash: (await clientMeta()).ipHash }); return r.ok ? { data: { reference: r.reference, requestExpiresAt: r.requestExpiresAt }, status: 201 } : fail("VALIDATION_FAILED", r.error, 422, requestId); } });
