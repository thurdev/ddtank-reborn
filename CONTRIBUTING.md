# Contributing — DDTank Reborn (fase privada)

> Fase atual: repo PRIVADO, só convidados. Este arquivo já vale e já prepara
> a fase comunidade.

## 1. Regra de ouro
Nada vai pra `main` direto. Ordem obrigatória:
`feature/*` → PR pra `develop` → checks verdes + review IA + review humano →
merge → `develop` roda no servidor de teste → PR `develop` → `main` →
`main` = produção live. Sem exceção, sem worktree (branch normal).

## 2. Branches
- `main`: produção. Protegida. Só via PR de `develop`.
- `develop`: integração/teste. Só via PR de `feature/*` ou `fix/*`.
- `feature/<tema>`, `fix/<tema>`: trabalho do dia a dia.
- Nunca commita em `main`/`develop` local. Sempre branch + PR.

## 3. PR checklist
- [ ] `pnpm typecheck` + `pnpm test` verdes
- [ ] Cita o arquivo C# espelhado (`vendor/...:linha`) quando porta comportamento
- [ ] Sem segredo no código (usa `.env.example`)
- [ ] Migração de banco em `packages/db` com rollback descrito
- [ ] Teste Playwright da feature na matriz (`docs/qa-matrix.json`) marcado

## 4. Review
1. Check automático (typecheck/test).
2. Review IA (`.github/workflows/pr-check.yml`) — aponta risco, não aprova sozinho.
3. Review humano (thurdev). Merge só após os 3.

## 5. Propriedade das contribuições
Toda contribuição é cedida ao dono do projeto (thurdev), que pode relicenciar
o projeto no futuro (previsto: BSL 1.1 → Apache-2.0). Contribuir = concordar.
Sem venda privada do código por colaborador (ver LICENSE).

## 6. Fase comunidade (dormindo, já preparada)
Quando abrir: `CODE_OF_CONDUCT.md` + `SECURITY.md` entram em vigor,
issues com labels `good-first-issue`, PRs externos seguem o mesmo fluxo
`feature → develop → main`. Servidor live roda sempre o `main`.
