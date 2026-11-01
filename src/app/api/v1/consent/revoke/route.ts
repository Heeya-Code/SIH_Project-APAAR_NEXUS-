// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { clientMeta } from "@/lib/auth/session";
import { revoke } from "@/lib/consent/service";

export const dynamic = "force-dynamic";
/** POST /api/v1/consent/revoke : the student withdraws an approved verification; its code stops working immediately. */
export const POST = apiRoute({ permission: "consent:decide", schema: z.object({ id: z.string().uuid() }).strict(),
  handler: async ({ user, input, requestId }) => { const r = await revoke(user, input.id, { ipHash: (await clientMeta()).ipHash }); return r.ok ? { data: { revoked: true } } : fail("VALIDATION_FAILED", r.error, 409, requestId); } });
