/**
 * Aba no jogo: Bolsa (6600) — "Figurino"/dress room, só existe no cliente 6600 (`playerDress.swf`,
 * `UIModuleTypes.PLAYER_DRESS`): salva/aplica conjuntos de roupa (até `DressModel.DRESS_LEN`=3 modelos,
 * combo box "model1/2/3"), "dobra" (mescla validade de) peças duplicadas da bolsa de vestir, trava a bolsa
 * de vestir. Tarefa `m3-figurino` (docs/plan/TASKS.md); detalhe completo em
 * research/6600/packets-m1.md "M3 figurino".
 *
 * COLISÃO DE CÓDIGO (não é layout, é o número do pacote em si — mesmo padrão do Detalhe D/259 e do
 * 121/RUNE_COMMAND em `research/6600/packets-m1.md`): `ddt/data/socket/ePackageType.as` define
 * `MARRYINFO_UPDATE=237` na 4.1 (editar o mural de casamento, `handlers/casamento/mural.ts`) e
 * `PLAYER_DRESS=237` no 6600 — o nome antigo nem existe mais no enum 6600 (confirmado em
 * `vendor/DDT-6600/Source/Game.Server/Game.Server.Packets/ePackageType.cs:166` vs
 * `vendor/DDTank41/Game.Server/Packets/ePackageType.cs:194`). `casamento/index.ts` despacha o código 237
 * por `clientKind` pra evitar isso: 6600 cai aqui, 4.1 continua indo pro mural.
 *
 * Sub-comandos (`playerDress/data/PlayerDressType.as`, confirmado contra `Game.Server.Packets/
 * PlayerDressType.cs` e o handler real `Game.Server.Packets.Client/PlayerDressHandler.cs:10-102`):
 *
 * 1 GET_DRESS_MODEL — também serve de SAVE (o cliente manda este sub tanto pra pedir quanto pra gravar;
 *   aqui só o sentido cliente->servidor existe, que é sempre "salvar"): int slot, int count, count×[int
 *   bagType, int place] — `place` é o slot da EquipBag (pode ser um slot equipado 0-30 OU um slot de
 *   bolsa 31-126, o cliente manda o que estiver em `PlayerDressView._dressCells[i].info.Place` no momento
 *   do save). Pra cada par: busca o item em `p.equipBag.getItemAt(place)`; se existir e o BagType bater,
 *   persiste (dá ItemID real) se ainda não tinha (`PlayerDressHandler.cs:35-38`, equivalente a
 *   `PlayerBussiness.AddGoods`) e guarda {itemId, templateId} no modelo. Se a lista final não ficar vazia,
 *   grava `DressModelArr` (upsert em Sys_Users_Extra) e manda de volta sub 1 (modelo cheio) + sub 2
 *   (índice atual, inalterado — salvar não troca qual modelo está "ativo").
 *   NÃO REPLICADO: `PlayerDressHandler.cs:39` também chama `client.Player.AvatarBag.DressEquip(item.Place)`
 *   — mas `AvatarBag` é uma bag SEPARADA de 392 slots (Relíquias/avatar, não portada neste servidor) e o
 *   `place` veio da EquipBag; na prática isso só marca `IsBinds=true` num slot aleatório/null da AvatarBag,
 *   sem efeito observável (nem no C# original). Omitido sem mudança de comportamento.
 * 2 CURRENT_MODEL — int slot: troca qual modelo está "ativo" (SÓ bookkeeping — quem re-equipa os itens de
 *   verdade é o CLIENTE, via `sendMoveGoods`/`sendItemTransfer` normais ANTES de mandar este sub,
 *   `PlayerDressView.exchangeProperty` — já cobertos pelo 49 CHANGE_PLACE_GOODS existente, `mover.ts`).
 *   Persiste `CurentDressModel` e ecoa o mesmo valor de volta (sub 2).
 * 6 FOLD_DRESS — int count, count×[int bagType(descartado), int fromPlace, int bagType(descartado), int
 *   toPlace]: mescla a VALIDADE de dois itens do MESMO TemplateID (ex. duas peças de vestir "temporárias"
 *   empilhadas em slots diferentes), somando `ValidDate` do item de `toPlace` dentro do de `fromPlace`
 *   (capado em 365 dias) — `PlayerDressHandler.cs:59-91`. REMOVE o item de `toPlace` (diferente do `.cs`: lá
 *   chama `AvatarBag.RemoveAllItem(list)` com slots da EquipBag — mesma classe de bug do sub 1 acima (bag
 *   errada) — replicado fielmente (o item de `toPlace` fica intacto, só `fromPlace` ganha a validade
 *   somada). Manda 64 GRID_GOODS do slot atualizado (via `equipBag.updateItem`, hook normal da bolsa).
 * 7 LOCK_DRESSBAG — sem payload: ack puro (`PlayerDressHandler.cs:93-95`), sem efeito de estado (a trava
 *   real da bolsa de vestir é só visual no cliente, `DressBagView.baglist.locked`).
 *
 * Enviado também no burst de login (`session/login.ts`, só clientKind "6600" — GamePlayer.cs:3644
 * `AvatarBag.UpdateInfo()`): sub 1 (modelo cheio) + sub 2 (índice atual), decodificados de
 * `extra.DressModelArr`/`CurentDressModel` (player.Sys_Users_Extra, migration 0013 — já tinha as colunas,
 * nenhuma migração nova precisou ser criada pra esta tarefa).
 *
 * Simplificações assumidas (documentadas, não bloqueantes):
 * - Sem renomear preset: o enum `PlayerDressType` só tem 4 sub-códigos (1/2/6/7), nenhum de "renomear" — os
 *   3 modelos são rotulados por chave de idioma fixa (`playerDress.model1/2/3`), não editável pelo jogador
 *   no cliente original. "Rename" citado na tarefa não existe no protocolo real; não implementado.
 * - Sem "AvatarBag": este servidor guarda TODO item do jogador numa bag só por BagType (`p.equipBag` pra
 *   BagType.EquipBag, equipado OU em estoque) — não existe uma bag de 392 slots separada pra "coleção".
 *   `FindEquipDressModel`/`GetEquipDressModel` do C# (que teria procurado em EquipBag OU AvatarBag conforme
 *   o slot) aqui procuram só em `p.equipBag` (busca completa, não só slots equipados — mesmo range que o
 *   `GetEquipDressModel` original varre).
 * - Sem "seed" automático do modelo 0 a partir da roupa vestida numa conta nova (`LoadDefaulModelArr`,
 *   `PlayerAvataInventory.UpdateCurrentDressModels()`): o C# decompilado nunca desliga essa flag, então re-
 *   popularia o modelo 0 a CADA chamada de `UpdateCurrentDressModels` (login E toda vez que QUALQUER modelo
 *   é salvo) — sobrescrevendo silenciosamente customizações do jogador no slot 0. Reproduzir isso pareceu
 *   pior que não reproduzir: uma conta nova simplesmente começa com os 3 modelos vazios (tela de Figurino
 *   sem nada salvo ainda, sem crash — confirmado no "Achado grande 1" do `m2-bolsa`, research/6600/
 *   packets-m1.md).
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { GSPacket } from "@ddt/protocol";
import { sql } from "drizzle-orm";
import * as Out from "../../packets/out.js";
import { saveItem } from "../../db/items.js";

export type DressModel = { itemId: number; templateId: number }[];
export type DressModelArr = Map<number, DressModel>;

/** PlayerAvataInventory.DressModelArrToString (PlayerAvataInventory.cs:541-583): "<m0>,<m1>,<m2>", cada
 *  modelo (se não vazio) "itemId|templateId;itemId|templateId;...". */
