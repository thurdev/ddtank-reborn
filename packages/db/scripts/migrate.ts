/** Usage: DATABASE_URL=... pnpm --filter @ddt/db db:migrate  (unset -> PGlite at packages/db/.data/pglite) */
import { createDb, migrateDb } from "../src/index.js";

const h = await createDb();
console.log(`migrating ${h.kind} ${h.location}`);
await migrateDb(h);
await h.close();
console.log("done");
