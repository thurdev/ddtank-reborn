/**
 * Aba no jogo: Forja › Refinaria — sobe o "nível de refinaria" (`StrengthenRefineryLevel`) de um equipamento
 * gastando Ouro, com chance de falha que cresce por nível. Botão hoje não existe em nenhuma tela do cliente
 * fixo (ver nota de design abaixo) — handler fica disponível pro código 110/111 que o cliente SABE montar
 * (`GameSocketOut.sendItemLianhua`), só nunca chamado por nenhuma view.
 * Pacotes: 110 ITEM_REFINERY (confirma a tentativa), 111 ITEM_REFINERY_PREVIEW (só calcula, não gasta nada).
 * C#: nenhum — confirmado em `vendor/DDTank41` e nos forks externos (`research/qa/feature-sources.md`):
 * mesmo o fork `zsj0613/DDTServer` que registra o código 110 só verifica senha de bolsa, sem fórmula real.
 * `GameSocketOut.sendItemLianhua` (cliente) nunca é chamado por nenhuma view (`store/fineStore`, `BaseStoreView`
 * só escutam o pacote de RESPOSTA pra mostrar um popup de sucesso/falha genérico, `__showTipsIII`) — ou seja,
 * é código do cliente que sobrou de um recurso cortado antes do lançamento, sem botão vivo. Por isso o formato
 * de LEITURA do pacote aqui é um design NOSSO (não o do `sendItemLianhua`, que nem escreve o tamanho do array
 * antes do loop — inutilizável como está), documentado em `research/qa/feature-designs.md`.
 *
 * Design (resumo, detalhe completo no research/qa/feature-designs.md):
 * - Alvo: item com `template.CanStrengthen` (mesmo portão do Fortalecer) e `StrengthenRefineryLevel < 5`.
 * - `StrengthenRefineryLevel` é uma coluna que JÁ existe em `Sys_Users_Goods` (ver `game/item.ts`) e já é
 *   enviada ao cliente no tooltip de comparar item (`bolsa/comparar-item.ts`) — só nunca tinha handler que
 *   a alterasse. Não é o mesmo campo que `ItemInfo.RefineryLevel` (esse é `template.RefineryLevel`, estático,
 *   usado no selo de combate — ver `fight/ddt.ts` — e não é tocado aqui pra não mudar o significado de um
 *   getter já fiel ao original).
 * - Custo: Ouro, crescente por nível (`REFINERY_COST[level]`). Chance decrescente por nível
 *   (`REFINERY_CHANCE[level]`), comparável à faixa de Fortalecer/Compor (ver cabeçalho de `fortalecer.ts`/
 *   `compor.ts`) mas sem pedra/consumível — é um sink de Ouro puro (sem risco de perder o item), pensado
 *   como meta de longo prazo pro jogador rico. Falha só consome o Ouro, não derruba nível nem quebra o item
 *   (diferente do Fortalecer) — decisão de design pra manter baixo risco num sistema 100% cosmético.
 * Como testar: `apps/game/test/forge-advanced.test.ts` (bloco "110/111 ITEM_REFINERY").
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export const REFINERY_MAX_LEVEL = 5;
/** Custo em Ouro pra ir do nível N pro N+1 (índice = nível atual). */
export const REFINERY_COST = [800, 1600, 2800, 4400, 6400];
/** Chance de sucesso (%) pra ir do nível N pro N+1 (índice = nível atual). */
export const REFINERY_CHANCE = [90, 70, 50, 30, 15];

function plan(level: number): { nextLevel: number; cost: number; chance: number } | null {
  if (level < 0 || level >= REFINERY_MAX_LEVEL) return null;
  return { nextLevel: level + 1, cost: REFINERY_COST[level]!, chance: REFINERY_CHANCE[level]! };
}

function readTarget(p: GamePlayer, pkt: GSPacket): { bagType: number; place: number; item: import("../../game/item.js").ItemInfo | null } {
  const bagType = pkt.readInt();
  const place = pkt.readInt();
  const inv = p.getInventory(bagType);
  const item = inv?.getItemAt(place) ?? null;
  return { bagType, place, item };
}

/** 111 ITEM_REFINERY_PREVIEW: `[int bagType, int place]` → `[int bagType, int place, int level, int nextLevel, int chance, int cost]` (nextLevel=level quando já está no máximo). */
export function refineryPreview(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const { bagType, place, item } = readTarget(p, pkt);
  const out = new GSPacket(111, p.id);
  out.writeInt(bagType); out.writeInt(place);
  if (!item || !item.template.CanStrengthen) { out.writeInt(0); out.writeInt(0); out.writeInt(0); out.writeInt(0); p.send(out); return; }
  const level = item.StrengthenRefineryLevel;
  const next = plan(level);
  out.writeInt(level);
  out.writeInt(next ? next.nextLevel : level);
  out.writeInt(next ? next.chance : 0);
  out.writeInt(next ? next.cost : 0);
  p.send(out);
}

/** 110 ITEM_REFINERY: `[int bagType, int place]` → `[int bagType, int place, bool success, int newLevel, int chance, int cost]`. */
export function refinery(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): void {
  const { bagType, place, item } = readTarget(p, pkt);
  const out = new GSPacket(110, p.id);
  out.writeInt(bagType); out.writeInt(place);
  if (!item || !item.template.CanStrengthen) {
    out.writeBoolean(false); out.writeInt(0); out.writeInt(0); out.writeInt(0);
    return p.send(out);
  }
  const next = plan(item.StrengthenRefineryLevel);
  if (!next) {
    out.writeBoolean(false); out.writeInt(item.StrengthenRefineryLevel); out.writeInt(0); out.writeInt(0);
    p.sendMessage(0, "Este equipamento já está no nível máximo de refinaria.");
    return p.send(out);
  }
  if (p.info.Gold < next.cost) {
    out.writeBoolean(false); out.writeInt(item.StrengthenRefineryLevel); out.writeInt(next.chance); out.writeInt(next.cost);
    p.sendMessage(0, "Ouro insuficiente para refinar.");
    return p.send(out);
  }
  p.removeGold(next.cost);
  const success = Math.floor(rnd() * 100) < next.chance;
  if (success) {
    item.StrengthenRefineryLevel = next.nextLevel;
    const inv = p.getInventory(bagType);
    inv?.updateItem(item);
    p.sendMessage(0, `Refinaria bem-sucedida! Nível de refinaria agora é ${next.nextLevel}.`);
  } else {
    p.sendMessage(0, "A refinaria falhou, mas o equipamento está intacto.");
  }
  out.writeBoolean(success); out.writeInt(item.StrengthenRefineryLevel); out.writeInt(next.chance); out.writeInt(next.cost);
  p.send(out);
}
