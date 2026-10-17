#!/usr/bin/env node
// Diff entre os XMLs que o cliente 6600 pede no boot/lobby (docs/plan/MIGRACAO-6600.md M1 tarefa 3)
// e o que nosso /request/*.xml hoje gera. Pra cada arquivo: elementos/caminhos que o 6600 tem e nós não,
// atributos que o 6600 tem e nós não (união dos primeiros ~200 elementos por caminho) e se o analyzer
// AS3 do 6600 realmente lê aquele atributo (prioriza o que importa, ignora lixo que o cliente nem olha).
//
// Fonte da lista de arquivos: vendor/DDT-6600/Flash_Project/DDT660/src/ddt/loader/LoaderCreate.as — toda
// chamada `PathManager.solveRequestPath("X.xml")` dentro das funções `creatXLoader()` chamadas durante o
// carregamento pós-login (é a tela "Loading..." que trava hoje, ver docs/plan/MIGRACAO-6600.md §Contexto).
// O analyzer de cada arquivo é resolvido pegando o `loader.analyzer = new XAnalyzer(...)` que aparece logo
// depois da chamada, dentro da mesma função — padrão usado em toda LoaderCreate.as.
//
// Uso: node tools/qa/xml-diff-6600.mjs [baseUrl]
//   baseUrl default: http://localhost:8091/request/ (rodar `$env:PORT=8091; pnpm --filter @ddt/api dev` antes)
// Saída: research/6600/xml-diff.md
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { inflateSync } from "node:zlib";

const BASE_URL = process.argv[2] ?? "http://localhost:8091/request/";
const VENDOR_SRC = "vendor/DDT-6600/Flash_Project/DDT660/src";
const LOADER_FILE = join(VENDOR_SRC, "ddt/loader/LoaderCreate.as");
const SNAPSHOT_DIR = "vendor/DDT-6600/Request";
const MAX_ELEMENTS_PER_PATH = 200;

// ---- 1. lista de arquivos + analyzer (de LoaderCreate.as) --------------------------------------------------------

function extractXmlAnalyzerMap(loaderSrc) {
  const callRe = /solveRequestPath\(\s*"([^"?]+)\.xml[^"]*"\s*\)/g;
  const hits = [];
  let m;
  while ((m = callRe.exec(loaderSrc))) hits.push({ name: m[1], index: m.index });
  const map = new Map(); // name -> Set<analyzerClass>
  for (let i = 0; i < hits.length; i++) {
    const { name, index } = hits[i];
    const end = Math.min(hits[i + 1]?.index ?? loaderSrc.length, index + 2000);
    const slice = loaderSrc.slice(index, end);
    const am = slice.match(/analyzer\s*=\s*new\s+(\w+)/);
    if (!map.has(name)) map.set(name, new Set());
    if (am) map.get(name).add(am[1]);
  }
  return map;
}

// ---- 2. localizar arquivo .as de cada analyzer (busca por nome de arquivo em toda a árvore AS3) ------------------

function walkAs(dir, out) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkAs(p, out);
    else if (extname(ent.name) === ".as") out.set(ent.name.slice(0, -3), p);
  }
  return out;
}

