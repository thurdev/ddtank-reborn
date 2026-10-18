// M3 coverage report for the DDT-6600 client (docs/plan/TASKS.md "M3 / M4 / M5").
//
// Two independent inventories, each compared against what apps/game / apps/api actually serve:
//   1. Packets: every `new PackageOut(ePackageType.X)` found in the 6600 AS3 client
//      (vendor/DDT-6600/Flash_Project/DDT660/src, any *SocketOut.as) against the codes
//      apps/game/src/handlers registers (via the SAME live registry tools/qa/packet-coverage.mjs
//      already uses, apps/game/src/handlers/index.ts createRegistry()). Status per code: handled
//      (registered, no "stub"/"partial" marker) / partial / stub / MISSING (not registered at all).
//   2. .ashx/.xml/.aspx endpoints: every real file under vendor/DDT-6600/Request (the actual 6600
//      Tank.Request source tree: 263 .ashx, 184 .xml, 35 .aspx, confirmed count in
//      docs/plan/MIGRACAO-6600.md §1.3) against apps/api/src/request/registry.ts (PORTED/STUBS) and
//      apps/api/src/templates/defs.ts (TEMPLATES, DB-backed .xml builders). Status: native (we build
//      it, DB or code) / snapshot (routes/request.ts falls back to this same vendor dir byte-for-byte,
//      see requestRoutes() `snap6600.resolve(...)`) / empty (generic `Result value="false"`, or a
//      bare `<Result value="true"/>` with no rows for `.xml`) / not-routed (`.aspx` outside
//      CreateLogin.aspx: no Fastify route matches it at all — not even the generic fallback).
//
// Usage: node tools/qa/packet-coverage-6600.mjs
// Output: research/6600/coverage-m3.md (this file) + console summary.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import { tsImport } from "tsx/esm/api";

const AS3_SRC = "vendor/DDT-6600/Flash_Project/DDT660/src";
const EPACKAGETYPE_CS = "vendor/DDT-6600/Source/Game.Server/Game.Server.Packets/ePackageType.cs";
const REQUEST_DIR = "vendor/DDT-6600/Request";
const SKIP_DIRS = new Set(["Bin", "obj", "Properties", "Service References", "logs", "tool", ".vs"]);

// ---------------------------------------------------------------------------------------------
// 1. ePackageType.cs -> { name -> code } (6600, 312 valores per docs/plan/MIGRACAO-6600.md §1.1)
// ---------------------------------------------------------------------------------------------
function parseEPackageType(path) {
  const src = readFileSync(path, "utf8");
  const map = new Map(); // name -> code
  for (const m of src.matchAll(/(\w+)\s*=\s*(-?\d+)\s*,?/g)) map.set(m[1], Number(m[2]));
  return map;
}

// ---------------------------------------------------------------------------------------------
// 2. AS3 client sends: same technique as docs/spec/server/tools/extract_client_sends.py, ported to
//    JS so this script has no python dependency, pointed at the 6600 source tree.
// ---------------------------------------------------------------------------------------------
function walkFiles(dir, ext, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, ext, out);
    else if (ent.name.endsWith(ext)) out.push(p);
  }
  return out;
}

function braceEnd(s, i) {
  let d = 0;
  for (; i < s.length; i++) {
    if (s[i] === "{") d++;
    else if (s[i] === "}" && --d === 0) return i;
  }
  return s.length;
}

