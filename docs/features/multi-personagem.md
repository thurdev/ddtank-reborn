# Múltiplos personagens por conta

## 1. O que é no jogo

Antes desta feature, 1 conta do site (`member."Accounts"`) = exatamente 1 personagem
(`player."Sys_Users_Detail"`), ligados pelo mesmo `UserName`. Agora cada conta pode ter
até `maxCharactersPerAccount` (admin, padrão 3) personagens — como o seletor de
personagem clássico de qualquer MMO: antes de escolher o canal, a página Jogar mostra
um **carrossel old-school** com o modelo real do personagem (avatar com os itens
equipados, aura de reforço, selo VIP, nick e cargo de guilda), gira entre os
personagens e, ao confirmar, abre o jogo com aquele personagem — depois o seletor de
canal de sempre.

Criar um personagem extra só reserva o "slot"; a criação de fato (nick/sexo, tela
"Novato" do cliente) acontece do jeito que **já sempre funcionou** pra conta nova — o
cliente e o servidor de jogo não sabem que "contas com vários personagens" existem.

## 2. Onde fica no código

| Camada | Arquivo | O quê |
|---|---|---|
| Dados | [`packages/db/src/schema/app.ts`](../../packages/db/src/schema/app.ts) `AccountCharacters` | conta → slot → `gameUserName` |
| Dados | [`packages/db/src/characters.ts`](../../packages/db/src/characters.ts) | `deriveGameUserName`, `createNextCharacterSlot` (lock por `pg_advisory_xact_lock`), `ensureFirstSlot` |
| Migração | [`packages/db/drizzle/0029_multi-char-account-characters.sql`](../../packages/db/drizzle/0029_multi-char-account-characters.sql) | `CREATE TABLE` + backfill idempotente do slot 1 de toda conta existente |
| API | [`apps/api/src/routes/auth.ts`](../../apps/api/src/routes/auth.ts) `playConfig` | resolve `slot` → `gameUserName` → ticket (`flashvars.user`) |
| API | mesmo arquivo, `GET/POST /api/me/characters` | lista os slots (com dados de render) / reserva o próximo |
| API | [`apps/api/src/routes/admin.ts`](../../apps/api/src/routes/admin.ts) `serverConfigDefaults` | `maxCharactersPerAccount` (default 3, [1,10]) |
| Web | [`apps/web/src/components/character/CharacterCarousel.tsx`](../../apps/web/src/components/character/CharacterCarousel.tsx) | carrossel (teclado/mouse/touch) |
| Web | [`apps/web/src/components/character/CharacterStage.tsx`](../../apps/web/src/components/character/CharacterStage.tsx) | render PixiJS do personagem focado (ícones de equipamento + aura) |
| Web | [`apps/web/src/pages/Play.tsx`](../../apps/web/src/pages/Play.tsx) | liga o carrossel antes do seletor de canal |
| Admin | [`apps/admin/src/pages/ServerConfig.tsx`](../../apps/admin/src/pages/ServerConfig.tsx) | campo "Máx. de personagens por conta" |
| Game | `apps/game` | **nenhuma mudança** — ver §3 |

## 3. Fluxo passo a passo

1. `member."Accounts".UserName` continua sendo, literalmente, o `UserName` que
   `player."Sys_Users_Detail"` usa pro slot 1 (igual sempre foi). Slot N>1 usa
   `"<nome da conta>~N"` como `gameUserName` — `~` nunca pode aparecer num nome de
   conta válido (`NAME_RE` em `apps/api/src/routes/auth.ts`:
   `^[A-Za-z0-9_.]{3,32}$`), então nunca colide com uma conta real.
2. `GET /api/me/characters` devolve cada slot reservado (`app."AccountCharacters"`)
   com dados pra renderizar: nick/nível/sexo/guilda, `DutyName` (cargo de guilda, o
   "título" mais próximo que o jogo tem hoje), VIP (`typeVIP`/`VIPLevel`), `Nimbus`
   (tier de aura de reforço/douração) e os ícones de cada item equipado, resolvidos
   com a mesma função que o preview de ícone do admin já usa
   (`apps/api/src/lib/item-icon.ts` `itemIconRel`, porte de
   `PathManager.solveGoodsPath`). Um slot reservado mas sem `NickName` ainda
   (`created: false`) é uma criação pendente.
