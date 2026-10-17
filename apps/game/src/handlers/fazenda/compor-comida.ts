/**
 * Aba no jogo: Fazenda › compor comida (fabricar ração de mascote com legumes colhidos).
 * Pacotes: 81 FARM sub 5 COMPOSE_FOOD ("sendCompose"): int foodID, int count.
 * C#: **sem handler nenhum** — `FarmHandleMgr` não registra o código 5; o cliente 4.1 manda mesmo assim
 * (`GameSocketOut.sendCompose`), então é implementação nova do Reborn. Receitas (`COMPOSE_RECIPES`) são
 * cópia literal de `apps/api/assets/request/foodcomposelist.xml` (zlib; dá pra ler direto com
 * `zlib.inflateSync`) — o C# original nunca lia esse arquivo do servidor (a tabela estática
 * `SqlDataProvider.Data.FoodComposeListInfo` não tinha de onde vir), por isso as 12 linhas ficam
 * embutidas aqui em vez de virar uma migração. Nenhuma resposta é lida pelo cliente
 * (`handFarmPkg` não tem case pra COMPOSE_FOOD) — sucesso/falha é só mensagem de chat + dar-ou-mandar-mail
 * (mesmo padrão de GAIN_FIELD quando a bolsa está cheia).
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: Fazenda → tela de compor →
 * escolher receita → fabricar.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { giveOrMail } from "./estado.js";

/**
 * Receitas de COMPOSE_FOOD: a chave é o ID do item "comida" (ração) que o jogador quer fabricar; o valor
 * é a lista de "legumes" (e quantos de cada) que ele precisa ter na bolsa da fazenda.
 */
const COMPOSE_RECIPES: Record<number, { vegetableId: number; needCount: number }[]> = {
  334101: [{ vegetableId: 336101, needCount: 10 }, { vegetableId: 336102, needCount: 10 }, { vegetableId: 336103, needCount: 10 }, { vegetableId: 336104, needCount: 10 }],
  334102: [{ vegetableId: 336101, needCount: 10 }, { vegetableId: 336105, needCount: 10 }, { vegetableId: 336106, needCount: 10 }, { vegetableId: 336107, needCount: 10 }],
  334103: [{ vegetableId: 336101, needCount: 10 }, { vegetableId: 336108, needCount: 10 }, { vegetableId: 336109, needCount: 10 }, { vegetableId: 336110, needCount: 10 }],
};

/** sub 5 COMPOSE_FOOD ("sendCompose"): int foodID, int count. */
export async function composeFood(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const foodID = pkt.readInt();
  const count = Math.max(1, Math.min(999, pkt.readInt()));
  const recipe = COMPOSE_RECIPES[foodID];
  const foodT = recipe ? ctx.templates.findItem(foodID) : undefined;
  if (!recipe || !foodT) return p.sendMessage(0, "Receita de comida desconhecida.");
  for (const ing of recipe) {
    if (p.getTemplateCount(ing.vegetableId, (id) => ctx.templates.findItem(id)) < ing.needCount * count) {
      return p.sendMessage(0, "Você não tem legumes suficientes para essa receita.");
    }
  }
  for (const ing of recipe) p.removeTemplateInShop(ing.vegetableId, ing.needCount * count, (id) => ctx.templates.findItem(id));
  await giveOrMail(ctx, p, foodT, count);
  p.sendMessage(0, `Você fabricou ${count}x ${foodT.Name ?? "comida"}.`);
}
