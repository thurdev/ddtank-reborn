/**
 * Aba no jogo: Forja (bancada, slots de reaproveitamento 1-4) — fica aqui, não em `handlers/forja/`,
 * por razão histórica: esse código vivia solto em `items.ts` desde antes do porte da Forja ter sido
 * organizado em pastas; mover pra `handlers/forja/` fica fora do escopo deste porte (ver AGENTS.md:
 * "Don't touch other handler files").
 * Pacote: 222 EQUIP_RECYCLE_ITEM.
 * C#: `EquipRetrieveHandler.cs:435` — consome as 4 posições 1-4 da `StoreBag` ("os 4 slots de
 * reaproveitamento da Forja"), soma a Quality delas e sorteia UM item da tabela de drop
 * `eDropType.Retrieve` (`Drop_Condiction`/`Drop_Item` — ver `db/templates.ts:dropConditions/dropItems`)
 * pela soma. Só as somas 8/12/15/20 têm linha de drop (estilo CardResetHandler "só alguns valores
 * funcionam"); qualquer outra soma não dá nada, igual ao original (`probability` fica 0 →
 * `GetDropCondiction` nunca casa → no-op).
 * Como testar: sem teste dedicado hoje. Manual: Forja → bancada → 4 itens nos slots 1-4 → Reaproveitar.
 *
 * Como lê esse código (cada variável):
 * - totalQuality: soma de Quality dos 4 itens removidos do banco de forja (sempre removidos, mesmo se o drop falhar
 *   — assim está no original, é "cobra primeiro").
 * - dropId/pool: grupo de drop (Drop_Condiction) e os itens possíveis dentro dele (Drop_Item), por quality sum.
 * - picked: um item aleatório (uniforme) dentre `pool` — NÃO pesado pelo campo Random (EquipRetrieveHandler.cs:471
 *   usa `rnd.Next(infos.Count)`, diferente do drop pesado usado em combate).
 */
import { ItemInfo } from "../../game/item.js";
import type { HandlerRegistry } from "../registry.js";

export function registerReaproveitarForja(r: HandlerRegistry): void {
  r.player(222, "EQUIP_RECYCLE_ITEM", (ctx, p) => {
    const inv = p.storeBag;
    let totalQuality = 0;
    for (let i = 1; i < 5; i++) {
      const item = inv.getItemAt(i);
      if (!item) continue;
      inv.removeItemAt(i);
      totalQuality += item.template.Quality;
    }
    const probability = [8, 12, 15, 20].includes(totalQuality) ? totalQuality : 0;
    const dropId = ctx.templates.findDropCondition(11 /* eDropType.Retrieve */, String(probability), "0");
    const pool = ctx.templates.dropItems.get(dropId);
    if (!pool?.length) return;
    const picked = pool[Math.floor(Math.random() * pool.length)]!;
    const t = ctx.templates.findItem(picked.ItemId);
    if (!t) return;
    const recycled = ItemInfo.createFromTemplate(t, 1, 105, ctx.now());
    if (t.CategoryID !== 11) recycled.ValidDate = 30;
    recycled.IsBinds = true; // EquipRetrieveHandler.cs:481 — unconditionally true at the end regardless of the branch above
    inv.addItemTo(recycled, 0);
  }, "partial");
}
