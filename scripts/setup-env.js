// npm run setup:env : creates .env from .env.example and fills in two freshly generated secrets.
// It never overwrites an existing .env. You still add your own PostgreSQL password to DATABASE_URL.
const fs = require("node:fs");
const { randomBytes } = require("node:crypto");
if (fs.existsSync(".env")) { console.log(".env already exists, so nothing was changed."); process.exit(0); }
if (!fs.existsSync(".env.example")) { console.error("Run this from the project folder (.env.example was not found)."); process.exit(1); }
const key = () => randomBytes(32).toString("base64");
const text = fs.readFileSync(".env.example", "utf8").replace(/^DATA_ENCRYPTION_KEY=.*$/m, `DATA_ENCRYPTION_KEY="${key()}"`).replace(/^HMAC_PEPPER=.*$/m, `HMAC_PEPPER="${key()}"`);
fs.writeFileSync(".env", text, { mode: 0o600 });
console.log("Created .env with new encryption secrets.\nNext: open .env and replace YOUR_PASSWORD in DATABASE_URL with your PostgreSQL password, then run: npm run db:setup");