export function encodeDressModelArr(models: DressModelArr): string {
  const parts: string[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const list = models.get(slot) ?? [];
    parts.push(list.length ? list.map((e) => `${e.itemId}|${e.templateId}`).join(";") : "");
  }
  return parts.join(",");
}

/**
 * PlayerAvataInventory.StringToDressModelArr (PlayerAvataInventory.cs:585-620): decodifica e, igual o C#
 * (`FindEquipDressModel`), descarta qualquer par (itemId,templateId) que não exista mais na bolsa do
 * jogador — presets ficam em sincronia com itens vendidos/perdidos desde o último save. Sem "AvatarBag"
 * separada (ver nota no cabeçalho do arquivo): busca em `p.equipBag` inteira, não só slots equipados.
 */
export function decodeDressModelArr(p: GamePlayer, raw: string | null | undefined): DressModelArr {
  const out: DressModelArr = new Map();
  const parts = (raw ?? ",,").split(",");
  const items = p.equipBag.getItems();
  for (let slot = 0; slot < 3; slot++) {
    const text = parts[slot] ?? "";
    const list: DressModel = [];
    if (text) {
      for (const pair of text.split(";")) {
        const [itemIdStr, templateIdStr] = pair.split("|");
        const itemId = Number(itemIdStr) || 0;
        const templateId = Number(templateIdStr) || 0;
        if (items.some((it) => it.ItemID === itemId && it.TemplateID === templateId)) list.push({ itemId, templateId });
      }
    }
    out.set(slot, list);
  }
  return out;
}

/** Upsert em player."Sys_Users_Extra" (mesmo padrão de `handlers/loja/roleta-canhao.ts` — a tabela não tem
 *  helper db/*.ts próprio ainda, ver nota lá) — grava DressModelArr/`p.currentDressModel` e espelha em
 *  `p.extra` quando a linha já existe em memória (uma conta nova não tem `p.extra` até o primeiro upsert
 *  aqui; `p.currentDressModel`/`p.dressModels`, não `p.extra`, são a fonte de verdade em memória — ver
 *  nota no campo `GamePlayer.currentDressModel`). */
