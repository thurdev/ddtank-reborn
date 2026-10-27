/**
 * Task `41-instancias`: `app."PveInstanceClear"` reads/writes (dungeon unlock-by-previous-clear progress).
 * See `game/pve-unlock.ts` for the gate logic this backs, and `room-mgr.ts` `onDungeonCleared` for when a
 * clear is recorded (room's `onFinished(isWin=true)` for a `RoomType.Dungeon` — once per full dungeon run,
 * not once per floor/mission).
 */
import { and, eq, sql } from "drizzle-orm";
import { app } from "@ddt/db";
import type { ServerContext } from "../session/context.js";

/** `dungeonDifficultyLadder` needs the FULL set of difficulties this player already cleared for one dungeon. */
export async function loadClearedDifficulties(ctx: ServerContext, userId: number, pveId: number): Promise<Set<number>> {
  const rows = await ctx.db.db.select({ HardLevel: app.PveInstanceClear.HardLevel }).from(app.PveInstanceClear)
    .where(and(eq(app.PveInstanceClear.UserID, userId), eq(app.PveInstanceClear.PveId, pveId)));
  return new Set(rows.map((r) => r.HardLevel));
}

/**
 * Login: reaplica no `PvePermission` do personagem as vitórias já gravadas em `PveInstanceClear` (vitórias de
 * antes do fix do SetPvePermission só existiam aqui, e o cliente só olha o `PvePermission`). Idempotente.
 *
 * Task `pve-qa` (owner report 2026-10-27, item 5, "algumas masmorras simplesmente travadas"): também GARANTE
 * a base de 50 caracteres ANTES de aplicar as vitórias, em vez de confiar só no padEnd lazy de dentro de
 * `setPvePermission` (`game/player.ts`). Duas falhas se combinavam: (1) `setPvePermission` só persiste o
 * padEnd se a checagem de "sobe só um nível a partir do exato anterior" passar — se os `PveInstanceClear`
 * rows não baterem com essa sequência estrita (conta antiga, edição manual, migração), a função retorna
 * `false` ANTES de escrever, então o padEnd nunca persiste; (2) sem nenhuma linha em `PveInstanceClear` (ex.:
 * masmorra nunca vencida NESTE sistema de progresso), o `for` nem roda uma vez. Nos dois casos
 * `info.PvePermission` fica do tamanho que já estava no banco — se for mais curto que `Pve_Info.ID` de
 * alguma masmorra, `PVEMapPermissionManager.getPermission` (cliente, `substr(mapId-1,1)` vira `""`)
 * trata posição ausente como TRAVADA, inclusive Fácil — diferente do `GamePlayer.LoadFromDatabase` original
 * (`GamePlayer.cs:3002`), que sempre inicializa `m_pvepermissions` com `InitPvePermission()` (50x '1') ANTES
 * de aplicar qualquer coisa, nunca deixando uma string curta chegar ao jogador. Normalizar aqui, sempre, é
 * esse mesmo "init on load", só que no ponto onde já temos `info` à mão.
 */
export async function syncPvePermission(ctx: ServerContext, p: { id: number; info: { PvePermission?: string | null }; setPvePermission(id: number, lv: number, notify?: boolean): boolean }): Promise<boolean> {
  let changed = false;
  const current = p.info.PvePermission ?? "";
  if (current.length < 50) {
    p.info.PvePermission = current.padEnd(50, "1");
    changed = true;
  }
  const rows = await ctx.db.db.select({ PveId: app.PveInstanceClear.PveId, HardLevel: app.PveInstanceClear.HardLevel })
    .from(app.PveInstanceClear).where(eq(app.PveInstanceClear.UserID, p.id));
  rows.sort((a, b) => a.HardLevel - b.HardLevel);
  for (const r of rows) changed = p.setPvePermission(r.PveId, Math.min(r.HardLevel + 1, 3), false) || changed;
  return changed;
}

/** GamePlayer-side effect of finishing a Dungeon run with a win: upsert the clear row (ClearCount++). */
export async function recordPveClear(ctx: ServerContext, userId: number, pveId: number, hardLevel: number): Promise<void> {
  const now = ctx.now();
  await ctx.db.db.insert(app.PveInstanceClear)
    .values({ UserID: userId, PveId: pveId, HardLevel: hardLevel, ClearCount: 1, FirstClearedAt: now, LastClearedAt: now })
    .onConflictDoUpdate({
      target: [app.PveInstanceClear.UserID, app.PveInstanceClear.PveId, app.PveInstanceClear.HardLevel],
      set: { ClearCount: sql`${app.PveInstanceClear.ClearCount} + 1`, LastClearedAt: now },
    });
}
