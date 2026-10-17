// Gera docs/MAPA-DO-JOGO.md: pra cada tela/feature do jogo (pasta do cliente Flash), quais pacotes ela manda,
// qual função do servidor TS responde (arquivo:linha) e qual handler C# original foi a base.
// Uso: node tools/docs/game-map.mjs
//
// Como lê esse código (cada variável):
// SRC fonte AS3 do cliente; CS handlers C#; H handlers TS; types nome->código (ePackageType.as);
// senders função sendX do cliente -> {code, name}; callers arquivo AS3 que chama cada sendX; server código -> local TS;
// csByCode código -> arquivo C#; byModule pasta do cliente -> linhas da tabela.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "vendor/DDTank41/Source Flash/src");
const CS = join(ROOT, "vendor/DDTank41/Game.Server");
const H = join(ROOT, "apps/game/src/handlers");

// Nome da tela em PT-BR por pasta do cliente (o que o jogador vê).
const SCREEN = {
  "store": "Forja — Ferraria (Fortalecer/Montar/Compor/Transferir/Fundir)",
  "store/forge": "Forja — aba Forno (Dourar/Evolução/Energia latente/Gemas)",
  "store/forge/wishBead": "Forja — Forno › Dourar (fusão dourada)",
  "store/equipGhost": "Forja — Espírito do equipamento", "store/fineStore": "Forja — Refinar conjunto",
  "latentEnergy": "Forja — Energia latente", "gemstone": "Forja — Gemas", "totem": "Totem", "AvatarCollection": "Coleção de visuais",
  "academy": "Academia (mestre/aprendiz)", "auctionHouse": "Leilão", "bagAndInfo": "Bolsa e personagem", "baglocked": "Senha da bolsa",
  "calendar": "Calendário", "cardSystem": "Cartas", "changeColor": "Trocar cor", "church": "Igreja / casamento",
  "consortion": "Sociedade (guilda)", "daily": "Recompensa diária", "eliteGame": "Liga de elite", "email": "Correio",
  "farm": "Fazenda", "fightLib": "Campo de treino", "game": "Batalha", "hall": "Lobby", "hallIcon": "Ícones do lobby",
  "hotSpring": "Termas", "im": "Amigos / chat privado", "invite": "Convites", "inviteFriends": "Convidar amigos",
  "labyrinth": "Labirinto", "league": "Liga", "lightRoad": "Caminho da luz", "littleGame": "Minigames", "login": "Login",
  "lottery": "Loteria", "luckStar": "Estrela da sorte", "newChickenBox": "Baú da galinha", "newTitle": "Títulos",
  "noviceactivity": "Atividades de novato", "pet": "Mascote", "petsBag": "Bolsa do mascote", "quest": "Missões",
  "room": "Sala", "roomList": "Lista de salas", "roulette": "Roleta", "shop": "Loja", "setting": "Configurações",
  "texpSystem": "Treino de atributos", "tofflist": "Ranking", "vip": "VIP", "wonderfulActivity": "Atividades especiais",
  "worldboss": "Boss mundial", "guildMemberWeek": "Semana da sociedade", "activeEvents": "Eventos", "ddt": "Núcleo do cliente (várias telas)",
};

const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; };

