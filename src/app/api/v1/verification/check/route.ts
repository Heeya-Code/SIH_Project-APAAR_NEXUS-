// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { clientMeta } from "@/lib/auth/session";
import { checkCredential } from "@/lib/consent/service";

export const dynamic = "force-dynamic";
/** POST /api/v1/verification/check : resolve a verification code or scanned QR. Checks signature, expiry, revocation and consent. */
export const POST = apiRoute({ permission: "verification:check", schema: z.object({ code: z.string().min(4).max(300), method: z.enum(["QR_SCAN", "CREDENTIAL_ID"]).default("CREDENTIAL_ID") }).strict(),
  handler: async ({ user, input }) => ({ data: await checkCredential(user, input.code, input.method, { ipHash: (await clientMeta()).ipHash }) }) });
