// task api-ashx: AuctionPageList.ashx (referenced by the 4.1 client, previously a stub).
import { sql, type SQL } from "drizzle-orm";
import { q, q1 } from "../../lib/db.js";
import { result, type XEl } from "../../lib/flash-xml.js";
import { item } from "../../lib/spec.js";
import { define, xml } from "../types.js";
import { GOODS } from "./social.js";

const and = (parts: (SQL | undefined | false)[]) => sql.join(parts.filter(Boolean) as SQL[], sql` AND `);
const inList = (nums: number[]) => sql.join(nums.map((n) => sql`${n}`), sql`, `);

function totalFirst(r: XEl, total: number): XEl {
  r.attrs.unshift(["total", String(total)]);
  return r;
}

// PlayerBussiness.GetAuctionPage:1051-1161 `type` switch (Auction.Category / TemplateID ranges).
const SINGLE_CATEGORY = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19]);
const CATEGORY_GROUPS: Record<number, number[]> = { 21: [1, 2, 5, 8, 9], 22: [13, 15, 6, 4, 3], 23: [16, 11, 10], 24: [8, 9], 25: [7, 17] };
const TEMPLATE_RANGE: Record<number, [number, number]> = { 26: [311000, 313999], 27: [311000, 311999], 28: [312000, 312999], 29: [313000, 313999] };
const TEMPLATE_SET: Record<number, number[]> = {
  35: [11560, 11561, 11562],
  1100: [11019, 11021, 11022, 11023],
  1101: [11019],
  1102: [11021],
  1103: [11022],
  1104: [11023],
  1105: [11001, 11002, 11003, 11004, 11005, 11006, 11007, 11008, 11009, 11010, 11011, 11012, 11013, 11014, 11015, 11016],
  1106: [11001, 11002, 11003, 11004],
  1107: [11005, 11006, 11007, 11008],
  1108: [11009, 11010, 11011, 11012],
  1109: [11013, 11014, 11015, 11016],
  1110: [11024],
  1111: [11039, 11041, 11043, 11047, 11040, 11042, 11044, 11048],
  1112: [11037, 11038, 11045, 11046],
  1113: [314101, 314102, 314103, 314104, 314105, 314106, 314107, 314108, 314109, 314110, 314111, 314112, 314113, 314114, 314115, 314116, 314121, 314122, 314123, 314124, 314125, 314126, 314127, 314128, 314129, 314130, 314131, 314132, 314133, 314134],
  1114: [314117, 314118, 314119, 314120, 314135, 314136, 314137, 314138, 314139],
  1116: [11035],
  1117: [11036],
  1118: [11026],
  1119: [11027],
};

function categoryFilter(type: number): SQL | undefined {
  if (SINGLE_CATEGORY.has(type)) return sql`"Category" = ${type}`;
  if (CATEGORY_GROUPS[type]) return sql`"Category" IN (${inList(CATEGORY_GROUPS[type]!)})`;
  if (TEMPLATE_RANGE[type]) {
    const [lo, hi] = TEMPLATE_RANGE[type]!;
    return sql`"TemplateID" >= ${lo} AND "TemplateID" <= ${hi}`;
  }
  if (TEMPLATE_SET[type]) return sql`"TemplateID" IN (${inList(TEMPLATE_SET[type]!)})`;
  return undefined;
}

// GetAuctionPage:1174-1193 order column; default when `order` matches none of 0/2/3/4/5 is the original's
// multi-column default (`"Category,Name,Price,dd,AuctioneerID"` — `dd` is a V_Auction_Scan-only computed column
// we don't have; approximated here with BeginDate, the closest real column).
const ORDER_COL: Record<number, string> = { 0: '"Name"', 2: '"BeginDate"', 3: '"AuctioneerName"', 4: '"Price"', 5: '"BuyerName"' };
const DEFAULT_ORDER = '"Category", "Name", "Price", "BeginDate", "AuctioneerID"';

