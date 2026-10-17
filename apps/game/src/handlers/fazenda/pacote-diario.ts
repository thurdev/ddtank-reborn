/**
 * Aba no jogo: Fazenda › pacote diário (clicar no ícone de presente sobre o dono da fazenda visitada,
 * ou sobre si mesmo, pra ganhar um mimo diário).
 * Pacotes: 81 FARM sub 20 FARM_GIFTPACKS ("giftPacks"): int targetPlayerId.
 * C#: **sem handler nenhum** — mesmo caso de COMPOSE_FOOD (`FarmHandleMgr` não registra 20), implementação
 * nova do Reborn. Controlado pela própria coluna `Sys_User_Farm.FriendCrop` do jogador visitante (coluna
 * existia no schema original mas nunca era escrita — confirmado pesquisando a árvore toda do vendor por
 * "FriendCrop", zero resultados fora do schema), no formato `"<ownerId>:<yyyy-mm-dd>,..."`, cortada pras
 * entradas de hoje em toda escrita.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: Fazenda → visitar um amigo
 * → clicar no ícone de presente sobre o avatar dele.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { saveFarm, type FarmState } from "./estado.js";

/** sub 20 FARM_GIFTPACKS ("giftPacks"): int targetPlayerId — dono da fazenda cujo avatar foi clicado
 * (você mesmo ou um amigo visitado). */
export async function farmGiftPacks(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  const targetId = pkt.readInt();
  if (!targetId || targetId === p.id || s.viewing !== targetId) return;
  const today = ctx.now().toISOString().slice(0, 10);
  const claims = new Set((s.farm.FriendCrop ?? "").split(",").filter(Boolean));
  const key = `${targetId}:${today}`;
  if (claims.has(key)) return p.sendMessage(0, "Você já pegou o presente desse amigo hoje.");
  claims.add(key);
  s.farm.FriendCrop = [...claims].filter((k) => k.endsWith(`:${today}`)).join(","); // drop stale days
  await saveFarm(ctx, s.farm);
  const reward = ctx.templates.cfgInt("FarmGiftPacksMoney", 500);
  p.addMoney(reward);
  const ownerName = ctx.world.get(targetId)?.info.NickName ?? "um amigo";
  p.sendMessage(0, `Você recebeu um presente de [${ownerName}]: ${reward} Cupons!`);
}
