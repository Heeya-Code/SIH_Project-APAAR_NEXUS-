// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { apiGet, fileResponse } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { audit } from "@/lib/audit";
import { seatLedgerCsv } from "@/lib/reports";
import { isValidAY } from "@/lib/years";

export const dynamic = "force-dynamic";
/** GET /api/v1/reports/seat-ledger?ay=&region= : CSV of programme-level seats, limited to what your role may see. */
export const GET = apiGet({ permission: "reports:export", handler: async ({ user, url, requestId }) => {
  const ay = url.searchParams.get("ay") ?? "2026-27", region = url.searchParams.get("region") ?? undefined;
  if (!isValidAY(ay) || (region && !["NORTH", "SOUTH", "EAST", "WEST", "CENTRAL", "NORTH_EAST"].includes(region))) return fail("VALIDATION_FAILED", "The request contains invalid fields.", 422, requestId);
  await audit({ actor: user, action: "REPORT_EXPORTED", institutionId: user.institutionId, metadata: { report: "seat-ledger", ay, region: region ?? "all", format: "csv" } });
  return fileResponse(await seatLedgerCsv(user, ay, region), `seat-ledger-${ay}${region ? `-${region.toLowerCase()}` : ""}.csv`, "text/csv; charset=utf-8", requestId);
} });
