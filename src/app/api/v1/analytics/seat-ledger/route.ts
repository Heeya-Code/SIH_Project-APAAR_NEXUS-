// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiGet } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { getSeatLedger } from "@/lib/queries/ledger";
import { isValidAY } from "@/lib/years";

export const dynamic = "force-dynamic";
/** GET /api/v1/analytics/seat-ledger?ay=2025-26&region=WEST : programme-level seats, scoped to your role. */
export const GET = apiGet({ permission: "national:view", handler: async ({ user, url, requestId }) => {
  const ay = url.searchParams.get("ay") ?? "2026-27"; const region = z.enum(["NORTH", "SOUTH", "EAST", "WEST", "CENTRAL", "NORTH_EAST"]).optional().safeParse(url.searchParams.get("region") ?? undefined);
  if (!isValidAY(ay) || !region.success) return fail("VALIDATION_FAILED", "The request contains invalid fields.", 422, requestId);
  const rows = (await getSeatLedger(user, ay)).filter((r) => !region.data || r.region === region.data);
  return { data: { academicYear: ay, rows } };
} });
