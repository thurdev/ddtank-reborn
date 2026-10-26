// M3 (task m3-ashx, research/6600/ashx-missing.md): first real ports of DDT-6600 `.ashx` endpoints that were
// answering an empty/stub Result until now. Each export cites the vendor/DDT-6600/Source/Tank.Request/<name>.cs
// handler it mirrors. 4.1 never had these handlers (the client calls them, the 4.1 server has no .cs for them
// either — see registry.ts STUBS comment "requested by the client, no handler in DDTank41 either"); where the
// real 6600 behaviour differs from the "Not supported" stub we used to answer both clients, we now branch on
// `client` so a 4.1 request keeps exactly the response it got before this task.
import { all } from "../../lib/db.js";
import { el, fmtDate, fmtDateDefault, result, wallNow, type XEl } from "../../lib/flash-xml.js";
import { define, text, xml } from "../types.js";

/**
 * SceneCollecRandomNpc.ashx (Tank.Request/scenecollecrandomnpc.cs:26 -> Road.Flash/FlashUtils.cs:9-12
 * CreatescenecollecrandomnpcInfo): a hardcoded decoy NPC appearance for the scene-collection minigame, zlib
 * (COMPRESS_REQUEST_LOADER, LoaderCreate.as). No DB read in the original — the values are literal in FlashUtils.
 */
export const SceneCollecRandomNpc = define("/SceneCollecRandomNpc.ashx", async () => {
  const item = el("item", [
    ["NickName", "Hime Chibi"],
    ["Sex", 1],
    ["Hair", 3251],
    ["Glass", 2213],
    ["Face", 6224],
    ["Eye", 4240],
  ]);
  return xml(result(true, "Success!", [item]), true);
}, "Tank.Request/scenecollecrandomnpc.cs");

/**
 * SubActiveList.ashx (Tank.Request/subactivelist.cs:26-41 -> PlayerBussiness.GetAllSubActive/
 * GetAllSubActiveCondition -> SP_SubActive_All/SP_SubActiveCondition_All over game.Sub_Active_List/
 * Sub_Active_Condition). Plain text (context.Response.Write, not BinaryWrite(Compress(...))).
 */
export const SubActiveList = define("/SubActiveList.ashx", async ({ app }) => {
  const kids: XEl[] = [];
  let ok = false;
  try {
    const actives = await all(app.h, "game", "Sub_Active_List");
    const conditions = await all(app.h, "game", "Sub_Active_Condition");
    for (const a of actives) {
      kids.push(
        el("Active", [
          ["ActiveID", a.ActiveID as number],
          ["SubID", a.SubID as number],
          ["IsOpen", !!a.IsOpen],
          ["StartDate", fmtDate(a.StartDate as Date)],
          ["StartTime", fmtDate(a.StartTime as Date)],
          ["EndDate", fmtDate(a.EndDate as Date)],
          ["EndTime", fmtDate(a.EndTime as Date)],
          ["IsContinued", !!a.IsContinued],
          ["ActiveInfo", (a.ActiveInfo as string) ?? ""],
        ]),
      );
      for (const c of conditions.filter((c) => Number(c.ActiveID) === Number(a.ActiveID)))
        kids.push(
          el("Condition", [
            ["ActiveID", c.ActiveID as number],
            ["SubID", c.SubID as number],
            ["ConditionID", c.ConditionID as number],
            ["Type", c.Type as number],
            ["Value", (c.Value as string) ?? ""],
            ["AwardType", c.AwardType as number],
            ["AwardValue", (c.AwardValue as string) ?? ""],
            ["IsValid", !!c.IsValid],
          ]),
        );
    }
    ok = true;
  } catch {
    /* subactivelist.cs: caught and logged, value stays false */
  }
  return xml(result(ok, ok ? "Success!" : "fail!", kids, [["nowTime", fmtDateDefault(wallNow())]]));
}, "Tank.Request/subactivelist.cs");

/** UpdateVersion.ashx (Tank.Request/UpdateVersion.cs:11-13): literal "1", plain text, no XML at all. */
export const UpdateVersion = define("/UpdateVersion.ashx", async () => text("1"), "Tank.Request/UpdateVersion.cs");

/** VoteSubmit.ashx (Tank.Request/VoteSubmit.cs:9-11): literal "1", plain text — same no-op shape as UpdateVersion.
 *  4.1 has no handler for this URL either (STUBS comment); keep the old "Not supported" XML for a 4.1 caller so its
 *  behaviour doesn't change, since this endpoint was never exercised there. */
