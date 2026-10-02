/**
 * Generates docs/QA-MATRIX.md (+ docs/qa-matrix.json): every packet the AS3 client sends (from
 * docs/spec/server/tools/out/client-sends.json), the client views/controllers that call it (scan of
 * "vendor/DDTank41/Source Flash/src"), and the game server handler status taken from the live registry
 * (apps/game/src/handlers). Manual columns (client-verified, notes, broken) live in tools/qa/overrides.json and are
 * merged by row key `<code>:<function>` so the matrix can be regenerated at any time.
 *
 * Run from the repo root: `npx tsx tools/qa/gen-matrix.ts`
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { createRegistry } from "../../apps/game/src/handlers/index.js";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "vendor/DDTank41/Source Flash/src");
const sends: { code: number; expr: string; func: string; file: string; writes: string[] }[] = JSON.parse(
  readFileSync(join(ROOT, "docs/spec/server/tools/out/client-sends.json"), "utf8"),
);
interface Override { verified?: "yes" | "no"; status?: string; notes?: string; evidence?: string }
const OV_PATH = join(ROOT, "tools/qa/overrides.json");
const overrides: Record<string, Override> = existsSync(OV_PATH) ? JSON.parse(readFileSync(OV_PATH, "utf8")) : {};

// ---- callers: `out.<func>(` in every .as file except the socket-out classes themselves
const callers = new Map<string, Set<string>>();
function walk(dir: string): void {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".as") && !/SocketOut\.as$/.test(f)) {
      const txt = readFileSync(p, "latin1");
      for (const m of txt.matchAll(/\bout\.(send\w+)\s*\(/g)) {
        const s = callers.get(m[1]!) ?? new Set();
        s.add(relative(SRC, p).replace(/\\/g, "/"));
        callers.set(m[1]!, s);
      }
    }
  }
}
walk(SRC);

// ---- server status from the registry
const reg = new Map(createRegistry().list().map((h) => [h.code, h]));

// ---- area classification (first matching rule on caller paths + function name)
const AREAS: [string, RegExp][] = [
  ["Conta/Login", /^(login|serverlist|baglocked)\/|sendLogin|BagLock|Password|sendPint|sendErrorMsg|sendSyncDate|sendCheckCode/i],
  ["Bolsa/Inventário", /^(bagAndInfo|changeColor|equipretrieve|equipDebt)\/|ItemOpenUp|MoveGoods|UseCard|UseProp|ItemOverDue|HideLayer|ReclaimGoods|Unchain|GoodsContinue|UseReworkName|ChangeColor|ChangeSex|EquipRetrieve|sendDeleteGoods/i],
  ["Loja", /^shop\/|BuyGoods|QuickBuy|GoodsCount|BuyGiftBag|sendBuyProp|PropSell/i],
  ["Ferreiro", /^(store|gemstone|latentEnergy)\/|ItemStrength|ItemCompose|ItemFusion|ItemEmbed|ItemTransfer|ItemTrend|ClearStoreBag|FiveSixHole|ItemExalt|Necklace|WishBead|LatentEnergy|FightSpirit/i],
  ["Personagem/FC", /^(character|texpSystem|AvatarCollection|newTitle|tryonSystem)\/|Texp|ItemEquip|sendGetUserEquip|AvatarColl|Title/i],
  ["Missões", /^(quest|daily|accumulativeLogin|effortView|calendar)\/|Quest|DailyAward|Achievement|UserAnswer|syncStep|syncWeakStep/i],
  ["Correio", /^email\/|Mail|sendGoodsPresent|sendBuyGift/i],
  ["Amigos", /^(im|socialContact|invite|inviteFriends|cityWide)\/|Friend|sendAddFriend|sendDelFriend|IMCmd|sendOneOnOne|sendGetPlayerCard/i],
  ["Lobby/Chat/Bugle", /^ddt\/view\/chat|Bugle|sendChat|sendScene(Chat|Face)|Chat/i],
  ["Salas PvP", /^(room|roomList|roomLoading)\/|GameRoom|sendCreateRoom|sendGame(Login|Start|Kick|Team)|sendExitRoom|RoomPlace|sendSceneLogin|sendGameStyle|sendGameMode/i],
  ["Combate (GAME_CMD)", /^(game|phy|tank)\/|GameCMD|sendShoot|sendGameCMD|sendFire|sendMove|sendUseProp|sendSkip|sendDirection|sendGunAngle|sendBeat|sendFly/i],
  ["PvE/Masmorras", /^(fightLib|labyrinth|trainer)\/|Mission|Labyrinth|PassDrama|TakeCard|sendShowCard|FightLib|TryAgain/i],
  ["Sociedade/Guilda", /^(consortion|ddt\/view\/consortia)\/|Consortia|Badge/i],
  ["GvG/Liga", /^(league|eliteGame)\//i],
  ["Eventos/Atividades", /^(activeEvents|wonderfulActivity|noviceactivity|LimitAward|firstRecharge|lanternriddles|luckStar|newChickenBox|chickActivation|surpriseRoulette|roulette|lottery|deng|guildMemberWeek|times|lightRoad|giftSystem)\/|Active|Lottery|Roulette|LeftGun|ChickenBox|LuckStar|Caddy|OpenDead|StartTurn|FinishRoulette/i],
  ["Hall da Fama/Ranking", /^(tofflist|hall)\/|Celeb|Rank|Order/i],
  ["Escola/Aprendiz", /^academy\/|Academy|Apprentice|Master/i],
  ["Spa/Fonte termal", /^hotSpring\/|HotSpring|sendHot/i],
  ["Casamento", /^church\/|Marry|Church|Wedding|Divorce|sendPropos/i],
  ["Leilão", /^auctionHouse\/|Auction/i],
  ["Pets", /^(pet|petsBag)\/|Pet/i],
  ["Fazenda", /^farm\/|Farm|Field/i],
  ["Cartas", /^cardSystem\/|Card/i],
  ["Totem/Honra", /^totem\/|Totem|Honor/i],
  ["VIP", /^vip\/|VIP|Vip/i],
  ["Boss mundial/Minigames", /^(worldboss|littleGame)\/|WorldBoss|LittleGame/i],
  ["Configurações", /^(setting|feedback|exitPrompt|gotopage|overSeasCommunity)\/|Setting|Feedback|Enthrall/i],
];
/** Router codes whose sends live in the socket-out classes: area by packet code. */
const CODE_AREA: Record<number, string> = {
  91: "Combate (GAME_CMD)", 81: "Fazenda", 68: "Pets", 129: "Sociedade/Guilda", 94: "Salas PvP", 160: "Amigos", 187: "Spa/Fonte termal",
  102: "Boss mundial/Minigames", 166: "Boss mundial/Minigames", 16: "Lobby/Chat/Bugle", 21: "Lobby/Chat/Bugle", 69: "Lobby/Chat/Bugle", 70: "Salas PvP", 4: "Conta/Login", 5: "Conta/Login",
  300: "Conta/Login", 172: "Conta/Login", 40: "Amigos", 53: "Eventos/Atividades", 48: "Loja", 75: "Combate (GAME_CMD)", 50: "PvE/Masmorras",
};
function areaOf(func: string, files: string[], code: number): string {
  for (const [name, re] of AREAS) if (files.some((f) => !/SocketOut\.as$/.test(f) && re.test(f))) return name;
  if (CODE_AREA[code]) return CODE_AREA[code]!;
  for (const [name, re] of AREAS) if (re.test(func)) return name;
  return "Outros";
}

