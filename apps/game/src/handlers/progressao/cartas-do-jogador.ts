/**
 * Aba no jogo: ficha de outro jogador — ver as cartas de buff equipadas de outro jogador (online ou offline).
 * Pacote: 18 GET_PLAYER_CARD.
 * C#: `GetPlayerCardHandler.cs:9-36` em `vendor/DDTank41/Game.Server/Packets/Client`.
 * Como testar: `apps/game/test/progression.test.ts`. Manual: `docs/features/cartas.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { loadPlayerInfo } from "../../db/characters.js";
import { loadUserCardBag } from "../../db/pets-cards.js";
import { CARD_EQUIP_SLOTS } from "../../game/cards.js";
import * as Out from "../../packets/out.js";

/**
 * 18 GET_PLAYER_CARD (GetPlayerCardHandler.cs:9-36): vê as cartas equipadas de outro jogador (online, via
 * `ctx.world.get`, ou offline via `loadPlayerInfo`/`loadUserCardBag`, igual a `WorldMgr.GetPlayerById` +
 * `PlayerBussiness.GetUserSingleByUserID`/`GetUserCardEuqip` no C#). `targetId` = UserID pedido; `cards` = as
 * até 5 cartas equipadas (Place 0..4); C# só responde se o jogador (`playerInfo`) existe.
 */
export async function getPlayerCard(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const targetId = pkt.readInt();
  const online = ctx.world.get(targetId);
  if (online) return p.send(Out.playerCardData(targetId, online.cardBag.equipped()));
  const info = await loadPlayerInfo(ctx.db.db, targetId);
  if (!info) return;
  const rows = await loadUserCardBag(ctx.db.db, targetId);
  const equipped = rows.filter((c) => c.Place >= 0 && c.Place < CARD_EQUIP_SLOTS && c.TemplateID !== 0);
  p.send(Out.playerCardData(targetId, equipped));
}