export const VoteSubmit = define("/VoteSubmit.ashx", async ({ client }) => (client === "6600" ? text("1") : xml(result(false, "Not supported"))), "Tank.Request/VoteSubmit.cs");

/**
 * LogTime.ashx (vendor/DDTank41/Tank.Request/LogTime.ashx.cs:27-73): parses page/size/order/consortiaID/state/name
 * and, on success, builds `<Result>` children from ConsortiaBussiness.GetConsortiaAllyPage — but the method has
 * no `context.Response.Write` anywhere (unlike every sibling handler in this folder). task api-ashx: confirmed by
 * reading the vendor .cs directly — this is a dead handler in DDTank41 itself, so the real HTTP body is always
 * empty, for both clients, regardless of params or outcome. (The donor `Tank.Request/LogTime.cs` used for the
 * 6600 client is the "1" literal from a different handler with the same name; 6600 keeps that behaviour here.)
 */
export const LogTime = define("/LogTime.ashx", async ({ client }) => (client === "6600" ? text("1") : text("")), "Tank.Request/LogTime.ashx.cs");

/**
 * AdvanceQuestTime.ashx (vendor/DDTank41/Tank.Request/AdvanceQuestTime.ashx.cs:25-53, same code in the donor
 * Tank.Request/AdvanceQuestTime.cs): parses `useid` but the Bussiness block is empty
 * (`using (PlayerBussiness db = new PlayerBussiness()) { }` — no-op) and the handler unconditionally
 * `Response.Write(string.Format("0,{0},0", DateTime.Now))` — the XElement it builds (and the commented-out
 * `BinaryWrite(Compress(...))`) is dead code. task api-ashx: this endpoint IS present in vendor/DDTank41 (`ls
 * Tank.Request/AdvanceQuestTime.ashx*`), so the 4.1 client gets the exact same literal text as 6600, not the old
 * "Not supported" stub.
 */
export const AdvanceQuestTime = define(
  "/AdvanceQuestTime.ashx",
  async () => text(`0,${fmtDateDefault(wallNow())},0`),
  "Tank.Request/AdvanceQuestTime.ashx.cs",
);

/**
 * TeamBuyActiveAwardInfo.ashx (Tank.Request/teambuyactiveawardinfo.cs:13-19): always
 * `<Result value="false" message="Success!" />` — `flag` is declared `false` and never flipped, `value` text is
 * "Success!" regardless; the group-buy event was shipped unfinished server-side. Literal translation, no DB.
 */
export const TeamBuyActiveAwardInfo = define("/TeamBuyActiveAwardInfo.ashx", async () => xml(result(false, "Success!")), "Tank.Request/teambuyactiveawardinfo.cs");

/**
 * ConsortiaWarConsortiaRank.ashx (Tank.Request/consortiawarconsortiarank.cs:13-21): always
 * `<Result value="false" message="fail!"><Item/></Result>` — guild-war ranking was never wired server-side either.
 */
export const ConsortiaWarConsortiaRank = define(
  "/ConsortiaWarConsortiaRank.ashx",
  async () => xml(result(false, "fail!", [el("Item")])),
  "Tank.Request/consortiawarconsortiarank.cs",
);

/**
 * ConsortiaWarPlayerRank.ashx (Tank.Request/consortiawarplayerrank.cs:13-29): needs `ConsortiaID` + `UserID`; when
 * both are present it echoes back a single hardcoded placeholder `<Item>` (Rank=1, Name="Sociedade", Score=99,
 * ZoneName="Canal", ZoneID=4) — not a DB read in the original, literal values kept as-is.
 */
export const ConsortiaWarPlayerRank = define("/ConsortiaWarPlayerRank.ashx", async ({ p }) => {
  const consortiaId = p("ConsortiaID");
  const userId = p("UserID");
  if (!consortiaId || !userId) return xml(result(true, "sucess!"));
  return xml(
    result(true, "Success!", [
      el("Item", [
        ["Rank", 1],
        ["ConsortiaID", consortiaId],
        ["Name", "Sociedade"],
        ["Score", 99],
        ["UserID", userId],
        ["ZoneName", "Canal"],
        ["ZoneID", 4],
      ]),
    ]),
  );
}, "Tank.Request/consortiawarplayerrank.cs");
