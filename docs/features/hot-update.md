# Atualização ao vivo ("Aplicar agora" / hot-update)

## 1. O que é no jogo
Pedido do dono: "ter um sistema de conseguir atualizar coisas do jogo sem os players
precisarem sair pra atualizar, ter um socket". Não é uma tela nova — é um botão no
painel admin (**Configuração do servidor → "Aplicar agora / Atualizar jogo ao vivo"**)
que faz duas coisas numa tacada: (1) recarrega os caches de template do `apps/game`
(itens, loja, missões, eventos, config — o mesmo que `/reload-templates` já fazia) e
(2) empurra pelo socket, pros jogadores **já conectados**, os pacotes que o cliente 4.1
(e 6600) sabem processar sem relogar.

**Seja honesto sobre o limite real**: o cliente 4.1 carrega as DEFINIÇÕES de item/loja/
missão/mapa/config **uma vez só, no boot** (antes do login), via um XML/`.ashx` buscado
pelo `StartupResourceLoader` e guardado em cache local pra sessão inteira — não existe
NENHUM pacote no protocolo original que diga "recarregue o XML de itens". Então uma
mudança de **nome, ícone, descrição ou preço** de um item só aparece pra quem já está
logado depois que a pessoa relogar (ou reabrir aquela tela, se ela buscar via `.ashx` de
novo — ver linha "Loja" na tabela). O que o botão consegue mesmo empurrar ao vivo são os
**números** que o jogo já manda via socket a cada tela (stats do jogador, progresso de
missão, estado do ícone de evento) — porque RECALCULAR contra o template novo e reenviar
o pacote de sempre é algo que o servidor já fazia em outras situações (ex. trocar de
equipamento), só nunca tinha sido disparado por uma mudança do ADMIN.

## 2. Onde fica no código
| Camada | Pasta/arquivo | O que tem |
|---|---|---|
| Cliente 4.1 (boot, carregamento único) | `vendor/DDTank41/"Source Flash"/src/ddt/loader/StartupResourceLoader.as` (lista completa de loaders :440-497) | `creatItemTempleteLoader` (item), `creatShopTempleteLoader` (loja), `creatQuestTempleteLoader` (missão), `creatServerListLoader` (canais), `creatServerConfigLoader`, `creatMapInfoLoader`/`creatDungeonInfoLoader` (mapas/masmorras) — cada um busca o `.ashx`/XML **1x** e guarda em um manager estático (`ItemManager`, `TaskManager.as:79 _questListPath`...) que nunca refaz a busca sozinho durante a sessão. |
| Admin channel interno (apps/game) | `apps/game/src/admin/http.ts` | `POST /reload-templates` (já existia) só reloada cache; `POST /hot-update {kinds?, notice?}` (novo, **41-hot-update**) reloada E empurra os pacotes de refresh. |
| Aplica localmente | `apps/game/src/admin/hot-update.ts` (`applyHotUpdate`) | Reloada `ctx.templates`/`eventsRuntime`, depois por jogador online: `GamePlayer.updatePlayerProperties()` (`game/player.ts:291-306`), `GamePlayer.questInv.sendAll()` (`game/quests.ts:70`), `pushEventIcons` (`handlers/eventos/agendador.ts`) + boss mundial, e um `3 SYS_MESSAGE` se `notice` foi passado. |
| Entre canais | `apps/game/src/bus/cross-channel.ts` (`CrossChannel.hotUpdate`, mensagem `ch:hot-update`) | O canal que recebeu o POST já aplicou local; publica pra avisar os OUTROS canais, que chamam o MESMO `applyHotUpdate` pros SEUS jogadores (nenhum republica de novo — mesmo padrão de `systemNotice`/`bossOpen`). |
| API REST | `apps/api/src/routes/admin.ts` | `POST /api/admin/hot-update {kinds:[...], notice?}` (admin-only, audita, delega pro canal local via `gameInternalPost(ctx, "/hot-update", ...)` — alcançar os outros canais é responsabilidade do `apps/game`, igual `/broadcast`). |
| Painel (React) | `apps/admin/src/pages/ServerConfig.tsx` (`HotUpdateCard`) | Botão "Aplicar agora" + campo de aviso opcional, na própria página de Configuração do servidor. |
| Gatilho já existente (não mudou) | `apps/api/src/routes/admin.ts` `afterWrite()` (~linha 807) | Toda escrita num recurso `game.*`/`app."ScheduledEvents"` já chama `gameInternalPost(ctx, "/reload-templates")` automaticamente — só reloada cache, NÃO empurra pacote pro cliente (gap citado em `docs/GAME-SERVER.md` "Canais" § "O que ainda não funciona com 2+ canais": `reload-templates`/`events/start`/`events/stop` ainda só atingem o canal local). O botão "Aplicar agora" é a ferramenta nova pra quando o admin QUER empurrar de verdade; o reload automático continua existindo do mesmo jeito, só pro cache do servidor. |