// 1) códigos de pacote e funções sendX do cliente
const types = new Map();
for (const m of readFileSync(join(SRC, "ddt/data/socket/ePackageType.as"), "utf8").matchAll(/const ([A-Z_0-9]+):int = (\d+)/g)) types.set(m[1], +m[2]);
const out = readFileSync(join(SRC, "ddt/manager/GameSocketOut.as"), "utf8");
const senders = new Map();
for (const m of out.matchAll(/public function (send\w+|\w+)\(([^)]*)\)[^{]*\{([\s\S]*?)\n      \}/g)) {
  const pk = m[3].match(/new PackageOut\(\s*(?:ePackageType\.)?([A-Z_0-9]+|\d+)/);
  if (!pk) continue;
  senders.set(m[1], { code: /^\d+$/.test(pk[1]) ? +pk[1] : types.get(pk[1]), name: pk[1] });
}
// 2) quem chama cada sendX (arquivo AS3 -> pasta = tela)
const asFiles = walk(SRC).filter((f) => f.endsWith(".as") && !f.endsWith("GameSocketOut.as"));
const uses = []; // {module, file, fn}
for (const f of asFiles) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/\.out\.(\w+)\(/g)) if (senders.has(m[1])) {
    const rel = relative(SRC, f).replace(/\\/g, "/");
    const parts = rel.split("/");
    const module = [3, 2, 1].map((n) => parts.slice(0, n).join("/")).find((k) => SCREEN[k]) ?? parts[0];
    uses.push({ module, file: rel, fn: m[1] });
  }
}
// 3) servidor TS: r.player(code, "NOME", ...) e r.player(code, ...).on(sub, ...)
const server = new Map();
// walk() recurses (pastas tipo handlers/forja/*.ts contam igual aos arquivos soltos de handlers/).
for (const f of walk(H).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
  const rel = relative(H, f).replace(/\\/g, "/");
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((l, i) => {
    const m = l.match(/\.player\(\s*(\d+)\s*,\s*"([^"]+)"\s*,\s*(?:\([^)]*\)\s*=>\s*(\w+)\(|(\w+))?/);
    if (m && !server.has(+m[1])) server.set(+m[1], { where: `apps/game/src/handlers/${rel}:${i + 1}`, fn: m[3] ?? m[4] ?? "", name: m[2] });
  });
}
// 4) handler C# original por código
const csByCode = new Map();
for (const f of walk(CS).filter((f) => f.endsWith(".cs"))) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/PacketHandler\(\s*(?:\(int\)\s*ePackageType\.([A-Z_0-9]+)|(\d+))/g)) {
    const code = m[2] ? +m[2] : types.get(m[1]);
    if (code !== undefined && !csByCode.has(code)) csByCode.set(code, relative(ROOT, f).replace(/\\/g, "/"));
  }
}
// 5) monta o markdown por tela
const byModule = new Map();
for (const u of uses) {
  const s = senders.get(u.fn);
  const key = `${u.fn}|${s.code}`;
  const list = byModule.get(u.module) ?? new Map();
  if (!list.has(key)) list.set(key, { fn: u.fn, code: s.code, name: s.name, files: new Set() });
  list.get(key).files.add(u.file);
  byModule.set(u.module, list);
}
const md = [
  "# Mapa do jogo — tela → cliente → pacote → servidor → C#",
  "",
  "Gerado por `node tools/docs/game-map.mjs` (não editar à mão). Como achar uma feature:",
  "1. Ache a tela abaixo (nome que aparece no jogo).",
  "2. A coluna **Cliente** mostra o arquivo AS3 do botão/janela (`vendor/DDTank41/Source Flash/src/...`).",
  "3. **Pacote** é o número que o cliente manda; **Servidor** é o arquivo:linha em TS que responde (Ctrl+clique).",
  "4. **C# original** é a base que foi portada (só leitura).",
  "",
  "Fluxo de qualquer ação: clique no cliente → `GameSocketOut.sendX()` manda o pacote → `handlers/<arquivo>.ts`",
  "(`r.player(código, ...)`) lê os bytes → muda o jogador/bolsa → responde com pacote de `packets/out.ts` → salva em",
  "`game/player.ts` `saveIntoDatabase` (ao sair e a cada 10 min).",
  "",
];
const order = [...byModule.keys()].sort((a, b) => (SCREEN[a] ?? a).localeCompare(SCREEN[b] ?? b));
for (const mod of order) {
  md.push(`## ${SCREEN[mod] ?? mod}`, "", "| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |", "|---|---|---|---|---|");
  for (const r of [...byModule.get(mod).values()].sort((a, b) => a.code - b.code)) {
    const sv = server.get(r.code);
    const files = [...r.files].slice(0, 2).map((f) => "`" + f + "`").join("<br>") + (r.files.size > 2 ? ` (+${r.files.size - 2})` : "");
    md.push(`| \`${r.fn}\` | ${files} | ${r.code} ${r.name} | ${sv ? `[${sv.fn || sv.name}](../${sv.where.replace(/:(\d+)$/, "#L$1")}) \`${sv.where}\`` : "**FALTA PORTAR**"} | ${csByCode.has(r.code) ? "`" + csByCode.get(r.code) + "`" : "—"} |`);
  }
  md.push("");
}
writeFileSync(join(ROOT, "docs/MAPA-DO-JOGO.md"), md.join("\n"));
console.log(`docs/MAPA-DO-JOGO.md: ${order.length} telas, ${uses.length} chamadas, ${server.size} códigos no servidor`);
