import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { validateGameLogin } from "@ddt/auth";
import { createDb, createDevAccounts, migrateDb, seedDatabase, type DbHandle } from "@ddt/db";
import { buildLoginPayload, bytesToBase64, generateRsaKey, rsaEncryptPkcs1, toDotNetRsaXml, type RsaPrivateKey } from "@ddt/protocol";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { REPO_ROOT } from "../src/config.js";

const VENDOR_REQ = join(REPO_ROOT, "vendor", "DDTank41", "Tank.Request");
let h: DbHandle;
let app: FastifyInstance;
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
  ({ app } = await buildApp({
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

  it("ServerList advertises GAME_PORT - 69", async () => {
    const r = await app.inject({ url: "/request/serverlist.ashx?rnd=0.5" });
    expect(r.body).toContain('IP="127.0.0.1" Port="9131"');
    expect(r.body).toMatch(/<Result value="true" message="Success!" total="\d+">/);
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