/** "Byte(FarmPackageType.BUY_PET_EXP_ITEM=19)" -> "BUY_PET_EXP_ITEM=19" (sub-command of a router code). */
function subOf(writes: string[]): string {
  const m = writes[0]?.match(/^(?:Byte|Int)\(\w*PackageType\.(\w+=\d+)\)/i) ?? writes[0]?.match(/^(?:Byte|Int)\((\w+\.\w+=\d+)\)/);
  return m ? m[1]! : "";
}

interface Row {
  key: string; area: string; func: string; files: string[]; code: number; name: string; sub: string;
  server: string; verified: string; notes: string; evidence: string;
}
const rows: Row[] = [];
for (const s of sends) {
  const key = `${s.code}:${s.func}`;
  const files = [...(callers.get(s.func) ?? [])].sort();
  if (!files.length && s.file !== "ddt/manager/GameSocketOut.as") files.push(s.file);
  const h = reg.get(s.code);
  const o = overrides[key] ?? {};
  const server = o.status ?? (h ? (h.status === "implemented" ? "ok" : h.status) : "missing");
  rows.push({
    key, area: areaOf(s.func, files, s.code), func: s.func, files, code: s.code, name: s.expr.replace(/^ePackageType\./, ""),
    sub: subOf(s.writes), server, verified: o.verified ?? "no", notes: o.notes ?? "", evidence: o.evidence ?? "",
  });
}
rows.sort((a, b) => a.area.localeCompare(b.area) || a.code - b.code || a.func.localeCompare(b.func));

