import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { validateGameLogin } from "@ddt/auth";
import { sql } from "drizzle-orm";
import { app as appSchema, createDb, createDevAccounts, migrateDb, seedDatabase, type DbHandle } from "@ddt/db";
import { buildLoginPayload, bytesToBase64, generateRsaKey, rsaEncryptPkcs1, toDotNetRsaXml, type RsaPrivateKey } from "@ddt/protocol";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { REPO_ROOT } from "../src/config.js";
import type { AppCtx } from "../src/context.js";
import { q1 } from "../src/lib/db.js";

const VENDOR_REQ = join(REPO_ROOT, "vendor", "DDTank41", "Tank.Request");
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppCtx;
let key: RsaPrivateKey;
let adminToken = "";

const tmp = mkdtempSync(join(tmpdir(), "ddt-api-"));
const flashDir = join(tmp, "flash");
const resDir = join(tmp, "resource");

beforeAll(async () => {
  mkdirSync(join(flashDir, "ui"), { recursive: true });
  mkdirSync(join(resDir, "image", "Arm"), { recursive: true });
  writeFileSync(join(flashDir, "Config.xml"), `<root><config><FLASHSITE value="http://old/flash/"/><REQUEST_PATH value="http://old/Request/"/><SITE value="http://old/"/><POLICY_FILES><file value="x"/></POLICY_FILES></config></root>`);
  writeFileSync(join(flashDir, "Loading.swf"), "FWS");
  writeFileSync(join(resDir, "image", "Arm", "Show.PNG"), "png");
  key = generateRsaKey(1024);
  h = await createDb("pglite:memory");
  await migrateDb(h);
  await seedDatabase(h);
  await createDevAccounts(h);
  ({ app, ctx } = await buildApp({
    db: h,
    logger: false,
    env: {},
    config: {
      NODE_ENV: "test",
      RSA_PRIVATE_KEY: toDotNetRsaXml(key),
      FLASH_DIR: flashDir,
      RESOURCE_DIR: resDir,
      UPLOAD_DIR: join(tmp, "uploads"),
      GAME_HOST: "127.0.0.1",
      GAME_PORT: 9200,
      GAME_INTERNAL_URL: "",
      PUBLIC_URL: "http://api.test",
      DB_MIGRATE: false,
      DB_SEED_IF_EMPTY: false,
    },
  }));
  const r = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "admin", password: "admin" } });
  adminToken = r.json().token;
});
afterAll(async () => {
  await app?.close();
  await h?.close();
});

