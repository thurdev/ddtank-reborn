/**
 * Pedra de espírito de luta (FightSpirit / "Gemstone"): persistência de `player."Sys_User_Gemstone"`.
 * Contrapartida C#: `GamePlayer.LoadGemStone/GetGemStone/UpdateGemStone` (GamePlayer.cs:5933-5990) +
 * `PlayerBussiness.GetSingleGemStones/AddUserGemStone/UpdateGemStoneInfo` (Bussiness/PlayerBussiness.cs:8427-8520).
 * Schema real: `research/db/Project_Player34/schema/procedures/SP_GetSingleGemStone.sql` (tabela `Sys_User_Gemstone`,
 * colunas ID/UserID/FigSpiritId/FigSpiritIdValue/EquipPlace — 0 linhas na fonte, nunca usada no servidor original).
 * Como lê esse código (cada variável): `G` alias de `player.Sys_User_Gemstone`; `userId` dono da pedra;
 * `equipPlace` categoria do equipamento que porta a pedra (11 anel, 5 chapéu, 2 roupa, 3 arma, 13 colar —
 * `GamePlayer.cs:5940-5947`); `row` resultado da leitura/escrita.
 */
import { eq, and } from "drizzle-orm";
import { player, type Database } from "@ddt/db";

const G = player.Sys_User_Gemstone;

export type GemStoneRow = typeof G.$inferSelect;

/** GamePlayer.cs:5940-5955: as 5 categorias de equipamento que recebem pedra de espírito, cada uma com seu FigSpiritId
 *  inicial e o rol padrão "0,0,0|0,0,1|0,0,2" (3 slots: nível,exp,posição). */
export const DEFAULT_GEM_STONES: { equipPlace: number; figSpiritId: number }[] = [
  { equipPlace: 11, figSpiritId: 100002 },
  { equipPlace: 5, figSpiritId: 100003 },
  { equipPlace: 2, figSpiritId: 100001 },
  { equipPlace: 3, figSpiritId: 100004 },
  { equipPlace: 13, figSpiritId: 100005 },
];
export const DEFAULT_FIG_SPIRIT_ID_VALUE = "0,0,0|0,0,1|0,0,2";

/** GamePlayer.LoadGemStone: lê as pedras do jogador; se não existir nenhuma, cria as 5 linhas padrão. */
export async function loadOrCreateGemStones(db: Database, userId: number): Promise<GemStoneRow[]> {
  const rows = await db.select().from(G).where(eq(G.UserID, userId));
  if (rows.length > 0) return rows;
  const created: GemStoneRow[] = [];
  for (const d of DEFAULT_GEM_STONES) {
    const [row] = await db
      .insert(G)
      .values({ UserID: userId, FigSpiritId: d.figSpiritId, FigSpiritIdValue: DEFAULT_FIG_SPIRIT_ID_VALUE, EquipPlace: d.equipPlace })
      .returning();
    if (row) created.push(row);
  }
  return created;
}

/** GamePlayer.GetGemStone(place): a linha cujo EquipPlace é a categoria do equipamento. */
export async function getGemStone(db: Database, userId: number, equipPlace: number): Promise<GemStoneRow | undefined> {
  const rows = await db.select().from(G).where(and(eq(G.UserID, userId), eq(G.EquipPlace, equipPlace))).limit(1);
  return rows[0];
}

/** GamePlayer.UpdateGemStone + PlayerBussiness.UpdateGemStoneInfo (SP_UpdateGemStoneInfo: grava por ID). */
export async function updateGemStone(db: Database, row: GemStoneRow): Promise<void> {
  await db.update(G).set({ FigSpiritId: row.FigSpiritId, FigSpiritIdValue: row.FigSpiritIdValue, EquipPlace: row.EquipPlace }).where(eq(G.ID, row.ID));
}
