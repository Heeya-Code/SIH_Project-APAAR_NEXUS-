// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
export const ACADEMIC_YEARS = ["2022-23", "2023-24", "2024-25", "2025-26", "2026-27"] as const;
export const CURRENT_AY = "2026-27";
export const ayStartYear = (ay: string) => Number(ay.slice(0, 4));
export const ayLabel = (startYear: number) => `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
export const isValidAY = (v: string | undefined): v is string => !!v && (ACADEMIC_YEARS as readonly string[]).includes(v);
