# M0 — Diff de schema real: DDT-6600 vs `packages/db`

> Pesquisa apenas. Gerado restaurando os `.bak` do 6600 (não a raspagem de texto parcial
> que `docs/plan/MIGRACAO-6600.md` §2.2 cita como "próximo passo real" — este documento É
> esse próximo passo, feito).

## Método

LocalDB + sqlcmd já estavam instalados neste ambiente (usados antes para a 4.1, ver
`research/db/HOWTO-restore.md`). Docker **não está disponível** (`docker` não existe no
PATH), então segui o HOWTO existente em vez da sugestão de imagem `mssql/server`:

```powershell
$L = "C:\Program Files\Microsoft SQL Server\170\Tools\Binn\SqlLocalDB.exe"
& $L start DDTank   # instância já existia, reaproveitada
# RESTORE DATABASE [Project_Game6600] FROM DISK=N'...\DDT-6600\Db\Db_Tank.bak' WITH MOVE ..., REPLACE;
# RESTORE DATABASE [Db_Membership6600] FROM DISK=N'...\DDT-6600\Db\Db_Membership.bak' WITH MOVE ..., REPLACE;
# RESTORE DATABASE [Db_Count6600] FROM DISK=N'...\DDT-6600\Db\Db_Count.bak' WITH MOVE ..., REPLACE;
```

Todos os 3 `.bak` restauraram sem erro (upgrade automático de versão de catálogo 957→998,
igual aconteceu com os `.bak` da 4.1). Depois rodei o exportador já existente:

```
node vendor/_tools/export.mjs --research research/6600/db Project_Game6600 Db_Membership6600 Db_Count6600
```

Saída completa (DDL `CREATE TABLE`, procedures/views/functions, `catalog.json` com
colunas/PK/FK, contagem de linhas) está em `vendor/_dbexport/Project_Game6600/`,
`.../Db_Membership6600/`, `.../Db_Count6600/`, com cópia do schema em `research/6600/db/<Db>/schema/`.
Os bancos restaurados continuam na instância LocalDB `DDTank` (nomes `Project_Game6600`,
`Db_Membership6600`, `Db_Count6600`) para reconsulta futura — não apaguei nada da 4.1
(`Project_Game34`, `Project_Player34`, `Db_Membership` continuam intactos).

## Achado estrutural #1: 6600 fundiu Game+Player num banco só

Na 4.1, templates estáticos (`Shop_Goods`, `NPC_Info`, `Quest`...) ficam em `Game34.bak` e
dados de jogador (`Sys_Users_Detail`, `Sys_Users_Goods`...) ficam em `Player34.bak` — dois
bancos. No 6600, **`Db_Tank.bak` contém os dois tipos de tabela no mesmo banco**
(`Project_Game6600`: 197 tabelas, incluindo tanto `Shop_Goods` quanto `Sys_Users_Detail`).
`Db_Membership.bak` (contas web) e `Db_Count.bak` (novo: analytics/log) continuam separados.

Isso **não exige mudança no nosso lado** — `packages/db` já representa os dois bancos da
4.1 como schemas Postgres separados (`game.*`, `player.*`, `member.*`, ver
`packages/db/src/schema/schemas.ts`) dentro do mesmo banco físico Postgres. A fusão do 6600
é só um detalhe de deploy do SQL Server original, sem efeito na nossa arquitetura.

## Achado estrutural #2: `Db_Count` é um banco de analytics, não gameplay

`Db_Count6600` (68 tabelas) é log/telemetria: `Log_Fight`, `Log_Item`, `Count_Login`,
`Count_Money`, `Count_UserConsumeLog`, `Count_PaymentInfo`, `Count_HallofFame`,
`Count_RegAndLog_Site`... Quase todas as 68 tabelas têm **0 linhas** na instância de
origem (era um server de produção pouco tempo rodando, ou o módulo de analytics nunca foi
ativado). **Recomendação: não portar como tabela — se quisermos esse tipo de métrica,
implementar como logging de aplicação (ex. Postgres + view, ou serviço de analytics
externo), não como réplica de schema 1:1.** Não está na matriz de reaproveitamento de
`docs/plan/MIGRACAO-6600.md` §3 porque não é gameplay.

## Tabelas novas confirmadas (não existem em `packages/db` hoje)

Comparado por nome de tabela (case-insensitive) contra todos os `export const X = (game|player|member|accounts|app).table("X", ...)` em `packages/db/src/schema/*.ts` (191 tabelas extraídas via regex). **137 tabelas do 6600 não têm equivalente hoje** (de 285 tabelas totais nos 3 bancos 6600) — a maioria (68) é do `Db_Count` já descartado acima. Das relevantes pra gameplay (`Project_Game6600`, prefixo removido):

