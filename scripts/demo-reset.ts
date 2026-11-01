// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Removes the demonstration upload for one institution so Demo A can be repeated.  npm run demo:reset [institution-slug]
import "dotenv/config";
import { db } from "../src/lib/db";
import { refreshAnalysis } from "../src/lib/analysis/service";
import { DEMO_AY, resetInstitutionDemo } from "../src/lib/demo";

async function main() {
  const slug = process.argv[2] ?? "sahyadri";
  const inst = await db.institution.findUniqueOrThrow({ where: { slug } });
  const r = await resetInstitutionDemo(inst.id);
  await refreshAnalysis({ notify: false });
  console.log(`Reset ${inst.name} for ${DEMO_AY}: removed ${r.students} students, ${r.submissions} submissions, ${r.alerts} alerts.`);
}
main().finally(() => db.$disconnect());
