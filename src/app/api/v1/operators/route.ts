// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
/** POST /api/v1/operators : an institution admin creates a data operator for their own institution. The temporary password is shown once. */
export const POST = apiRoute({ permission: "operators:manage", schema: z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email().max(120) }).strict(), rateLimit: { name: "operators", limit: 10, windowMs: 60 * 60_000 },
  handler: async ({ user, input, requestId }) => {
    if (!user.institutionId) return fail("FORBIDDEN", "Institution account required.", 403, requestId);
    if (await db.user.findUnique({ where: { email: input.email } })) return fail("VALIDATION_FAILED", "An account with that email already exists.", 409, requestId);
    const temporaryPassword = Array.from({ length: 14 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
    const u = await db.user.create({ data: { email: input.email, name: input.name, role: "DATA_ENTRY_OPERATOR", institutionId: user.institutionId, passwordHash: await bcrypt.hash(temporaryPassword, 12), isDemo: false } });
    await audit({ actor: user, action: "OPERATOR_CREATED", entityType: "User", entityId: u.id, institutionId: user.institutionId });
    return { data: { id: u.id, email: u.email, temporaryPassword, note: "Shown once. Ask the operator to keep it safe." }, status: 201 };
  } });
