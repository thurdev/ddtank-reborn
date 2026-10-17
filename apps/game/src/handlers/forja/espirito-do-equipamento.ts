/**
 * Aba no jogo: Forja › Forno › Espírito do equipamento. Bancada de 3 slots (0 sorte, 1 arma/elmo/roupa,
 * 2 pedra de espírito): cada tentativa consome 1 pedra (+1 item de sorte se presente) e tenta subir 1
 * nível (máx. 10) do "espírito" ligado à CATEGORIA do equipamento (arma/elmo/roupa compartilham o mesmo
 * nível de espírito dentro da mesma categoria — não é por item individual).
 * Pacotes: 391 EQUIP_GHOST (pedido sem corpo) → resposta `GSPacket(391)` `[boolean sucesso]`.
 * C#: nenhum handler existe em `vendor/DDTank41`/`vendor/DDT-6600` (tela do cliente nunca ligada no
 * servidor base deste projeto — ver `research/qa/feature-sources.md`). Porte 1:1 de `barrydevp/ddt3.8`
 * (`Game.Server/Packets/Client/EquipGhostHandler.cs` + `Managers/SpiritMgr.cs` +
 * `SqlDataProvider/Data/UserEquipGhostInfo.cs`/`SpiritInfo.cs`), licença não publicada no repo — ver
 * `THIRD_PARTY_NOTICES.md`. A tabela `SpiritInfo` (quanto cada nível soma de ataque/sorte/defesa/agilidade)
 * não existia no catálogo original: dados reais do fork, seed em `packages/db/drizzle/0010_forja_specs_seed.sql`
 * (decodificados de `Tank.Request/spiritinfolist.xml`), tabela em `packages/db/src/schema/app.ts`.
 * Persistência: `player."Sys_Users_Detail".GhostEquipList` — coluna que JÁ existia no catálogo original
 * (reservada, nunca escrita por nenhum handler) com o formato "categoryId,level,totalGhost|..." (3
 * categorias fixas: 1 arma, 5 elmo, 7 roupa — igual ao `EquipGhostData.categoryID` do cliente,
 * `store/equipGhost/data/EquipGhostData.as`). Adicionada a `SAVED_DETAIL_COLUMNS` (`game/player-info.ts`)
 * pra persistir ao sair/salvar.
 * Como testar: `apps/game/test/forge-ghost.test.ts`.
 * Manual: Forja → Forno → Espírito do equipamento → arrastar arma/elmo/roupa + pedra de espírito
 * (+ opcional item de sorte) → confirmar → nível do espírito daquela categoria sobe ou acumula tentativa.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";

/** EquipGhostData.categoryID (store/equipGhost/data/EquipGhostData.as): só essas 3 categorias têm espírito. */
export const GHOST_CATEGORIES = [1, 5, 7] as const;

export interface GhostSlot { categoryId: number; level: number; totalGhost: number }

/** `GhostEquipList` = "categoryId,level,totalGhost" × 3 separados por "|" (uma entrada por categoria). */
export function parseGhostEquipList(value: string | null | undefined): GhostSlot[] {
  const slots = (value ?? "")
    .split("|")
    .map((part) => {
      const [categoryId, level, totalGhost] = part.split(",").map(Number);
      return { categoryId: categoryId ?? 0, level: level ?? 0, totalGhost: totalGhost ?? 0 };
    })
    .filter((s) => GHOST_CATEGORIES.includes(s.categoryId as 1 | 5 | 7));
  for (const categoryId of GHOST_CATEGORIES) if (!slots.some((s) => s.categoryId === categoryId)) slots.push({ categoryId, level: 0, totalGhost: 0 });
  return slots;
}

export function formatGhostEquipList(slots: GhostSlot[]): string {
  return slots.map((s) => `${s.categoryId},${s.level},${s.totalGhost}`).join("|");
}

