/**
 * Aba no jogo (6600): sistema "GM Activity" (`wonderfulactivity.swf`, `wonderfulActivity/`) — vitrine de
 * promoções configuradas pelo admin (recarga acumulada, consumo, "Carnaval" com ~10 subtipos, montaria,
 * presente diário, VIP geral...), igual um painel de campanhas de marketing dentro do hall.
 * Pacotes: 159 `WONDERFUL_ACTIVITY` (`sendWonderfulActivity`), 405 `WONDERFUL_ACTIVITY_INIT`
 *   (`requestWonderfulActInit`), 373 `WONDERFUL_GETREWARD` (`sendWonderfulActivityGetReward`).
 * C#: `WonderfulActivityHandler.cs` (159), `WonderfulActivityInitHandler.cs` (405) — nenhuma classe
 *   `[PacketHandler(373)]` existe (grep vazio em `Game.Server.Packets.Client`).
 *
 * Achado (m3-eventos-b): os dois handlers decompilados (159/405) são stubs — `WonderfulActivityInitHandler`
 * devolve um "ato" FIXO com GUIDs chumbados (`4ac24166-...`/`03ff7e54-...`) idênticos pra qualquer jogador,
 * qualquer requisição. A fonte REAL dos dados de campanha (`activityData`, carregada por
 * `WonderfulGMActAnalyer`/`creatWondActiveLoader()` → XML `GmActivityInfo`, o MESMO endpoint listado em
 * `docs/plan/TASKS.md` `m3-endpoints-schema`/`m3-endpoints-aninhados` como SEM schema ainda) nunca passa por
 * este socket — `WonderfulActivityManager.as checkActivity()` só usa `this.activityData[key]` (dicionário
 * carregado daquele XML separado) pra decidir o que aparece na lateral; sem aquele endpoint, NENHUMA campanha
 * real pode existir no cliente, e o `activityInitData` que 405 alimenta fica inerte (cross-reference nunca
 * casa uma entrada fake com uma campanha real). Implementar uma economia de campanhas aqui — sem o
 * `GmActivityInfo` admin (fora do escopo desta tarefa) — seria inventar dados que não existem em lugar
 * nenhum do catálogo extraído; em vez disso, 159/405 são portados BYTE A BYTE iguais ao C# original (mesma
 * resposta determinística, inofensiva, sem item/moeda nenhum), e 373 (sem handler nenhum no original E sem
 * como ser alcançado sem `activityData` real) é um no-op puro — mesma categoria de `97`/`211` "Pedra da
 * Sorte" em `roleta.ts`.
 * Como testar: `apps/game/test/client-6600-m3-wonderful-activity.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/**
 * 159 WONDERFUL_ACTIVITY: `WonderfulActivityHandler.cs` lê `type`+1 int descartado e responde com o MESMO
 * `type` (como byte) + `count=0` — `WonderfulActivityManager.rechargeReturnHander` só lê algo além do byte
 * `type` quando `type==0` (lê `count:int` e itera `count` `CanGetData`); `count=0` = "nenhuma recompensa
 * pendente", resposta válida e inofensiva pros outros valores de `type` também (eles não leem nada depois).
 */
export function wonderfulActivity(p: GamePlayer, pkt: GSPacket): void {
  const type = pkt.readInt();
  pkt.readInt(); // 2º int (WonderfulActivityHandler.cs:11, lido e descartado no original também)
  const out = new GSPacket(159, p.id);
  out.writeByte(type);
  out.writeInt(0); // count (CanGetData[]) — sem campanha real pra reportar, ver nota no topo do arquivo
  p.send(out);
}

/**
 * 405 WONDERFUL_ACTIVITY_INIT: `WonderfulActivityInitHandler.cs` devolve 1 "ato" fixo com GUIDs chumbados —
 * portado byte a byte (mesmos valores do C# original, incluindo os GUIDs: são opacos pro cliente, só servem
 * de chave de dicionário, e ficam inertes sem a campanha correspondente carregada por `GmActivityInfo.xml`,
 * ver nota no topo). `updateInfoType` (lido pelo cliente como 1º campo da resposta) é ecoado de volta.
 */
export function wonderfulActivityInit(p: GamePlayer, pkt: GSPacket): void {
  const updateInfoType = pkt.readInt();
  const out = new GSPacket(405, p.id);
  out.writeInt(updateInfoType);
  out.writeInt(1); // actCount
  out.writeString("4ac24166-267e-99fa-b875-824323d1ad83"); // actID (GUID opaco, igual ao C# original)
  out.writeInt(1); // statusCount
  out.writeInt(1); out.writeInt(0); // statusID=1, statusValue=0
  out.writeInt(1); // giftInfoCount
  out.writeString("03ff7e54-2af1-3f8a-6543-051a4116c4c2"); // giftbagId (GUID opaco)
  out.writeInt(0); out.writeInt(8); // times=0, allGiftGetTimes=8
  p.send(out);
}

/**
 * 373 WONDERFUL_GETREWARD: `sendWonderfulActivityGetReward` é chamado por ~10 telas de campanha (carnaval,
 * herói, retorno de pagamento...), todas só alcançáveis com uma campanha REAL em `activityData` — sem
 * `GmActivityInfo.xml` real (fora do escopo, ver nota no topo), nenhuma dessas telas chega a existir. Sem
 * `[PacketHandler(373)]` no C# original também (grep vazio) — no-op, mesma categoria de `211
 * CADDY_EXCHANGE_ALL` em `roleta.ts`.
 */
export function wonderfulActivityGetReward(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  // SendGiftInfo[] (sendWonderfulActivityGetReward, GameSocketOut.as:3685-3699): per entry, activityId (UTF) +
  // awardCount (int) + giftIdArr (UTF[]) — descartado, sem resposta (ver nota no topo do arquivo).
  const count = pkt.readInt();
  for (let i = 0; i < count; i++) {
    pkt.readString(); // activityId
    pkt.readInt(); // awardCount
    const giftCount = pkt.readInt();
    for (let j = 0; j < giftCount; j++) pkt.readString(); // giftIdArr[j]
  }
  ctx.log.debug(`373 WONDERFUL_GETREWARD: noop (player=${p.id}, count=${count})`);
}
