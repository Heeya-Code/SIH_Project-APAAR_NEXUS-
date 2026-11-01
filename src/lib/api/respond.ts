// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHENTICATED" | "FORBIDDEN" | "CSRF_REJECTED" | "RATE_LIMITED" | "INVALID_JSON"
  | "UNSUPPORTED_MEDIA_TYPE" | "PAYLOAD_TOO_LARGE" | "VALIDATION_FAILED" | "NOT_FOUND" | "INTERNAL";

// Every endpoint answers in exactly one of these two shapes.
export type ApiSuccess<T> = { ok: true; data: T; meta: { requestId: string } };
export type ApiFailure = { ok: false; error: { code: ApiErrorCode; message: string; details?: unknown }; meta: { requestId: string } };

const base = (requestId: string, extra?: Record<string, string>) => ({ "x-request-id": requestId, "cache-control": "no-store", ...extra });

export function ok<T>(data: T, requestId: string, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data, meta: { requestId } }, { status, headers: base(requestId) });
}

export function fail(code: ApiErrorCode, message: string, status: number, requestId: string, details?: unknown, headers?: Record<string, string>) {
  return NextResponse.json<ApiFailure>({ ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) }, meta: { requestId } }, { status, headers: base(requestId, headers) });
}
