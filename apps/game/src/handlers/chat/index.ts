/**
 * Aba no jogo: índice do Chat inteiro (01 §2) — chat de cena, sussurro, cornetas, cartaz de desafio e
 * emoji. Cada ação tem o seu próprio arquivo:
 *
 *   scene-chat.ts       (chat da cena: geral/clã/termas/sala)  — 19 SCENE_CHAT
 *   privado.ts          (sussurro 1-a-1)                        — 37 CHAT_PERSONAL
 *   corneta.ts           (corneta pequena/grande/mundial)        — 71 S_BUGLE, 72 B_BUGLE, 73 C_BUGLE
 *   cartaz-desafio.ts    (cartaz de desafio)                     — 123 DEFY_AFFICHE
 *   emoji-cena.ts        (emoji acima do personagem)             — 20 SCENE_FACE
 *
 * Pacotes: ver tabela acima. C#: `Game.Server/Packets/Client/*.cs` (ver cabeçalho de cada arquivo).
 * Como testar: `apps/game/test/chat-bots.test.ts`.
 */
import type { HandlerRegistry } from "../registry.js";
import { sceneChat } from "./scene-chat.js";
import { chatPersonal } from "./privado.js";
import { smallBugle, bigBugle, worldBugle } from "./corneta.js";
import { defyAffiche } from "./cartaz-desafio.js";
import { sceneFace } from "./emoji-cena.js";

export function registerChat(r: HandlerRegistry): void {
  r.player(19, "SCENE_CHAT", sceneChat);
  r.player(37, "CHAT_PERSONAL", chatPersonal);
  r.player(71, "S_BUGLE", smallBugle);
  r.player(72, "B_BUGLE", bigBugle);
  r.player(73, "C_BUGLE", worldBugle);
  r.player(123, "DEFY_AFFICHE", defyAffiche);
  r.player(20, "SCENE_FACE", sceneFace);
}