const AUCTION_SPEC = "AuctionID AuctioneerID AuctioneerName BeginDate:d BuyerID BuyerName ItemID Mouthful PayType Price Rise ValidDate";

/**
 * AuctionPageList.ashx (vendor/DDTank41/Tank.Request/AuctionPageList.ashx.cs:26-81 ->
 * PlayerBussiness.GetAuctionPage:1041-1238, `SP_CustomPage` over view `V_Auction_Scan` ~= `Auction WHERE
 * IsExist=1`). Plain text (the original comments out `BinaryWrite(Compress(...))` and calls `Response.Write`
 * directly) despite the client loader type implying zlib (docs/spec/request/00-endpoints.md §3 "compression
 * mismatch" list) — followed here. `page`/`type`/`pay`/`userID`/`buyID`/`order`/`sort` are all `int.Parse`/
 * `bool.Parse` with no default in the original (missing/invalid -> exception -> caught -> `value=false
 * message=Fail! total=0`), `size` is hardcoded to 50 regardless of the query string. Each `Item` carries the
 * matching `Sys_Users_Goods` row when one exists (`PlayerBussiness.GetUserItemSingle` + `FlashUtils.CreateGoodsInfo`).
 */
export const AuctionPageList = define("/AuctionPageList.ashx", async ({ app, p }) => {
  try {
    const reqInt = (name: string): number => {
      const v = Number.parseInt(p(name) ?? "", 10);
      if (!Number.isFinite(v)) throw new Error(`missing ${name}`);
      return v;
    };
    const page = reqInt("page");
    const type = reqInt("type");
    const pay = reqInt("pay");
    const userID = reqInt("userID");
    const buyID = reqInt("buyID");
    const order = reqInt("order");
    const sortRaw = (p("sort") ?? "").toLowerCase();
    if (sortRaw !== "true" && sortRaw !== "false") throw new Error("bad sort");
    const sort = sortRaw === "true";
    const name = (p("name") ?? "").trim();
    const auctionIdsRaw = (p("Auctions") ?? "").trim();
    const auctionIds = (auctionIdsRaw ? auctionIdsRaw.split(",") : ["0"]).map((s) => Number.parseInt(s, 10)).filter(Number.isFinite);
    const size = 50;

    const where = and([
      sql`"IsExist" = true`,
      !!name && sql`"Name" ILIKE ${"%" + name.replace(/[%_\\]/g, (c) => "\\" + c) + "%"}`,
      categoryFilter(type),
      pay !== -1 && sql`"PayType" = ${pay}`,
      userID !== -1 && sql`"AuctioneerID" = ${userID}`,
      buyID !== -1 && sql`("BuyerID" = ${buyID} OR "AuctionID" IN (${inList(auctionIds.length ? auctionIds : [0])}))`,
    ]);
    const orderCol = ORDER_COL[order] ?? DEFAULT_ORDER;
    const orderSql = sql.raw(`${orderCol}${sort ? " DESC" : ""}, "AuctionID"`);

    const c = await q1<{ n: number }>(app.h, sql`SELECT count(*)::int AS n FROM player."Auction" WHERE ${where}`);
    const rows = await q(app.h, sql`SELECT * FROM player."Auction" WHERE ${where} ORDER BY ${orderSql} LIMIT ${size} OFFSET ${(page - 1) * size}`);
    const kids: XEl[] = [];
    for (const r of rows) {
      const node = item("Item", AUCTION_SPEC, r);
      const g = await q1(app.h, sql`SELECT * FROM player."Sys_Users_Goods" WHERE "ItemID" = ${r.ItemID as number} LIMIT 1`);
      if (g) node.add(item("Item", GOODS, g));
      kids.push(node);
    }
    return xml(totalFirst(result(true, "Success!", kids), Number(c?.n ?? 0)));
  } catch {
    return xml(totalFirst(result(false, "Fail!"), 0));
  }
}, "Tank.Request/AuctionPageList.ashx.cs");
