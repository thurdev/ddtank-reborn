/**
 * Aba no jogo: índice da Sala inteira (lobby de partida PvP/PvE + Campo de treino) — registra tudo que
 * responde ao roteador `94 GAME_ROOM` e aos pacotes avulsos de sala. Cada ação tem o seu próprio arquivo,
 * nomeado como o jogador vê na tela:
 *
 *   criar-sala.ts        (Sala › criar)                — sub 0  GAME_ROOM_CREATE
 *   entrar-sala.ts       (Sala › entrar)                — sub 1  GAME_ROOM_LOGIN
 *   configurar-sala.ts   (Sala › configurar, anfitrião) — sub 2  GAME_ROOM_SETUP_CHANGE (mapa/dificuldade de
 *                          masmorra PvE e modo do Campo de treino também passam por aqui)
 *   expulsar.ts          (Sala › expulsar, anfitrião)   — sub 3  GAME_ROOM_KICK
 *   sair-sala.ts         (Sala › saída)                 — sub 5  GAME_ROOM_REMOVEPLAYER
 *   trocar-time.ts       (Sala › trocar de time)        — sub 6  GAME_TEAM
 *   iniciar-partida.ts   (Sala › iniciar, anfitrião)     — sub 7  GAME_START, 82 GAME_MISSION_START (FightLab),
 *                          86 atalho de iniciar
 *   lista-de-salas.ts    (Lista de salas / de masmorras) — sub 9  ROOMLIST_UPDATE
 *   trocar-lugar.ts      (Sala › trocar de lugar)        — sub 10 GAME_ROOM_UPDATE_PLACE, 11/12 pickup
 *   ficar-pronto.ts       (Sala › ficar pronto)           — sub 15 GAME_PLAYER_STATE_CHANGE
 *   convidar.ts           (Sala › convidar amigo)         — 70  GAME_INVITE
 *   comando-de-jogo.ts    (dentro da luta, sem tela própria) — 91 GAME_CMD
 *
 * Pacotes: ver tabela acima.
 * C#: ver cabeçalho de cada arquivo listado. Base: `vendor/DDTank41/Game.Server/Rooms`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`
 * tem o passo a passo de cada ação, `docs/features/pve-masmorras.md` cobre a parte PvE.
 */
import { SubRouter, type HandlerRegistry } from "../registry.js";
import { criarSala } from "./criar-sala.js";
import { entrarSala } from "./entrar-sala.js";
import { configurarSala } from "./configurar-sala.js";
import { expulsarJogador } from "./expulsar.js";
import { sairDaSala } from "./sair-sala.js";
import { trocarTime } from "./trocar-time.js";
import { iniciarPartida, destravarAndarFightLab, atalhoIniciarAnfitriao } from "./iniciar-partida.js";
import { listarSalas } from "./lista-de-salas.js";
import { trocarLugar, cancelarPickup, escolherEstiloDePickup } from "./trocar-lugar.js";
import { ficarPronto } from "./ficar-pronto.js";
import { convidarJogador } from "./convidar.js";
import { comandoDeJogo } from "./comando-de-jogo.js";

/**
 * Roteador do pacote `94 GAME_ROOM` — um `.on(subcode, nome, fn)` por ação.
 * Contrapartida C#: `RoomMgr.cs`, `GameRoom`, `EnterRoomAction` em `vendor/DDTank41/Game.Server/Rooms`.
 */
export function roomRouter(): SubRouter {
  return new SubRouter("int", "GAME_ROOM")
    .on(0, "GAME_ROOM_CREATE", (ctx, p, pkt) => criarSala(ctx, p, pkt))
    .on(1, "GAME_ROOM_LOGIN", (ctx, p, pkt) => entrarSala(ctx, p, pkt))
    .on(2, "GAME_ROOM_SETUP_CHANGE", (ctx, p, pkt) => configurarSala(ctx, p, pkt), "partial")
    .on(3, "GAME_ROOM_KICK", (ctx, p, pkt) => expulsarJogador(ctx, p, pkt))
    .on(5, "GAME_ROOM_REMOVEPLAYER", (ctx, p) => sairDaSala(ctx, p))
    .on(6, "GAME_TEAM", (ctx, p) => trocarTime(ctx, p))
    .on(7, "GAME_START", (ctx, p) => iniciarPartida(ctx, p), "partial")
    .on(9, "ROOMLIST_UPDATE", (ctx, p, pkt) => listarSalas(ctx, p, pkt))
    .on(10, "GAME_ROOM_UPDATE_PLACE", (ctx, p, pkt) => trocarLugar(ctx, p, pkt), "partial")
    .on(11, "GAME_PICKUP_CANCEL", (ctx, p) => cancelarPickup(ctx, p))
    .on(12, "GAME_PICKUP_STYLE", (ctx, p, pkt) => escolherEstiloDePickup(ctx, p, pkt), "partial")
    .on(15, "GAME_PLAYER_STATE_CHANGE", (ctx, p, pkt) => ficarPronto(ctx, p, pkt));
}

/**
 * Registra handlers de sala no servidor — liga `94 GAME_ROOM` (roteador acima), `91 GAME_CMD`,
 * `70 GAME_INVITE`, `82 GAME_MISSION_START` e `86` (atalho de iniciar) ao `HandlerRegistry`.
 */
export function registerRooms(r: HandlerRegistry): SubRouter {
  const rr = roomRouter();
  r.player(94, "GAME_ROOM", rr.handler);
  r.player(91, "GAME_CMD", (ctx, p, pkt) => comandoDeJogo(ctx, p, pkt));
  r.player(70, "GAME_INVITE", (ctx, p, pkt) => convidarJogador(ctx, p, pkt));
  r.player(82, "GAME_MISSION_START", (ctx, p, pkt) => destravarAndarFightLab(ctx, p, pkt));
  r.player(86, "QUEST_ONE_KEY_FINISH(start)", (ctx, p) => atalhoIniciarAnfitriao(ctx, p));
  return rr;
}
