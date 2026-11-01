// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { apiGet, fileResponse } from "@/lib/api/route";
import { sampleCsv, templateCsv } from "@/lib/submissions/spec";

export const dynamic = "force-dynamic";
/** GET /api/v1/templates/students[?sample=1] : the blank CSV template, or a two-row fictional sample. */
export const GET = apiGet({ permission: "submissions:create", handler: async ({ url, requestId }) => {
  const sample = url.searchParams.get("sample") === "1";
  return fileResponse(sample ? sampleCsv() : templateCsv(), sample ? "student-data-sample.csv" : "student-data-template.csv", "text/csv; charset=utf-8", requestId);
} });
