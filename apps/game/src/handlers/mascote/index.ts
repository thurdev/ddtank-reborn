/**
 * Aba no jogo: índice do Mascote inteiro — um pacote só (68 PET, byte sub) pra cada ação da tela, mais
 * 216 CARDS_DATA (Cartas, tela separada mas sempre viveu junto neste pacote). Cada ação tem o seu próprio
 * arquivo, nomeado como o jogador vê na tela:
 *
 *   comum.ts              (sem tela própria, helpers compartilhados)
 *   listar.ts             (Mascote › bolsa do mascote)    — sub 1  UpdatePet
 *   chocar-ovo.ts         (Mascote › chocar ovo)           — sub 2  AddPet
 *   alimentar.ts          (Mascote › alimentar)            — sub 4  FeedPet
 *   adotar.ts             (Mascote › adotar)                — sub 5  RefereshPet, sub 6 AdoptPet
 *   habilidade.ts         (Mascote › equipar habilidade)    — sub 7  EquipSkillPet
 *   soltar.ts             (Mascote › soltar pet)            — sub 8  ReleasePet
 *   renomear.ts           (Mascote › renomear pet)          — sub 9  RenamePet
 *   equipar-luta.ts       (Mascote › levar pra luta)        — sub 17 FightPet
 *   reverter.ts           (Mascote › reverter pet)          — sub 18 RevertPet
 *   equipamento.ts        (Mascote › equipar/remover item)  — sub 20 AddPetEquip, sub 21 DelPetEquip
 *   estrela-ascendente.ts (Mascote › estrela ascendente)    — sub 22 PetRisingStar
 *   evolucao.ts           (Mascote › evolução)              — sub 23 PetEvolution
 *   devorar.ts            (Mascote › devorar)               — sub 33 EatPet
 *   cartas.ts             (Cartas, tela separada)           — 216 CARDS_DATA
 *   cartas-slot.ts        (Cartas › slot/alma da carta)     — 170 CARDS_SLOT (6600 only, m3-cards-slot)
 *
 * Pacotes: ver tabela acima. C#: `Game.Server/Pet/Handle/*.cs` (ver cabeçalho de cada arquivo listado).
 * Lógica pura: `game/pets.ts`, `game/cards.ts`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`, `apps/game/test/pets-cards-vip.test.ts`,
 *   `apps/game/test/client-6600-m3-cards-slot.test.ts`.
 * Manual: `docs/features/mascote.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import { cfgNum } from "../../game/pets.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import { adopt, refresh } from "./adotar.js";
import { addPet } from "./chocar-ovo.js";
import { feed } from "./alimentar.js";
import { equipSkill } from "./habilidade.js";
import { release } from "./soltar.js";
import { rename } from "./renomear.js";
import { fight } from "./equipar-luta.js";
import { revert } from "./reverter.js";
import { addEquip, delEquip } from "./equipamento.js";
import { risingStar } from "./estrela-ascendente.js";
import { evolution } from "./evolucao.js";
import { eat } from "./devorar.js";
import { updatePet } from "./listar.js";
import { cardCommand } from "./cartas.js";
import { cardsSlot } from "./cartas-slot.js";

/** 68 PET: byte sub (PetPackageType) — PetHandler.HandlePacket. */
export async function petCommand(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const sub = pkt.readByte();
  ctx.log.debug(`pet ${p.id} sub ${sub}`);
  // PetHandler.HandlePacket: grade < 25 (Pet_Config LimitGrade) → "não liberado"
  if (p.info.Grade < cfgNum(ctx.templates.pets, "LimitGrade", 25)) return p.sendMessage(0, ctx.lang.t("PetHandler.Msg23"));
  switch (sub) {
    case 1: return updatePet(ctx, p, pkt);
    case 2: return addPet(ctx, p, pkt);
    case 4: return feed(ctx, p, pkt);
    case 5: return refresh(ctx, p, pkt);
    case 6: return adopt(ctx, p, pkt);
    case 7: return equipSkill(ctx, p, pkt);
    case 8: return release(ctx, p, pkt);
    case 9: return rename(ctx, p, pkt);
    case 17: return fight(ctx, p, pkt);
    case 18: return revert(ctx, p, pkt);
    case 20: return addEquip(ctx, p, pkt);
    case 21: return delEquip(ctx, p, pkt);
    case 22: return risingStar(ctx, p, pkt);
    case 23: return evolution(ctx, p, pkt);
    case 33: return eat(ctx, p, pkt);
    default:
      // Confirmado morto no original (nenhuma classe Handle carrega esse PetPackageType; PetHandleMgr loga
      // "LoadCommandHandler" e descarta o pacote): 16 PAY_SKILL, 24 PET_FORMINFO, 25 PET_FOLLOW, 32 PET_WAKE.
      ctx.log.debug(`pet sub ${sub} not ported`);
  }
}

export function registerMascote(r: HandlerRegistry): void {
  // Todo PetPackageType sub com classe Handle de verdade no original foi portado (1,2,4,5,6,7,8,9,17,18,20,21,
  // 22,23,33); 3 MOVE_PETBAG, 16 PAY_SKILL, 24 PET_FORMINFO, 25 PET_FOLLOW, 31 PET_BREAK, 32 PET_WAKE e 34+
  // (break info / carta temporária / dobrar equips / despertar / purificar / selar — era DDT 6600) não têm
  // classe Handle nenhuma em vendor/DDTank41 (PetHandleMgr.LoadCommandHandler loga erro e descarta) —
  // confirmado morto no cliente.
  r.player(68, "PET", (ctx, p, pkt) => petCommand(ctx, p, pkt));
  r.player(216, "CARDS_DATA", (ctx, p, pkt) => cardCommand(ctx, p, pkt));
  // 170 CARDS_SLOT: sem equivalente no enum 4.1 — um cliente 4.1 nunca manda esse código (m3-cards-slot).
  r.player(170, "CARDS_SLOT", (ctx, p, pkt) => cardsSlot(ctx, p, pkt));
}
