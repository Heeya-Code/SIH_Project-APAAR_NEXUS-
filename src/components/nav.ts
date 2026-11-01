// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import type { Role } from "@/generated/prisma/client";

// Only pages that exist and that the role may open. Never list a link a user cannot use.
export type NavIcon = "dashboard" | "audit" | "users" | "building" | "students" | "verify" | "identity" | "desk" | "upload" | "history" | "trust" | "alerts" | "ledger" | "directory" | "regions" | "reports" | "requests" | "consent" | "qr" | "scan" | "send" | "operators" | "settings";
export type NavItem = { label: string; href: string; icon: NavIcon; group?: string };
const i = (label: string, href: string, icon: NavIcon, group?: string): NavItem => ({ label, href, icon, group });

export function navFor(role: Role): NavItem[] {
  switch (role) {
    case "SUPER_ADMIN":
      return [i("Platform overview", "/admin", "dashboard", "Platform"), i("Command centre", "/aicte", "ledger", "Platform"), i("Institutions", "/admin/institutions", "directory", "Platform"), i("Alerts and conflicts", "/aicte/alerts", "alerts", "Operations"), i("Users and access", "/admin/users", "users", "Security"), i("Security and audit", "/audit", "audit", "Security"), i("Configuration", "/admin/config", "settings", "System")];
    case "AICTE_ADMIN":
      return [i("Command centre", "/aicte", "dashboard", "Overview"), i("Institution directory", "/aicte/institutions", "directory", "Overview"), i("Live seat ledger", "/aicte/seat-ledger", "ledger", "Analytics"), i("Regional analytics", "/aicte/regions", "regions", "Analytics"), i("Trust scores", "/aicte/trust", "trust", "Analytics"), i("Alerts and conflicts", "/aicte/alerts", "alerts", "Operations"), i("Reports", "/aicte/reports", "reports", "Operations"), i("Audit logs", "/audit", "audit", "Security")];
    case "REGIONAL_OFFICER":
      return [i("Regional overview", "/aicte", "dashboard", "Overview"), i("Institutions", "/aicte/institutions", "directory", "Overview"), i("Regional seat ledger", "/aicte/seat-ledger", "ledger", "Analytics"), i("Regional analytics", "/aicte/regions", "regions", "Analytics"), i("Trust scores", "/aicte/trust", "trust", "Analytics"), i("Regional alerts", "/aicte/alerts", "alerts", "Operations"), i("Reports", "/aicte/reports", "reports", "Operations")];
    case "INSTITUTION_ADMIN":
      return [i("Overview", "/institution", "building", "Overview"), i("Upload centre", "/institution/upload", "upload", "Data submission"), i("Submissions", "/institution/submissions", "history", "Data submission"), i("Students", "/institution/students", "students", "Data submission"), i("Trust score", "/institution/trust", "trust", "Quality"), i("Check an APAAR ID", "/institution/verify", "verify", "Quality"), i("Data operators", "/institution/operators", "operators", "Administration"), i("Audit history", "/audit", "audit", "Administration")];
    case "DATA_ENTRY_OPERATOR":
      return [i("Work dashboard", "/institution", "building", "Overview"), i("Upload centre", "/institution/upload", "upload", "Data submission"), i("Submissions", "/institution/submissions", "history", "Data submission"), i("Students", "/institution/students", "students", "Data submission"), i("Trust score", "/institution/trust", "trust", "Quality"), i("Check an APAAR ID", "/institution/verify", "verify", "Quality")];
    case "STUDENT":
      return [i("My profile", "/student", "identity", "My identity"), i("Verification requests", "/student/requests", "requests", "Consent"), i("Consent history", "/student/consents", "consent", "Consent"), i("My QR verification", "/student/qr", "qr", "Consent")];
    case "VERIFIER":
      return [i("Verification dashboard", "/verifier", "desk", "Overview"), i("New request", "/verifier/new", "send", "Verify"), i("Scan or enter a code", "/verifier/check", "scan", "Verify"), i("Request history", "/verifier/history", "history", "Verify")];
  }
}
