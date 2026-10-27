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
- [ ] Fase 1 — componentes novos em `packages/ui`: `GamePanel`, `RewardChip`, `Hotspot`.
- [ ] Fase 2a — editor visual de Missões (`/quests`), com testes.
- [ ] Fase 2b — editor visual de Instâncias (`/dungeons`).
- [ ] Fase 2c — editor visual de Eventos (`/events`).
- [ ] Fase 2d — editor visual de Itens/Loja (`/items`).
- [ ] Fase 2e — editor visual de NPCs/Bosses (`/npcs`).
- [ ] Fase 3 — site: Home (hero/features/ranking/news), Jogar (polimento sem regressão), Apoiar/
      Transparência (link Buy Me a Coffee), Conta, responsivo, SEO.

## 5. Arte

Sem geração nova nesta sessão. Ícones de item reaproveitam `/api/admin/item-icons/:id.png` (já existe,
gerado por IA e cacheado — ver `docs/features/admin.md` §2). Moedas/recompensas não-item (exp, ouro, cupom,
honra) usam ícone `lucide-react` + tom do design system (não existe asset SWF mapeado 1:1 pra isso sem
exportar `quest.swf` de novo, fora do escopo read-only do vendor). Thumbnail de mapa reaproveita
`/api/admin/map-icons/:id.png` (já existe). Se/quando o dono gerar key-art nova pro site (`hero-bg.webp`,
`og-cover.jpg`), entra na fase 3 — não gerado nesta sessão (ver "O que falta").
