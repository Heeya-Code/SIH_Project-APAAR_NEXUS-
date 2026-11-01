import "dotenv/config";
import { defineConfig } from "prisma/config";

// A missing .env must stop with a clear message, not fall back to credentials that do not exist on your machine.
// (`prisma generate` does not connect to the database, so it is allowed to run without one.)
const url = process.env.DATABASE_URL;
if (!url && !process.argv.includes("generate")) throw new Error("DATABASE_URL is not set. Run `npm run setup:env`, then put your PostgreSQL password into DATABASE_URL in the new .env file (see README).");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts && tsx prisma/seed-phase2.ts",
  },
  datasource: {
    url: url ?? "postgresql://not-configured@localhost:5432/not-configured",
  },
});
