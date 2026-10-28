# Totem, mascote (pet), cartas, gemas, asas, títulos

Sistemas "de progressão" do jogador — cada um com sua própria tabela, pacote e tela, mas
todos seguem o MESMO padrão de achar/editar (ver
[como-achar-qualquer-coisa.md](./como-achar-qualquer-coisa.md)). Esta receita junta os
pontos de entrada de cada um, pra você não ter que procurar do zero.

**Como verificado**: lido/confirmado contra os docs de feature (`docs/features/totem.md`,
`mascote.md`, `cartas.md`, `forja.md`) + o código que eles citam; não exercitado ao vivo
nesta tarefa (cada um já tem teste próprio e passa na suíte — ver §5 de cada doc de
feature).

## Totem (bônus passivo permanente)

- **Dados**: `Sys_Users_Detail.totemId`/`.myHonor` (jogador), `game."Totem_Info"`
  (bônus por nível), `game."Totem_Honor_Template"` (custo de Honra por nível).
- **Pacote**: `136 TOTEM` (subir de totem), `96 HONOR_UP_COUNT` tipo 2 (comprar Honra).
- **Código**: `apps/game/src/handlers/progressao/totem.ts` (`totemOpenOne`),
  `apps/game/src/game/stats.ts:98` (`getTotemProp` — soma CUMULATIVA de todos os totens de
  10001 até o atual, não só o nível corrente).
- **Admin**: sem recurso dedicado ainda — editar `Totem_Info`/`Totem_Honor_Template` via
  `drizzle-kit studio`.
- Detalhe completo + bug conhecido preservado de propósito:
  [`docs/features/totem.md`](../../features/totem.md).

## Mascote (pet) — bolsa do pet, alimentar, evoluir, equipar

- **Dados**: `player."Sys_Users_Pet"` (pets do jogador), `game."Pet_Template_Info"`,
  `game."Pet_Skill_Info"`/`"Pet_Skill_Template_Info"`, `game."Pet_Level"`, `"Pet_Moe_
  Property"`, `"Pet_Star_Exp"`.
- **Pacote**: `68 PET` (guarda-chuva — todo sub-código: listar/chocar ovo/alimentar/
  equipar habilidade/soltar/renomear/levar pra luta/reverter/equipar item/estrela
  ascendente/evolução/devorar).
- **Código**: `apps/game/src/handlers/mascote/` (um arquivo por ação, roteador em
  `mascote/index.ts petCommand()`), lógica pura em `apps/game/src/game/pets.ts`
  (`petLevelForGp`/`petMaxLevel`/`reduceProp`/`petSkillsByKind`).
- **Item de pet** (categoria 50/51/52 — braço/cabeça/roupa): equipar é
  `68 PET` sub 20/21 (`mascote/equipamento.ts`), não `49 CHANGE_PLACE_GOODS` (diferente do
  equipamento normal do jogador).
- **Ovo de pet** (categoria 35): botão "Abrir" na bolsa → `68 PET` sub 2
  (`mascote/chocar-ovo.ts`).
- Detalhe completo: [`docs/features/mascote.md`](../../features/mascote.md).

## Cartas (buff de atributo, slot principal/reserva)

- **Dados**: `player."Sys_Users_Card"`, `game."Card_Group"`/`"Card_Info"` (pool de caixa),
  `game."CardUpdateCondition"`/`"CardUpdateInfo"` (custo de reset/upgrade).
- **Pacote**: `216 CARDS_DATA` (guarda-chuva: mover/abrir slot reserva/abrir caixa/upgrade/
  ordenar), `196 CARD_RESET` (reroll de atributo, pacote próprio).
- **Código**: `apps/game/src/handlers/pets.ts` (`cardCommand`, apesar do nome do arquivo —
  é histórico), lógica pura em `apps/game/src/game/cards.ts` (`nextSmallValue`/`copyProp`/
  `upgradeCard`).
- Detalhe completo: [`docs/features/cartas.md`](../../features/cartas.md).

## Gemas / beads (Fig Spirit, incrustar, gemstone)

Duas coisas diferentes com nome parecido:

- **Incrustar gema no equipamento** ("Montar", buraco do item): pacote `121 ITEM_INLAY` /
  remover `125 ITEM_EMBED_BACKOUT` — `apps/game/src/handlers/forja/montar.ts`.
- **Fig Spirit** (sistema de gema própria do jogador, não do item): pacote
  `209 FIGHT_SPIRIT` — `apps/game/src/handlers/forja/espirito-de-luta.ts` + modelo em
  `forja/gemas.ts`/`apps/game/src/db/gemstone.ts`, tabela `Sys_User_Gemstone`.
- Item "Gemstone" (`EquipType.GEMSTONE`) na bolsa abre a tela de forja direto
  (`BagView.__cellUse`, `BagStore.FORGE_STORE` aba 3) — é o mesmo padrão descrito em
  [item-com-menu-e-acao.md](./item-com-menu-e-acao.md) (item que abre uma tela própria em
  vez de "Usar" genérico).
- Tabela completa de toda a Forja (Fortalecer/Compor/Fundir/Dourar/Evolução/Refinar...):
  [`docs/features/forja.md`](../../features/forja.md).

## Asas (categoria 15)

Equipamento comum — sem sistema próprio. Mesma mecânica de qualquer equipável
(`EquipType.canEquip`, slot via `placeForCategory(15)`, equipar = `49 CHANGE_PLACE_GOODS`).
Ver [itens-funcoes.md §2](./itens-funcoes.md#2-categorias-categoryid--o-que-cada-uma-faz-e-onde).
Efeito visual (asas aparecem nas costas do personagem): arte vem do pacote de recursos
(`/resource/image/wing/...`), não tem lógica de servidor além de "está equipado ou não".

## Títulos

- **Carta de título** (categoria 24, `EquipType.TITLE_CARD`): botão "Usar" na bolsa →
  `sendNewTitleCard` → handler em `apps/game/src/handlers/bolsa/titulos.ts`.
- **Dados**: título ativo/coleção de títulos do jogador (ver `titulos.ts` pra tabela
  exata — cabeçalho do arquivo cita a coluna).
- Título de liga/ranking: tabela `game."New_Title"` (325 linhas reais, usada por `265
  NEWTITLE_CARD`).

## Como achar um sistema que NÃO está nesta lista

Clique nele com `?debug=true` e siga
[como-achar-qualquer-coisa.md](./como-achar-qualquer-coisa.md) — essa receita junta só os
sistemas mais perguntados; qualquer outro ("Catharine", eventos sazonais, etc.) usa o MESMO
roteiro (clique → view → pacote → `apps/game/HANDLERS.md` → handler → tabela).