const CONST_RE = /public\s+static\s+const\s+(\w+)\s*:\s*int\s*=\s*(-?\w+)\s*;/g;
const FUNC_RE = /(?:public|private|protected|internal)?\s*(?:static\s+)?function\s+(\w+)\s*\([^)]*\)[^{]*\{/g;
const PKG_RE = /new\s+PackageOut\s*\(\s*([\w.]+)\s*(?:,[^)]*)?\)/;

function extractClientSends(srcDir) {
  const files = walkFiles(srcDir, ".as");
  const consts = new Map(); // "ClassName.CONST" -> number
  for (const p of files) {
    const cls = basename(p, ".as");
    let s;
    try {
      s = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    for (const m of s.matchAll(CONST_RE)) {
      const n = Number.parseInt(m[2], 0);
      if (Number.isFinite(n)) consts.set(`${cls}.${m[1]}`, n);
    }
  }
  const rows = [];
  for (const p of files) {
    const s = readFileSync(p, "utf8");
    if (!s.includes("PackageOut")) continue;
    for (const fm of s.matchAll(FUNC_RE)) {
      const end = braceEnd(s, fm.index + fm[0].length - 1);
      const body = s.slice(fm.index + fm[0].length, end);
      const pm = PKG_RE.exec(body);
      if (!pm) continue;
      const expr = pm[1];
      let code = null;
      const epName = expr.startsWith("ePackageType.") ? expr.slice("ePackageType.".length) : null;
      rows.push({ expr, epName, func: fm[1], file: relative(srcDir, p).replaceAll("\\", "/") });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------
// 3. Area grouping heuristic (PT-BR), by keyword on the ePackageType constant name. Keywords taken
//    from docs/plan/MIGRACAO-6600.md §1.1/§2.1 and research/6600/swf-inventory.md feature names.
// ---------------------------------------------------------------------------------------------
const AREA_RULES = [
  [/^(LOGIN|PING|NETWORK|RSAKEY|SYS_DATE|SYS_MESSAGE|KIT_USER|LAUNCHER_LOGIN|CARDS_SOUL|CLIENT_LOG)$/, "Login/Rede/Handshake"],
  [/^(GRID_GOODS|GRID_PROP|EQUIP_CHANGE|ITEM_|PROP_USE|BAGLOCK|BAG_LOCKED|LINKREQUEST_GOODS|TEXP|SEARCH_GOODS)/, "Bolsa/Itens"],
  [/^(BUY_GOODS|SHOP|GYPSYSHOP|GYPSY_SHOP|MYSTERY_SHOP|MAGIC_HOUSE|MAGICHOUSE)/, "Loja"],
  [/^(SEND_MAIL|MAIL|USER_GET_GIFTS|USER_SEND_GIFTS)/, "Correio/Presentes"],
  [/^(GAME_ROOM|ROOM_|SCENE_ADD_USER|SCENE_REMOVE_USER|SCENE_STATE|SCENE_CHANNEL)/, "Sala/Hall"],
  [/^(GAME_MISSION_START|GAME_CMD|GAME_CREATE|GAME_LOAD|GAME_OVER|ALL_MISSION_OVER|START_GAME|FIRE|TURN)/, "Batalha"],
  [/^(NEW_HALL)/, "Hall Novo (NewHall)"],
  [/^(QUEST|TASK|MISSION_)/, "Missões"],
  [/^(CONSORTIA|GUILD)/, "Sociedade/Guilda"],
  [/^(AUCTION)/, "Leilão"],
  [/^(MARRY|DIVORCE|CHURCH|EDICTUM)/, "Casamento"],
  [/^(HOTSPRING)/, "Termas"],
  [/^(TOTEM)/, "Totem"],
  [/^(AVATAR_COLLECTION)/, "Álbum (AvatarCollection)"],
  [/^(PLAYER_DRESS|ENCHANT)/, "Figurino/Encantamento"],
  [/^(IM_CMD|SCENE_CHAT|SCENE_FACE|FRIEND)/, "Chat/Amigos"],
  [/^(CARDS_|CARD_)/, "Cartas"],
  [/^(ACHIEVEMENT)/, "Conquistas"],
  [/^(BUFF)/, "Buffs"],
  [/^(PET)/, "Pets"],
  [/^(RUNE|BEAD)/, "Runas/Beads"],
  [/^(NECKLACE)/, "Colar"],
  [/^(VIP|FIRSTRECHARGE|TOTAL_CHARGE|RECHARGE|CONSUME_RANK)/, "VIP/Recarga"],
  [/^(HORSERACE)/, "Corrida de Montaria"],
  [/^(HORSE)/, "Montaria"],
  [/^(RINGSTATION|RING_STATION)/, "Arena Ranqueada (RingStation)"],
  [/^(KING_DIVISION)/, "Liga dos Exploradores"],
  [/^(KING_BLESS)/, "Juramento do Rei"],
  [/^(DRAGON_BOAT)/, "Barco-dragão"],
  [/^(MAGIC_STONE)/, "Relíquias (Magic Stone)"],
  [/^(GROWTH)/, "Passe Clássico"],
  [/^(CATCHBEAST|CATCH_BEAST)/, "Capturar Nian"],
  [/^(BOMB_KING)/, "Rei da Bomba"],
  [/^(COLLECTION_TASK)/, "Coleta"],
  [/^(RESCUE)/, "Resgate"],
  [/^(FLOWER_GIVING)/, "Dar Flores"],
  [/^(MAGPIE_BRIDGE)/, "Ponte da Pega"],
  [/^(WORSHIP_THE_MOON)/, "Festival da Lua"],
  [/^(CRYPTBOSS)/, "Boss da Cripta"],
  [/^(BATTLE_GROUND|CAMPBATTLE|CAMP)/, "Campo de Batalha/Acampamento"],
  [/^(DICE_SYSTEM|DICE)/, "Dados"],
  [/^(TREASUREPUZZL|TREASURE)/, "Tesouro"],
  [/^(SEVEN_DOUBLE)/, "Sete Dobrado"],
  [/^(LANTERNRIDDLES)/, "Enigmas da Lanterna"],
  [/^(GODSROADS|LIGHTROAD)/, "Caminhos/Estrada dos Deuses"],
  [/^(HALLOWEEN)/, "Halloween"],
  [/^(CHRISTMAS)/, "Natal"],
  [/^(NEWYEARRICE)/, "Ano Novo"],
  [/^(GROUP_PURCHASE)/, "Compra em Grupo"],
  [/^(DEED_)/, "Escritura/Progressão"],
  [/^(TRUSTEESHIP)/, "Curadoria/Automação"],
  [/^(TRANSNATIONALFIGHT|CONSORTIA_BATTLE)/, "Cross-zone/GvG"],
  [/^(ACTIVE_SYSTEM|ACTIVITY|EVERYDAY_ACTIVEPOINT|WEEKLY_)/, "Eventos/Atividades"],
  [/^(SUPERWINNER)/, "Super Vencedor"],
  [/^(LOTTERY|MYSTERIOUSROULETTE|LEFT_GUN_ROULETTE)/, "Loteria/Roleta"],
  [/^(SAVE_DB)/, "Infra/Sistema"],
  [/^(WORLDBOSS|BOSS)/, "Boss Mundial"],
  [/^(ANSWERBOX|USER_ANSWER|USE_ANSWER)/, "Quiz/Caixa de Respostas"],
  [/^(UPDATE_PLAYER_INFO|UPDATE_PRIVATE_INFO|CHANGE_STATE|CHANGE_NICKNAME)/, "Perfil do Jogador"],
  [/^(FARM)/, "Fazenda"],
  [/^(NEWCHICKENBOX|CADDY|LUCKSTONE|LEFT_GUN_ROULETTE)/, "Loteria/Roleta"],
  [/^(SEPARATE_ACTIVITY)/, "Tesouro"],
  [/^(HONOR_UP_COUNT|GET_SIGNAWARD|GET_TIME_BOX|DAILY_AWARD|DAILYRECORD|DAY_SIGN)/, "Eventos/Atividades"],
  [/^(WISHBEADEQUIP)/, "Runas/Beads"],
  [/^(CHAT_|SNS_MSG|S_BUGLE|B_BUGLE|C_BUGLE)/, "Chat/Amigos"],
  [/^(SELL_GOODS|SEll_GOODS|CHANGE_PLACE_GOODS|GAME_TAKE_TEMP|GOODS_PRESENT)/, "Bolsa/Itens"],
  [/^(PROP_BUY|PROP_SELL|BUY_GIFTBAG)/, "Loja"],
  [/^(FIGHT_NPC|GOODS_EXCHANGE|COLLECTINFO)/, "Missões"],
  [/^(SCENE_LOGIN|SCENE_USERS_LIST|PICC)/, "Sala/Hall"],
  [/^(GET_PLAYER_CARD|ACTIVE_PULLDOWN|USER_RANK)/, "Progressão/Ranking"],
  [/^(MATE_ONLINE_TIME)/, "Casamento"],
  [/^(BATTLE_COMPANION_GIVE)/, "Batalha"],
];
function areaOf(name) {
  for (const [re, area] of AREA_RULES) if (re.test(name)) return area;
  return "Outros";
}

// ---------------------------------------------------------------------------------------------
// 4. main
// ---------------------------------------------------------------------------------------------
async function main() {
  mkdirSync("research/6600", { recursive: true });

  // -- packets --------------------------------------------------------------------------------
  const epMap = parseEPackageType(EPACKAGETYPE_CS); // name -> code (312 entries incl. duplicate-value names)
  const sends = extractClientSends(AS3_SRC); // every function with new PackageOut(...)
  const byCode = new Map(); // code -> { codeNames:Set, fns:[{func,file,epName}] }
  for (const s of sends) {
    let code = null;
    if (s.epName && epMap.has(s.epName)) code = epMap.get(s.epName);
    else {
      const n = Number.parseInt(s.expr, 0);
      if (Number.isFinite(n)) code = n;
    }
    if (code === null) continue;
    let e = byCode.get(code);
    if (!e) byCode.set(code, (e = { codeNames: new Set(), fns: [] }));
    if (s.epName) e.codeNames.add(s.epName);
    e.fns.push(s);
  }

  const { createRegistry } = await tsImport("../../apps/game/src/handlers/index.ts", import.meta.url);
  const live = new Map(createRegistry().list().map((h) => [h.code, h]));

  // file attribution (best-effort, display only): same regex apps/game registrations use.
  const handlerFile = new Map();
  const HDIR = "apps/game/src/handlers";
  function scanHandlerDir(dir) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) scanHandlerDir(p);
      else if (ent.name.endsWith(".ts") && !ent.name.endsWith(".test.ts")) {
        const t = readFileSync(p, "utf8");
        for (const m of t.matchAll(/\.player\(\s*(\d+)\s*,\s*"([^"]+)"/g)) handlerFile.set(+m[1], relative(HDIR, p).replaceAll("\\", "/"));
        for (const m of t.matchAll(/register\(\{\s*code:\s*(\d+)/g)) handlerFile.set(+m[1], relative(HDIR, p).replaceAll("\\", "/"));
      }
    }
  }
  scanHandlerDir(HDIR);

  const packetRows = [];
  for (const [code, e] of byCode) {
    const h = live.get(code);
    const status = h?.status ?? "MISSING";
    const names = [...e.codeNames].join("/") || "(literal)";
    packetRows.push({
      code,
      name: names,
      area: areaOf([...e.codeNames][0] ?? ""),
      fns: e.fns.map((f) => `${f.func} (${f.file})`).join("; "),
      status,
      file: handlerFile.get(code) ?? "",
    });
  }
  packetRows.sort((a, b) => a.code - b.code);

  const packetTotals = { implemented: 0, partial: 0, stub: 0, MISSING: 0 };
  for (const r of packetRows) packetTotals[r.status] = (packetTotals[r.status] ?? 0) + 1;

  const packetByArea = new Map();
  for (const r of packetRows) {
    if (!packetByArea.has(r.area)) packetByArea.set(r.area, []);
    packetByArea.get(r.area).push(r);
  }

  // -- endpoints --------------------------------------------------------------------------------
  const { endpointStatus } = await tsImport("../../apps/api/src/request/registry.ts", import.meta.url);
  const { TEMPLATES } = await tsImport("../../apps/api/src/templates/defs.ts", import.meta.url);
  const st = endpointStatus();
  const portedSet = new Set(st.ported.map((p) => p.toLowerCase()));
  const stubSet = new Set(st.stubs.map((p) => p.toLowerCase()));
  const templateFileNames = new Set();
  const templateEndpoints = new Set();
  for (const t of TEMPLATES) {
    if (t.endpoint) templateEndpoints.add(t.endpoint.toLowerCase());
    for (const f of t.files) templateFileNames.add(f.name.toLowerCase());
  }

  function walkRequestFiles(dir, out = []) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(ent.name)) continue;
      const p = join(dir, ent.name);
      const st2 = statSync(p);
      if (st2.isDirectory()) walkRequestFiles(p, out);
      else if ([".ashx", ".xml", ".aspx"].includes(extname(ent.name).toLowerCase())) out.push(p);
    }
    return out;
  }
  const reqFiles = walkRequestFiles(REQUEST_DIR);
  const endpointRows = [];
  for (const abs of reqFiles) {
    const rel = "/" + relative(REQUEST_DIR, abs).replaceAll("\\", "/");
    const ext = extname(rel).toLowerCase();
    const lower = rel.toLowerCase();
    const base = basename(rel, ext).toLowerCase();
    let status;
    let note = "";
    if (ext === ".ashx") {
      if (portedSet.has(lower)) status = "native";
      else if (templateEndpoints.has(lower)) status = "native (template rebuild)";
      else if (stubSet.has(lower)) status = "empty (stub gracioso)";
      else status = "empty (desconhecido)";
    } else if (ext === ".xml") {
      if (templateFileNames.has(base)) status = "native";
      else if (/celeb/.test(base)) status = "empty (ranking vazio, sem tabela cross-area)";
      else status = "snapshot";
    } else {
      // .aspx
      if (lower === "/createlogin.aspx") status = "native";
      else if (/^\/aas(getstate|updatestate)\.aspx$/.test(lower)) {
        status = "não roteado (fora de escopo)";
        note = "Anti-Addiction System (China/Ásia) — decidido fora de escopo BR, research/6600/client-boot.md";
      } else status = "não roteado (404)";
    }
    endpointRows.push({ path: rel, ext: ext.slice(1), status, note });
  }
  endpointRows.sort((a, b) => a.path.localeCompare(b.path));
  const endpointTotals = {};
  for (const r of endpointRows) endpointTotals[r.status] = (endpointTotals[r.status] ?? 0) + 1;

  // -- markdown ---------------------------------------------------------------------------------
  const L = [];
  L.push("# M3 — cobertura de pacotes e endpoints do cliente DDT-6600");
  L.push("");
  L.push("> Gerado por `tools/qa/packet-coverage-6600.mjs` (`node tools/qa/packet-coverage-6600.mjs`).");
  L.push("> Fonte dos pacotes: todo `new PackageOut(ePackageType.X)` em qualquer `*SocketOut.as` de");
  L.push(`> \`${AS3_SRC}\`, resolvido contra \`${EPACKAGETYPE_CS}\` (312 valores,`);
  L.push("> docs/plan/MIGRACAO-6600.md §1.1), e contra o registro vivo de `apps/game/src/handlers/index.ts`");
  L.push("> (`createRegistry()`). Fonte dos endpoints: toda árvore real de");
  L.push(`> \`${REQUEST_DIR}\` (263 \`.ashx\` + 184 \`.xml\` + 35 \`.aspx\`, mesma`);
  L.push("> contagem de docs/plan/MIGRACAO-6600.md §1.3), contra `apps/api/src/request/registry.ts`");
  L.push("> (PORTED/STUBS) e `apps/api/src/templates/defs.ts` (TEMPLATES, builders DB-backed).");
  L.push("");
  L.push("## Totais — pacotes (client→server)");
  L.push("");
  L.push("| Status | Total |");
  L.push("|---|---|");
  for (const k of ["handled", "partial", "stub", "MISSING"]) L.push(`| ${k} | ${packetTotals[k] ?? 0} |`);
  L.push(`| **Total de códigos enviados pelo cliente** | **${packetRows.length}** |`);
  L.push("");
  L.push("## Totais — endpoints (.ashx/.xml/.aspx)");
  L.push("");
  L.push(
    "> Contagem de arquivo-fonte real (deduplicado, excluindo `obj/`/`Bin/`/publish de " +
      `\`${REQUEST_DIR}\`): difere do \"263 .ashx / 184 .xml / 35 .aspx\" de ` +
      "docs/plan/MIGRACAO-6600.md §1.3, que é uma contagem recursiva simples (inclui cópias " +
      "duplicadas em `obj/Release/Package/PackageTmp/*`) — aqui cada endpoint aparece 1 vez.",
  );
  L.push("");
  L.push("| Status | Total |");
  L.push("|---|---|");
  for (const [k, v] of Object.entries(endpointTotals).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push(`| **Total de arquivos** | **${endpointRows.length}** |`);
  L.push("");
  L.push("## Pacotes por área");
  L.push("");
  const areaOrder = [...packetByArea.keys()].sort((a, b) => packetByArea.get(b).length - packetByArea.get(a).length);
  for (const area of areaOrder) {
    const rows = packetByArea.get(area);
    const t = { implemented: 0, partial: 0, stub: 0, MISSING: 0 };
    for (const r of rows) t[r.status] = (t[r.status] ?? 0) + 1;
    L.push(`### ${area} (${rows.length} código(s) — implemented ${t.implemented}, partial ${t.partial}, stub ${t.stub}, MISSING ${t.MISSING})`);
    L.push("");
    L.push("| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |");
    L.push("|---|---|---|---|---|");
    for (const r of rows.sort((a, b) => a.code - b.code)) {
      L.push(`| ${r.code} | \`${r.name}\` | ${r.fns.replace(/\|/g, "\\|")} | ${r.status} | ${r.file} |`);
    }
    L.push("");
  }
  L.push("## Endpoints — detalhe completo");
  L.push("");
  L.push("| Caminho | Tipo | Status | Observação |");
  L.push("|---|---|---|---|");
  for (const r of endpointRows) L.push(`| \`${r.path}\` | ${r.ext} | ${r.status} | ${r.note} |`);
  L.push("");

  const out = L.join("\n");
  writeFileSync("research/6600/coverage-m3.md", out);
  console.log(
    JSON.stringify(
      {
        packets: { total: packetRows.length, ...packetTotals },
        endpoints: { total: endpointRows.length, ...endpointTotals },
      },
      null,
      1,
    ),
  );
  console.log("research/6600/coverage-m3.md escrito.");
}

main();
