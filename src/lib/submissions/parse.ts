// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Papa from "papaparse";
import { COLUMNS, MAX_FILE_BYTES, MAX_ROWS, REQUIRED_KEYS } from "./spec";

export type ParsedFile = { ok: true; rows: Record<string, string>[]; extraColumns: string[] } | { ok: false; error: string; technical?: string };

const alias = (h: string) => h.trim().toLowerCase().replace(/^\ufeff/, "").replace(/[\s-]+/g, "_");

/** Turns CSV text into rows keyed by the standard column names. File-level problems return a friendly message. */
export function parseStudentCsv(text: string): ParsedFile {
  if (Buffer.byteLength(text) > MAX_FILE_BYTES) return { ok: false, error: `This file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB. Split it into smaller files and upload them one at a time.` };
  if (!text.trim()) return { ok: false, error: "The file is empty. Download the template, add your student rows and try again." };
  const res = Papa.parse<Record<string, string>>(text.replace(/^\ufeff/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: alias, transform: (v) => v.trim() });
  const headers = (res.meta.fields ?? []).filter(Boolean);
  const missing = REQUIRED_KEYS.filter((k) => !headers.includes(k));
  if (missing.length) {
    const names = missing.map((k) => COLUMNS.find((c) => c.key === k)!.label);
    return { ok: false, error: `The file is missing ${missing.length === 1 ? "a required column" : "required columns"}: ${names.join(", ")}. Download the template and keep its first row (the column names) unchanged.`, technical: `missing: ${missing.join(",")}` };
  }
  const fatal = res.errors.find((e) => e.type === "Quotes");
  if (fatal) return { ok: false, error: `The file could not be read: a quoted value is not closed near row ${(fatal.row ?? 0) + 2}. Check for a stray " character.`, technical: fatal.message };
  if (res.data.length === 0) return { ok: false, error: "The file has column names but no student rows." };
  if (res.data.length > MAX_ROWS) return { ok: false, error: `This file has ${res.data.length.toLocaleString("en-IN")} rows; the limit is ${MAX_ROWS.toLocaleString("en-IN")} per upload. Split it and upload in parts.` };
  const known = new Set(COLUMNS.map((c) => c.key));
  return { ok: true, rows: res.data.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => known.has(k)).map(([k, v]) => [k, String(v ?? "")]))), extraColumns: headers.filter((h) => !known.has(h)) };
}