const inflate = (b: Buffer) => inflateSync(b).toString("utf8");
const firstTag = (xml: string, tag: string) => new RegExp(`<${tag}\\s[^>]*?/?>`).exec(xml)?.[0] ?? "";
const attrNames = (tagText: string) => [...tagText.matchAll(/\s([\w.]+)="/g)].map((m) => m[1]);

function loginBlob(user: string, pwd: string, temp: string, nick = ""): string {
  // LoginStateView.creatLoginLoader: 7 UTC date bytes + "user,key,tempPwd,nickname", RSA PKCS#1 v1.5, base64
  const payload = buildLoginPayload(`${user},${pwd},${temp}`, nick, new Array(8).fill(0)).subarray(0, 7);
  const body = Buffer.concat([Buffer.from(payload), Buffer.from(`${user},${pwd},${temp},${nick}`, "utf8")]);
  return bytesToBase64(rsaEncryptPkcs1(key, body));
}

/** Same RSA envelope as loginBlob, but for the 5-field blobs RenameNick.ashx/RenameConsortiaName.ashx decrypt
 * (`name,pwd,newPwd,nickname,newNickname` / `name,pass1,pass2,_,_`). */
function blob5(a: string, b: string, c: string, d: string, e: string): string {
  const payload = buildLoginPayload("x", "y", new Array(8).fill(0)).subarray(0, 7);
  const body = Buffer.concat([Buffer.from(payload), Buffer.from(`${a},${b},${c},${d},${e}`, "utf8")]);
  return bytesToBase64(rsaEncryptPkcs1(key, body));
}

describe("auth + Login.ashx flow", () => {
  let token = "";
  let webKey = "";
  it("registers an account and returns token + one-time key", async () => {
    const r = await app.inject({ method: "POST", url: "/api/auth/register", payload: { username: "alice", email: "a@x.io", password: "secret1" } });
    expect(r.statusCode).toBe(201);
    const b = r.json();
    token = b.token;
    webKey = b.play.flashvars.key;
    expect(b.user).toMatchObject({ username: "alice", role: "player" });
    expect(webKey).toMatch(/^[0-9A-F-]{36}$/);
    expect(b.play.flashvars.config).toBe("http://api.test/flash/config.xml");
  });

  it("rejects bad credentials", async () => {
    const r = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "alice", password: "nope" } });
    expect(r.statusCode).toBe(401);
  });

  it("play config issues a fresh key + socket/ws info", async () => {
    const r = await app.inject({ url: "/api/play/config", headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.socketProxy[0]).toEqual({ host: "127.0.0.1", port: 9200, proxyUrl: expect.any(String) });
    expect(b.requestUrl).toBe("http://api.test/request/");
    webKey = b.flashvars.key;
  });

  it("Login.ashx refuses a wrong key (4.1 bypass fixed)", async () => {
    const r = await app.inject({ url: `/request/login.ashx?p=${encodeURIComponent(loginBlob("alice", "WRONG", "abcdef"))}&site=` });
    expect(r.body).toContain('value="false"');
  });

  it("Login.ashx accepts the web key, creates the character row, and arms the socket login", async () => {
    const r = await app.inject({ url: `/Request/Login.ashx?selfid=NaN&rid=&site=&p=${encodeURIComponent(loginBlob("alice", webKey, "qwerty"))}&v=5498628` });
    expect(r.body).toMatch(/^<Result value="true" message="[^"]+">\r\n  <Item ID="\d+" IsFirst="0" NickName="" Date="" /);
    expect(await validateGameLogin(h, "alice", "qwerty")).not.toBeNull();
    expect(await validateGameLogin(h, "alice", "other")).toBeNull();
  });

  it("VisualizeRegister + LoginSelectList + NickNameCheck", async () => {
    const reg = await app.inject({ url: `/request/VisualizeRegister.ashx?Name=alice&Pass=qwerty&NickName=Alice1&Sex=true` });
    expect(reg.body).toContain('value="true"');
    const sel = await app.inject({ url: `/request/loginselectlist.ashx?username=alice&rnd=0.1rnd=0%2E1` });
    expect(sel.body).toContain('NickName="Alice1"');
    const nick = await app.inject({ url: `/request/NickNameCheck.ashx?NickName=Alice1` });
    expect(nick.body).toContain('value="false"');
  });

  // task multi-char: /api/account/me now joins app."AccountCharacters" (ANY(...) over every reserved
  // slot's gameUserName) instead of matching the account's own UserName directly — confirms that still
  // finds "alice"'s just-created character.
  it("/api/account/me lists the account's character via app.AccountCharacters", async () => {
    const r = await app.inject({ url: "/api/account/me", headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(200);
    expect(r.json().characters).toEqual([expect.objectContaining({ nickname: "Alice1", sex: "m" })]);
  });

  it("ServerList advertises GAME_PORT - 69", async () => {
    const r = await app.inject({ url: "/request/serverlist.ashx?rnd=0.5" });
    expect(r.body).toContain('IP="127.0.0.1" Port="9131"');
    expect(r.body).toMatch(/<Result value="true" message="Success!" total="\d+">/);
  });

  // ch-tabela: 2 canais além do "Reborn" (ID 4, seed) — um com IP/Port próprios (admin preencheu), outro
  // desligado (Enabled = false, não deve aparecer pra nenhum cliente).
  it("ServerList with 2 extra channels: per-row IP/Port (4.1 -69 / 6600 direto), Enabled = false hidden", async () => {
    const { sql } = await import("drizzle-orm");
    await h.db.execute(sql`INSERT INTO player."Server_List"
      ("ID","Name","IP","Port","State","Online","Total","Room","MustLevel","LowestLevel","NewerServer","ZoneId","ZoneName","Enabled","SortOrder","PvpOnly")
      VALUES
      (90, 'Canal 2', '10.0.0.5', 9333, 2, 7, 300, 50, 0, 0, false, 1002, 'Canal 2', true, 1, true),
      (91, 'Canal desligado', '10.0.0.6', 9444, 2, 99, 300, 50, 0, 0, false, 1003, 'Canal desligado', false, 2, false)`);
    try {
      const r41 = await app.inject({ url: "/request/serverlist.ashx" });
      expect(r41.body).toContain('ID="90" Name="Canal 2" IP="10.0.0.5" Port="9264"'); // 9333 - 69
      expect(r41.body).not.toContain('ID="91"'); // Enabled = false
      const r6600 = await app.inject({ url: "/request6600/serverlist.ashx" });
      expect(r6600.body).toContain('ID="90" Name="Canal 2" IP="10.0.0.5" Port="9333"'); // cliente 6600 não soma 69
      expect(r6600.body).not.toContain('ID="91"');
    } finally {
      await h.db.execute(sql`DELETE FROM player."Server_List" WHERE "ID" IN (90, 91)`);
    }
  });
});

describe("task multi-char: GET/POST /api/me/characters + per-character ticket", () => {
  let token = "";

  it("registers a fresh account: /api/me/characters shows slot 1 reserved but not created yet", async () => {
    const r = await app.inject({ method: "POST", url: "/api/auth/register", payload: { username: "bob", email: "", password: "secret1" } });
    expect(r.statusCode).toBe(201);
    token = r.json().token;
    const list = await app.inject({ url: "/api/me/characters", headers: { authorization: `Bearer ${token}` } });
    expect(list.statusCode).toBe(200);
    const b = list.json();
    expect(b.maxCharacters).toBe(3); // server-config default
    expect(b.canCreate).toBe(true);
    expect(b.characters).toEqual([{ slot: 1, gameUserName: "bob", created: false }]);
  });

  it("POST creates slot 2 ('bob~2'), then slot 3, then refuses past the default limit of 3", async () => {
    const auth = { authorization: `Bearer ${token}` };
    const s2 = await app.inject({ method: "POST", url: "/api/me/characters", headers: auth });
    expect(s2.statusCode).toBe(201);
    expect(s2.json()).toMatchObject({ slot: 2, gameUserName: "bob~2" });
    const s3 = await app.inject({ method: "POST", url: "/api/me/characters", headers: auth });
    expect(s3.statusCode).toBe(201);
    expect(s3.json()).toMatchObject({ slot: 3, gameUserName: "bob~3" });
    const s4 = await app.inject({ method: "POST", url: "/api/me/characters", headers: auth });
    expect(s4.statusCode).toBe(409);
    const list = await app.inject({ url: "/api/me/characters", headers: auth });
    expect(list.json().characters.map((c: { slot: number }) => c.slot)).toEqual([1, 2, 3]);
    expect(list.json().canCreate).toBe(false);
  });

  it("/api/play/config?slot=2 issues a ticket for 'bob~2', not the account's own name", async () => {
    const auth = { authorization: `Bearer ${token}` };
    const cfg2 = await app.inject({ url: "/api/play/config?slot=2", headers: auth });
    expect(cfg2.json().flashvars.user).toBe("bob~2");
    const cfg1 = await app.inject({ url: "/api/play/config", headers: auth }); // default slot = 1
    expect(cfg1.json().flashvars.user).toBe("bob");
  });

  it("the full Login.ashx + VisualizeRegister flow works unmodified for a '~2' gameUserName", async () => {
    const auth = { authorization: `Bearer ${token}` };
    const cfg2 = await app.inject({ url: "/api/play/config?slot=2", headers: auth });
    const webKey2 = cfg2.json().flashvars.key;
    const login = await app.inject({ url: `/request/login.ashx?p=${encodeURIComponent(loginBlob("bob~2", webKey2, "temppwd2"))}&site=` });
    expect(login.body).toMatch(/^<Result value="true"/);
    expect(await validateGameLogin(h, "bob~2", "temppwd2")).not.toBeNull();
    const reg = await app.inject({ url: `/request/VisualizeRegister.ashx?Name=bob~2&Pass=temppwd2&NickName=BobTwo&Sex=true` });
    expect(reg.body).toContain('value="true"');
    const list = await app.inject({ url: "/api/me/characters", headers: auth });
    const slot2 = list.json().characters.find((c: { slot: number }) => c.slot === 2);
    expect(slot2).toMatchObject({ slot: 2, gameUserName: "bob~2", created: true, nickname: "BobTwo", sex: "m" });
    // registerPlayer equips a default arm/hair/face/cloth from BOY_VISUALIZE_ITEM -> at least one icon resolves.
    expect(Array.isArray(slot2.equip)).toBe(true);
    expect(slot2.equip.length).toBeGreaterThan(0);
    expect(slot2.equip[0]).toHaveProperty("iconRel");
    // task multi-char (correção do coordenador): style/colors/skin crus — o que o renderer real
    // (apps/client avatar.ts, ShowCharacter) consome diretamente, igual ao pacote 67/18 do jogo.
    expect(typeof slot2.style).toBe("string");
    expect(slot2.style.split(",").length).toBeGreaterThanOrEqual(9);
    expect(typeof slot2.colors).toBe("string");
    expect(typeof slot2.skin).toBe("string");
  });

  it("admin can lower maxCharactersPerAccount; it's enforced server-side even against a fresh account", async () => {
    const put = await app.inject({ method: "PUT", url: "/api/admin/server-config", headers: { authorization: `Bearer ${adminToken}` }, payload: { maxCharactersPerAccount: 1 } });
    expect(put.statusCode).toBe(200);
    try {
      const r = await app.inject({ method: "POST", url: "/api/auth/register", payload: { username: "carol", email: "", password: "secret1" } });
      const carolToken = r.json().token;
      const post = await app.inject({ method: "POST", url: "/api/me/characters", headers: { authorization: `Bearer ${carolToken}` } });
      expect(post.statusCode).toBe(409);
    } finally {
      await app.inject({ method: "PUT", url: "/api/admin/server-config", headers: { authorization: `Bearer ${adminToken}` }, payload: { maxCharactersPerAccount: 3 } });
    }
  });
});

describe("template XML (client boot files)", () => {
  // [file, compressed, first element] — formats per docs/spec/request/00a-endpoint-catalog.md
  const cases: [string, boolean, string][] = [
    ["balllist", true, "Item"],
    ["bombconfig", true, "Item"],
    ["loaditemscategory", true, "Item"],
    ["shopitemlist", true, "Item"],
    ["templatealllist", true, "Item"],
    ["questlist", true, "Item"],
    ["loadmapsitems", true, "Item"],
    ["loadpveitems", true, "Item"],
    ["mapserverlist", true, "Item"],
    ["activelist", true, "Item"],
    ["dailyawardlist", true, "Item"],
    ["serverconfig", false, "Item"],
    ["newtitleinfo", false, "Item"],
    ["petskillinfo", false, "item"],
    ["pettemplateinfo", false, "item"],
    ["totemhonortemplate", false, "item"],
  ];
  for (const [file, z, tag] of cases) {
    it(`${file}.xml matches the shipped snapshot format`, async () => {
      const r = await app.inject({ url: `/request/${file}.xml?rnd=0.89404485700652rnd=0%2E89404485700652` });
      expect(r.statusCode).toBe(200);
      const body = z ? inflate(r.rawPayload) : r.body;
      if (z) expect(r.rawPayload.subarray(0, 2).toString("hex")).toBe("78da");
      expect(body.startsWith('<Result value="true" message="Success!"')).toBe(true);
      expect(body).toContain("\r\n  <");
      const ours = firstTag(body, tag);
      expect(ours).not.toBe("");
      const snapFile = ["balllist", "bombconfig"].includes(file) ? file : file;
      const snapPath = [`${snapFile}.xml`].map((f) => join(VENDOR_REQ, f)).find((p) => existsSync(p));
      if (snapPath) {
        const raw = readFileSync(snapPath);
        const snap = raw[0] === 0x78 ? inflate(raw) : raw.toString("utf8");
        // superset, não igualdade exata: QuestList/TemplateAllList/LoadPVEItems ganharam atributos que a 4.1 não
        // tem (só o 6600 lê, ver research/6600/xml-diff.md) — a 4.1 ignora atributo desconhecido (AGENTS.md), e
        // o que importa aqui é nunca perder/renomear um atributo que a 4.1 espera.
        expect(attrNames(ours)).toEqual(expect.arrayContaining(attrNames(firstTag(snap, tag))));
      }
    });
  }

  it("Ball ID=73 is byte-identical to the catalog sample", async () => {
    const body = inflate((await app.inject({ url: "/request/BallList.xml" })).rawPayload);
    expect(body).toContain(
      '<Item ID="73" Power="0.5" Radii="65" FlyingPartical="47" BombPartical="73" Crater="" AttackResponse="0" IsSpin="false" SpinV="90" SpinVA="0.96" Amount="3" Wind="240" DragIndex="1" Weight="70" Shake="true" ShootSound="114" BombSound="101" ActionType="0" Mass="10" />',
    );
  });

  it("static-only snapshot files are served verbatim; unknown celeb lists are empty", async () => {
    const r = await app.inject({ url: "/request/loadallquestions.xml" });
    expect(r.statusCode).toBe(200);
    expect(inflate(r.rawPayload)).toContain("<Item QuestionCatalogID=");
    const c = await app.inject({ url: "/request/areacelebbygplist.xml" });
    expect(inflate(c.rawPayload)).toContain('value="true"');
  });
});

describe("6600 compat (research/6600/xml-diff.md, docs/plan/MIGRACAO-6600.md M1)", () => {
  // TaskManager.getImproveArray() (6600, ddt/manager/TaskManager.as:272-280) lê xml.@BindMoneyRate etc. do elemento
  // <Rate> — sem ele o cliente 6600 quebrava com TypeError #1009 ao entrar na tela de missões (bug original desta
  // tarefa). game.Quest_Rate está vazia na base seedada (0 linhas, igual à fonte original), então o builder cai
  // no default do próprio snapshot 6600 (vendor/DDT-6600/Request/questlist.xml).
  it("QuestList.xml carries <Rate> with the 6600 snapshot defaults (TaskManager.getImproveArray)", async () => {
    const body = inflate((await app.inject({ url: "/request/questlist.xml" })).rawPayload);
    expect(body).toContain('<Rate BindMoneyRate="1|1|1|1" ExpRate="1.5|2|2.5|3" GoldRate="1.5|2|2.5|3" ExploitRate="1.5|2|2.5|3" CanOneKeyFinishTime="10000" />');
  });

  it("QuestList.xml Item/Item_Good carry the 6600-only fields QuestInfo.as reads (RewardBindMoney, OneKeyFinishNeedMoney, ...)", async () => {
    const body = inflate((await app.inject({ url: "/request/questlist.xml" })).rawPayload);
    const item = firstTag(body, "Item");
    expect(attrNames(item)).toEqual(
      expect.arrayContaining(["RewardBindMoney", "OneKeyFinishNeedMoney", "CollocationCost", "CollocationColdTime", "Level2NeedMoney", "Level3NeedMoney", "Level4NeedMoney", "Level5NeedMoney"]),
    );
    // RewardBindMoney é o mesmo dado de RewardGiftToken (renome confirmado em Game.Server.Quests/QuestInventory.cs:476-480)
    expect(/RewardGiftToken="(\d+)"/.exec(item)?.[1]).toBe(/RewardBindMoney="(\d+)"/.exec(item)?.[1]);
    // fora de escopo (needs schema, M1 tarefa 1): defaults fixos iguais a 100% da amostra do snapshot 6600
    expect(item).toContain('CollocationCost="-1"');
    expect(item).toContain('OneKeyFinishNeedMoney="0"');
    const good = firstTag(body, "Item_Good");
    if (good) {
      // RewardItemCount1..5 duplicam o único RewardItemCount que já temos (sem coluna por nível, ver report)
      const count = /RewardItemCount="(\d+)"/.exec(good)?.[1];
      for (let i = 1; i <= 5; i++) expect(new RegExp(`RewardItemCount${i}="${count}"`).test(good)).toBe(true);
    }
  });

  it("ActivitySystemItems.xml / LoginAwardItemTemplate.xml / TemplateAllList.xml carry pre-existing columns that only the 6600 client reads", async () => {
    const act = inflate((await app.inject({ url: "/request/activitysystemitems.xml" })).rawPayload);
    if (/<Item /.test(act)) expect(attrNames(firstTag(act, "Item"))).toContain("Probability");
    const login = inflate((await app.inject({ url: "/request/loginawarditemtemplate.xml" })).rawPayload);
    if (/<Item /.test(login)) expect(attrNames(firstTag(login, "Item"))).toContain("AttackCompose");
    const tpl = inflate((await app.inject({ url: "/request/templatealllist.xml" })).rawPayload);
    expect(attrNames(firstTag(tpl, "Item"))).toContain("FloorPrice");
  });

  // Bug preexistente da própria 4.1 (não só do 6600): SuitTempleteAnalyzer.as/EquipSuitTempleteAnalyzer.as leem
  // `xml..item` (minúsculo, E4X é case-sensitive) nas duas versões do cliente; nosso `flat()` gerava `<Item>`
  // (maiúsculo, default), então as duas listas de conjunto (bônus de equipamento em grupo) sempre chegavam vazias
  // pro cliente mesmo com linhas na tabela.
  it("SuitPartEquipInfoList.xml / SuitTemplateInfoList.xml use lowercase <item> (both 4.1 and 6600 analyzers read xml..item)", async () => {
    const parts = inflate((await app.inject({ url: "/request/suitpartequipinfolist.xml" })).rawPayload);
    const suits = inflate((await app.inject({ url: "/request/suittemplateinfolist.xml" })).rawPayload);
    expect(parts).toMatch(/<item ID="\d+"/);
    expect(parts).not.toContain("<Item ");
    expect(suits).toMatch(/<item SuitId="\d+"/);
    expect(suits).not.toContain("<Item ");
  });

  // SP_Daily_League_Award_All não existe em nenhuma base (research/db/00-summary.md); o builder sempre-vazio foi
  // removido de TEMPLATES pra cair no fallback do snapshot vendor/DDT-6600/Request (request.ts) — melhora os dois
  // clientes (4.1 nunca teve esses dados; o fallback bate byte a byte com o 6600 original).
  it("DailyLeagueAward.xml falls back to the 6600 vendor snapshot (no source table, no more always-empty Result)", async () => {
    const r = await app.inject({ url: "/request/dailyleagueaward.xml" });
    expect(r.headers["x-snapshot"]).toBe("6600");
    const body = inflate(r.rawPayload);
    expect(body).toMatch(/<item Level="\d+" Class="\d+"/);
  });

  // shopcheapitemlist.ashx (research/6600/packets-m1.md "M2 loja"): mesma URL pros dois clientes
  // (ddt/manager/ShopManager.as loadDisCounts, 4.1 e 6600 idênticos), mas a FONTE muda — 4.1 lê game."Shop"
  // (IsCheap/Label==4), 6600 lê a tabela nova game."Shop_Cheap_Items" (m1-schema, nunca lida até agora).
  it("shopcheapitemlist.ashx: 4.1 reads game.Shop (IsCheap), 6600 reads the dedicated game.Shop_Cheap_Items table", async () => {
    const { sql } = await import("drizzle-orm");
    await h.db.execute(sql`INSERT INTO game."Shop_Cheap_Items"
      ("ID","TemplateID","LableType","LimitGrade","AUnit","APrice","AValue","BUnit","BPrice","BValue","CUnit","CPrice","CValue","StartDate","EndDate","BuyType")
      VALUES (900555, 11101, 2, 0, 1, -1, 777, 0, 0, 0, 0, 0, 0, now(), now() + interval '1 day', 0)
      ON CONFLICT ("ID") DO NOTHING`);
    // ShopManager.as:867 usa BaseLoader.REQUEST_LOADER (não COMPRESS_REQUEST_LOADER) nas duas versões — plain XML.
    const r41 = (await app.inject({ url: "/request/shopcheapitemlist.ashx" })).body;
    expect(r41).not.toContain('ID="900555"');
    const r6600 = (await app.inject({ url: "/request6600/shopcheapitemlist.ashx" })).body;
    expect(r6600).toContain('value="true"');
    expect(r6600).toContain('ID="900555" TemplateID="11101" LableType="2"');
    expect(r6600).toContain('AUnit="1" APrice="-1" AValue="777"');
  });

  // FusionInfoLoad.xml (m3-fusao, research/6600/packets-m1.md "M2 forja" 78 ITEM_FUSION): antes vinha do
  // snapshot do vendor (X-Snapshot: 6600, research/6600/xml-diff.md "FusionInfoLoad.xml" ok/ok só porque
  // ambos eram o mesmo snapshot); agora vem do banco (game."Item_Fusion_New", seed real de 206 receitas, ver
  // packages/db/scripts/schema-6600-tables.ts RENAME_6600) com os 13 atributos que
  // store/newFusion/data/FusionNewDataAnalyzer.as + FusionNewVo.as leem via ObjectUtils.copyPorpertiesByXML.
  it("fusioninfoload.xml comes from game.Item_Fusion_New now, not the vendor snapshot", async () => {
    const r = await app.inject({ url: "/request6600/fusioninfoload.xml" });
    expect(r.headers["x-snapshot"]).toBeUndefined();
    expect(r.rawPayload.subarray(0, 2).toString("hex")).toBe("78da"); // COMPRESS_TEXT_LOADER (LoaderCreate.as)
    const body = inflate(r.rawPayload);
    expect(body.startsWith('<Result value="true" message="Success!"')).toBe(true);
    // FusionID=1 real (vendor/_dbexport/Project_Game6600/data/Item_Fusion.json): 4x 11001 -> 1x 11002, 100%.
    expect(body).toContain('<Item FusionID="1" Item1="11001" Item2="-1" Item3="-1" Item4="-1" Count1="4" Count2="0" Count3="0" Count4="0" Formula="0" FusionRate="100000" FusionType="5" Reward="11002" />');
    expect((body.match(/<Item /g) ?? []).length).toBe(206);
  });
});

describe("M3 ashx + templates (research/6600/ashx-missing.md)", () => {
  it("SceneCollecRandomNpc.ashx: hardcoded decoy NPC, zlib (scenecollecrandomnpc.cs)", async () => {
    const body = inflate((await app.inject({ url: "/request6600/SceneCollecRandomNpc.ashx" })).rawPayload);
    expect(body).toContain('<item NickName="Hime Chibi" Sex="1" Hair="3251" Glass="2213" Face="6224" Eye="4240" />');
    expect(body).toContain('value="true"');
  });

  it("HelpGameReward.xml (m4-resgate): 6 cenas x 3 tiers com o default embutido quando o admin não configurou nada", async () => {
    const body = inflate((await app.inject({ url: "/request6600/HelpGameReward.xml" })).rawPayload);
    expect(body.startsWith('<Result value="true" message="Success!"')).toBe(true);
    expect((body.match(/<Item /g) ?? []).length).toBe(18); // 6 cenas * 3 tiers
    expect(body).toContain('<Item MissionID="1" Star="11" TemplateID="11107" StrengthenLevel="0" AttackCompose="0" DefendCompose="0" AgilityCompose="0" LuckCompose="0" Count="200" IsBind="true" IsTime="false" ValidDate="0" />');
  });

  it("HelpGameReward.xml: admin configura app.ScheduledEvents kind=rescue params.rewards e o XML reflete", async () => {
    await h.db.insert(appSchema.ScheduledEvents).values({ kind: "rescue", title: "", params: { rewards: { "1": [{ templateId: 99001, count: 7, isBind: false }, { templateId: 99002, count: 8 }, { templateId: 99003, count: 9 }] } } });
    await ctx.cache.invalidate(["app.ScheduledEvents"]); // same invalidation an admin edit triggers (routes/admin.ts)
    const body = inflate((await app.inject({ url: "/request6600/HelpGameReward.xml" })).rawPayload);
    expect(body).toContain('<Item MissionID="1" Star="11" TemplateID="99001" StrengthenLevel="0" AttackCompose="0" DefendCompose="0" AgilityCompose="0" LuckCompose="0" Count="7" IsBind="false" IsTime="false" ValidDate="0" />');
    // cena 2 não foi configurada: continua no default.
    expect(body).toContain('<Item MissionID="2" Star="11" TemplateID="11107" StrengthenLevel="0"');
  });

  it("SubActiveList.ashx: plain text (not zlib), real seeded Active + nested Condition rows (subactivelist.cs)", async () => {
    // seeded (packages/db/seed): game.Sub_Active_List has 1 row (ActiveID=1), game.Sub_Active_Condition has 11
    // rows all for that same ActiveID.
    const r = await app.inject({ url: "/request/SubActiveList.ashx" });
    expect(r.rawPayload.subarray(0, 2).toString("hex")).not.toBe("78da"); // plain, not zlib (Response.Write, not BinaryWrite(Compress))
    expect(r.body).toContain('<Active ActiveID="1" SubID="1" IsOpen="true" StartDate="2022-08-17 00:00:00"');
    expect(r.body).toContain('<Condition ActiveID="1" SubID="1" ConditionID="15136"');
    expect((r.body.match(/<Condition /g) ?? []).length).toBe(11);
    expect(r.body).toMatch(/nowTime="\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it("UpdateVersion.ashx: literal \"1\", no XML (UpdateVersion.cs)", async () => {
    const r = await app.inject({ url: "/request6600/UpdateVersion.ashx" });
    expect(r.body).toBe("1");
  });

  it("VoteSubmit.ashx: \"1\" for the 6600 client, 4.1 keeps the old stub (no handler in DDTank41 either)", async () => {
    expect((await app.inject({ url: "/request6600/VoteSubmit.ashx" })).body).toBe("1");
    expect((await app.inject({ url: "/request/VoteSubmit.ashx" })).body).toContain("Not supported");
  });

  it("LogTime.ashx: empty body for the 4.1 client too (api-ashx: LogTime.ashx.cs never calls Response.Write)", async () => {
    expect((await app.inject({ url: "/request6600/LogTime.ashx" })).body).toBe("1");
    expect((await app.inject({ url: "/request/LogTime.ashx" })).body).toBe("");
  });

  it("AdvanceQuestTime.ashx: \"0,<now>,0\" plain text for both clients (api-ashx: the XML it builds is discarded in the original AdvanceQuestTime.ashx.cs too)", async () => {
    for (const url of ["/request6600/AdvanceQuestTime.ashx?userid=1&selfid=1&key=x", "/request/AdvanceQuestTime.ashx?useid=1"]) {
      const r = await app.inject({ url });
      expect(r.body).toMatch(/^0,\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2} [AP]M,0$/);
    }
  });

  it("TeamBuyActiveAwardInfo.ashx / ConsortiaWarConsortiaRank.ashx: always-false placeholders (unfinished in the original)", async () => {
    expect((await app.inject({ url: "/request6600/TeamBuyActiveAwardInfo.ashx" })).body).toBe('<Result value="false" message="Success!" />');
    expect((await app.inject({ url: "/request6600/ConsortiaWarConsortiaRank.ashx" })).body).toContain('<Item />');
  });

  it("ConsortiaWarPlayerRank.ashx: hardcoded Item only when ConsortiaID+UserID are both present (consortiawarplayerrank.cs)", async () => {
    const empty = await app.inject({ url: "/request6600/ConsortiaWarPlayerRank.ashx" });
    expect(empty.body).toBe('<Result value="true" message="sucess!" />');
    const full = await app.inject({ url: "/request6600/ConsortiaWarPlayerRank.ashx?ConsortiaID=5&UserID=9" });
    expect(full.body).toContain('<Item Rank="1" ConsortiaID="5" Name="Sociedade" Score="99" UserID="9" ZoneName="Canal" ZoneID="4" />');
  });

  it("ConsortiaBossConfigLoad.xml: player.Consortia_Boss_Config, lowercase <item>, BossLevel never emitted", async () => {
    // table is empty in the seeded DB (research/6600/db-diff.md); insert + invalidate the template cache the same
    // way apps/api/src/routes/admin.ts does after a write (TemplateCache.invalidate, not picked up automatically
    // since this def has no `endpoint` admin-rebuild trigger — it only ships as a static snapshot upstream).
    const { sql } = await import("drizzle-orm");
    await h.db.execute(sql`INSERT INTO player."Consortia_Boss_Config" ("Level","NpcID","MissionID","AwardID","CostRich","ProlongRich","BossLevel")
      VALUES (3, 50001, 1291, 1001, 2000, 700, 1)`);
    try {
      await ctx.cache.invalidate(["player.Consortia_Boss_Config"]);
      const body = inflate((await app.inject({ url: "/request/consortiabossconfigload.xml" })).rawPayload);
      expect(body).toContain('<item Level="3" NpcID="50001" MissionID="1291" AwardID="1001" CostRich="2000" ProlongRich="700" />');
      expect(body).not.toContain("BossLevel");
    } finally {
      await h.db.execute(sql`DELETE FROM player."Consortia_Boss_Config" WHERE "Level" = 3`);
      await ctx.cache.invalidate(["player.Consortia_Boss_Config"]);
    }
  });

  it("ActivityHalloweenItems.xml: rows grouped by rewardLevel, <item> sorted by templateId DESC inside the group", async () => {
    // seeded: rewardLevel=1 has templateIds [8515, 9526, 11978, 71292, 1120110] (24 rows total, 6 groups).
    const body = inflate((await app.inject({ url: "/request/activityhalloweenitems.xml" })).rawPayload);
    const group1 = /<items rewardLevel="1">([\s\S]*?)<\/items>/.exec(body)?.[1] ?? "";
    expect(group1.indexOf('templateId="1120110"')).toBeLessThan(group1.indexOf('templateId="71292"'));
    expect(group1.indexOf('templateId="71292"')).toBeLessThan(group1.indexOf('templateId="8515"'));
    expect(body).toMatch(/<items rewardLevel="\d+">/);
  });

  it("CardInfoList.xml: each suit always lists exactly 5 <Card> children (TemplateID DESC, ID=0 padding)", async () => {
    // seeded: Card_Info ID=1 ("Bộ thẻ huyệt ma kiến") has 4 Card_Group rows (314103, 314102, 314101, 0) — the
    // builder still pads to exactly 5, matching vendor/DDTank41/Tank.Request/cardinfolist.xml byte-for-byte.
    const body = inflate((await app.inject({ url: "/request/cardinfolist.xml" })).rawPayload);
    const it = firstTag(body, "Item");
    expect(it).toContain('ID="1" SuitID="1" Name="Bộ thẻ huyệt ma kiến"');
    const suitBlock = /<Item ID="1" [\s\S]*?<\/Item>/.exec(body)?.[0] ?? "";
    const cards = [...suitBlock.matchAll(/<Card ID="(\d+)" \/>/g)].map((m) => m[1]);
    expect(cards).toEqual(["314103", "314102", "314101", "0", "0"]);
  });

  it("DiceGameAwardItem.xml: lowercase rank/template/count attrs (table columns Rank/template/count)", async () => {
    // seeded: game.Dice_Game_Award has (Rank=1, template=11035, count=5) among its 10 rows.
    const body = inflate((await app.inject({ url: "/request/dicegameawarditem.xml" })).rawPayload);
    expect(body).toContain('<Item rank="1" template="11035" count="5" />');
  });

  it("MountTemplate.xml: m1-schema game.Mount_Template, elem <item>, attrs in FlashUtils order", async () => {
    // seeded: Grade=0 row.
    const body = inflate((await app.inject({ url: "/request/mounttemplate.xml" })).rawPayload);
    expect(body).toContain('<item Grade="0" Experience="0" SkillID="0" AddDamage="7" AddGuard="15" MagicAttack="30" MagicDefence="30" AddBlood="260" />');
  });

  // Remaining new flat() templates (research/6600/ashx-missing.md P1) that ship with real rows in the seeded test
  // DB (packages/db/seed, loaded by seedDatabase in beforeAll): the attribute name/order/elem-casing for each was
  // verified by hand against the vendor/DDT-6600/Request/<file>.xml snapshot when writing defs.ts (see the
  // comments there) and spot-checked with real rows in the dedicated tests above — this is the wiring smoke test
  // (right file name resolves, valid zlib, well-formed non-empty <Result>).
  const seeded = [
    "mountdrawtemplate", "mountskillelementtemplate", "mountskillgettemplate", "mountskilltemplate",
    "searchgoodstemp", "treetemplatelist", "loadpetformdata", "magicstonetemplate", "lightriddlequest",
    "fairbattlerewardtemp", "cardgrooveupdatelist", "cardtemplateinfo", "everydayactiveprogressinfolist",
  ];
  for (const file of seeded) {
    it(`${file}.xml resolves to a valid, non-empty Result (table has seeded rows)`, async () => {
      const r = await app.inject({ url: `/request/${file}.xml` });
      expect(r.statusCode).toBe(200);
      const body = inflate(r.rawPayload);
      expect(body.startsWith('<Result value="true" message="Success!">')).toBe(true);
      expect(body).toMatch(/<\w+ [^>]+\/>/);
    });
  }

  // These three have no rows anywhere (research/6600/db-diff.md scrape never saw them either): a plain empty
  // Result is the correct, byte-compatible answer until the table is populated.
  const empty = ["activeconvertiteminfo", "everydayactivepointtemplateinfolist", "everydayactiverewardtemplateinfolist"];
  for (const file of empty) {
    it(`${file}.xml resolves to a valid empty Result (table has no rows)`, async () => {
      const r = await app.inject({ url: `/request/${file}.xml` });
      expect(r.statusCode).toBe(200);
      expect(inflate(r.rawPayload)).toBe('<Result value="true" message="Success!" />');
    });
  }
});

describe("api-ashx: newly ported Tank.Request endpoints (4.1 coverage)", () => {
  it("CreatShortCut.ashx / API/Login.ashx / IMRecentContactsList.ashx: literal/no-op handlers", async () => {
    expect((await app.inject({ url: "/request/CreatShortCut.ashx?gameurl=x" })).body).toBe("Not support right now");
    expect((await app.inject({ url: "/request/API/Login.ashx?username=a&password=b" })).body).toBe("1");
    expect((await app.inject({ url: "/request/IMRecentContactsList.ashx?useid=1" })).body).toBe('<Result value="true" message="Success!" />');
  });

  it("luckstaractivityrank.ashx: <Ranks> root (not <Result>), empty rank list + myRank placeholder (no Luckstar table yet)", async () => {
    const r = await app.inject({ url: "/request/luckstaractivityrank.ashx?selfid=1&key=x" });
    expect(r.body).toMatch(/^<Ranks lastUpdateTime="\d{2}-\d{2} \d{2}:\d{2}" value="true" message="Success!">/);
    expect(r.body).toContain('<myRank rank="0" useStarNum="0" nickName="" />');
  });

  it("gmtipallbyids.ashx: no ids -> value=false; with ids, every row's ID is overwritten by the FIRST id (bug kept for byte-compat)", async () => {
    const noIds = await app.inject({ url: "/request/gmtipallbyids.ashx" });
    expect(noIds.body).toBe('<Result value="false" message="Fail!" />');
    const { sql } = await import("drizzle-orm");
    const future = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 19).replace("T", " ");
    const past = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 19).replace("T", " ");
    await h.db.execute(sql`INSERT INTO game."Edictum_List" ("ID","Title","BeginDate","BeginTime","EndDate","EndTime","Text","IsExist")
      VALUES (501, 'Aviso 1', ${past}, ${past}, ${future}, ${future}, 'texto', true),
             (502, 'Aviso vencido', ${past}, ${past}, ${past}, ${past}, 'velho', true)`);
    try {
      const r = await app.inject({ url: "/request/gmtipallbyids.ashx?ids=999" });
      expect(r.body).toContain('value="true"');
      expect(r.body).toContain('<Item ID="999" Title="Aviso 1"');
      expect(r.body).not.toContain("Aviso vencido"); // EndDate.Date <= today is dropped
    } finally {
      await h.db.execute(sql`DELETE FROM game."Edictum_List" WHERE "ID" IN (501, 502)`);
    }
  });

  it("FarmGetUserFieldInfos.ashx / FarmGetUserFieldInfosSingle.ashx: real friend list, childless Items (no Farm table yet)", async () => {
    const { sql } = await import("drizzle-orm");
    const alice = await q1<{ UserID: number }>(ctx.h, sql`SELECT "UserID" FROM player."Sys_Users_Detail" WHERE "UserName" = 'alice' LIMIT 1`);
    await h.db.execute(sql`INSERT INTO player."Sys_Users_Friends" ("UserID","FriendID","AddDate","IsExist") VALUES (${alice!.UserID}, 999001, now(), true)`);
    try {
      const r = await app.inject({ url: `/request/FarmGetUserFieldInfos.ashx?selfid=${alice!.UserID}&key=x` });
      expect(r.body).toContain('<Item UserID="999001" />');
      const single = await app.inject({ url: "/request/FarmGetUserFieldInfosSingle.ashx?friendID=999001" });
      expect(single.body).toContain('<Item UserID="999001" isFeed="false" />');
    } finally {
      await h.db.execute(sql`DELETE FROM player."Sys_Users_Friends" WHERE "UserID" = ${alice!.UserID} AND "FriendID" = 999001`);
    }
  });

  it("GiftRecieveLog.ashx / giftsendlog.ashx: zlib Sys_Users_Gift rows filtered by ReceiverID/SenderID, playerID always shows ReceiverID", async () => {
    const { sql } = await import("drizzle-orm");
    await h.db.execute(sql`INSERT INTO player."Sys_Users_Gift" ("SenderID","ReceiverID","TemplateID","Count") VALUES (910, 920, 11019, 3)`);
    try {
      const recv = inflate((await app.inject({ url: "/request/GiftRecieveLog.ashx?key=x&selfid=920&userID=920" })).rawPayload);
      expect(recv).toContain('<Item playerID="920" TemplateID="11019" count="3" />');
      const send = inflate((await app.inject({ url: "/request/giftsendlog.ashx?key=x&selfid=910&userID=910" })).rawPayload);
      expect(send).toContain('<Item playerID="920" TemplateID="11019" count="3" />');
    } finally {
      await h.db.execute(sql`DELETE FROM player."Sys_Users_Gift" WHERE "SenderID" = 910`);
    }
  });

  it("AuctionPageList.ashx: missing required int param -> Fail!/total=0; empty table -> Success!/total=0; plain (not zlib)", async () => {
    const bad = await app.inject({ url: "/request/AuctionPageList.ashx?page=1" });
    expect(bad.rawPayload.subarray(0, 2).toString("hex")).not.toBe("78da");
    expect(bad.body).toBe('<Result total="0" value="false" message="Fail!" />');
    const ok = await app.inject({ url: "/request/AuctionPageList.ashx?page=1&name=&type=-1&pay=-1&userID=-1&buyID=-1&order=0&sort=false&Auctions=" });
    expect(ok.body).toBe('<Result total="0" value="true" message="Success!" />');
  });

  it("AuctionPageList.ashx: real row, filtered by category + name, with nested goods info", async () => {
    const { sql } = await import("drizzle-orm");
    await h.db.execute(sql`INSERT INTO player."Auction"
      ("AuctionID","Name","Category","AuctioneerID","AuctioneerName","ItemID","PayType","Price","Rise","Mouthful","BeginDate","ValidDate","BuyerID","BuyerName","IsExist")
      VALUES (1, 'Espada Dourada', 1, 5, 'Bob', 777001, 0, 1000, 100, 0, '2024-01-01 00:00:00', 7, -1, '', true)`);
    try {
      const r = await app.inject({ url: "/request/AuctionPageList.ashx?page=1&name=Dourada&type=1&pay=-1&userID=-1&buyID=-1&order=0&sort=false&Auctions=" });
      expect(r.body).toContain('total="1"');
      expect(r.body).toContain('<Item AuctionID="1" AuctioneerID="5" AuctioneerName="Bob" BeginDate="2024-01-01 00:00:00" BuyerID="-1" BuyerName="" ItemID="777001" Mouthful="0" PayType="0" Price="1000" Rise="100" ValidDate="7" />');
      const other = await app.inject({ url: "/request/AuctionPageList.ashx?page=1&name=&type=2&pay=-1&userID=-1&buyID=-1&order=0&sort=false&Auctions=" });
      expect(other.body).toContain('total="0"'); // wrong category -> filtered out
    } finally {
      await h.db.execute(sql`DELETE FROM player."Auction" WHERE "AuctionID" = 1`);
    }
  });

  it("RenameNick.ashx: rotates nickname + game key when pwd matches the current session (bypass fixed, unlike the original)", async () => {
    const wrong = await app.inject({ url: `/request/RenameNick.ashx?p=${encodeURIComponent(blob5("alice", "WRONG", "x", "Alice1", "Alice2"))}&site=` });
    expect(wrong.body).toContain('value="false"');
    const ok = await app.inject({ url: `/request/RenameNick.ashx?p=${encodeURIComponent(blob5("alice", "qwerty", "renamekey1", "Alice1", "Alice2"))}&site=` });
    expect(ok.body).toContain('value="true"');
    expect(await validateGameLogin(h, "alice", "renamekey1")).not.toBeNull();
    const nick = await app.inject({ url: "/request/NickNameCheck.ashx?NickName=Alice2" });
    expect(nick.body).toContain('value="false"'); // taken now
  });

  it("RenameConsortiaName.ashx: validates the session and rotates the key, but never renames any guild (no-op in DDTank41 itself)", async () => {
    const r = await app.inject({ url: `/request/RenameConsortiaName.ashx?p=${encodeURIComponent(blob5("alice", "renamekey1", "renamekey2", "x", "y"))}&site=` });
    expect(r.body).toContain('value="true"');
    expect(await validateGameLogin(h, "alice", "renamekey2")).not.toBeNull();
  });
});

describe("admin CRUD", () => {
  it("requires an admin token", async () => {
    expect((await app.inject({ url: "/api/admin/items" })).statusCode).toBe(401);
    const p = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "test", password: "test" } });
    expect((await app.inject({ url: "/api/admin/items", headers: { authorization: `Bearer ${p.json().token}` } })).statusCode).toBe(403);
  });

  it("lists, searches and sorts", async () => {
    const r = await app.inject({ url: "/api/admin/items?q=-900&page=1&pageSize=5&sort=-TemplateID", headers: { authorization: `Bearer ${adminToken}` } });
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.items[0].TemplateID).toBe(-900);
    expect(b.pageSize).toBe(5);
  });

  // site-admin-redesign: the owner rejected the first visual editors for showing raw Vietnamese text — this
  // is the fix. Quest 4's seeded Title is the vendor's original ("Cường hóa vũ khí Lv5", VN) with no pt-BR
  // overlay row yet; PATCHing Title writes app."Translations" instead of the raw game."Quest" column, which
  // the GET response must then surface as the override (what the player sees) plus the untouched original.
  it("translatable resources (quests/dungeons/missions/npcs): GET exposes pt-BR overlay + <field>__original; PATCH writes the overlay, never the raw column", async () => {
    const auth = { authorization: `Bearer ${adminToken}` };
    const before = await app.inject({ url: "/api/admin/quests/4", headers: auth });
    expect(before.statusCode).toBe(200);
    const originalTitle = before.json().Title as string;
    expect(originalTitle).toBe("Cường hóa vũ khí Lv5"); // vendor source text, no overlay yet
    expect(before.json().Title__original).toBe(originalTitle); // no overlay = original mirrors raw

    const patch = await app.inject({ method: "PATCH", url: "/api/admin/quests/4", headers: auth, payload: { Title: "Fortalecer Arma Nv5", NeedMinLevel: 2 } });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().Title).toBe("Fortalecer Arma Nv5"); // overlay, returned immediately
    expect(patch.json().Title__original).toBe(originalTitle); // raw untouched
    expect(patch.json().NeedMinLevel).toBe(2); // non-translatable field still writes the raw column normally

    const after = await app.inject({ url: "/api/admin/quests/4", headers: auth });
    expect(after.json().Title).toBe("Fortalecer Arma Nv5");
    expect(after.json().Title__original).toBe(originalTitle);

    // the raw game."Quest" row itself was never touched by the PATCH to Title (only NeedMinLevel, a real column)
    const raw = await q1<{ Title: string }>(h, sql`SELECT "Title" FROM game."Quest" WHERE "ID" = 4`);
    expect(raw?.Title).toBe(originalTitle);
  });

  // admin-ux "ref" field (apps/admin/src/crud/refs.ts): ONE request resolves every row a table page needs for a
  // given target resource (never N+1). `?ids=` bypasses pagination/search/sort and returns exactly those rows.
  it("?ids= batched lookup: returns exactly the matching rows, ignores pagination, rejects composite-PK resources", async () => {
    const auth = { authorization: `Bearer ${adminToken}` };
    const r = await app.inject({ url: "/api/admin/items?ids=-900,888888888,999999999999", headers: auth });
    expect(r.statusCode).toBe(200);
    const b = r.json();
    // 888888888 doesn't exist, 999999999999 overflows Postgres int4 — neither should 500, both are just a miss
    expect(b.items.map((i: { TemplateID: number }) => i.TemplateID)).toEqual([-900]);
    expect(b.total).toBe(1);
    expect(b.page).toBe(1);

    const empty = await app.inject({ url: "/api/admin/items?ids=", headers: auth });
    expect(empty.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 0 });

    const composite = await app.inject({ url: "/api/admin/quest-conditions?ids=1", headers: auth });
    expect(composite.statusCode).toBe(400);

    expect((await app.inject({ url: "/api/admin/items?ids=-900" })).statusCode).toBe(401); // admin-only, same guard as the rest of the resource
  });

  it("update rebuilds the template cache; composite ids work; delete", async () => {
    const auth = { authorization: `Bearer ${adminToken}` };
    const u = await app.inject({ method: "PATCH", url: "/api/admin/items/-900", headers: auth, payload: { Name: "Ouro do labirinto" } });
    expect(u.statusCode).toBe(200);
    const xml = inflate((await app.inject({ url: "/request/templatealllist.xml" })).rawPayload);
    expect(xml).toContain('Name="Ouro do labirinto"');
    const c = await app.inject({ method: "POST", url: "/api/admin/quest-conditions", headers: auth, payload: { QuestID: 999999, CondictionID: 1, CondictionTitle: "t", CondictionType: 1, Para1: 0, Para2: 1, isOpitional: false } });
    expect(c.statusCode).toBe(201);
    expect((await app.inject({ url: "/api/admin/quest-conditions/999999~1", headers: auth })).json().CondictionTitle).toBe("t");
    expect((await app.inject({ method: "DELETE", url: "/api/admin/quest-conditions/999999~1", headers: auth })).statusCode).toBe(204);
    const n = await app.inject({ method: "POST", url: "/api/admin/news", headers: auth, payload: { title: "Olá", summary: "s", category: "news", publishedAt: "2020-01-01T00:00:00Z" } });
    expect(n.statusCode).toBe(201);
    expect((await app.inject({ url: "/api/public/news" })).json()[0].title).toBe("Olá");
  });

  it("server-config round trip changes ServerList", async () => {
    const auth = { authorization: `Bearer ${adminToken}` };
    const r = await app.inject({ method: "PUT", url: "/api/admin/server-config", headers: auth, payload: { tcpPort: 9500, publicHost: "game.example.com" } });
    expect(r.json().tcpPort).toBe(9500);
    expect((await app.inject({ url: "/request/ServerList.ashx" })).body).toContain('IP="game.example.com" Port="9431"');
    await app.inject({ method: "PUT", url: "/api/admin/server-config", headers: auth, payload: { tcpPort: 9200, publicHost: "127.0.0.1" } });
    expect((await app.inject({ url: "/api/admin/stats", headers: auth })).json().uptimeSec).toBeGreaterThanOrEqual(0);
  });

  // ch-admin: CRUD de canais (resource "server-list" -> player."Server_List") pela página "Canais" do admin.
  it("server-list CRUD: create/edit a channel, disabling it hides it from ServerList.ashx", async () => {
    const auth = { authorization: `Bearer ${adminToken}` };
    const c = await app.inject({
      method: "POST",
      url: "/api/admin/server-list",
      headers: auth,
      payload: { ID: 95, Name: "Canal de teste", IP: "10.0.0.9", Port: 9222, State: 2, Total: 400, Room: 60 },
    });
    expect(c.statusCode).toBe(201);
    expect(c.json()).toMatchObject({ ID: 95, Name: "Canal de teste", Enabled: true, SortOrder: 0, PvpOnly: false });
    expect((await app.inject({ url: "/request/serverlist.ashx" })).body).toContain('ID="95" Name="Canal de teste" IP="10.0.0.9" Port="9153"');

    const u = await app.inject({ method: "PATCH", url: "/api/admin/server-list/95", headers: auth, payload: { Enabled: false } });
    expect(u.statusCode).toBe(200);
    expect((await app.inject({ url: "/request/serverlist.ashx" })).body).not.toContain('ID="95"');

    expect((await app.inject({ method: "DELETE", url: "/api/admin/server-list/95", headers: auth })).statusCode).toBe(204);
    expect((await app.inject({ url: "/api/admin/server-list/95", headers: auth })).statusCode).toBe(404);
  });

  // site-admin-redesign: "drop-conditions" had no admin resource yet, only the API whitelist entry — and that
  // entry had the wrong PK casing ("DropId" instead of the real column "DropID", packages/db/src/schema/game.ts
  // Drop_Condiction), which pkWhere would have resolved to no column at all, 404ing every single-row
  // GET/PATCH/DELETE. Regression guard for both: the resource now exists (the Instâncias editor's card-pool
  // preview uses it) and its PK resolves.
  it("drop-conditions CRUD: composite-free PK (\"DropID\") resolves correctly", async () => {
    const auth = { authorization: `Bearer ${adminToken}` };
    const c = await app.inject({
      method: "POST",
      url: "/api/admin/drop-conditions",
      headers: auth,
      payload: { DropID: 999999, CondictionType: 5, Name: "Cartas de teste", Para1: ",1073,", Para2: ",1," },
    });
    expect(c.statusCode).toBe(201);
    const g = await app.inject({ url: "/api/admin/drop-conditions/999999", headers: auth });
    expect(g.statusCode).toBe(200);
    expect(g.json()).toMatchObject({ DropID: 999999, Name: "Cartas de teste" });
    const u = await app.inject({ method: "PATCH", url: "/api/admin/drop-conditions/999999", headers: auth, payload: { Name: "Renomeado" } });
    expect(u.statusCode).toBe(200);
    expect(u.json().Name).toBe("Renomeado");
    expect((await app.inject({ method: "DELETE", url: "/api/admin/drop-conditions/999999", headers: auth })).statusCode).toBe(204);
    expect((await app.inject({ url: "/api/admin/drop-conditions/999999", headers: auth })).statusCode).toBe(404);
  });

  // site-admin-redesign (editor #2, Instâncias): GET /api/admin/dungeons/:id/diagnostics — mission-chain
  // gaps per difficulty (docs/guides/pve.md §1.1, task pve-cadeia). Pve 1 ("Lâu đài Gà"/Gulu Kingdom) is the
  // documented example: Easy was fixed (migration 0027), Normal/Difícil/Terror are documented-but-not-fixed
  // gaps (different script prefix, no safe sibling to reconstruct text from) — this asserts both states so
  // the test breaks (in the GOOD direction) the day someone closes one of the open gaps, per the doc's own
  // "rode o sweep de novo depois" instruction.
  it("dungeon diagnostics: Pve 1 Easy chain is complete, Normal still has the documented gap", async () => {
    const auth = { authorization: `Bearer ${adminToken}` };
    expect((await app.inject({ url: "/api/admin/dungeons/1/diagnostics" })).statusCode).toBe(401); // admin-only

    const r = await app.inject({ url: "/api/admin/dungeons/1/diagnostics", headers: auth });
    expect(r.statusCode).toBe(200);
    const byField = new Map(r.json().items.map((d: { field: string; missingSessionKeys: number[] }) => [d.field, d]));
    const easy = byField.get("SimpleGameScript") as { missingSessionKeys: number[]; missions: { session: number; id: number; cardDropId: number | null }[] };
    expect(easy.missingSessionKeys).toEqual([]);
    // GuluKingdomSimpleGame calls Game.SetupMissions("1072,1073") (0027_pve_cadeia_gulu_baron.sql) — the
    // resolved chain, in order, is part of what the Instâncias preview renders as a strip of cards.
    expect(easy.missions.map((m) => ({ session: m.session, id: m.id }))).toEqual([{ session: 1, id: 1072 }, { session: 2, id: 1073 }]);
    for (const m of easy.missions) expect(typeof m.cardDropId === "number" || m.cardDropId === null).toBe(true);
    const normal = byField.get("NormalGameScript") as { totalMissionCount: number; resolvedCount: number; missingSessionKeys: number[] };
    expect(normal.missingSessionKeys.length).toBeGreaterThan(0);
    expect(normal.resolvedCount).toBeLessThan(normal.totalMissionCount);

    expect((await app.inject({ url: "/api/admin/dungeons/999999/diagnostics", headers: auth })).json()).toEqual({ items: [] });
  });

  // 41-hot-update: POST /api/admin/hot-update ("Aplicar agora" do ServerConfig.tsx) — admin-only, delega pro
  // canal interno do apps/game (GAME_INTERNAL_URL vazio neste teste, igual /broadcast: sem servidor de jogo de
  // verdade escutando, a rota responde 503 em vez de travar; o round-trip real com pacotes de refresh é
  // `apps/game/test/hot-update.test.ts`, que tem um GameServer de verdade).
  describe("hot-update (41-hot-update)", () => {
    it("requires an admin token", async () => {
      expect((await app.inject({ method: "POST", url: "/api/admin/hot-update", payload: { kinds: ["config"] } })).statusCode).toBe(401);
      const p = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "test", password: "test" } });
      expect((await app.inject({ method: "POST", url: "/api/admin/hot-update", headers: { authorization: `Bearer ${p.json().token}` }, payload: {} })).statusCode).toBe(403);
    });

    it("admin-authenticated: 503 quando o apps/game não está acessível (GAME_INTERNAL_URL vazio neste teste)", async () => {
      const auth = { authorization: `Bearer ${adminToken}` };
      const r = await app.inject({ method: "POST", url: "/api/admin/hot-update", headers: auth, payload: { kinds: ["items", "events"], notice: "manutencao em 10 min" } });
      expect(r.statusCode).toBe(503);
    });

    it("aceita corpo vazio (kinds/notice opcionais) sem quebrar antes de tentar falar com o game", async () => {
      const auth = { authorization: `Bearer ${adminToken}` };
      expect((await app.inject({ method: "POST", url: "/api/admin/hot-update", headers: auth, payload: {} })).statusCode).toBe(503);
    });
  });
});

