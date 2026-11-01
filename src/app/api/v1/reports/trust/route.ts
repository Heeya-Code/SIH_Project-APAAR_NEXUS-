// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { apiGet, fileResponse } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { audit } from "@/lib/audit";
import { trustCsv } from "@/lib/reports";
import { isValidAY } from "@/lib/years";

export const dynamic = "force-dynamic";
/** GET /api/v1/reports/trust?ay= : CSV of Trust Scores (a prototype metric) with component scores and the weights used. */
export const GET = apiGet({ permission: "reports:export", handler: async ({ user, url, requestId }) => {
  const ay = url.searchParams.get("ay") ?? "2026-27"; if (!isValidAY(ay)) return fail("VALIDATION_FAILED", "Invalid academic year.", 422, requestId);
  await audit({ actor: user, action: "REPORT_EXPORTED", institutionId: user.institutionId, metadata: { report: "trust", ay, format: "csv" } });
  return fileResponse(await trustCsv(user, ay), `trust-scores-${ay}.csv`, "text/csv; charset=utf-8", requestId);
} });
