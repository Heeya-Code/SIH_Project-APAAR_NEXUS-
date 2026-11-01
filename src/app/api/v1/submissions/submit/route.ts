// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { clientMeta } from "@/lib/auth/session";
import { submitValidRows } from "@/lib/submissions/service";

export const dynamic = "force-dynamic";
/** POST /api/v1/submissions/submit : store the rows that passed. Held rows stay for correction. Safe to repeat. */
export const POST = apiRoute({ permission: "submissions:create", schema: z.object({ submissionId: z.string().uuid() }).strict(), rateLimit: { name: "submit", limit: 20, windowMs: 10 * 60_000 },
  handler: async ({ user, input, requestId }) => { const r = await submitValidRows(user, input.submissionId, { ipHash: (await clientMeta()).ipHash }); return r.ok ? { data: r } : fail("VALIDATION_FAILED", r.error, 409, requestId); } });
