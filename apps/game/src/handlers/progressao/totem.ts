/**
 * Aba no jogo: Totem (ícone de Honra no hall, `HonorUpIcon`) — subir de totem gastando Honra; bônus passivo
 * permanente de atributo (ataque/defesa/agilidade/sorte/vida/dano/guarda).
 * Pacote: 136 TOTEM (sem corpo).
 * C#: `OpenOneTotemHandler.cs:14-68` em `vendor/DDTank41/Game.Server/Packets/Client`.
 * Como testar: `apps/game/test/persist-all.test.ts` (ciclo salvar/sair/reload). Manual: `docs/features/totem.md`.
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";

/** TotemMgr.MaxTotem() (Bussiness/Managers/TotemMgr.cs:85-88): limite fixo no código, não vem da tabela. */
const MAX_TOTEM_ID = 10350;

/**
 * Trava de senha da bolsa (igual a `bagLocked` em `bolsa/senha-da-bolsa.ts`, duplicada aqui porque cada
 * handler C# fazia a mesma checagem `HasBagPassword && IsLocked` inline). Usada por `totem.ts` e `honra.ts`.
 */
export function bagLocked(ctx: ServerContext, p: GamePlayer): boolean {
  if (p.info.HasBagPassword && p.info.IsLocked) {
    p.sendMessage(0, ctx.lang.t("Bag.Locked"));
    return true;
  }
  return false;
}

/** GamePlayer.MoneyDirect(value, true, false) tipo Money (GamePlayer.cs:3432-3460): bound (MoneyLock) primeiro. */
export function tryRemoveMoney(p: GamePlayer, cost: number): boolean {
  if (p.info.Money + p.info.MoneyLock < cost) return false;
  p.removeMoney(cost);
  return true;
}

/**
 * 136 TOTEM (OpenOneTotemHandler.cs:14-68). Sem corpo (o pacote do cliente não lê nada extra).
 * Como lê esse código (cada variável): `id` = próximo totem (totemId atual + 1, ou 10001 se ainda não tem
 * nenhum); `info` = linha de Totem_Info desse id (ConsumeExp = custo em Money, ConsumeHonor = custo em
 * Honra); `gotMoney` = resultado da tentativa de gastar Money (ver o bug abaixo).
 *
 * BUG ORIGINAL PRESERVADO DE PROPÓSITO (OpenOneTotemHandler.cs:49-59):
 *   if (client.Player.MoneyDirect(needMoney, IsAntiMult: true, false)) ;    // <- ";" solta: isto é um no-op!
 *   {
 *       client.Player.AddTotem(id);
 *       client.Player.RemovemyHonor(needHonor);
 *       ...
 *   }
 * O `;` depois do `if(...)` faz o bloco `{ ... }` rodar SEMPRE, não só quando `MoneyDirect` retorna true. Ou
 * seja, no servidor original o totem só é gatilhado pela Honra: se o jogador não tiver Money suficiente,
 * `MoneyDirect` não remove nada (e manda SendInsufficientMoney por dentro), mas o totem sobe e a Honra é
 * gasta do mesmo jeito. Isto é comportamento real que já rodou em produção (não uma suposição) — reproduzido
 * aqui porque a regra do projeto é espelhar o C#. Se o dono quiser consertar esse bug (cobrar Money de
 * verdade), é só trocar o `if` abaixo por `if (!tryRemoveMoney(...)) return;` antes do `addTotem`.
 */
export async function totemOpenOne(ctx: ServerContext, p: GamePlayer): Promise<void> {
  // QA dev switch (cfg.ALL_OPEN): bypassa o requisito de nível 20 (OpenOneTotemHandler.cs:19-22), igual
  // aos outros gates listados em config.ts ALL_OPEN. Custo de Honra/Money continua cobrado normalmente.
  if (!ctx.cfg.ALL_OPEN && p.info.Grade < 20) return p.sendMessage(0, ctx.lang.t("OpenOneTotemHandler.Msg1"));
  if (bagLocked(ctx, p)) return;
  let id = p.info.totemId + 1;
  if (id <= 10000) id = 10001;
  if (id > MAX_TOTEM_ID) {
    p.sendMessage(0, ctx.lang.t("OpenOneTotemHandler.Maxlevel"));
    p.send(Out.totemRefresh(p.id, p.info.myHonor, p.info.totemId));
    return;
  }
  const info = ctx.templates.totemInfos.get(id);
  if (!info) {
    p.sendMessage(0, ctx.lang.t("OpenOneTotemHandler.ErrorData"));
    p.send(Out.totemRefresh(p.id, p.info.myHonor, p.info.totemId));
    return;
  }
  if (p.info.myHonor < info.ConsumeHonor) return p.sendMessage(0, ctx.lang.t("OpenOneTotemHandler.Msg2"));
  if (!tryRemoveMoney(p, info.ConsumeExp)) p.send(Out.insufficientMoney(p.id, 0)); // ver bug acima: não bloqueia o resto
  p.addTotem(id);
  p.removeMyHonor(info.ConsumeHonor);
  p.send(Out.totemRefresh(p.id, p.info.myHonor, p.info.totemId));
  p.updatePlayerProperties(); // EquipBag.UpdatePlayerProperties() (OpenOneTotemHandler.cs:57): aplica o bônus do novo totem
}
