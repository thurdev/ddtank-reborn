# Designs próprios desta sessão (QA "todo ícone ativo")

Contexto: `research/qa/hall-icons.md`. Dois ícones (`littlegamenote`, `limitActivity`) tinham caminho de
ativação real no cliente 4.1, mas o servidor nunca mandava o pacote que o liga. Nenhum dos dois tem um
sender C# completo pra copiar 1:1 (o original aparentemente nunca disparava esses pacotes num fluxo de
login simples, ou o `.cs` correspondente não sobrou no `vendor/`) — então são designs próprios, documentados
aqui em vez de alegados como porte fiel.

## littlegamenote (badge do Termas / "Đại chiến Hút Gà")

- **Pacote**: 80 `LITTLEGAME_ACTIVED` (`ePackageType.as:482`), topo — não é sub de 166. Payload: 1 bool.
- **Cliente**: `LittleGameManager.__actived` (`littleGame/LittleGameManager.as:72-76`) seta `_actived` e
  dispara `LittleGameEvent.ActivedChanged`; `HallStateView.__littlegameActived`
  (`hall/HallStateView.as:402-412`) ouve e chama `updateSwitchHandler(LITTLEGAMENOTE, hasActive())`.
- **Servidor**: `LittleGameMgr` (`apps/game/src/handlers/minigame-termas/mgr.ts:160-189`) já abre o mundo
  (`isOpen=true`) na construção — comentário no próprio arquivo diz que não existe agendador por horário
  ainda (`GameProperties.LittleGameStartHourse`/`LittleGameTimeSpendingHours` nunca foram portados).
- **Decisão**: em vez de instanciar `littleGameMgr(ctx)` (que levanta timers de spawn de bichinho) pra
  TODO login só pra ler `isOpen`, o badge fica **só em `ALL_OPEN`** (`login.ts`, `if (all) p.send(Out.littleGameActived(p.id, true))`).
  Quando o agendador por horário for portado de verdade, troca pra `on("littlegame")` como os outros.
- **Como testar**: `apps/game/test/all-open.test.ts` → "littlegame note 80, novato tabs 258/0".

## limitActivity (painel "Atividades de novato" / newbie)

- **Pacote novo**: 258/0 `NOVICEACTIVITY_MESSAGE` caso 0 (`Out.noviceActivityRow`,
  `apps/game/src/packets/out.ts`). Formato por chamada: `int 0` (case), `int index` (1-10), `int conditions`,
  `int awardGot`, `date start`, `date end`.
- **Cliente**: `NoviceActivityManager.__updateNovice` case 0 (`noviceactivity/NoviceActivityManager.as:113-126`)
  escreve UMA linha de `recordList[index-1]` por chamada e sobrescreve `startDate`/`endDate` toda vez
  (inclusive fazendo `endDate.date -= 1` depois de ler — por isso `sendNoviceActivityOpen` manda `end`
  365 dias na frente pro resultado final ficar ~364 dias, bem confortável pra QA).
  `HallStateView.addNoviceActivityAct()` (`hall/HallStateView.as:450-459`) só chama
  `NoviceActivityManager.instance.addIconNoviceActivity()` (o `updateSwitchHandler` real) se
  `checkTime()` retornar true — e `checkTime()` exige `startDate`/`endDate` setados, ou seja, exige que
  pelo menos uma chamada deste pacote já tenha chegado.
- **Painel em si** (`list`, os nomes/condições de cada uma das 10 abas) é carregado de um XML local do
  cliente (`NoviceActivityAnalyzer`), não vem do servidor — então só a "linha de progresso" (`recordList`)
  e a janela de datas precisam do pacote novo.
- **Decisão de design** (não existe `NoviceActivityGetAward.cs` sender neste `vendor/` pra copiar): manda
  as 10 linhas com `conditions=0`/`awardGot=0` (nada bloqueado, nada marcado como já resgatado na UI) — o
  controle de verdade continua sendo o handler de clique (`noviceActivity()` em `novato.ts`, que valida
  `Grade` e usa `claimOnce` por jogador). Ou seja: a UI sempre mostra "disponível pra clicar", e quem decide
  se realmente dá o prêmio é o mesmo código de sempre (não ficou mais permissivo que antes — só ficou
  **visível**, que é o pedido desta sessão).
- **Gate**: `activityOpen(ctx, "novato")` — como não existe linha nenhuma em `app."ScheduledEvents"` com
  esse `kind`, fica aberto por padrão (mesma regra de `chickenbox`/`luckystar`/`labyrinth` — "feature sem
  janela admin fica sempre aberta"). Então aparece mesmo sem `ALL_OPEN`; pra desligar, criar uma linha
  `kind: "novato"` com `enabled: false` no admin.
- **Como testar**: `apps/game/test/all-open.test.ts` → mesmo describe acima; `stock` já mostra as 10
  linhas (default-aberto), `ALL_OPEN` não muda a contagem (só reforça, via `isOpen()` sempre true).
