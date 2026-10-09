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

## Histórico de pedidos do dono (ordem, resumido fiel)
1. Skill pros CLIs (opencode/claude/gemini/copilot) pra cortar token: receber→fazer→TLDR,
   sem narrar pensamento, sem avisar batch/wave, sem despejo; só interrompe p/ delete,
   muda MVP/POC ou breaking change cara. Virou skill `direto` + comando `/direto`.
2. Reclamou de resposta longa ("30 mil linhas"): modo direto vale até p/ pesquisa;
   detalhe só com "detalha". Sem abertura com elogio ("boa ideia" proibido).
3. DDTank: achar projeto em Documents/Projects, subir tudo no GitHub privado com LFS
   (até imagens IA), licença que PROÍBA venda, open source no futuro (mundo DDT é
   mercenário), review dele, live pública do código, comunidade melhorando.
   Fluxo exigido: branch (sem worktree) → PR → modelo checa PR → merge main →
   main = produção; branch develop p/ testar antes; backup bem pensado; migrar
   resto C#→TS com Playwright botão-a-botão marcando ok/falha.
4. Repo `thurdev/ddtank-reborn`; DDTankWEB/ddtank-calc NÃO têm relação (ignorar).
   Licença final: livre baixar/testar/mod/mods, NUNCA vender, só o dono vende →
   PolyForm Noncommercial 1.0.0 (texto oficial no LICENSE + resumo PT-BR).
5. Antes de abrir: README belo, CODE_OF_CONDUCT, auditoria total de secrets
   (.env/histórico/blobs — só placeholders, limpo), BRANCH-FLOW, proteção
   main/develop (checks obrigatórios, sem force).
6. Abrir + sequência: gap C#→TS (361 itens: 208 ok, 66 partial, 48 missing, 39 stub;
   56 verificados) em MIGRATION-GAP.md + protocolo Playwright por item.
7. Docs p/ outras IAs: regras + detalhe cruzado de cada parte (docs/README índice
   mestre, API, GAME-SERVER, CLIENT, TESTING, READMEs web/admin).
8. Fusão na forja: pedra empilha tudo num slot; quer escolher qtd + divisão
   automática. Solução SERVIDOR (sem SWF): auto-split 1un/slot 1-4 em forge.ts.
   Direto na main por ordem dele. Hot reload: tsx watch (game/api), Vite HMR (web/admin).
9. Docs DIRETO NO CÓDIGO (JSDoc PT-BR + "Como lê esse código (cada variável):"),
   nada de mandar pra .md; nomes realistas; escalar p/ todos os arquivos via subagentes.
10. VSCode: abrir raiz /DDTank; Ctrl+hover quebrou por modo untrusted (+ .vscode/settings
    committado p/ TS do workspace).
11. Loading travou 13/13 "Falha ao carregar playertip!": meu stash removeu
    playertip.swf da outra IA. LIÇÃO gravada acima.
12. "Usa tudo da outra IA": restore total do stash + merge main na feature.
    Login quebrou (tabela InviteFriends faltava no live + 107 travava burst) →
    migrate 0006 no live + guard try/catch no invite.
13. Live rodava código velho (processo sem watch): reiniciei game (11660) e api (59636)
    com código atual via node direto detached. DEV antido Oct 4 ainda existe — limpar depois.
14. Admin tem que espelhar o jogo 1:1 por seção (loja, missões, salas, spa, recompensas,
    eventos, calendário criável no game, tudo editável com imagens). Dar-item com picker
    game-like (nome+atributos+popup, NÃO template id). Bots PvP ligados na tabela.
    COM ÍCONE NO PICKER (obrigatório). UX no tema do site. Paralelo subagent-driven:
    admin UI x backend/SWF.
15. Busca do picker não acha ("Pedra de Fortalecimento" por "forta/pedra"): busca PT
    existe no código novo mas api live estava velha → reiniciei api. Pendente validar.

## Fazendo agora (próxima IA continua daqui)
- [x] Login race: 2º login durante burst tomava kick LoginError (texto igual ao
  LoginNext, confunde). Fix: espera até 5s o burst em vez de chutar (login.ts
  waitLoginFree). Testes burst atualizados (87 icons + 107/5). 30/30 verdes.
- [x] Admin 1:1 (item picker c/ ÍCONE obrigatório, bots na tabela real,
  calendário salva) + backend (bots provider+seed 0007, upcoming, give-item).
  Migrações 0006+0007 aplicadas no live. Falta: teste manual no admin :5174
  (picker mostra ícone? bots lista? calendar salva?) + corrigir Zod
  "expected string, received number" se persistir.
- [ ] PAUSADO: gap `missing` (MIGRATION-GAP.md), matriz Playwright botão-a-botão.
- [ ] PAUSADO: docs JSDoc arquivo-a-arquivo (continuar lista após handlers).
- [ ] Backup live (`scripts/backup-db.sh`) antes de abrir pra jogadores.
