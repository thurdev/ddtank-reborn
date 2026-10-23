# Contributing — DDTank Reborn

> Repo aberto pra comunidade: qualquer pessoa pode abrir issue e PR. A ideia é a
> comunidade ajudar a balancear, corrigir, traduzir e adicionar funcionalidades.

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
- [ ] Usou código/arte de outro projeto? Crédito em `THIRD_PARTY_NOTICES.md`

## 4. Review
1. Check automático (typecheck/test).
2. Review IA (`.github/workflows/pr-check.yml`) — aponta risco, não aprova sozinho.
3. Review humano (@thurdev). Merge só após os 3.

## 5. Licença e transparência
Projeto sem fins lucrativos, mantido só por doação voluntária (nunca pay-to-win).
A licença definitiva ainda vai ser escolhida pelo mantenedor (@thurdev); até lá vale
o arquivo `LICENSE`. Ao contribuir você concorda que sua contribuição entra sob a
licença do projeto: código em MIT, arte/tradução/texto em CC BY-NC-SA 4.0 (ver `BRAND.md`). Tudo que vem de terceiros fica creditado em `THIRD_PARTY_NOTICES.md`.

## 6. Comunidade
`CODE_OF_CONDUCT.md` + `SECURITY.md` valem pra todo mundo. Issues `good-first-issue`
são o ponto de entrada. PRs externos seguem o mesmo fluxo `feature → develop → main`.
Cada um pode subir o próprio servidor com este código, **com nome e logo próprios** (o nome
"DDTank Reborn", logo e fundos são reservados — ver `BRAND.md`); o servidor oficial roda o `main`.
