// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Single source of truth for role-based access control.
// Defined in code (not DB rows) so it is reviewable, versioned and unit-tested.
import type { Role, Region } from "@/generated/prisma/client";

export type Permission =
  | "national:view"            // National Command Centre (scope depends on role)
  | "institution:view"         // Institutional portal for own institution
  | "students:view"            // Student list of own institution
  | "students:reveal-apaar"    // Reveal a full APAAR ID (audited)
  | "submissions:create"       // Upload / correct / resubmit (Stage 3)
  | "audit:view:all"
  | "audit:view:institution"
  | "users:manage"
  | "student:self"             // Own digital academic identity
  | "verification:apaar"       // Run an APAAR verification check through the adapter
  | "verifier:use"             // Verification portal
  | "submissions:view"         // Upload history and validation results (own institution)
  | "trust:view:own"           // Own institution's Trust Score
  | "operators:manage"         // Create and deactivate own institution's data operators
  | "alerts:view"              // Anomaly and conflict alerts (scoped by institutionScope)
  | "alerts:review"            // Record a review decision on an alert
  | "consent:request"          // Ask a student for consent to verify
  | "consent:decide"           // Approve, reject or revoke consent for own record
  | "verification:check"       // Resolve a verification code or QR
  | "reports:export";          // Download reports (scope depends on role)

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: ["national:view", "audit:view:all", "users:manage", "alerts:view", "alerts:review", "reports:export"],
  AICTE_ADMIN: ["national:view", "audit:view:all", "alerts:view", "alerts:review", "reports:export"],
  REGIONAL_OFFICER: ["national:view", "alerts:view", "alerts:review", "reports:export"],
  INSTITUTION_ADMIN: ["institution:view", "students:view", "students:reveal-apaar", "submissions:create", "submissions:view", "trust:view:own", "operators:manage", "verification:apaar", "reports:export", "audit:view:institution"],
  DATA_ENTRY_OPERATOR: ["institution:view", "students:view", "submissions:create", "submissions:view", "trust:view:own", "verification:apaar"],
  STUDENT: ["student:self", "consent:decide"],
  VERIFIER: ["verifier:use", "consent:request", "verification:check"],
};

export const can = (role: Role, perm: Permission): boolean => ROLE_PERMISSIONS[role].includes(perm);

export const ROLE_META: Record<Role, { label: string; home: string; blurb: string; group: "national" | "institution" | "student" | "verifier" }> = {
  SUPER_ADMIN:         { label: "Super Admin",          home: "/aicte",       blurb: "Platform administration and full audit access", group: "national" },
  AICTE_ADMIN:         { label: "AICTE Administrator",  home: "/aicte",       blurb: "National oversight with masked student data",  group: "national" },
  REGIONAL_OFFICER:    { label: "Regional Officer",     home: "/aicte",       blurb: "Oversight limited to one AICTE region",        group: "national" },
  INSTITUTION_ADMIN:   { label: "Institution Admin",    home: "/institution", blurb: "Manages own institution's records only",       group: "institution" },
  DATA_ENTRY_OPERATOR: { label: "Data Entry Operator",  home: "/institution", blurb: "Enters and uploads own institution's records", group: "institution" },
  STUDENT:             { label: "Student",              home: "/student",     blurb: "Views own academic identity and consents",     group: "student" },
  VERIFIER:            { label: "Employer / Verifier",  home: "/verifier",    blurb: "Verifies credentials within student consent",  group: "verifier" },
};

export const REGION_LABEL: Record<Region, string> = {
  NORTH: "Northern", SOUTH: "Southern", EAST: "Eastern", WEST: "Western", CENTRAL: "Central", NORTH_EAST: "North-Eastern",
};

export type Actor = {
  id: string;
  role: Role;
  institutionId: string | null;
  region: Region | null;
  studentId: string | null;
};

export class ForbiddenError extends Error {
  constructor(message = "Not permitted for this role") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * The ONLY place that decides which institutions an actor may see.
 * Every institution-level query must pass through this filter (fail closed).
 */
export function institutionScope(actor: Actor): { id?: string; region?: Region } {
  switch (actor.role) {
    case "SUPER_ADMIN":
    case "AICTE_ADMIN":
      return {};
    case "REGIONAL_OFFICER":
      if (!actor.region) throw new ForbiddenError("Regional officer has no region assigned");
      return { region: actor.region };
    case "INSTITUTION_ADMIN":
    case "DATA_ENTRY_OPERATOR":
      if (!actor.institutionId) throw new ForbiddenError("User is not linked to an institution");
      return { id: actor.institutionId };
    default:
      throw new ForbiddenError("This role has no institution-level access");
  }
}
