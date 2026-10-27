# Site + admin redesign — plano e checklist (site-admin-redesign)

Status: em andamento (2026-10-27). Worktree `site-admin-redesign` (branch `feature/site-admin-redesign`).
Dono: "bem feito, com animação, design, motion, boas fotos do jogo" no site; no admin, "editar exatamente
o que eu vejo no jogo" — missões, eventos, instâncias, tudo, com ícones/imagens, "uma espécie de réplica
não-jogável porém editável".

Decisão de UX (já acordada, ver prompt da tarefa): **editores híbridos**, não réplica pura. Cada editor tem
um painel de **preview** (desenha a entidade como a janela do jogo, com a arte real) + um **painel lateral**
de edição; clicar num elemento do preview foca o campo correspondente no painel lateral; editar atualiza o
preview ao vivo. Campos invisíveis no jogo (ids, rates, scripts, condições) só existem no painel lateral.
Tabelas continuam existindo para trabalho em massa — toggle Tabela ↔ Visual por recurso.

**Divisão de escopo (coordenador, durante a fase 2):** o agente `multi-char` passou a ser dono do fluxo
Jogar/Play do site (carrossel de seleção de personagem antes do seletor de canal) + APIs de personagem.
Na fase 3 (site) **não tocar** em `apps/web/src/pages/Play.tsx`, `play.css`, `GameFrame.tsx` nem no seletor
de canal — se precisar de ajuste visual ali, só via tokens compartilhados em `packages/ui`. Home, Apoiar/
Transparência, páginas de conta e os editores do admin continuam sendo deste agente.

## 0.1 Correção de rumo (dono rejeitou a fase 2 — "não parece o jogo")

O dono testou os editores visuais da fase 2 (via Playwright) e rejeitou: "a tela parecia um card genérico
escuro com texto vietnamita — não era o que foi pedido". Dois problemas reais, confirmados:

1. **Idioma**: os recursos liam a coluna `game.*` crua (vietnamita/chinês do vendor), nunca o overlay pt-BR
   que `apps/api/src/templates/defs.ts` já aplica pro cliente ver. Corrigido: `apps/api/src/lib/i18n-admin.ts`
   + `ResourceDef.translatable` (quests/dungeons/missions/npcs) — GET/lista devolve o texto COM overlay +
   `<campo>__original` (cru, referência); PATCH grava em `app."Translations"`, nunca na coluna crua.
2. **Arte**: os previews eram `GamePanel` estilizado (CSS do design system), não a arte real do jogo. Corrigido
   (editor de Missões primeiro, ver §3): preview monta com PNGs reais exportados
   (`apps/client/public/assets/flash/ui/vietnam/swf/<módulo>/`, servidos por
   `/client-assets/*` — `apps/api/src/routes/static.ts`) nas posições/proporções da classe AS3 original.

**Avaliação de `@ddt/flash` headless** (o dono pediu pra avaliar primeiro — ver prompt): o CHECKOUT PRINCIPAL
tem `apps/client/src/game/quest/{TaskMainFrame,QuestInfoPanelView,QuestRewardView,...}.ts` já transpilados
(as3-to-ts), mas **este worktree não tem `apps/client/src/game`** (gitignorado/gerado por outro agente,
"pixi-port" — `docs/plan/MEMORY` "Pixi generated files"). Montar essas classes de verdade dentro do admin
exigiria: (a) o admin depender de `apps/client`'s gerado (não existe neste worktree), (b) um canvas PixiJS
embutido no React do admin, (c) stubar ~6 singletons do motor (ComponentFactory, LanguageMgr, SoundManager,
PlayerManager, ItemManager, StateManager/TaskManager) que as views esperam prontos. Escopo de dias, não desta
sessão — optei pela réplica com arte real + coordenadas do AS3 (abaixo), que já resolve os dois problemas
reais apontados. Registrado aqui pra quem retomar considerar o caminho `@ddt/flash` mais tarde.

