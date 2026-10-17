/**
 * Aba no jogo: Mascote › evolução (sobe o grau de evolução do personagem usando o item 11163; diferente da
 * evolução de pet individual — isso é um bônus de combate do jogador, por tiers de `Pet_Fight_Property`).
 * Pacotes: 68 PET sub 23 (PetEvolution).
 * C#: `PetEvolution.cs`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → Evolução.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/** 23 PetEvolution: item 11163 (templateId), count -> `player.evolutionGrade`/`evolutionExp` (tiers de Pet_Fight_Property). */
export function evolution(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const templateId = pkt.readInt();
  let count = pkt.readInt();
  if (templateId !== 11163) return;
  const food = p.propBag.getItemByTemplateID(0, templateId);
  if (!food || count <= 0) return;
  if (food.Count < count) count = food.Count;
  const exp = food.template.Property2 * count;
  if (exp <= 0) return;
  const total = (p.info.evolutionExp ?? 0) + exp;
  let leveledUp = false;
  let grade = p.info.evolutionGrade ?? 0;
  const maxLv = ctx.templates.petFightMax; // PetMgr.GetEvolutionMax = contagem de linhas de Pet_Fight_Property
  for (let i = grade; i <= maxLv; i++) {
    const f = ctx.templates.stats.petFight(i + 1);
    if (f && f.Exp <= total) { grade = i + 1; leveledUp = true; }
  }
  p.info.evolutionGrade = grade;
  p.info.evolutionExp = total;
  p.propBag.removeCountFromStack(food, count);
  p.updatePlayerProperties();
  p.send(Out.petEvolutionReply(leveledUp));
}
