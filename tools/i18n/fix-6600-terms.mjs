// Passe de qualidade sobre data/i18n/pt-BR/lang-6600-extra.json depois do MT em bruto (tools/i18n/mt-6600.mjs):
//  1. normaliza termos de "sociedade/guilda" (Birlik/consortia) pra "Sociedade", so nas chaves desse
//     dominio (prefixos abaixo) — o MT turco->pt traduziu "Birlik" de formas inconsistentes (sindicato,
//     aliança, união, unidade, tropas...) dependendo do contexto da frase.
//  2. troca a marca do pack turco original ("Bombom") por "DDTank" em qualquer chave.
//  3. remove aspas orfas (resquicio das linhas multi-linha quebradas do turco original, ver lang-6600.mjs)
//     que sobraram coladas no inicio/fim do texto traduzido.
//  4. reporta toda chave cujo valor final ficou IDENTICO ao valor turco original (heuristica forte de "MT
//     nao traduziu" — provavelmente string curta/ambigua que o Google tratou como nome próprio) pra
//     correcao manual.
//   node tools/i18n/fix-6600-terms.mjs [--apply]   (sem --apply so reporta, nao escreve)
import { readFileSync, writeFileSync } from "node:fs";

const EXTRA_JSON = "data/i18n/pt-BR/lang-6600-extra.json";
const PAIRS_FILE = "research/i18n/lang-6600-untranslated-pairs.json"; // so pra achar o turco original de cada chave (foi gerado antes do extra existir, mas o valor turco nao muda)

const GUILD_KEY_RE = /^(consorti|club\.|conortionTask|guildMemberWeek|tank\.consorti|tank\.Consortion|createConsortionFrame|tanl\.consortion)/i;
const GUILD_WORD_FIXES = [
  [/\bsindicato\b/g, "sociedade"], [/\bSindicato\b/g, "Sociedade"],
  [/\baliança\b/g, "sociedade"], [/\bAliança\b/g, "Sociedade"],
  [/\bunião\b/g, "sociedade"], [/\bUnião\b/g, "Sociedade"],
  [/\bunidade\b/g, "sociedade"], [/\bUnidade\b/g, "Sociedade"],
  [/\btropas\b/g, "sociedade"], [/\bTropas\b/g, "Sociedade"],
];
// "sociedade" é sempre feminino — corrige o artigo/pronome que ficou masculino depois da troca de palavra
// acima (ex. MT traduziu "Birlik" como "sindicato" (masc.) com "do sindicato", a troca de palavra virou
// "do sociedade", errado). Aplicado globalmente (nao so no dominio de guilda): a palavra "sociedade" em
// si nunca é ambígua, então corrigir a concordância ao redor dela é seguro em qualquer chave.
const AGREEMENT_FIXES = [
  [/\bdo(?=\s+[Ss]ociedade\b)/g, "da"], [/\bDo(?=\s+[Ss]ociedade\b)/g, "Da"],
  [/\bno(?=\s+[Ss]ociedade\b)/g, "na"], [/\bNo(?=\s+[Ss]ociedade\b)/g, "Na"],
  [/\bum(?=\s+[Ss]ociedade\b)/g, "uma"], [/\bUm(?=\s+[Ss]ociedade\b)/g, "Uma"],
  [/\bo(?=\s+[Ss]ociedade\b)/g, "a"], [/\bO(?=\s+[Ss]ociedade\b)/g, "A"],
  [/\beste(?=\s+[Ss]ociedade\b)/gi, "esta"], [/\besse(?=\s+[Ss]ociedade\b)/gi, "essa"],
  [/\baquele(?=\s+[Ss]ociedade\b)/gi, "aquela"], [/\bnenhum(?=\s+[Ss]ociedade\b)/gi, "nenhuma"],
  [/\boutro(?=\s+[Ss]ociedade\b)/gi, "outra"], [/\bseu(?=\s+[Ss]ociedade\b)/gi, "sua"],
  [/\bmeu(?=\s+[Ss]ociedade\b)/gi, "minha"], [/\bnovo(?=\s+[Ss]ociedade\b)/gi, "nova"],
];

const apply = process.argv.includes("--apply");
const extra = JSON.parse(readFileSync(EXTRA_JSON, "utf8"));
const pairs = JSON.parse(readFileSync(PAIRS_FILE, "utf8"));

let brandFixed = 0, guildFixed = 0, quoteFixed = 0;
const unchanged = [];

for (const [key, val] of Object.entries(extra)) {
  if (typeof val !== "string") continue;
  let v = val;
  if (/Bombom/i.test(v)) { v = v.replace(/\bBombom\b/g, "DDTank"); brandFixed++; }
  if (GUILD_KEY_RE.test(key)) {
    const before = v;
    for (const [re, pt] of GUILD_WORD_FIXES) v = v.replace(re, pt);
    if (v !== before) guildFixed++;
  }
  for (const [re, pt] of AGREEMENT_FIXES) v = v.replace(re, pt);
  const beforeQ = v;
  v = v.replace(/^"+/, "").replace(/"+$/, "").trim();
  if (v !== beforeQ) quoteFixed++;
  extra[key] = v;

  const turkish = pairs[key];
  if (turkish && v.trim() === turkish.replace(/^"+/, "").replace(/"+$/, "").trim()) unchanged.push(key);
}

console.log(JSON.stringify({ brandFixed, guildFixed, quoteFixed, suspectUnchanged: unchanged.length }, null, 2));
if (unchanged.length) console.log("chaves com valor == turco original (provavel falha de MT):\n" + unchanged.slice(0, 100).join("\n"));

if (apply) {
  const sorted = Object.fromEntries(Object.entries(extra).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  writeFileSync(EXTRA_JSON, JSON.stringify(sorted, null, 1) + "\n");
  writeFileSync("research/i18n/lang-6600-suspect-unchanged.json", JSON.stringify(unchanged, null, 1));
  console.log(`gravado ${EXTRA_JSON}`);
} else {
  console.log("(dry run, use --apply pra gravar)");
}
