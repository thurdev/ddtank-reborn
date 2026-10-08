<div align="center">

# 🎯 DDTank Reborn

**O clássico DDTank 4.1, reescrito numa stack moderna. Cliente Flash original + servidor 100% TypeScript.**

[![PR Check](https://github.com/thurdev/ddtank-reborn/actions/workflows/pr-check.yml/badge.svg)](https://github.com/thurdev/ddtank-reborn/actions/workflows/pr-check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](./tsconfig.base.json)
[![Node 24 + pnpm 11](https://img.shields.io/badge/Node-24%20%7C%20pnpm-11-green?logo=node.js)](./package.json)

[Começar](#-começar) • [Stack](#-stack) • [Estrutura](#-estrutura) • [Contribuir](./CONTRIBUTING.md) • [Licença](#-licença)

</div>

---

## O que é

Port completo do servidor privado **DDTank 4.1** (originalmente C#/.NET + SQL Server + ASP.NET `.ashx`)
para **Node 24 + TypeScript + Postgres**. O cliente Flash AS3 original continua funcionando
(via Ruffle no navegador + launcher desktop) — o protocolo binário é mantido byte-a-byte,
então o jogo é o mesmo, o motor por trás é novo.

**Status atual:** jogável em lobby, salas PvP, PvE com bots, loja, itens, missões e admin.
A migração C# → TS continua em andamento — issues marcadas `good-first-issue` são o melhor
ponto de entrada. O servidor live roda sempre o branch `main`.

## ✨ Features

- ⚔️ **PvP / PvE / GvG** — salas, batalhas por turno, física e dano compartilhados cliente↔servidor
- 🤖 **Bots** — oponentes IA com nomes editáveis, PvE com scripts de missão/NPC
- 🏰 **Guilda, casamento, fazenda, forja, pets, leilão, águas termais** — handlers portados 1:1 do C#
- 🌐 **API byte-compatível** — mesmos endpoints `.ashx`/XML/zlib do servidor original
- 🛠️ **Admin panel** — gerencia itens, mapas, NPCs, missões, textos PT-BR e overlay de assets
- 🇧🇷 **Localização PT-BR** — cliente, servidor e banco traduzidos, editáveis no admin
- 🎨 **Remaster de arte** — pipeline IA (image-to-image sobre o original) + overlay sem tocar nos SWFs

## 🧱 Stack

| Camada | Tech |
|---|---|
| Servidor jogo | `apps/game` — Node 24 + TS (substitui Center + Game/Road + Fighting) |
| API HTTP | `apps/api` — Fastify (substitui `Tank.Request` .ashx) |
| Banco | `packages/db` — Drizzle ORM + Postgres (Neon prod / PGlite dev) |
| Protocolo | `packages/protocol` — codec binário, crypto, framing TCP + WebSocket |
| Física/combate | `packages/fight` — compartilhado servidor ↔ cliente futuro |
| Site / Admin | `apps/web`, `apps/admin` — React + Vite |
| Cliente atual | SWF original via Ruffle; futuro cliente PixiJS v8 (ver `docs/ROADMAP.md`) |

## 🚀 Começar

```bash
# requisitos: Node 24 + pnpm 11
pnpm install
cp .env.example .env        # ou por app: apps/game/.env.example etc.
pnpm dev                    # sobe tudo (game + api + web + admin)
```

Detalhes por app em `apps/*/README.md` (quando existir) e visão geral em [`docs/`](./docs).

```bash
pnpm typecheck   # checagem TS do monorepo
pnpm test        # vitest
```

## 🗺️ Roadmap

1. **Fase 1 (atual)** — Flash original + stack nova, jogo 100% funcional
2. **PT-BR total** — textos + imagens com texto refeitas via IA
3. **Cliente PixiJS** — 60fps, navegador + celular, mesmo protocolo (servidor não muda)
4. **Site/admin premium + visual "Reborn"** — depois do jogo 100%

Ver [`docs/ROADMAP.md`](./docs/ROADMAP.md), [`docs/BACKLOG.md`](./docs/BACKLOG.md) e [`docs/BRANCH-FLOW.md`](./docs/BRANCH-FLOW.md).

## 🤝 Contribuir

Fluxo obrigatório: `feature/*` → PR pra `develop` → checks + review IA + review humano →
`develop` (servidor de teste) → PR pra `main` (= produção live). Sem push direto, sem worktree.

Leia o **[CONTRIBUTING.md](./CONTRIBUTING.md)** antes do primeiro PR. Ao espelhar comportamento
do servidor original, cite o arquivo C# (`vendor/...:linha`).

## 📜 Licença

**[MIT](./LICENSE)** — livre pra usar, estudar, modificar, hospedar e distribuir, igual ao
projeto da comunidade em que nos apoiamos (SkelletonX/DDTank4.1). Créditos de terceiros em
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## 🙏 Créditos

Base C#: `pnkl1999/DDTank41` (+ fork `AloneInAbyss` branch `remake/main`).
Tradução PT-BR e arte traduzida do cliente: [SkelletonX/DDTank4.1](https://github.com/SkelletonX/DDTank4.1) (MIT).
Arte e cliente originais pertencem aos seus respectivos donos — este projeto é um
trabalho de fã, sem afiliação, e não vende nada derivado deles.
