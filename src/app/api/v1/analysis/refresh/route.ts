// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { audit } from "@/lib/audit";
import { refreshAnalysis } from "@/lib/analysis/service";

export const dynamic = "force-dynamic";
/** POST /api/v1/analysis/refresh : re-run conflict detection and anomaly analysis over current records (idempotent). */
export const POST = apiRoute({ permission: "alerts:review", schema: z.object({}).strict(), rateLimit: { name: "analysis", limit: 6, windowMs: 10 * 60_000 },
  handler: async ({ user }) => { const r = await refreshAnalysis(); await audit({ actor: user, action: "ANALYSIS_REFRESHED", metadata: { alertsCreated: r.alertsCreated, alertsRemoved: r.alertsRemoved, conflictsCreated: r.conflicts.created } }); return { data: { alertsCreated: r.alertsCreated, alertsRemoved: r.alertsRemoved, conflictsCreated: r.conflicts.created, institutionYearsScreened: r.screened } }; } });
