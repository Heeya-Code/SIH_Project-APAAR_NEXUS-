// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
const nf = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "–" : nf.format(n));
export const pct = (r: number | null | undefined, digits = 0) => (r === null || r === undefined ? "–" : `${(r * 100).toFixed(digits)}%`);
export const dateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(d));
export const dateOnly = (d: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(d));
export const TYPE_LABEL: Record<string, string> = {
  GOVERNMENT: "Government", GOVT_AIDED: "Government-aided", PRIVATE: "Private", UNIVERSITY_DEPARTMENT: "University department", DEEMED: "Deemed",
};
export const LEVEL_LABEL: Record<string, string> = { DIPLOMA: "Diploma", UG: "Undergraduate", PG: "Postgraduate", PGDM: "PGDM", MBA: "MBA", MCA: "MCA" };