/** Nomes de propriedade pública (var ou get/set) declaradas numa classe .as (alvo de copyPorpertiesByXML). */
function publicPropsOf(asFile) {
  const src = readFileSync(asFile, "utf8");
  const set = new Set();
  for (const m of src.matchAll(/public\s+var\s+(\w+)\s*:/g)) set.add(m[1]);
  for (const m of src.matchAll(/public\s+function\s+(?:get|set)\s+(\w+)\s*\(/g)) set.add(m[1]);
  return set;
}

/**
 * Nomes de atributo que um analyzer realmente usa, por dois caminhos (padrões de toda LoaderCreate.as/analyzers):
 *   1. E4X direto: `xml.@Attr` — o próprio analyzer referencia o atributo.
 *   2. `ObjectUtils.copyPorpertiesByXML(infoVar, xmlItem)` (com.pickgliss.utils.ObjectUtils.as:34-61): copia
 *      TODO atributo presente no XML pra `infoVar[nomeDoAtributo]` desde que `infoVar.hasOwnProperty(nomeDoAtributo)`
 *      — ou seja, o atributo só "conta" se a classe de infoVar (resolvida por `var x:Classe = new Classe()` ou
 *      `x = new Classe()` no mesmo arquivo) declarar uma `public var`/getter-setter com aquele nome exato.
 *      Sem isso, qualquer grep só no analyzer dá falso-negativo (ex.: TemplateAllList.xml @FloorPrice: não aparece
 *      como `@FloorPrice` em ItemTempleteAnalyzer.as, mas ItemTemplateInfo.as tem `public var FloorPrice`).
 */
function readAttrsOf(asFile, asIndex) {
  const src = readFileSync(asFile, "utf8");
  const set = new Set();
  for (const m of src.matchAll(/@([A-Za-z_]\w*)/g)) set.add(m[1]);
  const varClass = new Map();
  for (const m of src.matchAll(/(\w+)\s*(?::\s*\w+)?\s*=\s*new\s+(\w+)\s*\(/g)) varClass.set(m[1], m[2]);
  for (const m of src.matchAll(/copyPorpertiesByXML\(\s*([\w.]+)\s*,/g)) {
    const varName = m[1].split(".").pop();
    const className = varClass.get(varName);
    const classFile = className && asIndex.get(className);
    if (classFile) for (const p of publicPropsOf(classFile)) set.add(p);
  }
  return set;
}

// ---- 3. XML parsing (regex-based, suficiente pra templates attr-only, sem CDATA/comentário) ----------------------

function parseXml(text) {
  // Map<tagName, { count, attrs: Map<attrName, count> }> — agrupado só pelo nome da tag (não pelo caminho
  // completo): os analyzers quase sempre navegam com E4X descendente (`xml..Item`, case-sensitive mas
  // indiferente à profundidade/wrapper), então "Result/Item" e "Result/ItemTemplate/Item" são o mesmo pra eles.
  // Isso evita falso-positivo de "elemento ausente" quando só o wrapper muda (ver LoadPetFightProperty no
  // relatório: 6600 manda `Result/Item`, nós mandamos `Result/ItemTemplate/Item`, mesmo dado, mesmo leitor).
  const paths = new Map();
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z_][\w.:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(text))) {
    const [, closing, tag, attrsStr, selfClose] = m;
    if (closing) {
      if (stack.length && stack[stack.length - 1] === tag) stack.pop();
      continue;
    }
    stack.push(tag);
    const path = tag;
    let e = paths.get(path);
    if (!e) paths.set(path, (e = { count: 0, attrs: new Map() }));
    e.count++;
    if (e.count <= MAX_ELEMENTS_PER_PATH) {
      for (const am of attrsStr.matchAll(/([A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"/g)) {
        e.attrs.set(am[1], (e.attrs.get(am[1]) ?? 0) + 1);
      }
    }
    if (selfClose) stack.pop();
  }
  return paths;
}

function maybeInflate(buf) {
  if (buf.length > 2 && buf[0] === 0x78) {
    try {
      return inflateSync(buf);
    } catch {
      /* não era zlib de verdade (ex. texto plano começando por "x"); segue como está */
    }
  }
  return buf;
}

// ---- 4. busca em disco (snapshot 6600) e por HTTP (nosso servidor) -----------------------------------------------

function buildSnapshotIndex(dir) {
  const idx = new Map();
  for (const f of readdirSync(dir)) idx.set(f.toLowerCase(), join(dir, f));
  return idx;
}

async function fetchOurs(name) {
  try {
    const res = await fetch(`${BASE_URL}${name}.xml`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.status !== 200) return { status: `HTTP ${res.status}`, buf: null };
    return { status: "ok", buf };
  } catch (e) {
    return { status: `erro: ${String(e?.message ?? e)}`, buf: null };
  }
}

function readSnapshot(idx, name) {
  const file = idx.get(`${name.toLowerCase()}.xml`);
  if (!file) return { status: "ausente no snapshot vendor", buf: null };
  return { status: "ok", buf: readFileSync(file) };
}

// ---- 5. main -------------------------------------------------------------------------------------------------

async function main() {
  const loaderSrc = readFileSync(LOADER_FILE, "utf8");
  const xmlAnalyzer = extractXmlAnalyzerMap(loaderSrc);
  const asIndex = walkAs(VENDOR_SRC, new Map());
  const snapIndex = buildSnapshotIndex(SNAPSHOT_DIR);

  const names = [...xmlAnalyzer.keys()].sort((a, b) => a.localeCompare(b));
  const rows = []; // resumo pra tabela do topo
  const details = []; // markdown detalhado por arquivo

  for (const name of names) {
    const analyzers = [...xmlAnalyzer.get(name)];
    const analyzerFiles = analyzers.map((a) => asIndex.get(a)).filter(Boolean);
    const readAttrs = new Set();
    for (const f of analyzerFiles) for (const a of readAttrsOf(f, asIndex)) readAttrs.add(a);

    const ours = await fetchOurs(name);
    const snap = readSnapshot(snapIndex, name);

    if (ours.status !== "ok" || snap.status !== "ok") {
      rows.push([name, analyzers.join(",") || "?", ours.status, snap.status, "-", "-"]);
      details.push(`### ${name}.xml\n- analyzer: ${analyzers.join(", ") || "(não resolvido)"}\n- nosso: **${ours.status}**\n- snapshot 6600: **${snap.status}**\n`);
      continue;
    }

    const oursText = maybeInflate(ours.buf).toString("utf8");
    const snapText = maybeInflate(snap.buf).toString("utf8");
    const oursPaths = parseXml(oursText);
    const snapPaths = parseXml(snapText);

    const missingPaths = [...snapPaths.keys()].filter((p) => !oursPaths.has(p));
    const attrDiffs = []; // { path, attr, readByAnalyzer }
    for (const [path, snapEntry] of snapPaths) {
      const oursEntry = oursPaths.get(path);
      const oursAttrs = oursEntry ? oursEntry.attrs : new Map();
      for (const attr of snapEntry.attrs.keys()) {
        if (!oursAttrs.has(attr)) attrDiffs.push({ path, attr, read: readAttrs.has(attr) });
      }
    }
    // prioriza o que o analyzer lê de fato (o resto é "o 6600 manda mas nem o próprio cliente usa")
    attrDiffs.sort((a, b) => Number(b.read) - Number(a.read) || a.path.localeCompare(b.path) || a.attr.localeCompare(b.attr));

    const readCount = attrDiffs.filter((d) => d.read).length;
    rows.push([name, analyzers.join(",") || "?", "ok", "ok", String(missingPaths.length), `${readCount}/${attrDiffs.length}`]);

    let detail = `### ${name}.xml\n- analyzer: ${analyzers.join(", ") || "(não resolvido)"} (${analyzerFiles.length}/${analyzers.length} arquivo(s) .as encontrado(s))\n`;
    if (missingPaths.length) {
      detail += `- **Caminhos ausentes em nós** (6600 tem, nós não): ${missingPaths.map((p) => `\`${p}\``).join(", ")}\n`;
    }
    if (attrDiffs.length) {
      detail += `- **Atributos ausentes** (✅ = o analyzer 6600 lê de verdade, prioridade; ❌ = presente no XML mas não lido por este analyzer):\n`;
      for (const d of attrDiffs) detail += `  - ${d.read ? "✅" : "❌"} \`${d.path}\` @${d.attr}\n`;
    }
    if (!missingPaths.length && !attrDiffs.length) detail += "- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.\n";
    details.push(detail);
  }

  mkdirSync("research/6600", { recursive: true });
  const total = rows.length;
  const withGaps = rows.filter((r) => r[4] !== "-" && (Number(r[4]) > 0 || r[5] !== "0/0")).length;
  const md = [
    "# XML diff: cliente 6600 (boot/lobby) vs /request do nosso servidor",
    "",
    `Gerado por \`tools/qa/xml-diff-6600.mjs\` contra \`${BASE_URL}\` (nosso) e \`vendor/DDT-6600/Request\` (snapshot original).`,
    `Lista de arquivos: todo \`solveRequestPath("X.xml")\` em LoaderCreate.as (tela de loading pós-login), ` +
      `${total} arquivos únicos. Analyzer de cada um resolvido pelo \`loader.analyzer = new XAnalyzer(...)\` adjacente.`,
    "",
    `**Resumo:** ${withGaps}/${total} arquivos com pelo menos uma diferença de elemento ou atributo.`,
    "",
    "## Metodologia e limitações",
    "",
    "- **Agrupamento por nome de tag, não por caminho completo**: os analyzers quase sempre navegam com E4X " +
      "descendente (`xml..Item`), que ignora profundidade/wrapper — então um elemento `Item` dentro de `ItemTemplate` " +
      "conta como o mesmo `Item` direto sob `Result`. Reduz falso-positivo de \"elemento ausente\" só por wrapper " +
      "diferente, mas pode juntar tags de mesmo nome usadas em contextos diferentes dentro do mesmo arquivo (raro " +
      "nesses templates, não observado nesta rodada).",
    "- **\"Lido pelo analyzer\" (✅/❌) cobre dois padrões**: `xml.@Attr` direto no analyzer, e " +
      "`ObjectUtils.copyPorpertiesByXML(infoVar, xmlItem)` (com.pickgliss.utils.ObjectUtils.as:34-61) — nesse " +
      "segundo caso o atributo só é lido se a classe de `infoVar` (resolvida por `new Classe()` no mesmo arquivo) " +
      "declarar uma `public var`/getter-setter de mesmo nome. Não cobre analyzers que delegam pra uma 3a classe " +
      "(ex. `QuestListAnalyzer` → `QuestInfo.createFromXML`, verificado manualmente pro caso do QuestList) nem " +
      "reflexão por outros meios (`describeType`, `for each (var p in obj)`).",
    "- ❌ não é \"pode ignorar\": é \"este analyzer específico não lê\", verificar manualmente antes de apagar um " +
      "atributo de qualquer gerador — o 4.1 ignora atributo desconhecido, mas outra tela/handler no 6600 pode ler.",
    "",
    "## Tabela resumo",
    "",
    "| Arquivo | Analyzer(s) | Nosso | Snapshot | Caminhos ausentes | Atributos ausentes (lidos/total) |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} | ${r[5]} |`),
    "",
    "## Detalhe por arquivo",
    "",
    ...details,
    "",
    "## Status (M1 tarefa 2-3, docs/plan/MIGRACAO-6600.md)",
    "",
    "Corrigidos nesta rodada (apps/api/src/templates/defs.ts): QuestList.xml (`<Rate>` + RewardBindMoney/" +
      "OneKeyFinishNeedMoney/CollocationCost/CollocationColdTime/Level2-5NeedMoney/RewardItemCount1-5), " +
      "SuitPartEquipInfoList.xml e SuitTemplateInfoList.xml (bug preexistente de case no nome do elemento, " +
      "`Item`→`item`, afetava a 4.1 também), ActivitySystemItems.xml (`Probability`), LoginAwardItemTemplate.xml " +
      "(`AttackCompose`), TemplateAllList.xml (`FloorPrice`) — todas colunas já existentes, só faltava no spec — " +
      "e DailyLeagueAward.xml (removido o builder sempre-vazio, agora cai no fallback do snapshot 6600 em " +
      "request.ts, que também beneficia a 4.1).",
    "",
    "Precisa de schema novo (fora de escopo, M1 tarefa 1 — ver docs/plan/MIGRACAO-6600.md §5): " +
      "`LoadPVEItems.xml` (`EpicTemplateIds`, dificuldade \"Épico\" acima de Terror em game.Pve_Info; emitido `''` " +
      "por ora). `QuestList.xml` Level2-5NeedMoney/CollocationCost/CollocationColdTime usam defaults fixos (`-1`/`0`, " +
      "constantes em 100% da amostra do snapshot 6600) em vez de coluna própria; RewardItemCount1-5 duplica o " +
      "único RewardItemCount que já temos (diverge em ~0,3% das linhas do snapshot 6600 — aceitável sem schema novo).",
    "",
    "Sem ação (atributo presente no XML mas não lido pelo analyzer resolvido, ver Metodologia): " +
      "`PetConfigInfo.xml` `NotRemoveLevel`, `TemplateAllList.xml` nenhum restante.",
  ].join("\n");
  writeFileSync("research/6600/xml-diff.md", md);
  console.log(`research/6600/xml-diff.md escrito: ${total} arquivos, ${withGaps} com diferenças.`);
}

main();