**Capturas ao vivo do cliente real**: consegui UMA captura limpa (tela de criação de personagem, via
`:5173` → Jogar → conta de teste `screenshot_bot`, já usada na Home — ver fase 3). Tentei avançar até o Hall
pra abrir a janela de missão de verdade, mas depois de criar o personagem o navegador (sessão Playwright
compartilhada — cookies de `higgsfield.ai`/`google.com` confirmam que é o navegador real do dono, não um
Chromium isolado) foi redirecionado pro topo pra `localhost:5181/avatar.html?nickname=Thur&...` — um serviço
de preview de avatar, não a janela de missão — de forma determinística nas duas tentativas. Não investiguei
mais fundo (client em desenvolvimento ativo por outro agente, risco de interferir) nem insisti com mais
cliques no navegador compartilhado. Por isso as capturas "antes/depois" de cada janela usam o PREVIEW real do
admin (que já usa a arte exportada verdadeira) comparado com os PNGs reais isolados, não um screenshot do
cliente jogável renderizando aquela janela específica — ver `docs/plan/redesign-shots/<janela>/` e o relatório
final pra o que está (não) verificado dessa forma.

## 0. Direção de design (já existente, estendida — não é um redesign do zero)

O design system "night sky artillery" (`packages/ui/src/styles.css`) já está certo pro pedido do dono e
**não foi substituído**: navy/indigo de fundo (`--color-night*`, `--color-panel*`), paleta neon do power
gauge do jogo (`sun`/`coral`/`mint`/`sky`/`grape`), botões 3D "toy" (`shadow-toy`, `active:translate-y`),
`font-display` (Lilita One) pra títulos estilo placa de jogo. Isso cobre "high-tech, colorido,
profundidade/glow/gradiente, escuro mas vivo" — o trabalho deste plano é **estender** esse sistema pros
editores visuais e pro site, não reinventar.

- **Paleta**: tokens existentes, sem novos. `sun` = destaque/ouro, `coral` = perigo/dano, `mint` = sucesso/exp,
  `sky` = info/água, `grape` = raro/épico (já usado em `QUALITY` dos itens).
- **Tipografia**: `font-display` (Lilita One) para títulos "placa", `font-sans` (Rubik) pro resto,
  `font-mono` (JetBrains Mono) pra ids/código — já em `styles.css`.
- **Motion**: modo **Operate** no admin (ver skill `impeccable`) — motion discreta, CSS transitions
  (`transition-[transform,box-shadow]`, 100-200ms, `ease-out`), nunca em ações de alta frequência
  (toggle de coluna, filtro). `prefers-reduced-motion` já é global (`styles.css` base layer) — nenhum
  componente novo precisa checar isso na mão. No site (`apps/web`), modo **Persuade**: motion de entrada
  orquestrada no hero, mantendo `src/lib/motion.ts` + `MotionConfig reducedMotion="user"` já existentes.
- **Componentes novos em `packages/ui`** (fase 1): `GamePanel`/`GamePanelHeader` (moldura "janela do jogo",
  reaproveita `shadow-panel`/`border-line`/`title-plate`), `RewardChip` (ícone+valor de recompensa,
  variante item real via `iconUrl` ou moeda via ícone lucide + tone), `Hotspot` (wrapper clicável de um
  elemento do preview: ring de foco + leve "pop" ao focar via clique externo, nunca em hover puro).

## 1. Sitemap (site, `apps/web`) — já existe, confirmado nesta rodada

Home (`/`) · Ranking (`/ranking`) · Jogar (`/jogar`) · Apoiar/Transparência (`/apoiar`, `/transparencia`,
Pix em `/apoiar/pix`) · Conta (`/conta`) · Login/Registro. Rotas em `src/router.tsx`, code-split por rota
exceto Home. Nada de novo a criar aqui — fase 3 é **polimento**, não rota nova, salvo indicação em contrário.

## 2. Arquitetura de informação do admin (espelha o jogo)

Hall → Loja (`shop`, `shop-show`, `item-box`) → Bolsa/Itens (`items`, `player-items`) → Missões (`quests`,
`quest-conditions`, `quest-goods`) → Instâncias (`dungeons`=Pve_Info, `missions`=Mission_Info, `npcs`,
`pve-balance`, `pve-clears`) → Eventos (`events`, `scheduled-events`, `event-claims`, `event-codes`,
`login-award`, `time-box`) → Sociedade (`guilds*`) → Forja (itens+composição, dentro de Itens) →
NPCs/Bosses (`npcs`) → Mapas (`maps`) → Jogadores (`players`, `accounts`) → Servidor/Canais (`channels`,
`system`) → Doações (`donations`). Navegação lateral já agrupa por `NavGroup` (`content`/`players`/
`server`/`system`/`site`) em `apps/admin/src/resources/index.ts` — mantido, sem reestruturar o menu nesta
tarefa (risco alto pra pouco ganho; "reuse, don't break").