3. O jogador escolhe um personagem no carrossel → `onConfirm(slot)` → a página Jogar
   busca `GET /api/public/config?slot=N` → `playConfig` troca o `gameUserName` daquele
   slot pro `flashvars.user` do ticket (`issueWebKey`) → dali em diante é o **mesmo
   fluxo de sempre**: `Login.ashx` (`consumeWebKey`) → socket `1 LOGIN`
   (`findCharacterByUserName`, `apps/game/src/db/characters.ts`) → se não existir
   `NickName` ainda, o cliente mostra a tela "Novato" → `VisualizeRegister.ashx`
   cria o personagem com aquele `gameUserName`. **Zero código de `apps/game` mudou**
   porque `findCharacterByUserName`/a validação do ticket só olham pra uma string de
   usuário, nunca souberam o que é "conta".
4. "+ Novo personagem" no carrossel → `POST /api/me/characters` → reserva o próximo
   slot (transação com `pg_advisory_xact_lock(accountId)`, então duas abas
   clicando "criar" ao mesmo tempo nunca pegam o mesmo número de slot) → entra direto
   no jogo com aquele slot (mesma tela "Novato").
5. Conta recém-criada (nenhum personagem de fato, só o slot 1 pendente) pula o
   carrossel direto pro seletor de canal — mesmo comportamento de antes desta
   feature.

## 4. Fidelidade do renderer (gap conhecido)

O ideal seria reusar `ShowCharacter`/`RoomCharacter`/`BaseCharacter` (cliente
transpilado, `apps/client/src/game/ddt/view/character/`), mas esse código é saída
gerada do transpilador AS3→TS (gitignored) e só existe na branch em andamento
`feature/pixi-ligar`, ainda não mesclada em `main` — de onde esta feature partiu.
Em vez disso, `CharacterStage` monta os mesmos ícones de equipamento (resolvidos por
`itemIconRel`) em camadas PixiJS, com uma aura simples e um balanço de "idle" leve.
Isto é fiel o bastante pra uma tela de seleção, mas **não é** a animação quadro-a-quadro
real do personagem. Fechar esse gap quando o cliente PixiJS chegar em `main`.

## 5. Quero mudar…

- **Limite de personagens**: admin → Config do servidor → aba "Jogo" → "Máx. de
  personagens por conta" (`maxCharactersPerAccount`, [1,10]). Nunca deve ser vendido
  (ver `AGENTS.md` "No pay-to-win").
- **Separador do `gameUserName`**: `SLOT_SEPARATOR` em `packages/db/src/characters.ts`
  (hoje `"~"`).
- **Cores/tiers da aura no carrossel**: `AURA_TIER_COLOR` em
  `apps/web/src/components/character/CharacterStage.tsx`.

## 6. Testes

- `packages/db/test/account-characters.test.ts` — migração + `deriveGameUserName` +
  `createNextCharacterSlot` (limite, concorrência, índice único).
- `apps/api/test/api.test.ts` — `describe("task multi-char: ...")`: slots, limite,
  ticket por slot, fluxo completo `Login.ashx`/`VisualizeRegister.ashx` com um
  `gameUserName` `~2`, admin alterando o limite ao vivo.
- `apps/game/test/multi-char-login.test.ts` — confirma que `findCharacterByUserName`/
  o handler de `1 LOGIN` não precisam de nenhuma mudança pra um `gameUserName` `~N`.
- `apps/web/src/pages/Play.characters.test.tsx` — carrossel: seleção por teclado,
  "continuar criação", limite atingido esconde o slot "+", criar personagem leva
  direto ao seletor de canal com o ticket certo.
- Status (2026-10-27): **OK** ponta a ponta (criação de slot, ticket, login/registro
  do personagem novo, limite ao vivo pelo admin); fidelidade visual do carrossel é
  **parcial** — ver §4.