| Tabela | Linhas (fonte) | Feature provável |
|---|---|---|
| `Mount_Data`, `Mount_Template`, `Mount_Draw_Template`, `Mount_Skill_Template`, `Mount_SKill_Get_Template`, `Mount_SKill_Element_Tempalate` | 9/81/15/105/90/135 | **Montarias** (`horse.swf`/`horseRace.swf`) — confirma a suspeita da raspagem parcial anterior |
| `Sys_User_Drills` | 54 | Treino/Academia ("Sist. Treino" da referência DDClássico — §4 do plano) |
| `Sys_User_MagicHouse` | 9 | Casa Mágica (`magichouse.swf`) |
| `Sys_User_Pet_Form` | 9 | Evolução/forma de pet (`Pet_Form_Data` tem o template, 6 linhas) |
| `Sys_User_RingStation`, `Ringstation_Battle_Field`, `Ringstation_Config` | 2/89/1 | Arena ranqueada (RingStation) |
| `Sys_User_Treasure`, `Treasure_Data`, `Treasure_Award`, `Treasure_Puzzle_Data`, `Treasure_Puzzle_Reward` | 9/48/41/6/6 | Sistema de tesouro (`treasure*.swf`) |
| `Sys_Users_Christmas` | 7 | Save de evento sazonal (Natal) |
| `User_Avatar_Colection` | 216 | **Atenção**: nome quase idêntico a `Sys_Users_AvatarCollection` (já existe em `packages/db`) mas é tabela **diferente** — confirmar se é duplicata/legado ou dado complementar antes de assumir que Álbum já está 100% coberto |
| `Magicstone_Template`, `Gypsy_Item_Data`, `Mystery_Shop_Items` | 542/104/188 | Relíquias (Magic Stone), Loja Cigana, Loja Misteriosa |
| `Dice_Data`, `Dice_Game_Award`, `Dice_Level_Award` | 37/10/5 | Sistema de Dados (`dice.swf`) |
| `Cloth_Group_Template`, `Cloth_Property_Template` | 279/24 | Coleção de roupa (bônus de conjunto de visual, não equipamento) |
| `NPC_Info2` | 1348 | Segunda tabela de NPC (mais colunas que `NPC_Info`, 28 cols — provavelmente NPCs/monstros das features novas) |
| `BoguAdventure_Data`, `BoguAdventure_Reward` | 3/51 | Aventura (nome "Bogu" = provável localização PT/TR de "Boogu"/evento) |
| `Lightriddle_Quest` | 336 | Enigmas/lanterna (`lanternriddles.swf`) |
| `Pyramid_Data` | 5 | Evento "Pirâmide" |
| `Every_Day_Active_Progress` (+ `..._Point_Template`, `..._Reward_Template`) | 11/0/0 | Sistema de atividade diária (pontos/recompensas) |
| `Halloween_Rank`, `Activity_Halloween_Items` | 15/24 | Evento Halloween |
| `Tree_Template` | 51 | Árvore (provável farm/evento) |
| `Gypsy_Item_Data`, `Shop_Cheap_Items` | 104/46 | Loja cigana / itens promocionais |
| `GM_Activity`, `GM_Active_Condition`, `GM_Active_Reward`, `GM_Gift` | 0/0/0/0 | Ferramentas de GM/admin pra criar eventos ad-hoc — mapeia direto pro nosso `apps/admin` (calendário de evento já existe lá) |
| `AchievementReward`, `Daily_League_Award` | 74/0 | Variante nova de recompensa de achievement / liga diária |
| `Suit_Template`, `Suit_Part_Equip` | 0/0 | Conjunto/visual de equipamento (vazias na fonte, schema só) |

Tabelas menores/utilitárias novas sem feature clara ainda (baixa prioridade, confirmar
jogando): `Button_Config`, `Box_Temp`, `All_Questions`, `Ativity_Quest_Condition`,
`Activity_Quest`, `Charge_Active_Template`, `Charge_Spend_Reward_Template`,
`Cloud_Buy_Log`/`Cloud_Buy_Lottery`, `Consortia_Badge_Config`, `Drop_Informação` (nome com
acento, provável bug de import PT no próprio servidor de origem), `Fight_Lab_Drop_Item`,
`FoodComposeList`, `Goods_Collect`, `Help_Game_Reward`, `Item_Streng_Then_Data`,
`Lottery_Show_Template`, `Magic_Item_Template`, `MissionEnergyPrice`, `Rank_Template`,
`Search_Goods_Pay_Money`.

