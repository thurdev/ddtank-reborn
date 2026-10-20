/**
 * 41-hot-update: aplica um "Aplicar agora"/"Atualizar jogo ao vivo" de admin NESTE canal — reloada os caches
 * de template (igual `/reload-templates`, `server.ts adminApi().reloadTemplates`) e empurra pros jogadores
 * JÁ CONECTADOS os pacotes que o cliente 4.1/6600 sabe processar sem relogar. Mapa completo (o que atualiza ao
 * vivo vs o que precisa relogar, e por quê) em `docs/features/hot-update.md`.
 *
 * Por `kind` (`HotUpdateKind`):
 *  - "items"/"shop"/"config"/"drops": `GamePlayer.updatePlayerProperties()` (player.ts:291-306) — recalcula
 *    stats a partir dos templates recarregados (`game/stats.ts computeStats`, já lê `ctx.templates`) e
 *    reenvia 38 PRIVATE_INFO / 67 UPDATE_PLAYER_INFO (`PlayerManager.as __updatePlayerInfo`, 4.1 linha 1658) /
 *    167 PLAYER_PROPERTY. NÃO republica nome/ícone/descrição/preço do item — o cliente só lê isso 1x no boot
 *    (`TemplateAllList.xml`/`ShopItemList.xml`, `StartupResourceLoader.as:446-447`), sem pacote de refresh no
 *    protocolo original; só os NÚMEROS que o jogo já manda via socket (dano/defesa/HP/FightPower efetivos,
 *    rates futuras) ficam de fato ao vivo.
 *  - "quests": `GamePlayer.questInv.sendAll()` (game/quests.ts:70) — reenvia 178 UPDATE_QUEST_DATA com o progresso
 *    atual. Mesma limitação: texto/recompensa da missão vêm do `QuestList.xml` do boot
 *    (`TaskManager.as:79`/`StartupResourceLoader.as:455`), não deste pacote.
 *  - "events": `pushEventIcons` (handlers/eventos/agendador.ts) + boss mundial — reenvia o estado ATUAL de
 *    cada ícone do hall (liga, elite, batalha da sociedade, resgate, captura de monstro, boss mundial) pra
 *    todo mundo já online. Cobre o caso de o admin habilitar uma janela cujo horário já estava em curso:
 *    `reload()` só dispara onStart/onEnd em TRANSIÇÃO (`EventScheduler.tick`, game/scheduler.ts) — sem este
 *    empurrão explícito, quem já estava online só veria o ícone abrir relogando.
 *  - `notice`: 3 SYS_MESSAGE (`Out.message`, igual `/broadcast`) pra todo mundo, dentro do mesmo pacote de ação
 *    (texto sugerido pela tarefa: "atualização aplicada, algumas telas atualizam ao reabrir").
 *
 * Chamado 2x por um `POST /hot-update` (admin/http.ts): localmente, pelo canal que recebeu o POST, e
 * remotamente, pelos OUTROS canais via `ch:hot-update` (bus/cross-channel.ts) — nenhum dos dois republica de
 * novo (cada canal só reloada + empurra pros SEUS próprios jogadores, igual todo outro método de
 * `ctx.crossChannel`).
 */
import type { GamePlayer } from "../game/player.js";
import { eventsRuntime, pushEventIcons } from "../handlers/eventos/agendador.js";
import { worldBossOpen } from "../handlers/eventos/boss-mundial.js";
import * as Out from "../packets/out.js";
import type { ServerContext } from "../session/context.js";

export type HotUpdateKind = "items" | "shop" | "quests" | "events" | "config" | "drops" | "maintenance" | "bots" | "channels";

/** kinds vazio/ausente = aplica tudo que este módulo sabe empurrar (default do botão "Aplicar agora"). */
const ALL_KINDS: HotUpdateKind[] = ["items", "shop", "quests", "events", "config"];

function pushPlayerRefresh(ctx: ServerContext, p: GamePlayer, set: Set<string>): void {
  if (set.has("items") || set.has("shop") || set.has("config") || set.has("drops")) p.updatePlayerProperties();
  if (set.has("quests")) p.questInv?.sendAll();
  if (set.has("events")) {
    pushEventIcons(ctx, p);
    const rt = eventsRuntime(ctx);
    if (rt.boss.window) p.send(worldBossOpen(rt, p));
  }
}

/** Resultado: igual `reloadTemplates()` + quantos jogadores locais foram notificados. */
export async function applyHotUpdate(ctx: ServerContext, kinds: string[] = [], notice?: string): Promise<Record<string, number>> {
  await ctx.templates.load(ctx.db.db, ctx.cfg.SERVER_ID, ctx.cfg.DEFAULT_LANG);
  const ev = eventsRuntime(ctx);
  await ev.reload();
  const set = new Set(kinds.length ? kinds : ALL_KINDS);
  const players = ctx.world.all();
  for (const p of players) pushPlayerRefresh(ctx, p, set);
  if (notice) for (const p of players) p.send(Out.message(1, notice));
  return {
    items: ctx.templates.items.size,
    shop: ctx.templates.shop.size,
    maps: ctx.templates.maps.size,
    scheduledEvents: ev.scheduler.events.length,
    achievements: ev.data.achievements.size,
    notified: players.length,
  };
}
