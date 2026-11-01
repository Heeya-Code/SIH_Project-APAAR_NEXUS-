// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { demoMode, resetForActor } from "@/lib/demo";

export const dynamic = "force-dynamic";
/** POST /api/v1/demo/reset : DEMO ONLY. Removes this institution's 2026-27 upload so the demonstration can be repeated. */
export const POST = apiRoute({ permission: "operators:manage", schema: z.object({}).strict(), rateLimit: { name: "demo-reset", limit: 5, windowMs: 10 * 60_000 },
  handler: async ({ user, requestId }) => demoMode() ? { data: await resetForActor(user) } : fail("FORBIDDEN", "Demo reset is switched off on this installation.", 403, requestId) });