## Colunas novas em tabelas que **já existem** nos dois lados

Rodei um diff de colunas (case-insensitive) para as 191 tabelas que batem por nome. **42
tabelas têm colunas diferentes** — a maioria é ruído de migração old-player (campos que
nosso schema já tem e o 6600 não, tipo `cansentmoney`/`apprenticeshipstate` do sistema de
apadrinhamento que só existe no nosso schema hoje, herdado do fork `remake/main`). As
diferenças que **importam pra migração** (coluna nova no 6600, feature real):

- **`Sys_Users_Detail`** (char principal) ganha no 6600: `giftgp`/`giftlevel`/`isopengift`
  (Passe Clássico / `growthpackage.swf`), `cardsoul` (cartas-alma, colide com
  `CARDS_SOUL=208` citado em §1.1 do plano), `receiebox`/`receiegrade`/`needgetboxtime`/
  `timebox` (sistema de caixa por tempo, variante do que já existe), `leaguemoney`,
  `isfirstdivorce`, `pveepicpermission`, `horseracecanracetime` (gate de montaria).
- **`Sys_Users_Extra`** ganha ~28 colunas novas: `missionenergy`/`buyenergycount` (energia
  de missão — sistema separado da "Energia latente" que já existe, não confundir),
  `kingblessinfo`/`kingblessenddate`/`kingblessindex` (Juramento do Rei, `kingbless.swf`),
  `dressmodelarr`/`curentdressmodel` (Vestir com encanto, `playerdress.swf`),
  `scoremagicstone` (Relíquias), `deedinfo`/`deedenddate`/`deedindex` (sistema "escritura"
  citado em §1.1 — `DEED_MAIN=2272`), `magpiebridgeitems`/`nowpositionmb`/`magpienum`
  (Ponte da Pega, `magpiebridge.swf`), `catchinsectgetprize` (Capturar Nian/inseto).
- **`Sys_Users_Goods`** (inventário) ganha campos de **dano mágico** inteiros:
  `magicattack`/`magicdefence`/`magicexp`/`magiclevel` em cada item, além de
  `beadexp`/`beadlevel`/`beadislock` (nível de conta/runa por item) e `advancedate`
  (progressão). **Isso é estrutural pro motor de combate** — `eFightPackageType` quase
  idêntico (§1.1 do plano) não significa dano mágico de item seja igual; `packages/fight`
  precisa de uma segunda rota de cálculo (dano físico vs mágico por equipamento) quando
  migrar pra M2/M3, não só os 4 pacotes de modo novo já identificados.
- **`Sys_Users_Fight`** ganha `magicattack`/`magicdefence` (mesmo padrão, status do char).
- **`Quest`/`Quest_Goods`**: colunas de custo em dinheiro por nível
  (`level2needmoney`...`level5needmoney`, `onekeyfinishneedmoney`) e `rewarditemcount1..5`
  no lugar de `rewarditemcount` único — quest no 6600 suporta "avançar etapa pagando" e
  múltiplas recompensas por item, não só uma.
- **`Pve_Info`**: `nightmaretemplateids`/`epictemplateids` + scripts dedicados
  (`epicgamescript`, `nightmaregamescript`) — dificuldades "Pesadelo"/"Épico" dedicadas,
  mais granulares que o que temos.

Tabelas com só diferença de nomenclatura/ruído (não precisa ação): `active`,
`active_convert_item`, `areaconfig`, `consortia_level`, `drop_condiction`,
`event_award_item`, `item_strengthen_goods` (`originalequip` vs `orginequip`, só
grafia), `new_title`, `pet_config`/`pet_star_exp`/`sys_users_texp` (só ganham/perdem `id`
auto-incremento, sem significado de feature), `shopgoodsshowlist`, `sys_user_match_info`,
`sys_users_card`, `sys_users_pet`, `sys_users_rank_date` (prefixo `gift`→`charm`, mesmo
campo renomeado).

## Próximo passo (fora de M0)

Gerar os arquivos Drizzle novos (`packages/db/src/schema/*.ts`) para as ~30 tabelas de
gameplay listadas acima, seguindo o padrão `scripts/gen-schema.ts` já usado pra 4.1 (hoje
aponta pra `Project_Game34`/`Project_Player34`/`Db_Membership`; precisa aceitar
`Project_Game6600` como fonte alternativa). Isso é M1/M2, não M0.
