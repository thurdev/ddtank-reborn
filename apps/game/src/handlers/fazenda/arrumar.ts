/**
 * Aba no jogo: Fazenda › "dọn đất" (arrumar/ajudar a limpar o terreno de um amigo) — o botão que aparece
 * quando você visita a fazenda de um amigo, separado do ícone de presente (`pacote-diario.ts`).
 * Pacote: 135 (código próprio, NÃO é sub do 81 FARM) — `GameSocketOut.arrange(param1)`
 * (`Source Flash/src/ddt/manager/GameSocketOut.as:2393-2399`): int 1 (reservado/sempre 1 no cliente),
 * int targetFarmerId. Resposta: int código — 0 = sucesso ("Đã dọn thành công đất cho bạn này"), 1 = já
 * arrumou esse amigo hoje ("Hôm nay đã dọn đất cho bạn này rồi"), 2 = limite diário do ajudante atingido
 * ("Số lần dọn đất của bạn này đã tối đa") — textos em `language.txt` (`ddt.farm.arrange0/1/2`),
 * lidos por `FarmModelController.__arrangeFriendFarmHandler` (mesmo arquivo AS3, linha ~196-209).
 *
 * C#: NENHUM handler existe pra esse pacote em `vendor/DDTank41/Game.Server` nem em `vendor/DDT-6600`
 * (confirmado por grep do enum completo `Packets/ePackageType.cs` dos dois — 135 nem está declarado lá;
 * o cliente manda um `PackageOut(135)` com o número cru, sem passar por `ePackageType`). Também não achei
 * fonte em nenhum fork externo pesquisado (`research/qa/feature-sources.md`) — é "tela sem servidor" de
 * verdade, confirmando `research/qa/pendencias-sem-fonte.md` linha "135 (farm arrange)".
 *
 * IDEIA (decisão de design nova, não é porte): já que não existe fonte nem semântica de "dọn đất"
 * (não há conceito de praga/planta morta no nosso modelo de `FieldRow` — só `SeedID`/maduro/vazio, ver
 * `estado.ts`), a ação virou um FAVOR real: colhe TODOS os terrenos maduros do amigo visitado e entrega a
 * colheita pro AMIGO (dono da fazenda, por mail se ele estiver offline ou a bolsa estiver cheia) — ou
 * seja, você adianta a colheita dele enquanto ele não está, sem roubar nada (isso já existe em
 * `colher.ts:gainField` pro caso de roubo de 1 unidade). Você (quem ajuda) ganha uma gorjeta fixa em
 * Cupons por fazer o favor. Regras (ambas limitadas por dia, resetam à meia-noite UTC):
 *   - 1x por amigo/dia (código 1 se repetir) — mesma trava de `FriendCrop` que `pacote-diario.ts` já usa,
 *     só que com o prefixo `"arr:"` pra não colidir com as chaves do presente diário.
 *   - Limite de amigos distintos ajudados por dia (`FarmArrangeDailyLimit`, padrão 5 — código 2 se
 *     passar) — evita abusar da gorjeta visitando muitos amigos só por isso; número comparável ao teto
 *     informal de outras recompensas diárias da fazenda (`FarmGiftPacksMoney` já usa um valor fixo
 *     parecido em `pacote-diario.ts`).
 * Gorjeta: `FarmArrangeMoney` (Server_Config, padrão 300 — um pouco menos que o presente diário de 500,
 * já que aqui NÃO precisa visitar; é clique único). Sem economia inventada maior que isso — só o
 * suficiente pra não deixar o botão morto no cliente.
 *
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts` (bloco "135 arrange").
 */
import type { GSPacket } from "@ddt/protocol";
import { PacketOut } from "@ddt/protocol";
import { saveItem } from "../../db/items.js";
import { sendMail } from "../../db/social.js";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { giveOrMail, isRipe, loadFarm, saveField, saveFarm, st, stateOf } from "./estado.js";

const ARRANGE_PREFIX = "arr:";

/** 135: int (reservado, sempre 1 no cliente), int targetFarmerId. */
export async function arrangeFriendFarm(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  pkt.readInt(); // reservado — sempre 1 em GameSocketOut.arrange, nada pra validar contra
  const targetId = pkt.readInt();
  const reply = (code: number) => { const out = new PacketOut(135); out.writeInt(code); p.send(out); };
  if (!targetId || targetId === p.id) return;
  const s = await st(ctx, p);
  if (s.viewing !== targetId) return; // só vale enquanto estiver visitando a fazenda desse amigo

  const today = ctx.now().toISOString().slice(0, 10);
  const claims = new Set((s.farm.FriendCrop ?? "").split(",").filter(Boolean));
  const key = `${ARRANGE_PREFIX}${targetId}:${today}`;
  if (claims.has(key)) return reply(1); // já arrumou esse amigo hoje

  const arrangedToday = [...claims].filter((k) => k.startsWith(ARRANGE_PREFIX) && k.endsWith(`:${today}`)).length;
  const dailyLimit = ctx.templates.cfgInt("FarmArrangeDailyLimit", 5);
  if (arrangedToday >= dailyLimit) return reply(2); // limite diário do ajudante

  const other = ctx.world.get(targetId);
  const ownerState = other ? stateOf(other) : undefined;
  const target = ownerState ?? (await loadFarm(ctx, targetId, ""));
  const now = ctx.now();
  for (const f of target.fields.values()) {
    if (!isRipe(f, now)) continue;
    const t = ctx.templates.findItem(f.SeedID);
    const goodsT = t ? ctx.templates.findItem(t.Property4) : undefined;
    const count = f.GainCount;
    f.SeedID = 0; f.FieldValidDate = 1; f.AccelerateTime = 0; f.GainCount = 0;
    await saveField(ctx, targetId, f);
    if (!goodsT || count <= 0) continue;
    if (other) await giveOrMail(ctx, other, goodsT, count);
    else {
      const item = ItemInfo.createFromTemplate(goodsT, count, 102);
      item.UserID = 0; item.BagType = -1; item.Place = -1;
      await saveItem(ctx.db.db, item);
      await sendMail(ctx.db.db, {
        Content: "Um amigo arrumou sua fazenda e colheu pra você!", Title: "Fazenda arrumada",
        Annex1: String(item.ItemID), Annex1Name: goodsT.Name ?? "", Gold: 0, Money: 0, Type: 9,
        Receiver: target.farm.FarmerName ?? "", ReceiverID: targetId, Sender: p.info.NickName ?? "Fazenda", SenderID: 0,
      } as never);
    }
  }

  claims.add(key);
  s.farm.FriendCrop = [...claims].filter((k) => k.endsWith(`:${today}`)).join(","); // corta dias velhos
  await saveFarm(ctx, s.farm);

  const tip = ctx.templates.cfgInt("FarmArrangeMoney", 300);
  p.addMoney(tip);
  reply(0);
}
