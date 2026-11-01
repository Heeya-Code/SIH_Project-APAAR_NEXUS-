// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
export type DemoAccount = { email: string; label: string; note: string };
export const DEMO_GROUPS: { title: string; accounts: DemoAccount[] }[] = [
  { title: "AICTE", accounts: [
    { email: "admin@aicte.demo", label: "AICTE Administrator", note: "National view, masked data" },
    { email: "officer.west@aicte.demo", label: "Regional Officer, West", note: "Only MH, GJ, GA institutions" },
    { email: "superadmin@nexus.demo", label: "Super Admin", note: "Users, sessions, audit" },
  ]},
  { title: "Institution", accounts: [
    { email: "admin@sahyadri.demo", label: "Sahyadri IT admin", note: "Upload-demo institution" },
    { email: "operator@sahyadri.demo", label: "Sahyadri IT operator", note: "No APAAR reveal" },
    { email: "admin@aravalli.demo", label: "Aravalli IET admin", note: "Admissions over intake" },
    { email: "admin@sabarmati.demo", label: "Sabarmati IT admin", note: "NRI cap exceeded" },
    { email: "admin@deccan.demo", label: "Deccan SoM admin", note: "Supernumerary within caps" },
  ]},
  { title: "Student", accounts: [
    { email: "student@nexus.demo", label: "Student, Sahyadri IT", note: "Clean record" },
    { email: "student.multi@nexus.demo", label: "Student, two institutions", note: "Same APAAR ID elsewhere" },
  ]},
  { title: "Verifier", accounts: [
    { email: "verifier@meridian.demo", label: "Employer verifier", note: "Meridian Talent Partners" },
  ]},
];