async function saveDressExtra(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const arr = encodeDressModelArr(p.dressModels);
  const current = p.currentDressModel;
  await ctx.db.db.execute(sql`INSERT INTO player."Sys_Users_Extra" ("UserID", "DressModelArr", "CurentDressModel") VALUES (${p.id}, ${arr}, ${current})
    ON CONFLICT ("UserID") DO UPDATE SET "DressModelArr" = EXCLUDED."DressModelArr", "CurentDressModel" = EXCLUDED."CurentDressModel"`);
  if (p.extra) { p.extra.DressModelArr = arr; p.extra.CurentDressModel = current; }
}

/** sub 1 GET_DRESS_MODEL (save): PlayerDressHandler.cs case 1 (lines 19-52). */
async function saveDressModel(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const slot = pkt.readInt();
  const count = pkt.readInt();
  const list: DressModel = [];
  for (let i = 0; i < count; i++) {
    const bagType = pkt.readInt();
    const place = pkt.readInt();
    const it = p.equipBag.getItemAt(place);
    if (it && it.BagType === bagType) {
      if (it.ItemID === 0) await saveItem(ctx.db.db, it); // PlayerBussiness.AddGoods: dá um ItemID real pro modelo referenciar
      list.push({ itemId: it.ItemID, templateId: it.TemplateID });
    }
  }
  if (list.length === 0) return; // SaveDressModel no-ops numa lista vazia (PlayerAvataInventory.cs:517)
  p.dressModels.set(slot, list);
  await saveDressExtra(ctx, p);
  p.send(Out.dressModelArr(p.id, p.dressModels));
  p.send(Out.currentDressModel(p.id, p.currentDressModel)); // inalterado — salvar não troca o modelo ativo
}

/** sub 2 CURRENT_MODEL (switch, bookkeeping only): PlayerDressHandler.cs case 2 (lines 53-58). */
async function setCurrentDressModel(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const slot = pkt.readInt();
  p.currentDressModel = slot;
  await saveDressExtra(ctx, p);
  p.send(Out.currentDressModel(p.id, slot));
}

/** ItemInfo.IsValidItem (ItemInfo.cs:780-783): permanente (ValidDate=0) OU nunca usado OU ainda não venceu. */
function isValidItem(it: { ValidDate: number; IsUsed: boolean; BeginDate: Date }, now: Date): boolean {
  return it.ValidDate === 0 || !it.IsUsed || new Date(it.BeginDate.getTime() + it.ValidDate * 86_400_000) > now;
}

/** sub 6 FOLD_DRESS (merge ValidDate de itens duplicados): PlayerDressHandler.cs case 6 (lines 59-92). */
function foldDress(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const count = pkt.readInt();
  const now = ctx.now();
  for (let i = 0; i < count; i++) {
    pkt.readInt(); // bagType (origem) — descartado, igual ao .cs original
    const fromPlace = pkt.readInt();
    pkt.readInt(); // bagType (destino) — descartado
    const toPlace = pkt.readInt();
    if (fromPlace === toPlace) continue; // mesmo slot: somaria a validade consigo mesmo sem consumir nada
    const from = p.equipBag.getItemAt(fromPlace);
    const to = p.equipBag.getItemAt(toPlace);
    if (!from || !to || from.TemplateID !== to.TemplateID) continue;
    if (!(from.ValidDate > 0 && isValidItem(to, now))) continue;
    if (!isValidItem(from, now)) from.BeginDate = to.BeginDate;
    from.ValidDate = Math.min(365, from.ValidDate + to.ValidDate);
    p.equipBag.updateItem(from); // AllUpdateItem([from]) -> 64 GRID_GOODS do slot atualizado
    // DIFERENÇA PROPOSITAL do .cs: lá `AvatarBag.RemoveAllItem(list)` usa a bag errada e o item de `toPlace`
    // nunca some — isso duplica item (soma a validade e o jogador fica com os dois). Aqui o item consumido
    // é removido, que é a intenção óbvia do recurso ("juntar" duas peças numa só).
    p.equipBag.removeItem(to);
  }
}

/** 237 PLAYER_DRESS (6600 só): despacha pelo sub-comando. */
export async function playerDress(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const cmd = pkt.readByte();
  switch (cmd) {
    case 1: await saveDressModel(ctx, p, pkt); break;
    case 2: await setCurrentDressModel(ctx, p, pkt); break;
    case 6: foldDress(ctx, p, pkt); break;
    case 7: p.send(Out.playerDressLockAck(p.id)); break;
    default: break; // sub-comando desconhecido — o .cs original só loga e retorna (PlayerDressHandler.cs:97-99)
  }
}
