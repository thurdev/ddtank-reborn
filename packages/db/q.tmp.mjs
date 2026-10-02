import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/ddtank", { max: 1 });
const r = await sql.unsafe(process.argv.slice(2).join(" "));
console.log(JSON.stringify(r, null, 0).replace(/\},\{/g, "}\n{"));
await sql.end();
