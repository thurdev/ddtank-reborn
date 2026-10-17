/**
 * Aba no jogo: Forja › Forno › Energia latente (potencial). Sorteia um NOVO conjunto de atributos
 * ocultos pro equipamento gastando um "Catalisador", depois confirma (ou não) esse rol — como um
 * re-roll de atributo com preview antes de aceitar.
 * Pacotes: 133 LATENT_ENERGY.
 * C#: `LatentEnergyHandler.cs`.
 * Como testar: `apps/game/test/latent-energy.test.ts`. Manual: Forja → Forno → Energia latente →
 * equipamento qualificado + Catalisador → sorteia rol novo → confirmar aplica, senão mantém o antigo.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/**
 * Potencial no jogo: sorteia (type 1) ou aplica (type outro) um novo conjunto de atributos ocultos pro
 * equipamento, usando um "Catalisador" (`Property1===101`) consumido da bolsa indicada.
 * Contrapartida C#: `LatentEnergyHandler.cs` (pacote 133 LATENT_ENERGY).
 * Pacote que lê: `[byte type, int bagType, int place]`, e se `type===1` mais `[int temBagType, int temPlace]`.
 * Resposta `GSPacket(133)`: `[int place, string curStr, string newStr, datetime endTime]` — formato confirmado
 * pelo cliente (`LatentEnergyManager.as:equipChangeHandler`: `place=readInt(); curStr=readUTF(); newStr=readUTF();
 * endTime=readDate();`).
 * Como lê esse código (cada variável):
 * - `equipCell`: equipamento alvo (`p.getInventory(bagType).getItemAt(place)`); precisa `canLatentEnergy()`.
 * - `type===1`: sorteia um NOVO rol (`latentEnergyNewStr`) gastando 1 Catalisador; se o rol atual já é válido
 *   (`isValidLatentEnergy()`) ou está fora da faixa da tabela do Catalisador, reseta pra "0,...,0" primeiro.
 *   `rolledCurStr`: 7 valores — 4 sorteios em `[Property2,Property3)` + 3 em `[Property6,Property7)`.
 * - outro `type`: confirma o rol (`latentEnergyCurStr = latentEnergyNewStr`), sem gastar item.
 * - `inv`: inventário do equipamento (pra `updateItem`); sempre marca `IsBinds=true` ao final (como o original).
 */
export async function latentEnergy(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const type = pkt.readByte();
  const bagType = pkt.readInt();
  const place = pkt.readInt();
  const inv = p.getInventory(bagType);
  const equipCell = inv?.getItemAt(place);
  if (!inv || !equipCell || !equipCell.canLatentEnergy()) {
    return p.sendMessage(0, ctx.lang.t("LatentEnergyHandler.Msg1"));
  }
  let msg = "Kích hoạt tiềm năng thành công!";
  if (type === 1) {
    const catalystBagType = pkt.readInt();
    const catalystPlace = pkt.readInt();
    const catalystInv = p.getInventory(catalystBagType);
    const catalyst = catalystInv?.getItemAt(catalystPlace);
    if (!catalyst || catalyst.Count < 1 || catalyst.template.Property1 !== 101) {
      return p.sendMessage(0, "Vật phẩm không đủ.");
    }
    const curStrFirst = Number(equipCell.latentEnergyCurStr.split(",")[0]);
    const catalystTemplate = catalyst.template;
    if (equipCell.isValidLatentEnergy() || curStrFirst >= catalystTemplate.Property3 - 5 || curStrFirst <= catalystTemplate.Property2 - 5) {
      equipCell.resetLatentEnergy();
    }
    const roll = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo));
    const values: number[] = [];
    for (let i = 0; i < 4; i++) values.push(roll(catalystTemplate.Property2, catalystTemplate.Property3));
    for (let i = 0; i < 3; i++) values.push(roll(catalystTemplate.Property6, catalystTemplate.Property7));
    const rolledCurStr = values.join(",");
    if (equipCell.latentEnergyCurStr.split(",")[0] === "0") equipCell.latentEnergyCurStr = rolledCurStr;
    equipCell.latentEnergyNewStr = rolledCurStr;
    equipCell.latentEnergyEndTime = new Date(ctx.now().getTime() + 7 * 864e5);
    catalystInv!.removeCountFromStack(catalyst, 1);
  } else {
    equipCell.latentEnergyCurStr = equipCell.latentEnergyNewStr;
    msg = "Cập nhật tiềm năng thành công!";
  }
  const out = new GSPacket(133, p.id);
  out.writeInt(equipCell.Place);
  out.writeString(equipCell.latentEnergyCurStr);
  out.writeString(equipCell.latentEnergyNewStr);
  out.writeDateTime(equipCell.latentEnergyEndTime);
  equipCell.IsBinds = true;
  inv.updateItem(equipCell);
  p.updatePlayerProperties();
  p.send(out);
  p.sendMessage(0, msg);
}
