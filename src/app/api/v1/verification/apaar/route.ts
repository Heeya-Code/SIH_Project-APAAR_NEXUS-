// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { runApaarVerification } from "@/lib/verification/service";

export const dynamic = "force-dynamic";

const realDate = (s: string) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

const schema = z.object({
  apaarId: z.string().trim().min(1, "Enter an APAAR ID").max(40, "APAAR ID is too long"),
  fullName: z.string().trim().min(1).max(120).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD").refine(realDate, "Not a real date").optional(),
}).strict();

/** POST /api/v1/verification/apaar : check one APAAR ID through the configured verification provider. */
export const POST = apiRoute({
  permission: "verification:apaar",
  schema,
  rateLimit: { name: "apaar-verify", limit: 30, windowMs: 10 * 60_000 },
  handler: async ({ user, input, requestId }) => ({ data: await runApaarVerification(user, input, requestId) }),
});
