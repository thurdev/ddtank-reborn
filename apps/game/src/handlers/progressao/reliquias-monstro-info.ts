/**
 * Aba no jogo: Relíquias (magicstone.swf, `MagicStoneInfoView`) — contador de "lutas normais"/"lutas difíceis"
 * disponíveis pra explorar o board de Relíquias, mostrado no topo da tela de exploração.
 * Pacote: 284 MAGIC_STONE_MONSTER_INFO (`sendCheckMagicStoneNumber`, sem payload — confirmado chamado de
 * verdade em `magicStone/views/MagicStoneInfoView.as:607`).
 * C#: `MagicStoneMonsterInfoHandler.cs:6-16` — consulta pura, devolve `Extra.Info.NormalFightNum`/
 * `HardFightNum` (player."Sys_Users_Extra", colunas adicionadas nesta tarefa — ver packages/db/README.md,
 * migração 0020). 6600 only (código não existe no enum 4.1) — não precisa de checagem de `clientKind`
 * porque o cliente 4.1 nunca manda este código.
 * Como testar: `apps/game/test/client-6600-m3-magic-stone-monster.test.ts`.
 */
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";

export function magicStoneMonsterInfo(p: GamePlayer): void {
  p.send(Out.magicStoneMonsterInfo(p.id, p.extra?.NormalFightNum ?? 1, p.extra?.HardFightNum ?? 1));
}
