// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { TYPE_LABEL } from "@/lib/format";
import type { InstitutionTableRow } from "@/components/institutions-table";
import type { NationalSnapshot } from "@/lib/queries/national";
import type { TrustRow } from "@/lib/trust/service";

export function institutionTableRows(snap: NationalSnapshot, trust: Map<string, TrustRow>, ay: string): InstitutionTableRow[] {
  return snap.institutions.map((i) => { const t = trust.get(`${i.id}|${ay}`)?.result; return {
    id: i.id, name: i.name, city: i.city, stateName: i.stateName, typeLabel: TYPE_LABEL[i.type], intake: i.intake, admitted: i.admitted, supernumerary: i.supernumerary, utilisation: i.utilisation, apaarCoverage: i.apaarCoverage,
    submitted: i.submission.status === "ACCEPTED", version: i.submission.version, signals: i.signals, trust: t?.scored ? t.overall : null }; });
}
