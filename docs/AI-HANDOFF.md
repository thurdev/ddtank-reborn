# AI-HANDOFF — memória viva do projeto (LEIA PRIMEIRO, TODA IA)

> REGRA DE MEMÓRIA: ao ler este arquivo, ATUALIZE-O no mesmo PR/commit:
> move o que concluiu pra "Feito (histórico)", apaga o obsoleto, acrescenta
> regra nova que aprendeu. Arquivo limpo = respeito com a próxima IA.

## Onde estamos (2026-10-09)
- Repo público: `thurdev/ddtank-reborn`. Branches: `main` (= live), `develop`,
  `feature/qa-amigos-missing` (invite 107/40/223 + trabalho outra IA + merge main).
- Live roda DESTA pasta: `scripts/dev.mjs` (PID 52392, Oct 4, defasado) + 2ª stack
  manual de hoje (game 33904→reiniciado 11660, api 61836, web :5173, admin :5174).
  Game reiniciado com código atual via `node tsx watch` detached — se cair,
  subir igual (DATABASE_URL postgres local + TZ UTC).
- Banco live: migrado até 0006 (`app.InviteFriends`). Migra com
  `pnpm --filter @ddt/db db:migrate` (DATABASE_URL do live).
- Licença: PolyForm Noncommercial (venda só @thurdev). Docs índice: `docs/README.md`.

## Feito (histórico)
- Fusion auto-split servidor (`forge.ts`, teste `fusion-autosplit.test.ts`): pilha
  num slot só espalha 1/slot 1-4. Sem SWF.
- JSDoc PT-BR + "Como lê esse código" em forge (fusão), items, rooms (resto forge
  via subagente). items.ts quebrou 1x via subagente (revertido e refeito à mão).
- `.vscode/settings.json`: força TS do workspace (Ctrl+hover).
- Loading 13/13 quebrou 1x porque `git stash` removeu `playertip.swf` (criado pela
  outra IA, fora do git). LIÇÃO: assets fora do git quebram o live no stash/checkout.
- Outra IA: pack UI PT-BR (swfs + language.txt), skelleton tools, packet-coverage.
  Tudo restaurado do stash e mergeado na feature.

## Regras que valem (resumo — detalhe em CONTRIBUTING.md + AGENTS.md)
1. Comportamento espelha o C# (`vendor/…:linha` no código/PR). Cliente Flash é fixo.
2. Docs no código (JSDoc PT-BR + glossário de variável), zero mudança de lógica
   em PR de docs. `pnpm --filter <pkg> typecheck` + teste antes de subir.
3. Fluxo `feature → PR → develop → main`. Push direto na main SÓ com ordem
   explícita do dono nesta sessão (live testa na hora).
4. Segredo nunca no código. LFS pra binário. Sem `git worktree`.
5. Subagentes: 1-2 arquivos cada, sem shell neles — verificação é com a IA principal.

## Fazendo agora (próxima IA continua daqui)
- [ ] Admin 1:1 com o jogo (item picker game-like no dar-item, bots ligado na
  tabela, calendário/eventos editáveis, spa/salas/recompensas) — Builder A.
  REQUISITO DONO: picker de item tem que mostrar ÍCONE junto (nome+attr só não basta).
  BUG VISTO: "Invalid input: expected string, received number" no teste rápido
  do picker (provável Zod do SchemaForm recebendo number) — corrigir na rodada de verificação.
- [ ] Backend: bots PvP↔`app.Bots` (seed? flag enabled? fallback), calendar/
  ScheduledEvents game-side, robustez give-item — Builder B.
- [ ] PAUSADO: gap `missing` (MIGRATION-GAP.md), matriz Playwright botão-a-botão.
- [ ] PAUSADO: docs JSDoc arquivo-a-arquivo (continuar lista após handlers).
- [ ] Backup live (`scripts/backup-db.sh`) antes de abrir pra jogadores.