## 3. Editores visuais — um por slice, nesta ordem

Cada linha: recurso(s) admin → janela do jogo replicada → classe AS3 de referência (`vendor/DDTank41/Source
Flash/src/...`, nunca editada, só lida) → onde entra no painel.

| # | Recursos | Janela do jogo | AS3 de referência | Integração |
|---|---|---|---|---|
| 1 | `quests` + `quest-conditions` + `quest-goods` | Painel de missão (título, descrição, condições obrigatórias/opcionais, recompensas) | `quest/QuestInfoPanelView.as` (condições/descrição), `quest/QuestRewardView.as` (recompensas: exp/ouro/cupom/honra/medalha + itens 2 por linha) | Rota `/quests` dedicada (override da rota genérica), Tabs "Visual"/"Tabela" — Tabela = `<ResourcePage embedded>` de sempre |
| 2 | `dungeons` + `missions` + `npcs` + card de recompensa | Cartão de masmorra (nome, dificuldade, fases/chefes, thumbnail do mapa) | `roomList/pveRoomList`, `room/view/bigMapInfoPanel/MissionRoomBigMapInfoPanel.as` | Rota `/dungeons` dedicada |
| 3 | `events` + `scheduled-events` + `event-reward-*` | Painel de evento (calendário + prêmios) | `vendor/DDTank41/Source Flash/src/activity/**` (a localizar na fase) | Rota `/events` — já tem `?edit=`, preservar |
| 4 | `items` + `shop` | Tooltip de item / cartão de loja | `src/ddt/view/common/goods/**`, `src/shop/**` | Rota `/items` dedicada |
| 5 | `npcs` | Cartão de NPC/chefe | `src/room/view/**` (barra de vida/nome de NPC) | Rota `/npcs` dedicada |

Esta sessão entrega o **#1 (Missões)** por completo (preview + painel + clique-pra-focar + salvar + testes) como
padrão de referência para as próximas. #2-#5 ficam para sessões seguintes (ver "O que falta" no fim).

## 4. Checklist

- [x] Fase 0 — leitura (`AGENTS.md`, READMEs web/admin, `docs/features/admin.md`, `TASKS.md` §4,
      `docs/client-pixi/ASSETS.md`, `packages/ui`) + este plano.
- [x] Fase 1 — componentes novos em `packages/ui`: `GamePanel`, `RewardChip`, `Hotspot`.
- [x] Fase 2a — editor visual de Missões (`/quests`), com testes. `apps/admin/src/pages/Quests.tsx`
      (rota estática em `router.tsx`, vence a rota genérica `$resource` — mesmo truque de `/events`):
      Tabs Visual/Tabela/Condições/Prêmios; Visual = `QuestPicker` (busca + lista) + `QuestEditor`
      (preview `GamePanel` ao vivo via `useWatch` + painel lateral com todos os campos de `quests.fields`,
      reaproveitando os helpers de `crud/schema.ts` que `SchemaForm` já usa — sem duplicar validação/conversão).
      Clicar um `Hotspot` do preview rola+foca o campo via `fieldRefs`; editar atualiza o preview antes de
      salvar (sem round-trip). Ícones de item real via `/api/admin/item-icons/:id.png` (cache existente);
      recompensas em moeda (exp/ouro/cupom/honra/medalha/buff) usam glifo `lucide-react` com tom do design
      system (sem asset SWF mapeado — ver §5). Testes: `apps/admin/src/pages/Quests.test.tsx` (3 casos: aba
      Visual por padrão sem missão escolhida; clicar hotspot do título foca o campo e editar atualiza o
      preview ao vivo; trocar de missão troca o preview). `pnpm --filter admin exec vitest run` (12 passam)
      e `pnpm --filter admin exec tsc --noEmit` limpos.
  - [x] **Rebuild rodada 2** (dono rejeitou, ver §0.1): preview reconstruído com arte real
        (`apps/admin/src/lib/flashAssets.tsx` `FlashImg`/`useFlashLibrary`, módulo `quest` —
        `titleBG`/`QuestInfoCondTitle`/`necessary`/`notNecessary`/`RewardText.OptionalTitle`/`RewardText.
        Type1-8`/`QuestRewardCellBG`/`leftBGStyle1`, todos verificados visualmente como já localizados
        pt-BR — ex. "Objetivo da tarefa:", "Recompensa:") no lugar do `GamePanel` CSS genérico; zoom (40–
        150%, `useZoom`, CSS `zoom` não `transform`) a 560px de largura real (grade 2×186px de
        `QuestRewardCell.as`); painel lateral ganhou "Original (VN)" (`OriginalTextNote`) sob
        Título/Detalhe/Objetivo quando o overlay pt-BR existe e difere do cru. Verificado ao vivo: instância
        isolada do admin+api (porta 5199/8099, banco pglite descartável, `admin/admin`) — screenshot antes
        (missão #4 "Cường hóa vũ khí Lv5", cru) e depois (editei Título/Detalhe/Objetivo pelo painel, salvei,
        preview + lista + "Original (VN)" atualizaram corretamente) em
        `docs/plan/redesign-shots/quest/{admin-before-raw-vn,admin-after-ptbr}.png` (gitignorado) +
        `real-asset-*.png` (PNGs reais isolados, prova de que são arte exportada de verdade). **Não
        verificado**: comparação lado a lado com a janela de missão rodando no cliente PixiJS de verdade —
        não consegui chegar lá com segurança nesta sessão (ver §0.1). Testes mantidos verdes (`Quests.test.tsx`
        3/3, ajustados pra nova estrutura DOM — título agora é `<h3>` fora do `Hotspot`, dentro como antes).
