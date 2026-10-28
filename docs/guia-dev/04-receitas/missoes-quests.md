# Missões/Quests

Detalhe completo (todos os tipos de condição, passo a passo real):
[`docs/features/missoes.md`](../../features/missoes.md). Este arquivo é o resumo prático
pra criar/editar uma missão.

**Como verificado**: lido/confirmado contra `docs/features/missoes.md` e o código que ele
cita (`apps/game/src/game/quests.ts`). Não criada/testada uma missão nova ao vivo nesta
tarefa.

## As 3 tabelas que formam uma missão

| Tabela | Pra quê |
|---|---|
| `game."Quest"` | A missão em si: nome, descrição, nível mín/máx, janela de tempo, pré-requisito (`PreQuestID`), se pode repetir. |
| `game."Quest_Condiction"` | 1+ condições pra concluir (tipo + `Para1`/`Para2` — significado varia por tipo, igual `Property1-8` dos itens). |
| `game."Quest_Goods"` | Recompensa (item/ouro/XP) ao concluir. |

## Pacotes (guarda-chuva não existe — cada ação é um código próprio)

| Ação | Pacote | Handler |
|---|---|---|
| Aceitar | `176 QUEST_ADD` | `apps/game/src/handlers/missoes/aceitar-missao.ts` → `QuestInventory.add` (`game/quests.ts:130`) |
| Abandonar | `177 QUEST_REMOVE` | `missoes/abandonar-missao.ts` → `.remove` |
| Concluir/resgatar | `179 QUEST_FINISH` | `missoes/entregar-missao.ts` → `.finish` |
| Progresso client-side (tipo 20) | `181 QUEST_CHECK` | `missoes/progresso-missao.ts` → `.clientModify` |

**O cliente decide quando MOSTRAR o botão, o servidor decide se ACEITA de verdade** — ao
aceitar, `QuestInventory.add` revalida tudo (nível, pré-requisito, guilda/casamento,
repetição) e simplesmente não aceita se algo não bate, sem pacote de erro dedicado (o
cliente só não atualiza a lista).

## Tipos de condição (`CondictionType`) — os mais comuns

`condCompleted()` (`apps/game/src/game/quests.ts:180`) tem um `switch` por tipo:

| Tipo | Significa | Quando é checado |
|---|---|---|
| `1` | Nível mínimo | Na hora (toda tentativa de completar) |
| `2` | Item equipado | Na hora |
| `14`/`15` | Possuir item (quantidade) | Na hora |
| `17` | Estar casado | Na hora |
| `18` | Guilda/riqueza/forja/loja/banco (várias sub-condições de progresso acumulado) | Na hora |
| `20` | `ClientModifyCondition` — o CLIENTE manda o progresso via `181 QUEST_CHECK` | Evento explícito do cliente |
| outros | Progresso incremental (matar N, usar item X vezes...) | Em eventos do jogo (`p.questInv?.onUsingItem(...)`, abate de NPC, etc. — grep `questInv?.on` pra achar todos os pontos de gancho) |

## Criar uma missão nova

1. Admin → **Missões** (se existir recurso dedicado; senão `drizzle-kit studio` nas 3
   tabelas acima — confira `apps/admin/src/resources/` primeiro).
2. `Quest`: defina nível/janela/pré-requisito.
3. `Quest_Condiction`: uma ou mais linhas, tipo + `Para1`/`Para2` conforme a tabela acima
   (pra tipos "incrementais", confira `game/quests.ts` pelo nome exato do gancho que
   incrementa aquele tipo).
4. `Quest_Goods`: recompensa.
5. Recarregar templates (automático pelo admin).
6. Testar: aceite pelo cliente (`?debug=true` mostra `176` saindo), jogue até a condição
   bater, confira que **Concluir** fica disponível e resgate.

## Ganchos pra uma condição incremental nova

Se seu tipo de condição precisa de um gancho que não existe ainda (ex. "usar uma skill de
pet X vezes"), adicione a chamada `p.questInv?.onAlgumaCoisa(...)` no ponto certo do
código (mesmo padrão de `p.questInv?.onUsingItem(templateId)`, chamado em vários handlers
de uso de item) e trate o tipo novo em `condCompleted()`/`QuestInventory`
(`game/quests.ts`).

## Testes

`apps/game/test/quests*.test.ts` (confirme o nome exato com
`ls apps/game/test | grep -i quest`) — padrão de teste completo em
[testes.md](./testes.md).