// ---- stats + markdown
const areas = [...new Set(rows.map((r) => r.area))].sort();
const count = (l: Row[], f: (r: Row) => boolean) => l.filter(f).length;
let md = `# Matriz de QA — cliente Flash × servidor

> **Gerado** por \`npx tsx tools/qa/gen-matrix.ts\` — não edite as tabelas à mão. Colunas manuais (verificado no cliente,
> notas, evidência, status "broken") ficam em \`tools/qa/overrides.json\` (chave \`<código>:<função>\`). Fontes: pacotes que o
> cliente envia (\`docs/spec/server/tools/out/client-sends.json\`), quem chama cada função (varredura de
> \`vendor/DDTank41/Source Flash/src\`), status do handler lido do registro vivo \`apps/game/src/handlers\` (ver \`apps/game/HANDLERS.md\`).
>
> Status do servidor: **ok** = portado; **partial** = fluxo principal ok, partes faltando; **stub** = no-op registrado;
> **missing** = código não registrado (pacote descartado); **broken** = testado no cliente e com defeito (override).
> Códigos com sub-comando (94, 91, 129, 160, ...) mostram o status do código; o sub está na coluna *Sub*.

## Resumo por área

| Área | Linhas | ok | partial | stub | missing | broken | verificado no cliente |
|---|---|---|---|---|---|---|---|
`;
for (const a of areas) {
  const l = rows.filter((r) => r.area === a);
  md += `| ${a} | ${l.length} | ${count(l, (r) => r.server === "ok")} | ${count(l, (r) => r.server === "partial")} | ${count(l, (r) => r.server === "stub")} | ${count(l, (r) => r.server === "missing")} | ${count(l, (r) => r.server === "broken")} | ${count(l, (r) => r.verified === "yes")} |\n`;
}
md += `| **Total** | ${rows.length} | ${count(rows, (r) => r.server === "ok")} | ${count(rows, (r) => r.server === "partial")} | ${count(rows, (r) => r.server === "stub")} | ${count(rows, (r) => r.server === "missing")} | ${count(rows, (r) => r.server === "broken")} | ${count(rows, (r) => r.verified === "yes")} |\n\n`;

for (const a of areas) {
  md += `## ${a}\n\n| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |\n|---|---|---|---|---|---|---|\n`;
  for (const r of rows.filter((x) => x.area === a)) {
    const files = r.files.slice(0, 3).map((f) => `\`${f}\``).join("<br>") + (r.files.length > 3 ? ` (+${r.files.length - 3})` : "");
    const notes = [r.notes, r.evidence ? `evidência: ${r.evidence}` : ""].filter(Boolean).join(" — ").replace(/\|/g, "\\|");
    md += `| \`${r.func}\` | ${files || "—"} | ${r.code} ${r.name} | ${r.sub} | ${r.server} | ${r.verified} | ${notes} |\n`;
  }
  md += "\n";
}
writeFileSync(join(ROOT, "docs/QA-MATRIX.md"), md);
writeFileSync(join(ROOT, "docs/qa-matrix.json"), JSON.stringify(rows, null, 1));
console.log(`QA matrix: ${rows.length} rows, ${areas.length} areas -> docs/QA-MATRIX.md`);
