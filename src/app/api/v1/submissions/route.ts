// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiGet, apiRoute } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { clientMeta } from "@/lib/auth/session";
import { listSubmissions } from "@/lib/queries/submissions";
import { processUpload } from "@/lib/submissions/service";

export const dynamic = "force-dynamic";
const schema = z.object({ academicYear: z.string().max(10), fileName: z.string().max(200), csv: z.string().max(3_000_000) }).strict();

/** POST /api/v1/submissions : validate an uploaded student CSV. Nothing becomes an enrolment until it is submitted. */
export const POST = apiRoute({ permission: "submissions:create", schema, maxBodyBytes: 3_200_000, rateLimit: { name: "upload", limit: 20, windowMs: 10 * 60_000 },
  handler: async ({ user, input, requestId }) => {
    const r = await processUpload(user, input, { ipHash: (await clientMeta()).ipHash });
    return r.ok ? { data: { submissionId: r.submissionId, version: r.version, summary: r.summary }, status: 201 } : fail("VALIDATION_FAILED", r.error, 422, requestId);
  } });

/** GET /api/v1/submissions : your institution's upload history. */
export const GET = apiGet({ permission: "submissions:view", handler: async ({ user }) => ({ data: (await listSubmissions(user)).map((s) => ({ id: s.id, academicYear: s.academicYear, version: s.version, status: s.status, fileName: s.fileName, rows: s.rowCount, valid: s.validCount, warnings: s.warningCount, requiresReview: s.reviewCount, rejected: s.rejectedCount, createdAt: s.createdAt, submittedAt: s.submittedAt })) }) });
