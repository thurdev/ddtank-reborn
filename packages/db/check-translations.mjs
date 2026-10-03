import { createDb } from "./src/index.js";
const h = await createDb();
const r = await h.db.execute(`SELECT count(*)::int AS n FROM app."Translations"`);
console.log("ROWS:", JSON.stringify(Array.isArray(r) ? r[0] : r.rows[0]));
await h.close();
process.exit(0);