describe("static + public", () => {
  it("serves a rewritten config.xml and case-insensitive resources with placeholders", async () => {
    const cfg = (await app.inject({ url: "/flash/CONFIG.xml" })).body;
    expect(cfg).toContain('<REQUEST_PATH value="http://api.test/request/"/>');
    const { buildConfigXml } = await import("../src/routes/static.js");
    const guide = (on: boolean) =>
      buildConfigXml({ cfg: { PUBLIC_URL: "http://x", SITE_URL: "http://s", USER_GUIDE_ENABLE: on } } as never, '<USER_GUILD_ENABLE value="true" />');
    expect(guide(false)).toBe('<USER_GUILD_ENABLE value="false" />'); // newbie guide off by default (stuck arrows / locked hall)
    expect(guide(true)).toBe('<USER_GUILD_ENABLE value="true" />');
    expect((await app.inject({ url: "/resource/image/arm/show.png" })).body).toBe("png");
    const miss = await app.inject({ url: "/resource/image/equip/m/cloth/default/1/show.png" });
    expect(miss.headers["content-type"]).toContain("image/png");
    const m = await app.inject({ url: "/api/admin/assets/misses", headers: { authorization: `Bearer ${adminToken}` } });
    expect(m.json()[0].path).toContain("cloth");
  });

  // site-admin-redesign: admin game-window previews read the client's exported UI art through this route
  // (not a hardcoded client dev-server port). Resolved on demand (no eager CiTree index — see static.ts's
  // comment on this route for why: ~153k files under apps/client/public/assets).
  it("/client-assets/ serves the PixiJS client's exported UI art read-only, rejects traversal", async () => {
    const lib = await app.inject({ url: "/client-assets/flash/ui/vietnam/swf/quest/library.json" });
    expect(lib.statusCode).toBe(200);
    expect(lib.headers["content-type"]).toContain("json");
    const parsed = JSON.parse(lib.body);
    expect(parsed.chars).toBeTruthy();
    expect((await app.inject({ url: "/client-assets/../../../package.json" })).statusCode).toBe(404);
    expect((await app.inject({ url: "/client-assets/flash/ui/vietnam/swf/quest/does-not-exist.png" })).statusCode).toBe(404);
  });

  it("dailyloglist.ashx answers value=true (else the client's startup queue never loads the mail list)", async () => {
    const r = await app.inject({ url: "/request/dailyloglist.ashx?selfid=1&key=x" });
    const x = inflate(r.rawPayload);
    expect(x).toContain('value="true"');
    expect(x).toContain("<DailyLogList ");
  });

  it("/request6600/ wraps COMPRESS_ASHX_6600 endpoints in zlib even when we have a real (plain-XML) handler", async () => {
    // IMListLoad.ashx is an implemented endpoint (not the "unknown endpoint" 404 path) that answers plain
    // XML for 4.1's loader; the 6600 client loads it with COMPRESS_REQUEST_LOADER and throws #2058 right
    // after the request if the body isn't zlib (routes/request.ts, right after ep.handle()).
    const plain = await app.inject({ url: "/request/IMListLoad.ashx?id=1" });
    expect(plain.body).toContain("<customList");
    const compressed = await app.inject({ url: "/request6600/IMListLoad.ashx?id=1" });
    expect(inflate(compressed.rawPayload)).toContain("<customList");
    // dailyloglist.ashx already zlibs its own output (xml(..., true)) for every client — the 6600 wrap must
    // not double-compress it.
    const r6600 = await app.inject({ url: "/request6600/dailyloglist.ashx?selfid=1&key=x" });
    expect(inflate(r6600.rawPayload)).toContain("<DailyLogList ");
  });

  // site-play: a página Jogar (apps/web) usa isto pro seletor de canal — mesma fonte/filtro do ServerList.ashx,
  // mas em JSON simples (id/name/state/online/capacity/níveis/pvpOnly/wsUrl) em vez do XML do cliente.
  it("public/channels: same filter as ServerList.ashx, plain JSON with pvpOnly/wsUrl for the web channel picker", async () => {
    const { sql } = await import("drizzle-orm");
    await h.db.execute(sql`INSERT INTO player."Server_List"
      ("ID","Name","IP","Port","State","Online","Total","Room","MustLevel","LowestLevel","NewerServer","ZoneId","ZoneName","Enabled","SortOrder","PvpOnly","WsUrl")
      VALUES
      (92, 'Canal PvP', '10.0.0.7', 9555, 2, 11, 300, 50, 0, 20, false, 1004, 'Canal PvP', true, 1, true, 'ws://10.0.0.7:9655/ws'),
      (93, 'Canal desligado', '10.0.0.8', 9666, 2, 0, 300, 50, 0, 0, false, 1005, 'Canal desligado', false, 2, false, '')`);
    try {
      const body = (await app.inject({ url: "/api/public/channels" })).json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.find((c: { id: number }) => c.id === 93)).toBeUndefined(); // Enabled = false
      const pvp = body.find((c: { id: number }) => c.id === 92);
      expect(pvp).toMatchObject({ name: "Canal PvP", state: 2, capacity: 300, pvpOnly: true, lowestLevel: 20, wsUrl: "ws://10.0.0.7:9655/ws" });
    } finally {
      await h.db.execute(sql`DELETE FROM player."Server_List" WHERE "ID" IN (92, 93)`);
    }
  });

  it("launcher manifest + public config", async () => {
    const l = (await app.inject({ url: "/api/public/launcher" })).json();
    expect(l.servers.length).toBeGreaterThan(0);
    expect(l.client.swfUrl).toBe("http://api.test/flash/Loading.swf");
    const c = (await app.inject({ url: "/api/public/config" })).json();
    expect(c.game.flashvars.key).toBe("");
    expect((await app.inject({ url: "/api/public/ranking?type=level" })).statusCode).toBe(200);
  });

  it("rank update: day/week deltas from snapshots, positions, UserRankDate.ashx", async () => {
    const { updateRank } = await import("../src/rank.js");
    const { q } = await import("../src/lib/db.js");
    const { sql } = await import("drizzle-orm");
    const first = await updateRank(h, new Date("2026-03-04T10:00:00Z"));
    expect(first.daySnapshot).toBe(true);
    const id = Number((await q(h, sql`SELECT "UserID" FROM player."Sys_Users_Detail" ORDER BY "UserID" LIMIT 1`))[0]!.UserID);
    await h.db.execute(sql`UPDATE player."Sys_Users_Detail" SET "GP" = "GP" + 500, "Offer" = "Offer" + 7 WHERE "UserID" = ${id}`);
    const second = await updateRank(h, new Date("2026-03-04T11:00:00Z"));
    expect(second).toEqual({ daySnapshot: false, weekSnapshot: false });
    const row = (await q(h, sql`SELECT "AddDayGP","AddWeekGP","AddDayOffer" FROM player."Sys_Users_Detail" WHERE "UserID" = ${id}`))[0]!;
    expect([Number(row.AddDayGP), Number(row.AddWeekGP), Number(row.AddDayOffer)]).toEqual([500, 500, 7]);
    // next day: the day counter restarts, the week one keeps going
    await updateRank(h, new Date("2026-03-05T01:00:00Z"));
    const row2 = (await q(h, sql`SELECT "AddDayGP","AddWeekGP" FROM player."Sys_Users_Detail" WHERE "UserID" = ${id}`))[0]!;
    expect([Number(row2.AddDayGP), Number(row2.AddWeekGP)]).toEqual([0, 500]);
    const x = await app.inject({ url: `/request/CelebList/UserRankDate.ashx?userID=${id}&ConsortiaID=0` });
    expect(x.body).toContain('value="true"');
    expect(x.body).toMatch(/<Item UserID="\d+" ConsortiaID="\d+" FightPower="\d+" PrevFightPower/);
  });
});
