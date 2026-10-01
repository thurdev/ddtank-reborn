/** Usage: pnpm --filter @ddt/db db:dev-account   -> admin/admin (IsAdmin) + test/test in member."Accounts". */
import { createDb, createDevAccounts, migrateDb } from "../src/index.js";

if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.error("refusing to create admin/admin with NODE_ENV=production (pass --force if you really mean it)");
  process.exit(1);
}
const h = await createDb();
await migrateDb(h);
for (const a of await createDevAccounts(h)) console.log(`account ${a.UserName} (ID ${a.ID}, admin=${a.IsAdmin})`);
await h.close();
