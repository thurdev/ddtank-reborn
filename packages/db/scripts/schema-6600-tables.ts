/**
 * Tabelas de gameplay do DDT-6600 que `packages/db` ainda não tem (task `m1-schema`, ver
 * `research/6600/db-diff.md`). Fonte: `Project_Game6600` (6600 funde Game+Player num banco só,
 * ver §"Achado estrutural #1" do db-diff) — este mapa decide pra qual schema Postgres nosso
 * (`game` = templates/config, `player` = estado por jogador) cada tabela vai, seguindo a mesma
 * separação usada pelas tabelas 4.1 (ver `packages/db/README.md`).
 *
 * Usado por `scripts/gen-schema.ts` (gera as tabelas Drizzle dentro de `game.ts`/`player.ts`) e
 * por `scripts/export-seed.ts` (decide quais linhas de template exportar pro seed; tabelas
 * `player` aqui são estado por jogador reais do servidor de origem — nunca seedadas).
 *
 * Lista deliberadamente NÃO inclui as ~25 tabelas "utilitárias sem feature clara" do fim do
 * db-diff (`Button_Config`, `Box_Temp`, `All_Questions`, ...) — ficam pra confirmar jogando o
 * 6600, como o próprio db-diff recomenda.
 */
/**
 * Source table name (as it is in the 6600 `.bak`) -> target Drizzle/Postgres name, only for the rare case where
 * it collides with an EXISTING 4.1 table of the same name but an incompatible shape. Used by both `gen-schema.ts`
 * (so the 6600 catalog entry is pushed under the renamed name instead of colliding/merging with the 4.1 table
 * already generated from `Project_Game34`) and `export-seed.ts` (so the renamed seed file/manifest entry never
 * touches the unrelated, already-committed 4.1 seed of the same source name).
 *
 * `Item_Fusion` (m3-fusao): 4.1's is the 4-identical-stones mechanism (`FusionID` keyed by sorted FusionType,
 * only `Item1-4`/`Formula`/`Reward` columns). 6600's is the recipe system the client's `FusionNewDataAnalyzer`/
 * `FusionNewVo` read (`FusionID`/`Item1-4`/`Count1-4`/`FusionRate`/`FusionType`/`Reward`) — same table name in the
 * source `.bak`, different columns/semantics (research/6600/packets-m1.md "M2 forja" 78 ITEM_FUSION). Renamed to
 * `Item_Fusion_New`, matching the client's own `store/newFusion/*` naming.
 */
export const RENAME_6600: Record<string, string> = { Item_Fusion: "Item_Fusion_New" };

export const GAMEPLAY_6600_TABLES: Record<string, "game" | "player"> = {
  // Montaria (horse.swf / horseRace.swf)
  Mount_Template: "game",
  Mount_Draw_Template: "game",
  Mount_Skill_Template: "game",
  Mount_SKill_Get_Template: "game",
  Mount_SKill_Element_Tempalate: "game",
  Mount_Data: "player",

  // Evolução/forma de pet
  Pet_Form_Data: "game",
  Sys_User_Pet_Form: "player",

  // Treino / Academia
  Sys_User_Drills: "player",

  // Casa Mágica
  Sys_User_MagicHouse: "player",

  // Arena RingStation
  Ringstation_Config: "game",
  Sys_User_RingStation: "player",
  Ringstation_Battle_Field: "player",

  // Tesouro
  Treasure_Award: "game",
  Treasure_Puzzle_Reward: "game",
  Sys_User_Treasure: "player",
  Treasure_Data: "player",
  Treasure_Puzzle_Data: "player",

  // Evento sazonal (Natal)
  Sys_Users_Christmas: "player",

  // Álbum (complementar ao Sys_Users_AvatarCollection já existente)
  User_Avatar_Colection: "player",

  // Relíquias / Loja Cigana / Loja Misteriosa
  Magicstone_Template: "game",
  Gypsy_Item_Data: "player",
  Mystery_Shop_Items: "game",

  // Dados (dice.swf)
  Dice_Data: "player",
  Dice_Game_Award: "game",
  Dice_Level_Award: "game",

  // Coleção de roupa (bônus de conjunto visual)
  Cloth_Group_Template: "game",
  Cloth_Property_Template: "game",

  // NPCs/monstros das features novas
  NPC_Info2: "game",

  // Aventura ("Bogu")
  BoguAdventure_Data: "player",
  BoguAdventure_Reward: "game",

  // Enigmas/lanterna
  Lightriddle_Quest: "game",

  // Evento "Pirâmide"
  Pyramid_Data: "player",

  // Atividade diária (pontos/recompensas)
  Every_Day_Active_Progress: "game",
  Every_Day_Active_Point_Template: "game",
  Every_Day_Active_Reward_Template: "game",

  // Evento Halloween
  Halloween_Rank: "player",
  Activity_Halloween_Items: "game",

  // Árvore (farm/evento)
  Tree_Template: "game",

  // Loja promocional
  Shop_Cheap_Items: "game",

  // Ferramentas de GM/admin (eventos ad-hoc)
  GM_Activity: "game",
  GM_Active_Condition: "game",
  GM_Active_Reward: "game",
  GM_Gift: "game",

  // Recompensa de achievement / liga diária (variantes novas)
  AchievementReward: "game",
  Daily_League_Award: "game",

  // Conjunto/visual de equipamento
  Suit_Template: "game",
  Suit_Part_Equip: "game",

  // Fusão por receita (m3-fusao): mesmo nome `Item_Fusion` que a 4.1 já usa pro sistema antigo (4 pedras
  // idênticas, Formula/Reward só), mas shape DIFERENTE (Item1-4/Count1-4/FusionRate/FusionType) — exportado como
  // `Item_Fusion_New` via RENAME_6600 em `export-seed.ts` pra não colidir com o seed 4.1 já committado.
  Item_Fusion: "game",
};