- [x] Fase 2b — editor visual de Instâncias (`/dungeons`). `apps/admin/src/pages/Dungeons.tsx`: mesmo
      padrão do editor de Missões (preview `GamePanel` ao vivo + painel lateral + clique-pra-focar), uma
      `DifficultyLane` por dificuldade configurada (`SimpleGameScript`...`TerrorGameScript`). Diferencial:
      a cadeia de fases (`Game.SetupMissions(...)`) só existe em código, não em dado — `GET
      /api/admin/dungeons/:id/diagnostics` (`apps/api/src/lib/pve-diagnostics.ts`) reconstrói o `PveGame`
      real de cada dificuldade (igual `packages/fight/test/pve-sweep.test.ts`) e devolve a cadeia resolvida
      + avisos quando uma sessão referenciada não tem `Mission_Info` (`docs/guides/pve.md` §1.1, tarefa
      `pve-cadeia`) — a masmorra Gulu Kingdom (Pve 1) mostra isso de verdade: Fácil completo, Normal/
      Difícil/Herói com sessão faltando (gap documentado, não corrigido ainda). Prêmios de fase via
      `Drop_Condiction`/`Drop_Item` (recursos novos: `apps/admin/src/resources/drops.ts`, não existiam no
      painel — PK errado corrigido em `admin-resources.ts`, `DropId`→`DropID`). Ícones de item reais via
      `/api/admin/item-icons`; arte da masmorra via `/resource/image/map/<Pic>/icon.png` (rota pública
      existente, 404 cai num placeholder 1×1, nunca quebra visualmente). Mock (`VITE_USE_MOCKS=true`)
      ganhou `GET /api/admin/dungeons/:id/diagnostics` espelhando o fallback "sem script" do motor real
      (não pode rodar o script de verdade no mock). Testes: `apps/admin/src/pages/Dungeons.test.tsx` (3),
      `apps/api/test/api.test.ts` "dungeon diagnostics" + "drop-conditions CRUD" (regressão do PK). Suites
      completas (admin 15, api 119) e typechecks limpos.
  - [x] **Rebuild rodada 2** (dono rejeitou, ver §0.1): módulo `roomlist`
        (`roomList/pveRoomList/DungeonListItemView.as`) — `DungeonListBG` ("Cais de expedição", moldura com
        vinhas) como fundo da janela, `hardLevel_PVE` ("Dificuldade", verificado pt-BR) como rótulo real da
        badge de dificuldade, `pveSel_01` como fundo das faixas. `asset.DungeonList.boss` ficou de fora —
        inspecionei e ainda está em vietnamita cru ("Đánh Boss") nesta exportação, então o indicador de boss
        continua ícone+texto do admin em vez de arte real incorreta. `Nome`/`Descrição` ganharam "Original
        (VN)" (reaproveita o mesmo padrão de `Quests.tsx`, ainda não extraído pra componente compartilhado).
        Verificado ao vivo (mesma instância isolada porta 5199/8099, banco pglite reaproveitado da rodada do
        editor de Missões): `docs/plan/redesign-shots/dungeon/{admin-before-raw-vn,admin-after-ptbr}.png`
        (editei "Rừng rậm Gamazon" → "Floresta Gamazon" pelo painel, preview + lista + "Original (VN)"
        atualizaram) + `real-asset-*` (PNGs isolados). Mesma ressalva: sem comparação com o cliente PixiJS
        rodando de verdade (§0.1). Servidores QA parados logo depois da captura (memória da máquina limitada
        nesta sessão — rodar só uma instância por vez, parar ao terminar). Testes mantidos verdes
        (`Dungeons.test.tsx` 3/3; corrigido um bug de ordem de hooks que o rebuild introduziu — `useFlashLibrary`
        precisa rodar antes do `if (isLoading) return` do `DungeonEditor`, não depois).
