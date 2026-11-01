// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { clientMeta } from "@/lib/auth/session";
import { reviewAnomaly, reviewConflict } from "@/lib/analysis/review";

export const dynamic = "force-dynamic";
const schema = z.object({ type: z.enum(["anomaly", "conflict"]), id: z.string().uuid(), status: z.enum(["UNDER_REVIEW", "CONFIRMED", "DISMISSED"]), note: z.string().max(500).default("") }).strict();
/** POST /api/v1/alerts/review : record a human decision on an alert. Regional officers act only within their region. */
export const POST = apiRoute({ permission: "alerts:review", schema,
  handler: async ({ user, input, requestId }) => { const meta = { ipHash: (await clientMeta()).ipHash }; const r = input.type === "anomaly" ? await reviewAnomaly(user, input.id, input.status, input.note, meta) : await reviewConflict(user, input.id, input.status, input.note, meta); return r.ok ? { data: { saved: true } } : fail("NOT_FOUND", r.error, 404, requestId); } });
