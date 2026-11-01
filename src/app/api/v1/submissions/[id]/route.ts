// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiGet } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { getSubmissionDetail } from "@/lib/queries/submissions";

export const dynamic = "force-dynamic";
const q = z.object({ category: z.enum(["DUPLICATE", "APAAR", "INTAKE", "DATA", "CROSS_INSTITUTION"]).optional(), outcome: z.enum(["VALID", "WARNING", "REQUIRES_REVIEW", "REJECTED"]).optional(), page: z.coerce.number().int().min(1).default(1) });
/** GET /api/v1/submissions/{id}?category=&outcome=&page= : validation results with row-level explanations. */
export const GET = apiGet({ permission: "submissions:view", handler: async ({ user, url, params, requestId }) => {
  const id = z.string().uuid().safeParse(params.id); const p = q.safeParse(Object.fromEntries(url.searchParams));
  if (!id.success || !p.success) return fail("VALIDATION_FAILED", "The request contains invalid fields.", 422, requestId);
  const d = await getSubmissionDetail(user, id.data, { ...p.data, pageSize: 50 });
  if (!d) return fail("NOT_FOUND", "That submission was not found.", 404, requestId);
  return { data: { id: d.sub.id, version: d.sub.version, status: d.sub.status, academicYear: d.sub.academicYear, totals: { rows: d.sub.rowCount, valid: d.sub.validCount, warnings: d.sub.warningCount, requiresReview: d.sub.reviewCount, rejected: d.sub.rejectedCount }, summary: d.notes, total: d.total, page: p.data.page, rows: d.rows, submissionLevelIssues: d.subIssues } };
} });
