# Eventos (calendário/agenda, ícones do hall)

Quase todo "evento" do jogo (boss mundial, liga, EXP em dobro, baú do rei galinha, labirinto,
loterias, semana da sociedade...) é configurado numa ÚNICA tabela genérica —
`app."ScheduledEvents"` — e aberto/fechado automaticamente pelo `EventScheduler`
(`apps/game/src/handlers/eventos/agendador.ts`) nos horários configurados. Detalhe por
ícone (o que é, fluxo, quero mudar): [`docs/features/eventos.md`](../../features/eventos.md)
— **este arquivo já é maior que os outros de propósito**, um mini-doc por ícone.

**Como verificado**: lido/confirmado contra `apps/admin/src/resources/event-systems.ts`
(campos reais do formulário, incluindo o `hint` com exemplo de JSON por tipo) e
`docs/features/eventos.md`. Não criado/aberto um evento ao vivo nesta tarefa.

## Criar/editar um evento pelo admin

Admin → **Eventos** → **Novo** (ou edite um existente):

| Campo | Pra quê |
|---|---|
| `kind` | O TIPO de evento — decide qual lógica roda (lista completa abaixo). |
| `title` | Nome mostrado. |
| `enabled` | Liga/desliga sem apagar a linha. |
| `weekdays` | Dias da semana que abre (`0`=domingo…`6`=sábado, ex. `0,6` = só fim de semana). |
| `startTime` | Horário de abertura, **UTC**, `HH:MM`. |
| `durationMin` | Quanto tempo fica aberto. |
| `startDate`/`endDate` | Janela de validade do agendamento em si (sazonal). |
| `params` (JSON) | Parâmetros específicos do `kind` — ver tabela abaixo. |

## Tipos (`kind`) e o que cada `params` espera

| `kind` | O que é | Exemplo de `params` |
|---|---|---|
| `worldboss` | Boss mundial compartilhado entre canais | `{"bossHp":20000000,"name":"Dragão","rankAwards":[{"rank":1,"giftToken":500}]}` |
| `league` | Liga (Deus da Guerra) | `{"maxCount":10}` |
| `elite` | Campeonato de elite | — |
| `weekly_reset` | Reset semanal (zera semana da sociedade/liga) | — |
| `double_exp` / `double_gold` | EXP/Ouro em dobro | `{"rate":2}` |
| `chickenbox` | Baú do Rei Galinha | `{"pool":[{"templateId":11107,"count":500,"weight":10}],"openCardPrice":[100,200,300,500,800],"eagleEyePrice":[50,100,150,250,400],"flushPrice":500}` |
| `luckystar` | Lucky Star (dentro do baú da galinha) | `{"pool":[...]}` |
| `labyrinth` | Labirinto | `{"priceBig":5000,"priceSmall":1000,"cleanOutGiftToken":100,"pricePerMin":10}` |
| `lottery` / `lottery-luck` / `lottery-novice` | Loterias de carta (104/239, 105, cartão platina novato) | `{"cardMinLevel":3,"cardCost":200,"cardDailyLimit":3,"pool":[...]}` |
| `lightroad` | "Caminho da luz" (145) | `{"spaces":12,"freePicks":1,"pickCost":100,"pool":[...]}` |
| `guildmemberweek` / `guildweek` | Semana da sociedade (aberto / prêmios top 3) | `{"rewards":[[{"templateId":-200,"count":20000}],[...]]}` |

**Atenção**: `lightroad` e `guildmemberweek` precisam de uma linha explícita com
`enabled:true` pra o ícone correspondente ABRIR no hall — sem linha, o ícone fica fechado
por padrão (`enabled:false` fecha qualquer um sem apagar a linha, útil pra desligar
temporariamente sem perder a config).

## Sem pool configurado (`chickenbox`/`luckystar`)

Esses dois funcionam MESMO sem configurar `params.pool` — caem num pool padrão embutido em
código (`DEFAULT_CHICKENBOX_POOL`/`DEFAULT_LUCKYSTAR_POOL`,
`apps/game/src/handlers/eventos/bau-da-galinha.ts`/`estrela-da-sorte.ts`) — útil pra testar
sem configurar nada primeiro.

## Prêmios de evento "antigo" (`Active_Award`/`events` — eventos nomeados, não agendados)

Separado do `ScheduledEvents` acima: `game."Active_Award"` (recurso admin
**"Prêmios de evento"**) associa um item/ouro/cupom a um `ActiveID` (referência pro recurso
`events`, outra tabela) — é o sistema de "código de evento"/resgate, não o calendário.

## Depois de editar

O admin já chama `/reload-templates` (toda chave `app.ScheduledEvents` dispara isso —
`apps/api/src/routes/admin.ts:876`). O `EventScheduler` já tickando continua lendo a MESMA
tabela — não precisa reiniciar o `apps/game`, a próxima checagem de janela já vê a mudança.

## Criar um evento totalmente novo (`kind` que não existe)

1. Adicione o `kind` em `KINDS` (`apps/admin/src/resources/event-systems.ts`) pra aparecer
   no seletor do admin.
2. Trate o novo `kind` em `apps/game/src/handlers/eventos/agendador.ts` (`EventsRuntime
   .onStart`/`.onEnd`) — é aqui que a abertura/fechamento de verdade acontece.
3. Se o evento precisa de pacotes próprios (abrir painel, interagir), siga
   [novo-pacote.md](./novo-pacote.md) e registre em
   `apps/game/src/handlers/eventos/index.ts` (mesmo padrão: 1 arquivo por ícone/atividade).

## Testes

`apps/game/test/activities.test.ts`/`events.test.ts` cobrem a lógica pura (sorteio,
cálculo de recompensa) sem precisar de agendamento de verdade — bom modelo pra testar um
`kind` novo. Padrão completo: [testes.md](./testes.md).
