// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiGet, fileResponse } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { audit } from "@/lib/audit";
import { institutionPdf } from "@/lib/reports";
import { isValidAY } from "@/lib/years";

export const dynamic = "force-dynamic";
/** GET /api/v1/reports/institution/{id}?ay= : a PDF summary for one institution (Trust Score, seat ledger, alerts). */
export const GET = apiGet({ permission: "reports:export", handler: async ({ user, url, params, requestId }) => {
  const id = z.string().uuid().safeParse(params.id), ay = url.searchParams.get("ay") ?? "2026-27";
  if (!id.success || !isValidAY(ay)) return fail("VALIDATION_FAILED", "The request contains invalid fields.", 422, requestId);
  const pdf = await institutionPdf(user, id.data, ay); if (!pdf) return fail("NOT_FOUND", "That institution was not found in your scope.", 404, requestId);
  await audit({ actor: user, action: "REPORT_EXPORTED", institutionId: id.data, metadata: { report: "institution", ay, format: "pdf" } });
  return fileResponse(Buffer.from(pdf), `institution-report-${ay}.pdf`, "application/pdf", requestId);
} });
