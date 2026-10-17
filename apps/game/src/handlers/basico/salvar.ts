/**
 * Aba no jogo: sem tela própria — salvar sob demanda, disparado pelo próprio cliente de tempos em tempos.
 * Pacotes: 172 SAVE_DB.
 * C#: nenhum throttle no original; aqui limitado a 1x por 30s por jogador.
 * Como testar: `apps/game/test/persist-all.test.ts`. Manual: nenhuma tela — roda em segundo plano.
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

const lastSave = new WeakMap<GamePlayer, number>();

/** 172 SAVE_DB: save disparado pelo cliente (throttle de 30s; o C# não tinha throttle nenhum). */
export async function saveDb(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const t = Date.now();
  if (t - (lastSave.get(p) ?? 0) < 30_000) return;
  lastSave.set(p, t);
  await p.saveIntoDatabase(ctx.db.db);
}