- [x] Fase 2c — editor visual de Eventos (`/events`). Aditivo: nova aba "Visual" em `pages/Events.tsx`
      (que já existia com Calendário/Tabela/Agendados/Prêmios/Códigos/Presença/Caixas) — mesmo padrão de
      preview `GamePanel` ao vivo + painel lateral + clique-pra-focar, réplica de
      `activeEvents/view/ActiveMainFrame.as`/`ActiveSubContent.as` (título, período, descrição/conteúdo,
      prêmios). Prêmios reais via `event-awards` (ícone de item real) + `AwardContent` (texto livre, campo
      já existente). Nenhuma aba/comportamento existente mudou (testes de `?edit=` continuam intactos).
      Achado ao escrever o teste: `@radix-ui/react-tabs` troca de aba no `mousedown`, não no `click` —
      `fireEvent.click` sozinho nunca ativa uma aba no jsdom (os testes anteriores só liam a aba inicial,
      nenhum clicava pra trocar) — documentado no teste novo pra quem for reusar o padrão nos próximos
      editores. Testes: `apps/admin/src/pages/Events.test.tsx` (+1, total 3). Suite completa (admin 16) e
      typecheck limpos.
- [x] Fase 2d — editor visual de Itens/Loja (`/items`). `apps/admin/src/pages/Items.tsx`, rota estática.
      Preview estilo dica de item (ícone grande, nome, badges qualidade/categoria/nível, atributos ATK/DEF/
      AGI/SOR, descrição) + seção "Na loja" com ofertas reais de `game."Shop"` filtradas por
      `cf_TemplateID` (campo numérico mesmo sendo `item-picker` no FieldDef — resolução é pela coluna
      Drizzle, não pelo tipo do campo). Painel lateral reaproveita `ItemIconGenerator` (gerador de ícone
      por IA, antes só no diálogo genérico) + todos os campos de `items.fields` (seções Geral/Atributos/
      Regras já existentes). Abas Visual/Tabela/Loja. Testes: `apps/admin/src/pages/Items.test.tsx` (3).
      Suite completa (admin 19) e typecheck limpos.
  - [x] **Rebuild rodada 2** (dono rejeitou, ver §0.1): módulo `coreiconandtip` (dica de item genérica +
        `shop/view/ShopItemCell.as`) — rótulos reais `GoodsLevel` ("Nível. Lv.", verificado pt-BR),
        `GoodsType` ("Tipo"), `GoodsTipItemHert` ("Dano"), `GoodsTipItemDefence` ("Armadura"),
        `GoodsTipItemArmAngle` ("Ângulo") ao lado dos valores de atributo — Sorte não tem bitmap exportado
        num tamanho utilizável, continua texto puro. Não achei o frame completo da dica em tamanho usável
        (`GoodsTipBg` é 71×56, parece um slot/canto, não o fundo inteiro); o painel manteve o mesmo
        tratamento de pergaminho dos editores de Missões/Instâncias por consistência visual, sem inventar
        um asset que não existe. `items` (resource `Shop_Goods`) ganhou o mesmo tratamento de overlay pt-BR
        que quests/dungeons/missions/npcs — `withItemOverlay` (API) agora também devolve `<campo>__original`
        e o PATCH roteia Name/Description/Remark pra `app."Translations"` em vez da coluna crua (commit
        separado, backend). Testes: `Items.test.tsx` (3/3). Suite completa do admin (21, `--maxWorkers=1`)
        e do apps/api (121) e typechecks limpos. **Sem captura ao vivo desta rodada** (memória da máquina
        limitada nesta sessão — não liguei outra instância QA só pra isso; os PNGs reais usados estão em
        `docs/plan/redesign-shots/item/real-asset-*.png`, mas não há comparação antes/depois do admin como
        nas duas primeiras janelas).
