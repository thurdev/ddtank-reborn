/**
 * Aba no jogo: Loja — contador global de estoque diário comprado hoje (usado pela loja #20, item grátis diário).
 * Pacote: 168 GOODS_COUNT.
 * C#: `GoodsCountHandler.cs` + `WorldMgr.GetAllShopFreeCount`/`UpdateShopFreeCount`/`ScanShopFreeVaildDate`
 * (`WorldMgr.cs:523-597`): `Dictionary<int shopItemId, ShopFreeCountInfo>` GLOBAL (processo inteiro, não
 * por jogador) — chave é `Shop.ID` (a linha da loja, não o `ShopID` de agrupamento; nome confuso do DTO
 * original `ShopFreeCountInfo.ShopID`, mantido no pacote por compatibilidade com o cliente real —
 * `ddt.manager.ShopManager.as __updateGoodsCount` lê `(goodsID, count)` e sobrescreve
 * `ShopItemInfo.LimitCount` local com o valor RECEBIDO, isto é, manda o estoque RESTANTE, não o total).
 * `UpdateShopFreeCount(shopId, total)`: sem entrada hoje -> cria com `Count = total - 1` (1ª compra do dia
 * já consome 1 unidade) e devolve true; com entrada e `Count<=0` -> false (esgotado); senão decrementa e
 * devolve true. `ScanShopFreeVaildDate` (rodada por um timer, não portado) zera O DICIONÁRIO INTEIRO se
 * achar QUALQUER entrada de um dia != hoje — aqui o reset é POR CHAVE (nunca mais permissivo, só mais
 * preciso: uma chave de ontem nunca "contamina" o reset de outra chave ainda válida).
 * Só em memória (igual ao original, que usa um arquivo local fora do Postgres — `WorldMgrDataInfo`
 * "shopfreecount" — para sobreviver a restart; aqui perde no restart do processo, mesmo desvio aceito já
 * documentado pra outros estados em memória deste repo, ex. chicken box).
 * Como testar: `apps/game/test/shop-estoque-global.test.ts`. Manual: `docs/features/loja.md`.
 */
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "../registry.js";
import type { ServerContext } from "../../session/context.js";
import { dayKey } from "../../game/events.js";

interface FreeCountEntry { count: number; day: string }
const freeCountByCtx = new WeakMap<ServerContext, Map<number, FreeCountEntry>>();
function freeCountMap(ctx: ServerContext): Map<number, FreeCountEntry> {
  let m = freeCountByCtx.get(ctx);
  if (!m) freeCountByCtx.set(ctx, (m = new Map()));
  return m;
}

/** Olha o saldo de hoje sem consumir (pro cart de 44 BUY_GOODS poder recusar ANTES de cobrar dinheiro —
 * `Infinity` quando `total<=0`, ou seja, `LimitCount` não configurado = sem teto nenhum). */
export function peekShopFreeCount(ctx: ServerContext, shopItemId: number, total: number): number {
  if (total <= 0) return Infinity;
  const e = freeCountMap(ctx).get(shopItemId);
  const day = dayKey(ctx.now());
  if (!e || e.day !== day) return total - 1;
  return e.count;
}

/** `WorldMgr.UpdateShopFreeCount`: decrementa de verdade (só chamar depois que a compra já foi confirmada —
 * ver nota em `comprar.ts` sobre não gastar estoque global de um carrinho que acabou recusado por falta de
 * dinheiro). `true` = consumiu 1 unidade (ou sem limite configurado); `false` = esgotado hoje. */
export function updateShopFreeCount(ctx: ServerContext, shopItemId: number, total: number): boolean {
  if (total <= 0) return true;
  const m = freeCountMap(ctx);
  const day = dayKey(ctx.now());
  const e = m.get(shopItemId);
  if (!e || e.day !== day) { m.set(shopItemId, { count: total - 1, day }); return true; }
  if (e.count <= 0) return false;
  e.count -= 1;
  return true;
}

/** `WorldMgr.GetAllShopFreeCount`: só entradas de HOJE (de ontem já não contam — reset por chave). */
export function getAllShopFreeCount(ctx: ServerContext): Array<[shopItemId: number, remaining: number]> {
  const day = dayKey(ctx.now());
  const out: Array<[number, number]> = [];
  for (const [shopItemId, e] of freeCountMap(ctx)) if (e.day === day) out.push([shopItemId, e.count]);
  return out;
}

/** `AbstractPacketLib.SendShopGoodsCountUpdate` (168): N×[shopItemId, restante] + 3 ints reservados — o
 * original sempre manda 0/0/0 ali (2ª lista "por guild" que nenhum C# decompilado preenche de verdade,
 * `ShopManager.as __updateGoodsCount` lê e descarta quando `consortiaId!=Self.ConsortiaID`). */
export function shopGoodsCountPacket(ctx: ServerContext, userId: number): GSPacket {
  const list = getAllShopFreeCount(ctx);
  const out = new GSPacket(168, userId);
  out.writeInt(list.length);
  for (const [shopItemId, remaining] of list) { out.writeInt(shopItemId); out.writeInt(remaining); }
  out.writeInt(0); out.writeInt(0); out.writeInt(0);
  return out;
}

export function registerEstoqueDiario(r: HandlerRegistry): void {
  r.player(168, "GOODS_COUNT", (ctx, p) => { p.send(shopGoodsCountPacket(ctx, p.id)); });
}
