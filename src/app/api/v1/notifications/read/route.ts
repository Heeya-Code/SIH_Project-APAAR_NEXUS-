// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
/** POST /api/v1/notifications/read : mark one notification (or all) as read. Only your own can be touched. */
export const POST = apiRoute({ permission: null, schema: z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).strict(),
  handler: async ({ user, input }) => ({ data: { updated: (await db.notification.updateMany({ where: { userId: user.id, readAt: null, ...(input.id ? { id: input.id } : {}) }, data: { readAt: new Date() } })).count } }) });
