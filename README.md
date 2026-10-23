<div align="center">

# 🎯 DDTank Reborn

**O clássico DDTank 4.1, reescrito numa stack moderna — aberto pra comunidade.
Servidor 100% TypeScript + cliente novo em PixiJS (sem Flash) + remaster HD em PT-BR.**

[![PR Check](https://github.com/thurdev/ddtank-reborn/actions/workflows/pr-check.yml/badge.svg)](https://github.com/thurdev/ddtank-reborn/actions/workflows/pr-check.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](./tsconfig.base.json)
[![Node 24 + pnpm 11](https://img.shields.io/badge/Node-24%20%7C%20pnpm-11-green?logo=node.js)](./package.json)

[Vídeo](#-vídeo) • [Ideia](#-a-ideia) • [Começar](#-começar) • [Stack](#-stack) • [Contribuir](./CONTRIBUTING.md) • [Apoiar](#-apoiar) • [Créditos](#-créditos)

</div>

## 🎬 Vídeo

[![DDTank Reborn — apresentação no YouTube](https://img.youtube.com/vi/Jkr7ADRN_kw/maxresdefault.jpg)](https://youtu.be/Jkr7ADRN_kw)

▶️ **[Assista no YouTube](https://youtu.be/Jkr7ADRN_kw)** — apresentação do projeto rodando.

---

## 💡 A ideia

Um DDTank que a **comunidade ajuda a construir**: balancear, corrigir, traduzir e adicionar
funcionalidades, tudo aberto aqui no repositório.

- **Cada um com o seu servidor.** O código serve pra qualquer pessoa subir o próprio servidor
  (Docker, Postgres, painel admin pra configurar tudo).
- **Servidor oficial sem pay-to-win.** O servidor do mantenedor vai abrir sem vantagem paga.
- **Sem fins lucrativos.** O projeto se mantém só por doação voluntária (ver [Apoiar](#-apoiar)),
  usada pra manter o desenvolvimento e a infraestrutura.
- **Transparência.** Tudo que veio de outros projetos está creditado em [Créditos](#-créditos)
  e em [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## O que é

Port completo do servidor privado **DDTank 4.1** (originalmente C#/.NET + SQL Server + ASP.NET `.ashx`)
para **Node 24 + TypeScript + Postgres**. O cliente Flash AS3 original foi convertido inteiro pra
**TypeScript + PixiJS (WebGL)** — roda no navegador sem Flash nem Ruffle. O protocolo binário é mantido
byte-a-byte, então o jogo é o mesmo, o motor por trás é novo. O SWF original via Ruffle/launcher
continua funcionando como alternativa.

**Status atual (out/2026):** jogável — lobby, salas PvP, PvE com bots, loja, itens, missões, guilda,
fazenda e painel admin. Lobby remasterizado em HD e boa parte das imagens do cliente traduzidas pra PT-BR.

- **Cliente novo, sem Flash:** o cliente 4.1 inteiro convertido pra TypeScript + PixiJS (WebGL) —
  boot, login, hall, batalha PvP/PvE e quase todas as janelas já funcionam. Em dev a página **Jogar**
  já abre ele (`PIXI_CLIENT_URL=off` volta pro Ruffle). Ver [`docs/client-pixi/`](./docs/client-pixi/README.md).
- **Foco:** versão 4.1. A migração pra versão mais nova (DDT 6600,
  [`docs/plan/MIGRACAO-6600.md`](./docs/plan/MIGRACAO-6600.md)) está em espera.

Issues `good-first-issue` são o melhor ponto de entrada.

## ✨ Features

- ⚔️ **PvP / PvE / GvG** — salas, batalhas por turno, física e dano compartilhados cliente↔servidor
- 🤖 **Bots** — oponentes IA com nomes editáveis, PvE com scripts de missão/NPC
- 🏰 **Guilda, casamento, fazenda, forja, pets, leilão, águas termais** — handlers portados 1:1 do C#
- 🌐 **API byte-compatível** — mesmos endpoints `.ashx`/XML/zlib do servidor original
- 🛠️ **Painel admin** — itens, mapas, NPCs, missões, eventos, textos PT-BR e overlay de assets
- 🇧🇷 **PT-BR** — cliente, servidor e banco traduzidos, editáveis no admin
- 🎨 **Remaster HD** — lobby redesenhado e imagens com texto refeitas em PT-BR, aplicadas como overlay
  sem tocar nos arquivos originais (`tools/remaster/`, `tools/i18n/`)

## 🧱 Stack

| Camada | Tech |
|---|---|
| Servidor jogo | `apps/game` — Node 24 + TS (substitui Center + Game/Road + Fighting) |
| API HTTP | `apps/api` — Fastify (substitui `Tank.Request` .ashx) |
| Banco | `packages/db` — Drizzle ORM + Postgres (Neon prod / Postgres embutido em dev) |
| Protocolo | `packages/protocol` — codec binário, crypto, framing TCP + WebSocket |
| Física/combate | `packages/fight` — motor de batalha determinístico (física, turnos, dano, bots) |
| Login | `packages/auth` — ticket de login compartilhado entre API e servidor |
| Site / Admin | `apps/web`, `apps/admin` — React + Vite (componentes comuns em `packages/ui`) |
| Cliente | `apps/client` — TS + PixiJS convertido do AS3; `packages/flash` = API do Flash reimplementada sobre PixiJS |
| Conversores | `tools/as3-to-ts` (AS3 → TS) e `tools/swf-export` (SWF → PNG/JSON, FLV → MP3) |
| Cliente legado | SWF original via Ruffle (`apps/client-harness`) e launcher desktop (`apps/launcher`) |

## 🚀 Começar

```bash
# requisitos: Node 24 + pnpm 11 + Java (só pro build de arte do cliente)
pnpm install
cp .env.example .env        # ou por app: apps/game/.env.example etc.
pnpm dev:all                # banco + api + game + web + admin
pnpm --filter @ddt/client dev   # cliente PixiJS em http://localhost:5180
```

Site em `http://localhost:5173`, admin em `http://localhost:5174`. O código do jogo
(`apps/client/src/game`) e a arte (`apps/client/public/assets`) são gerados localmente pelos
conversores e não vão pro git — passo a passo em [`docs/client-pixi/COMO-RODAR.md`](./docs/client-pixi/COMO-RODAR.md). Detalhes por app em
`apps/*/README.md` e índice geral em [`docs/README.md`](./docs/README.md).

```bash
pnpm typecheck   # checagem TS do monorepo
pnpm test        # vitest
pnpm client:art  # recompila a arte PT-BR/HD do cliente (overlay em apps/api/assets/flash)
```

## 🗺️ Roadmap

1. ✅ **Stack nova** — servidor 100% TS, API byte-compatível, Postgres, site + admin, remaster HD PT-BR
2. 🚧 **Cliente PixiJS (atual)** — cliente 4.1 em TS/WebGL, 60fps, navegador + celular, mesmo protocolo
3. **Vários canais** — Canal 1, 2, 3… editáveis no admin, um container por canal
4. **Site/admin premium** — visual "Reborn"
5. ⏸️ **Migração 6600** — versão mais nova, mesmo backend TS (em espera)

Ver [`docs/ROADMAP.md`](./docs/ROADMAP.md), [`docs/BACKLOG.md`](./docs/BACKLOG.md) e [`docs/BRANCH-FLOW.md`](./docs/BRANCH-FLOW.md).

## 🤝 Contribuir

Fluxo: `feature/*` → PR pra `develop` → checks + review → `develop` (servidor de teste) →
PR pra `main` (= produção). Leia o **[CONTRIBUTING.md](./CONTRIBUTING.md)** antes do primeiro PR.
Ao espelhar comportamento do servidor original, cite o arquivo C# (`vendor/...:linha`).

Ajuda bem-vinda em tudo: balanceamento, bugs, tradução, arte, novas funcionalidades, docs.

## ☕ Apoiar

O projeto é mantido sem fins lucrativos. Se quiser ajudar a manter o desenvolvimento e o
servidor oficial (sem pay-to-win):

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-apoiar-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/3vdopcs)

**[buymeacoffee.com/3vdopcs](https://buymeacoffee.com/3vdopcs)** — doação é sempre opcional, voluntária
e **não dá vantagem nenhuma no jogo**.

Pra quem sobe o próprio servidor: o site já vem com página de doação via Pix e página de transparência
(custo do servidor × doações do mês), configuráveis no admin. Detalhes de como funciona (provedores Pix, segurança): [docs/features/doacao-pix.md](./docs/features/doacao-pix.md).

## 👤 Mantenedor

[@thurdev](https://github.com/thurdev)

## 🙏 Créditos

Este projeto só existe por causa do trabalho da comunidade DDTank:

- **[pnkl1999/DDTank41](https://github.com/pnkl1999/DDTank41)** — servidor C# base, banco e cliente compilado
  (+ fork `AloneInAbyss`, branch `remake/main`, com correções e guias).
- **[SkelletonX/DDTank4.1](https://github.com/SkelletonX/DDTank4.1)** — source do servidor/cliente usada como
  referência (scripts PvE de missões/NPCs), tradução PT-BR do cliente e arte traduzida (MIT).
- **[yutikeyux/ddt-34-csharp](https://github.com/yutikeyux/ddt-34-csharp)** — scripts PvE que faltavam (MIT).
- **[dk-khoado/Gunny-3.0](https://github.com/dk-khoado/Gunny-3.0)** — 3 scripts PvE de missão.
- **[barrydevp/ddt3.4server](https://github.com/barrydevp/ddt3.4server)** e **[barrydevp/ddt3.8](https://github.com/barrydevp/ddt3.8)** —
  telas da Forja (espírito do equipamento, aprimorar, refinar conjunto).
- **[tohru48/DDT-6600](https://github.com/tohru48/DDT-6600)** — referência da versão mais nova.
- **[Ruffle](https://ruffle.rs)** — emulador Flash que roda o cliente no navegador.

Arte do projeto: o remaster HD, as imagens traduzidas, o logo e os fundos do site foram feitos pelo
mantenedor com IA (**Higgsfield** e **Recraft**) a partir da arte original.

100% open source ([LICENSE](./LICENSE)): use, modifique e suba seu próprio servidor. Se usar a arte ou
as traduções do projeto, um crédito ao DDTank Reborn é bem-vindo.

Licenças e avisos de terceiros: [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
DDTank, seu nome, cliente e arte originais pertencem aos respectivos donos — este é um projeto
de fã, sem afiliação e sem fins lucrativos.
