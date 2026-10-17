/**
 * Aba no jogo: trava de slot — o cadeado que aparece no canto de um item na bolsa/bancada pra impedir
 * que ele seja gasto por engano (ex.: devorado pelo Aprimorar/`EQUIP_BRING_UP`, vendido, etc.).
 * Pacote: 313 ITEM_CELL_IS_LOCKED — int bagType, int place, bool isLocked.
 * C#: NÃO existe em `vendor/DDTank41` nem `vendor/DDT-6600` (confirmado em `research/qa/port-A.md` e de
 * novo nesta sessão) — mas existe em forks posteriores do mesmo código-base (DDTank 3.4/3.8, mesmo padrão
 * `PacketHandler`/`Bussiness`/`eBageType` do nosso vendor): `ItemCellIsClockedHandler.cs`
 * (github.com/barrydevp/ddt3.4server, sem licença explícita no repo — fork público da mesma linhagem de
 * código vazado que já está em `vendor/`), registrado em `research/qa/feature-sources.md`. A lógica de lá
 * é trivial e direta — ler bagType/place/isLocked e gravar o campo booleano no item — e nosso `ItemInfo` já
 * tem exatamente esse campo (`cellLocked`, `game/item.ts`) sem nenhum handler escrevendo nele ainda. Porte
 * 1:1 dessa lógica.
 * Como testar: `apps/game/test/forge-advanced.test.ts` (ver bloco "313 ITEM_CELL_IS_LOCKED").
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 313 ITEM_CELL_IS_LOCKED: int bagType, int place, bool isLocked — trava/destrava um slot (sem resposta
 * ao cliente; o cadeado é só um estado local do item, igual ao original). */
export function itemCellIsLocked(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const bagType = pkt.readInt();
  const place = pkt.readInt();
  const isLocked = pkt.readBoolean();
  const inv = p.getInventory(bagType);
  const item = inv?.getItemAt(place);
  if (!inv || !item) return;
  item.cellLocked = isLocked;
  inv.updateItem(item);
}
