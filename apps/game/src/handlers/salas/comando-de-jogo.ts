/**
 * Aba no jogo: dentro da luta (sem tela própria aqui) — repassa cada comando da partida (atirar, mover, trocar
 * arma, usar avião/arma auxiliar, habilidade de pet...) pro motor de luta da sala atual.
 * Pacote: 91 GAME_CMD.
 * C#: `GameDataHandler.cs` em `vendor/DDTank41/Game.Server`; cada sub vira um arquivo em `Game.Logic/Cmd/*.cs`.
 * Como testar: `apps/game/test/fight-*.test.ts`. Manual: `docs/features/salas-batalha.md`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/**
 * GameDataHandler.cs: repassa pro módulo de luta ativo (`FightSession.processData` → `parseCommand`). Sem
 * partida ativa, só sonda o sub `98` (keep-alive do cliente durante o lobby) e responde uma mentira neutra —
 * o resto do pacote fica intacto (`pkt.offset` é restaurado) pra não quebrar quem ler depois.
 */
export function comandoDeJogo(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const game = p.currentRoom?.game;
  if (game) return game.processData(p, pkt);
  const off = pkt.offset;
  if (pkt.readByte() === 98) {
    const out = new GSPacket(91, p.id);
    out.writeByte(98); out.writeBoolean(true); out.writeByte(0); out.writeByte(0); out.writeByte(0); out.writeBoolean(false);
    p.send(out);
  }
  pkt.offset = off;
}
