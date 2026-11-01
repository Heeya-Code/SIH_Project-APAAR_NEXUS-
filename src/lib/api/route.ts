// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// One wrapper for every API route, so authentication, permission, CSRF, rate limiting,
// validation, error shape and audit behave identically everywhere.
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { audit } from "@/lib/audit";
import { ForbiddenError, can, type Permission } from "@/lib/auth/permissions";
import { getAuth, clientMeta, type AuthUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok } from "./respond";

const DEFAULT_BODY_BYTES = 16 * 1024;

export type ApiContext<S extends z.ZodType> = { user: AuthUser; input: z.infer<S>; requestId: string };
export type ApiResult = { data: unknown; status?: number };
export type HandlerResult = ApiResult | Response;

export function apiRoute<S extends z.ZodType>(opts: {
  /** null = any signed-in user (for example reading your own notifications) */
  permission: Permission | null;
  schema: S;
  maxBodyBytes?: number;
  rateLimit?: { limit: number; windowMs: number; name: string };
  handler: (ctx: ApiContext<S>) => Promise<HandlerResult>;
}) {
  return async function POST(req: Request): Promise<Response> {
    const requestId = randomUUID();
    try {
      // CSRF: session cookies are SameSite=Lax; additionally refuse cross-origin browser requests and non-JSON bodies.
      const origin = req.headers.get("origin");
      if (origin) {
        let sameOrigin = false;
        try { sameOrigin = new URL(origin).host === req.headers.get("host"); } catch { /* malformed origin */ }
        if (!sameOrigin) return fail("CSRF_REJECTED", "Cross-origin requests are not allowed.", 403, requestId);
      }
      if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"))
        return fail("UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json.", 415, requestId);

      const user = await getAuth();
      if (!user) return fail("UNAUTHENTICATED", "Sign in to use this endpoint.", 401, requestId);

      const meta = await clientMeta();
      if (opts.permission && !can(user.role, opts.permission)) {
        await audit({ actor: user, action: "ACCESS_DENIED", outcome: "DENIED", institutionId: user.institutionId, ipHash: meta.ipHash, metadata: { permission: opts.permission, via: "api", requestId } });
        return fail("FORBIDDEN", "Your role is not permitted to use this endpoint.", 403, requestId);
      }

      if (opts.rateLimit) {
        const rl = rateLimit(`api:${opts.rateLimit.name}:${user.id}`, opts.rateLimit.limit, opts.rateLimit.windowMs);
        if (!rl.ok) {
          await audit({ actor: user, action: "API_RATE_LIMITED", outcome: "DENIED", institutionId: user.institutionId, ipHash: meta.ipHash, metadata: { endpoint: opts.rateLimit.name, requestId } });
          return fail("RATE_LIMITED", `Too many requests. Try again in ${rl.retryAfterSec} seconds.`, 429, requestId, undefined, { "retry-after": String(rl.retryAfterSec) });
        }
      }

      const text = await req.text();
      if (Buffer.byteLength(text) > (opts.maxBodyBytes ?? DEFAULT_BODY_BYTES)) return fail("PAYLOAD_TOO_LARGE", "The request body is too large.", 413, requestId);
      let json: unknown;
      try { json = JSON.parse(text); } catch { return fail("INVALID_JSON", "The request body is not valid JSON.", 400, requestId); }

      const parsed = opts.schema.safeParse(json);
      if (!parsed.success) {
        // Report field paths and messages only; never echo submitted values (they may be identifiers).
        const details = parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
        return fail("VALIDATION_FAILED", "The request contains invalid fields.", 422, requestId, details);
      }

      const result = await opts.handler({ user, input: parsed.data, requestId });
      if (result instanceof Response) return result;
      return ok(result.data, requestId, result.status ?? 200);
    } catch (e) {
      if (e instanceof ForbiddenError) return fail("FORBIDDEN", "Your role is not permitted to do this.", 403, requestId);
      console.error(`[api] ${requestId} unhandled ${e instanceof Error ? e.name : "error"}`); // never log messages: they may contain PII
      return fail("INTERNAL", "Something went wrong. Quote the request ID when reporting this.", 500, requestId);
    }
  };
}

export type GetContext = { user: AuthUser; url: URL; requestId: string; params: Record<string, string> };

/** Read-only endpoints: same authentication, permission and error behaviour, no body. */
export function apiGet(opts: { permission: Permission; handler: (ctx: GetContext) => Promise<HandlerResult> }) {
  return async function GET(req: Request, routeCtx?: { params?: Promise<Record<string, string>> }): Promise<Response> {
    const requestId = randomUUID();
    try {
      const user = await getAuth();
      if (!user) return fail("UNAUTHENTICATED", "Sign in to use this endpoint.", 401, requestId);
      if (!can(user.role, opts.permission)) {
        const meta = await clientMeta();
        await audit({ actor: user, action: "ACCESS_DENIED", outcome: "DENIED", institutionId: user.institutionId, ipHash: meta.ipHash, metadata: { permission: opts.permission, via: "api", requestId } });
        return fail("FORBIDDEN", "Your role is not permitted to use this endpoint.", 403, requestId);
      }
      const result = await opts.handler({ user, url: new URL(req.url), requestId, params: (await routeCtx?.params) ?? {} });
      if (result instanceof Response) return result;
      return ok(result.data, requestId, result.status ?? 200);
    } catch (e) {
      if (e instanceof ForbiddenError) return fail("FORBIDDEN", "Your role is not permitted to do this.", 403, requestId);
      console.error(`[api] ${requestId} unhandled ${e instanceof Error ? e.name : "error"}`);
      return fail("INTERNAL", "Something went wrong. Quote the request ID when reporting this.", 500, requestId);
    }
  };
}

export function fileResponse(body: BodyInit, filename: string, type: string, requestId: string) {
  return new Response(body, { headers: { "content-type": type, "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store", "x-request-id": requestId, "x-content-type-options": "nosniff" } });
}
