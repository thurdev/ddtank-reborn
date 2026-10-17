/**
 * Aba no jogo: índice da Fazenda inteira — registra o pacote 81 FARM (um só código, sub-tipo lido como
 * byte dentro dele, não um SubRouter porque cada sub tem formato muito diferente). Cada ação tem o seu
 * próprio arquivo, nomeado como o jogador vê na tela:
 *
 *   estado.ts            (sem tela própria, infra compartilhada) — carregar/salvar terreno e fazenda,
 *                                                                   pacotes, dar-ou-mandar-mail
 *   entrar-fazenda.ts    (Fazenda › entrar/sair)         — sub 1 ENTER_FARM, sub 16 EXIT_FARM
 *   plantar.ts           (Fazenda › plantar semente)     — sub 2 GROW_FIELD
 *   fertilizar.ts        (Fazenda › regar tudo / adubar)  — sub 18 FRAM_GROP_FASTFORWARD, sub 3
 *                                                            ACCELERATE_FIELD
 *   colher.ts            (Fazenda › colher / limpar)      — sub 4 GAIN_FIELD, sub 7 KILLCROP_FIELD
 *   expandir-terreno.ts  (Fazenda › alugar terreno)       — sub 6 PAY_FIELD
 *   ajudante.ts          (Fazenda › ajudante automático)  — sub 8 HELPER_PAY_FIELD, sub 9
 *                                                            HELPER_SWITCH_FIELD
 *   compor-comida.ts     (Fazenda › compor comida)        — sub 5 COMPOSE_FOOD
 *   pacote-diario.ts     (Fazenda › pacote diário)        — sub 20 FARM_GIFTPACKS
 *   arrumar.ts           (Fazenda › "dọn đất" do amigo)   — pacote PRÓPRIO 135 (não é sub do 81)
 *
 * Pacotes: 81 FARM (+ 135, próprio, ver `arrumar.ts`). C#: `Game.Server/Farm/*` (ver `estado.ts`).
 * Jogador precisa de `MIN_GRADE` (25) pra usar a fazenda; contas guerreira (`isWarrior`) não têm acesso.
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`,
 * `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/fazenda.md` tem o passo a
 * passo de cada ação.
 */
import type { HandlerRegistry } from "../registry.js";
import { enterFarm, exitFarm } from "./entrar-fazenda.js";
import { growField } from "./plantar.js";
import { growFastForward, accelerateField } from "./fertilizar.js";
import { gainField, killCropField } from "./colher.js";
import { payField } from "./expandir-terreno.js";
import { helperPayField, helperSwitchField } from "./ajudante.js";
import { composeFood } from "./compor-comida.js";
import { farmGiftPacks } from "./pacote-diario.js";
import { arrangeFriendFarm } from "./arrumar.js";
import { isWarrior, MIN_GRADE, st } from "./estado.js";

export function registerFazenda(r: HandlerRegistry): void {
  r.player(81, "FARM", async (ctx, p, pkt) => {
    if (isWarrior(p)) return;
    if (p.info.Grade < MIN_GRADE) return p.sendMessage(0, ctx.lang.t("Farm.NeedGrade", MIN_GRADE));
    const type = pkt.readByte();
    const s = await st(ctx, p);
    switch (type) {
      case 1: return enterFarm(ctx, p, pkt, s);
      case 16: return exitFarm(ctx, p, pkt, s);
      case 2: return growField(ctx, p, pkt, s);
      case 18: return growFastForward(ctx, p, pkt, s);
      case 4: return gainField(ctx, p, pkt, s);
      case 7: return killCropField(ctx, p, pkt, s);
      case 6: return payField(ctx, p, pkt, s);
      case 8: return helperPayField(ctx, p, pkt, s);
      case 9: return helperSwitchField(ctx, p, pkt, s);
      case 3: return accelerateField(ctx, p, pkt, s);
      case 5: return composeFood(ctx, p, pkt);
      case 20: return farmGiftPacks(ctx, p, pkt, s);
      default:
        ctx.log.debug(`81 FARM: sub ${type} not handled`);
    }
  }, "partial");

  // Pacote próprio (não um sub do 81) — ver cabeçalho de arrumar.ts.
  r.player(135, "135", async (ctx, p, pkt) => {
    if (isWarrior(p)) return;
    if (p.info.Grade < MIN_GRADE) return;
    return arrangeFriendFarm(ctx, p, pkt);
  }, "implemented");
}