/**
 * Espírito do equipamento no jogo: sobe o nível (0-10) do espírito da categoria do equipamento gastando
 * 1 pedra de espírito (+1 item de sorte opcional) da bancada da forja.
 * Contrapartida C#: `EquipGhostHandler.cs` (pacote 391 EQUIP_GHOST, sem corpo no pedido — só o header).
 * Resposta `GSPacket(391)`: `[boolean isSuccess]` (único campo lido pelo cliente, `EquipGhostManager.__equipGhost`).
 * Como lê esse código (cada variável):
 * - `store`: bancada da forja (`p.storeBag`); slot 0 = item de sorte, 1 = equipamento, 2 = pedra de espírito
 *   (`EquipGhostHandler.cs:20`: "0 - luck, 1 - equip, 2 - stone").
 * - `item`: precisa existir, `Count===1` e `CategoryID` em {1 arma, 5 elmo, 7 roupa} (`GHOST_CATEGORIES`).
 * - `stone`: precisa existir e `Count>0`; seu nível (`template.Level`) entra na fórmula de chance.
 * - `luck`: opcional; quando presente soma `Property2` à taxa base.
 * - `ghost`: entrada atual de `GhostEquipList` pra essa categoria (nível 0-10 + `totalGhost` tentativas).
 * - `probability`: fórmula EXATA do fork (`Math.floor(5 * rate * 2^(2^(pedraLevel-1) + 2 - nívelAtual))`),
 *   comparada com `roll` sorteado em `[0, 10000)` — chance cai muito conforme o nível sobe.
 * - sucesso: `ghost.level++`, `ghost.totalGhost=0`; falha: só `ghost.totalGhost++`. Sempre consome 1 pedra
 *   (+1 item de sorte se presente); nunca consome nada quando o pedido é rejeitado antes da tentativa.
 * - aviso global (`ctx.world.all()`) só quando sucesso E nível final > 8 (ou seja, virou 9 ou 10).
 */
export async function equipGhost(ctx: ServerContext, p: GamePlayer, rnd = Math.random): Promise<void> {
  const store = p.storeBag;
  const luck = store.getItemAt(0);
  const item = store.getItemAt(1);
  const stone = store.getItemAt(2);

  if (!item || item.Count !== 1 || !GHOST_CATEGORIES.includes(item.template.CategoryID as 1 | 5 | 7)) {
    return p.sendMessage(0, ctx.lang.t("EquipGhostHandler.Material1"));
  }
  if (!stone || stone.Count <= 0) {
    return p.sendMessage(0, ctx.lang.t("EquipGhostHandler.Material2"));
  }

  const slots = parseGhostEquipList(p.info.GhostEquipList);
  const ghost = slots.find((s) => s.categoryId === item.template.CategoryID)!;
  const oldLv = ghost.level < 0 ? 0 : ghost.level;
  if (ghost.level > 10) {
    return p.sendMessage(0, ctx.lang.t("EquipGhostHandler.MaxLevel"));
  }

  let rate = 100;
  if (luck) rate += luck.template.Property2;
  const probability = Math.floor(5 * rate * Math.pow(2, Math.pow(2, stone.template.Level - 1) + 2 - oldLv));
  const roll = Math.floor(rnd() * 10000);
  const isSuccess = probability > roll;

  if (isSuccess) {
    ghost.totalGhost = 0;
    ghost.level += 1;
  } else {
    ghost.totalGhost += 1;
  }
  p.info.GhostEquipList = formatGhostEquipList(slots);

  const out = new GSPacket(391, p.id);
  out.writeBoolean(isSuccess);
  store.beginChanges();
  try {
    store.removeCountFromStack(stone, 1);
    if (luck) store.removeCountFromStack(luck, 1);
  } finally {
    store.commitChanges();
  }
  p.send(out);

  if (isSuccess && item.ItemID > 0 && ghost.level > 8) {
    const zone = ctx.templates.server?.ZoneName ?? "";
    const msg = ctx.lang.t("EquipGhostHandler.congratulation", zone, p.info.NickName, item.TemplateID, ghost.level);
    const notice = Out.message(2, msg);
    for (const onlinePlayer of ctx.world.all()) onlinePlayer.send(notice);
  }
  if (item.Place < 31) p.updatePlayerProperties();
}
