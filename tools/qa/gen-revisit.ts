// Generates docs/REVISIT.md: every QA-matrix row that is NOT fully ok (partial / stub / missing / dead-in-original),
// grouped by area, so nothing gets forgotten. Regenerate after `tools/qa/gen-matrix.ts`:  npx tsx tools/qa/gen-revisit.ts
import { readFileSync, writeFileSync } from "node:fs";

type Row = { key: string; area: string; func: string; code: number; name: string; sub: string; server: string; verified: string; notes: string };
const rows: Row[] = JSON.parse(readFileSync("docs/qa-matrix.json", "utf8"));
const pending = rows.filter((r) => r.server !== "ok" || r.verified !== "yes");
const order = ["missing", "stub", "partial", "dead", "ok"];
const byArea = new Map<string, Row[]>();
for (const r of pending) byArea.set(r.area, [...(byArea.get(r.area) ?? []), r]);

const count = (s: string) => pending.filter((r) => r.server === s).length;
let md = `# Pendências para revisitar (gerado — não editar à mão)\n\n`;
md += `Tudo que NÃO está 100% (servidor ok + verificado no cliente). Inclui itens "mortos no original" (sem handler nem no C#): `;
md += `decidir depois se implementamos do zero ou removemos o botão do cliente.\n\n`;
md += `Totais: ${pending.length} linhas — missing ${count("missing")}, stub ${count("stub")}, partial ${count("partial")}, `;
md += `ok-mas-não-verificado-no-cliente ${pending.filter((r) => r.server === "ok").length}.\n\n`;
for (const [area, list] of [...byArea].sort((a, b) => b[1].length - a[1].length)) {
  md += `## ${area} (${list.length})\n\n| status | código | pacote | função cliente | notas |\n|---|---|---|---|---|\n`;
  for (const r of list.sort((a, b) => order.indexOf(a.server) - order.indexOf(b.server) || a.code - b.code)) {
    const st = r.server === "ok" ? "ok (não verificado)" : r.server;
    md += `| ${st} | ${r.code}${r.sub ? "/" + r.sub : ""} | ${r.name} | ${r.func} | ${(r.notes || "").replace(/\|/g, "\|").replace(/\n/g, " ")} |\n`;
  }
  md += "\n";
}
writeFileSync("docs/REVISIT.md", md);
console.log(`docs/REVISIT.md: ${pending.length} rows`);
