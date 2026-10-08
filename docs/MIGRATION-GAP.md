# Gap C# → TS + protocolo de verificação (fonte: `docs/qa-matrix.json`)

Panorama 2026-10-08 — 361 itens: servidor `ok` 208 · `partial` 66 · `missing` 48 · `stub` 39.
Verificado em jogo: `yes` 56 · resto `no`. **Nada conta como pronto sem `verified:yes` + evidência.**

## Mapa origem C# → destino TS

| Subsistema C# (`vendor/DDTank41`) | Destino TS | Situação |
|---|---|---|
| `Tank.Request` (.ashx: login, serverlist, nickname…) | `apps/api/src/request/endpoints/` (9 arquivos) | Base ok, faltam endpoints menores |
| `Game.Server` + `Center.Server` (handlers de pacote) | `apps/game/src/handlers/` (20 arquivos) | Maioria ok; ver tabela por área |
| `Game.Logic` (Player, Bag, Quest, Pet, Fight…) | `apps/game/src/game/` (14 arquivos) | Núcleo ok |
| `Game.Logic` PvE/AI + `DDTank4.1` scripts missão/NPC | `packages/fight` (646 arquivos) | Maior parte gerada; validar em jogo |
| `SqlDataProvider` + `.bak` | `packages/db` (Drizzle, 15 arquivos) | Schema/migrações em andamento |
| Protocolo binário/crypto | `packages/protocol` (16 arquivos) | Ok (cliente conecta) |
| `GameAdmin` | `apps/admin` | Parcial (joins/filtros pendentes — ver ROADMAP) |
| `Road.Service` / ranking e serviços auxiliares | — | **Gap: mapear quais endpoints faltam** |
| `Center.Server` cross-server (GvG inter-server) | — | **Gap: checar se entra no escopo Fase 1** |

## Por área (matriz QA) — ordem de ataque

1. **`missing` (48)** primeiro: `Amigos/sendSnsMsg` e cia. Cada um vira `feature/` + PR.
2. **`stub` (39)**: implementa de verdade ou marca `wontfix` com motivo no `notes`.
3. **`partial` (66)**: completa e testa.
4. **`ok` + `verified:no` (maioria)**: só Playwright, sem código novo.

Áreas com mais dívida: Combate (39), Eventos/Atividades (37), Guilda (28), Bolsa (27),
Casamento (24), Missões (23), Salas PvP (21).

## Protocolo Playwright (vale pra cada item)

1. Branch `feature/qa-<area>` a partir de `develop`. Servidor local + cliente harness.
2. Pra cada item: executa a ação no cliente de verdade (cada botão, cada feature),
   confere efeito no servidor (DB/pacote), tira evidência (screenshot ou log).
3. Marca no `qa-matrix.json`: `verified:"yes"`, `notes` curto, `evidence` path.
   Se falhar: `verified:"no"`, `notes` com sintoma + abre issue linkada.
4. PR pra `develop` com a matriz atualizada. Review roda o mesmo teste no servidor de teste.
5. `verified:yes` em `develop` + jogatina real = pode ir pra `main`.

## Backup (pré-requisito da live, não da abertura do repo)

- `scripts/backup-db.sh` (criar): `pg_dump --format=custom` diário, retenção 30d, restore 1x/mês.
- `.env` prod só em cofre. Restore = dump + env + tag `main`.
- Sem backup testado, sem live pública.
