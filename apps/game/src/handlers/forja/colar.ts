/**
 * Aba no jogo: Forja › Forno › Colar (energia do colar). Consome "Pedra de Petroquímica" da bolsa
 * de itens pra subir `necklaceExp`/`necklaceExpAdd` — um bônus fixo salvo no personagem (não num
 * item), por isso essa ação não precisa da bancada da Forja.
 * Pacotes: 95 NECKLACE_STRENGTH.
 * C#: `NecklaceStrengthHandler.cs`.
 * Como testar: sem teste automatizado dedicado ainda. Manual: Forja → Forno → Colar → usar Pedra
 * de Petroquímica → `necklaceExp` sobe até o limite do nível 12.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** EquipType.NECKLACE_PTETROCHEM_STONE (Packets/EquipType.cs:85). */
const NECKLACE_PTETROCHEM_STONE = 11160;

/**
 * Colar no jogo: consome "Pedra de Petroquímica" da `propBag` pra subir `necklaceExp`/`necklaceExpAdd`
 * (bônus fixo salvo em `p.info`, não num item — por isso não precisa de bancada da forja).
 * Contrapartida C#: `NecklaceStrengthHandler.cs` (pacote 95 NECKLACE_STRENGTH).
 * Pacote que lê: `[byte type, int stonePlace, int count]` — nessa ORDEM exata (comentários do C# nomeiam as
 * variáveis fora de ordem, mas os `ReadByte/ReadInt/ReadInt` são type→stonePlace→count).
 * Resposta `GSPacket(95)`: `[int necklaceExp, int necklaceExpAdd]` — formato confirmado pelo cliente
 * (`PlayerManager.as:__necklaceStrengthInfoUpadte`: `Self.necklaceExp=readInt(); Self.necklaceExpAdd=readInt();`).
 * NÃO enviada quando `stone` não existe OU quando a tabela `StrengThenExp` está vazia (`maxExp===0`) — bug/guarda
 * original (`return 0` sem chamar `SendNecklaceStrength`), replicado aqui.
 * Exemplo concreto: pedra `Property2=4500` no slot 3 da `propBag`, `count=2`, `necklaceExp=0` →
 * `totalExp=9000`; se `maxExp` (limite do nível 12) for maior, grava `necklaceExp=9000` e recalcula o bônus.
 * Como lê esse código (cada variável):
 * - `type`: `1` é no-op (lido pelo cliente mas sem ação no servidor); `2` é a única lógica real.
 * - `stone`: item em `p.propBag.getItemAt(stonePlace)`; `count`: pedido pelo cliente, limitado a `stone.Count`.
 * - `currentLv`/`maxExp`/`needExp`: via `Templates.necklaceLevelByGP/necklaceMaxExp` (StrengThenExp por nível).
 * - `totalExp`: `necklaceExp + stoneExp*count`, truncado em `maxExp` se passar (e `count` recalculado pro tanto
 *   que cabe, mínimo 1 pedra consumida).
 */
export async function necklaceStrength(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const type = pkt.readByte();
  const stonePlace = pkt.readInt();
  let count = pkt.readInt();
  const stone = p.propBag.getItemAt(stonePlace);
  if (!stone) return;
  if (stone.Count < count) count = stone.Count;

  if (type === 2) {
    const MAX_LEVEL = 12;
    const stoneExp = stone.template.Property2;
    const currentLv = ctx.templates.necklaceLevelByGP(p.info.necklaceExp);
    const currentExpAdd = p.info.necklaceExpAdd;
    if (currentLv < MAX_LEVEL && stone.TemplateID === NECKLACE_PTETROCHEM_STONE && count > 0) {
      let totalExp = p.info.necklaceExp + stoneExp * count;
      const maxExp = ctx.templates.necklaceMaxExp();
      if (maxExp === 0) return; // C#: `return 0` sem mandar o pacote de resposta
      if (totalExp > maxExp) {
        const needExp = maxExp - p.info.necklaceExp;
        totalExp = p.info.necklaceExp + needExp;
        count = Math.trunc(needExp / stoneExp) <= 0 ? 1 : Math.trunc(needExp / stoneExp);
      }
      p.info.necklaceExp = totalExp;
      const nextExpAdd = ctx.templates.necklaceExpAdd(p.info.necklaceExp, currentExpAdd);
      if (currentExpAdd < nextExpAdd) p.updatePlayerProperties();
      p.info.necklaceExpAdd = nextExpAdd;
      p.propBag.removeTemplate(stone.TemplateID, count);
    }
  }
  const out = new GSPacket(95, p.id);
  out.writeInt(p.info.necklaceExp);
  out.writeInt(p.info.necklaceExpAdd);
  p.send(out);
}
