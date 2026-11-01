// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { clientMeta } from "@/lib/auth/session";
import { decide } from "@/lib/consent/service";

export const dynamic = "force-dynamic";
const schema = z.object({ id: z.string().uuid(), decision: z.enum(["APPROVE", "REJECT"]), fields: z.array(z.string().max(30)).max(8).optional(), validDays: z.number().int().optional(), note: z.string().max(300).optional() }).strict();
/** POST /api/v1/consent/decision : the student approves a chosen subset of fields (and a validity period), or declines. */
export const POST = apiRoute({ permission: "consent:decide", schema,
  handler: async ({ user, input, requestId }) => { const r = await decide(user, input, { ipHash: (await clientMeta()).ipHash }); return r.ok ? { data: r } : fail("VALIDATION_FAILED", r.error, 409, requestId); } });
