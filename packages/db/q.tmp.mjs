import postgres from "postgres";
const sql = postgres("postgres://postgres:postgres@127.0.0.1:5432/ddtank");
const r2 = await sql.unsafe(`select g."ItemID",g."BagType",g."Place",g."TemplateID",g."IsExist",g."Count",g."RemoveDate" from player."Sys_Users_Goods" g where "UserID"=1 and "TemplateID" between 7000 and 7999 order by 1 desc limit 20`); console.log(JSON.stringify(r2));
await sql.end();
