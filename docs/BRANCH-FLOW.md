# Branch flow + deploy + backup (roadmap ativo)

## Fluxo (sem worktree, branch normal)
1. `git checkout develop && git pull && git checkout -b feature/<tema>`
2. Codifica + testa local (`pnpm typecheck`, `pnpm test`, Playwright da feature).
3. Push branch → abre PR pra `develop` (template checa CONTRIBUTING).
4. Checks: build+test verdes → review IA → review humano → squash merge.
5. `develop` sobe no servidor de TESTE. Joga de verdade, marca matriz QA.
6. PR `develop` → `main`. Merge = carimbo "vai pra produção".
7. Deploy produção (roadmap): hoje manual; meta é automático no merge em `main`
   (watchtower/docker pull ou action SSH). Até lá: `main` travada, deploy com tag.

## Proteção de branch (configurar no GitHub)
- `main`: require PR, require checks, require 1 review, sem push direto.
- `develop`: require PR + checks.
- Sem force-push em `main`/`develop`.

## Backup (antes de abrir qualquer comunidade/live)
- Banco: dump diário Neon/Postgres (`pg_dump --format=custom`), retenção 30d,
  restore testado 1x/mês. Script: `scripts/backup-db.sh` (criar).
- Assets/packs: versionados em LFS; snapshot semanal do volume de uploads.
- `.env` prod: cofre (não no repo). Restore = banco + env + `main` tag.
- Regra: sem backup testado, sem live pública.

## Review IA do PR (roadmap)
`pr-check.yml` já roda build+test. Falta: job que manda o diff pra um modelo
com o prompt "acha breaking change, cheat/exploit, vazamento segredo, N+1,
migração sem rollback" e posta como comentário (não-approvador).
Liga quando existir `AI_REVIEW_TOKEN`.