## 3. Fluxo passo a passo
1. Admin edita algo (item, loja, missão, evento, config) pelo CRUD normal — já dispara o
   `/reload-templates` automático (cache do servidor atualizado, comportamento mudou pro
   PRÓXIMO fight/compra/etc., igual sempre).
2. Se o admin quer que quem **já está jogando** veja/saiba agora, clica em "Aplicar
   agora" (com um aviso opcional, ex. "Nerf no item X aplicado"). Isso chama `POST
   /api/admin/hot-update`.
3. `apps/api` audita a ação (`audit(ctx, actor, "hot-update", ...)`) e repassa pro canal
   LOCAL do jogo (`gameInternalPost(ctx, "/hot-update", {kinds, notice})`).
4. `apps/game` (`applyHotUpdate`): reloada `ctx.templates`/`eventsRuntime` (igual
   `/reload-templates`) e, pra cada jogador já conectado NESTE canal, reenvia os pacotes
   relevantes (ver tabela da seção 4) + o aviso, se houver.
5. Esse mesmo canal publica `ch:hot-update` no barramento (`ctx.crossChannel.hotUpdate`,
   só se houver `REDIS_URL`/múltiplos canais) — cada OUTRO canal reloada e empurra pros
   SEUS próprios jogadores, sem passar de novo pela API.
6. Resposta volta pro admin com `{ items, shop, maps, scheduledEvents, achievements,
   notified }` — `notified` é só a contagem do canal LOCAL (cada canal conta os próprios).

## 4. Mapa por tipo de mudança — o que atualiza ao vivo vs o que precisa relogar
| Mudança do admin | O servidor recarrega | O cliente 4.1 já conectado recebe (socket) | Precisa relogar / reabrir tela? Por quê |
|---|---|---|---|
| **Itens/templates** (`items`, atributos/preço/`ReclaimValue`...) | `ctx.templates.items` (`db/templates.ts`) | `kinds: ["items"]` → `updatePlayerProperties()` recalcula (`game/stats.ts computeStats`, já lê os templates recarregados) e reenvia **38 PRIVATE_INFO / 67 UPDATE_PLAYER_INFO** (`PlayerManager.as __updatePlayerInfo`, linha 1658) / **167 PLAYER_PROPERTY** — dano/defesa/HP/FightPower efetivos do item equipado mudam na hora. | **Sim, pro nome/ícone/descrição**: só vêm do `TemplateAllList.xml` carregado 1x no boot (`StartupResourceLoader.as:446`). Relogar (ou, pra quem tiver, reabrir a tela que refaz o `.ashx`) é a única forma de ver o texto novo. |
| **Loja** (`shop`, preço/estoque/item à venda) | `ctx.templates.shop` | `kinds: ["shop"]` → mesmo `updatePlayerProperties()` de cima (preço pago na próxima compra já é o novo, cobrança é sempre server-side). | **Sim, pra lista visível**: `ShopItemList.xml` também é boot-only (`StartupResourceLoader.as:447`) — a tela da loja só mostra a lista nova depois de relogar. A COBRANÇA em si já está certa sem relogar (o servidor nunca confia no preço que o cliente mostra). |
| **Missões** (`quests`, recompensa/condição) | `ctx.templates` (via `eventsRuntime`/quest templates) | `kinds: ["quests"]` → `questInv.sendAll()` reenvia **178 UPDATE_QUEST_DATA** com o PROGRESSO atual (contador, concluída ou não). | **Sim, pro texto/recompensa**: vêm do `QuestList.xml` (boot-only, `TaskManager.as:79`). O progresso numérico já viaja sem relogar; só a descrição/recompensa mostrada na tela fica desatualizada até relogar. |
| **Eventos/calendário** (`events`, `app."ScheduledEvents"` — liga, elite, boss mundial, batalha da sociedade, resgate, captura de monstro) | `eventsRuntime(ctx).reload()` | `kinds: ["events"]` → `pushEventIcons` (**42 league**, elite status, **153/1** batalha da sociedade, **277/1** resgate, captura de monstro) + boss mundial (**0 WORLD_BOSS_OPEN** se a janela estiver ativa) — ícone do hall abre/fecha SEM relogar. | **Não precisa.** Esta é a categoria que mais se parece com "atualização ao vivo de verdade" — o jogo já manda esses pacotes quando a janela abre/fecha sozinha (`EventScheduler.tick`); o botão só repete o envio pra quem perdeu a transição (ex. o admin habilitou uma janela cujo horário já estava em curso). |
| **Config/rates** (`expRate`/`goldRate`, `PUT /api/admin/server-config`) | `ctx.templates.rates` | **Nenhum pacote precisa**: a taxa é lida DIRETO do template a cada luta (`fight/ddt.ts`), então já é 100% ao vivo pro PRÓXIMO fight — nada na tela do jogador mostra a taxa em si pra "atualizar". `kinds: ["config"]` ainda chama `updatePlayerProperties()` por segurança (reflete qualquer outro número dependente), mas é redundante aqui. | **Não precisa.** Já era assim antes desta tarefa (comentário em `admin.ts:262`). |
| **Drops** (`game.Drop_Item`/`Drop_Condiction`) | `ctx.dropItems`/`dropConditions` | Nenhum pacote: drop é só sorteado no momento da morte/abertura, não existe "tela de drop" pra atualizar. | **Não precisa.** Já era ao vivo (próxima morte usa a tabela nova). |
| **Aviso de manutenção** (`maintenance`/`maintenanceMessage`) | N/A (lido pelo `apps/api` a cada tentativa de login, `auth.ts maintenance()`) | `notice` → **3 SYS_MESSAGE** pra quem já está dentro — é a ÚNICA forma de avisar quem já logou, porque `maintenance` não existe no lado `apps/game` (só bloqueia login NOVO, nunca desconecta quem já está online). | Já é ao vivo pro bloqueio de login novo. Pra quem já está jogando, só o aviso (`notice`) — ninguém é expulso automaticamente; é o próprio admin quem decide usar `POST /kick`/`/broadcast` se quiser forçar saída. |
| **Bots** (IA de PvP, `app.Bots`) | Lido a cada partida nova (`bots/provider.ts`) | Nenhum pacote: bot só aparece quando uma SALA NOVA é criada/preenchida. | **Não precisa.** Partidas em andamento continuam com o bot antigo (já estava "montado"); a próxima partida usa a config nova. |
| **Canais** (`player."Server_List"`) | `apps/api` `ServerList.ashx` lê a tabela direto (sem cache de processo) | Nenhum pacote. | **Sim**: a lista de canais também é carregada 1x no boot (`creatServerListLoader`, `StartupResourceLoader.as:453`) — novo canal/canal desabilitado só aparece no seletor depois de relogar. Isto é DIFERENTE da troca de canal em si (`docs/GAME-SERVER.md` "ch-troca"), que já funciona sem relogar — o que não atualiza é a LISTA mostrada no dropdown. |

## 5. Quero mudar…
- **Adicionar um novo `kind` que empurra outro pacote**: edite `pushPlayerRefresh` em
  `apps/game/src/admin/hot-update.ts` — adicione o `set.has("<kind>")` e o `p.send(...)`
  correspondente; se o pacote depende de estado por-evento (tipo os ícones do hall),
  prefira estender `pushEventIcons` (`handlers/eventos/agendador.ts`) pra reaproveitar em
  login E hot-update.
- **Mudar o texto do botão / adicionar campo de `kinds` no painel**: `apps/admin/src/
  pages/ServerConfig.tsx` (`HotUpdateCard`) — hoje manda sempre "tudo" (kinds vazio =
  `items,shop,quests,events,config` em `admin/hot-update.ts ALL_KINDS`); pra expor
  checkboxes por tipo, adicione um `useState<string[]>` e mande em `mutationFn`.
- **Fazer uma mudança de admin EXISTENTE já chamar hot-update em vez de só
  reload-templates**: troque `gameInternalPost(ctx, "/reload-templates")` por
  `gameInternalPost(ctx, "/hot-update", { kinds: [...] })` no ponto de escrita
  (`apps/api/src/routes/admin.ts`) — mas pense antes: isso passa a mandar pacote pra
  TODO MUNDO online a cada salvamento do CRUD (ex. toda tecla do form de item), o que é
  ruidoso; o padrão escolhido aqui foi manter o reload automático "silencioso" (cache só)
  e deixar o push explícito pro botão dedicado.

## 6. Testes + status
- `apps/game/test/hot-update.test.ts`: `POST /hot-update` num `GameServer` de teste real —
  reenvio de **67** após `kinds: ["config"]`, **3 SYS_MESSAGE** (`notice`) chegando no
  jogador, **42** (liga) reenviado com `kinds: ["events"]` quando a janela já estava
  aberta, e o cenário entre canais (2 `GameServer` ligados por `createMemoryBus`, igual
  `ch-eventos.test.ts`): `POST /hot-update` no canal 4 chega também no jogador do canal 5
  via `ctx.crossChannel.hotUpdate`.
- `apps/api/test/api.test.ts` (`describe("hot-update (41-hot-update)")`): exige token
  admin (401 sem token, 403 sem papel admin) e devolve 503 quando o `apps/game` não está
  acessível (ambiente de teste roda com `GAME_INTERNAL_URL` vazio de propósito — o
  round-trip real com pacotes é só no teste do `apps/game` acima, que tem um servidor de
  jogo de verdade).
- Sem teste automatizado do botão React (`HotUpdateCard`) — mesma lacuna já registrada em
  `docs/features/admin.md` pro resto do painel; verificação manual em `:5174`.
