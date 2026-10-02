import postgres from "postgres";
const sql = postgres("postgres://postgres:postgres@127.0.0.1:5432/ddtank");
const q = process.argv.slice(2).join(" ");
const r = await sql.unsafe(q);
console.log(JSON.stringify(r, null, 0).slice(0, 6000));
await sql.end();