- [x] Fase 2e — editor visual de NPCs/Bosses (`/npcs`). `apps/admin/src/pages/Npcs.tsx`, rota estática.
      Preview: ficha de combate (nível, vida, ataque, EXP) + pool de drop real (`DropId` do NPC É o
      `Drop_Condiction.DropID`, mais direto que o de Missões). Arte do NPC (`.swf`) sem prévia — não existe
      rota de export de frame pra PNG (diferente de item/mapa); mostra `ModelID`/`ResourcesPath` como texto
      em vez de inventar um caminho incerto (nota explícita no preview, `npcs.artNote`). Abas Visual/
      Tabela/Drops. Testes: `apps/admin/src/pages/Npcs.test.tsx` (2). Suite completa (admin 21) e
      typecheck limpos.

      **Fase 2 completa** (5/5 editores visuais: Missões, Instâncias, Eventos, Itens/Loja, NPCs/Bosses).
- [~] Fase 3 — site (Jogar **fora de escopo**, dono agora é `multi-char` — ver nota de divisão de escopo
      no topo). Feito nesta rodada:
  - [x] **Home — screenshot real**: `public/art/screenshot-char-select.webp` (seção nova "É o jogo de
        verdade", entre Features e Notícias, `RealScreenshot` em `src/pages/Home.tsx`) + `public/art/
        og-cover.jpg` (card de compartilhamento padrão, `src/lib/seo.ts` `DEFAULT_IMAGE` — antes caía no
        `logo.webp`). Ambos a MESMA captura real (Playwright contra `:5173`/`:5180` com uma conta de
        teste descartável `screenshot_bot`, criada via `/api/auth/register` — nunca a do dono; sessão do
        navegador encerrada depois). Nenhum Higgsfield usado (arte real bastou pra esta peça).
  - [x] **Apoiar — Buy Me a Coffee**: `/apoiar` virou a página oficial de doação
        (`https://buymeacoffee.com/3vdopcs`, CTA principal) — o fluxo de Pix que existia ali não é o canal
        oficial (precisa de uma chave Pix por servidor, só faz sentido pra quem hospeda o próprio fork),
        então foi **realocado**, não apagado: `/apoiar/pix` (`ApoiarPixPage`), com aviso explícito de que é
        ferramenta self-host. `/apoiar` linka pra lá pra quem precisar.
    - ⚠️ Nota pro dono: `Transparência` (`/transparencia`) ainda soma só doações via Pix
      (`donationSummaryQuery`) — doações pelo Buy Me a Coffee **não aparecem lá automaticamente** (BMC é uma
      plataforma externa, sem integração/webhook nesta tarefa). Se quiser os dois num só total, precisa de
      uma integração futura (fora do escopo desta rodada).
  - [ ] Home: hero dedicado (`public/art/hero-bg.webp`, ainda reaproveitando o fundo da página Jogar —
        pendente, ver `apps/web/README.md` "Arte"), pódio no ranking (já existia da `site-design`, não
        revisado nesta rodada).
  - [ ] Conta, responsivo (revisão dedicada), SEO (além do `og-cover` — títulos/descrições por página já
        existiam da `site-design`, não revisados nesta rodada).
  - Testes: `apps/web/src/pages/Apoiar.test.tsx` (3, novo). Suite completa do web (14) e typecheck
    limpos.

## 5. Arte

- `apps/web/public/art/og-cover.jpg` e `screenshot-char-select.webp` — real, Playwright (ver fase 3 acima).

Fora isso, nenhuma geração nova nesta sessão. Ícones de item reaproveitam `/api/admin/item-icons/:id.png` (já existe,
gerado por IA e cacheado — ver `docs/features/admin.md` §2). Moedas/recompensas não-item (exp, ouro, cupom,
honra) usam ícone `lucide-react` + tom do design system (não existe asset SWF mapeado 1:1 pra isso sem
exportar `quest.swf` de novo, fora do escopo read-only do vendor). Thumbnail de mapa reaproveita
`/api/admin/map-icons/:id.png` (já existe). `og-cover.jpg` já tem uma versão real (acima); `hero-bg.webp`
dedicado continua pendente — key-art gerada (Higgsfield) fica pra uma rodada futura se o dono preferir arte
original à captura real.
