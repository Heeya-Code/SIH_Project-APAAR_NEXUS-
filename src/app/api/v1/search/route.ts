// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { apiGet } from "@/lib/api/route";
import { db } from "@/lib/db";
import { institutionScope } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
/** GET /api/v1/search?q= : institutions in your scope whose name, city or state matches (for the command palette). */
export const GET = apiGet({ permission: "national:view", handler: async ({ user, url }) => {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return { data: { institutions: [] } };
  const rows = await db.institution.findMany({ where: { ...institutionScope(user), OR: [{ name: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { stateName: { contains: q, mode: "insensitive" } }] }, orderBy: { name: "asc" }, take: 8, select: { id: true, name: true, city: true, stateName: true } });
  return { data: { institutions: rows } };
} });
