# Como achar qualquer coisa no código (5 passos)

Receita genérica. Use quando vir algo no jogo (um botão, uma janela, um efeito) e não
souber onde isso mora no código. Todas as outras receitas deste guia são casos especiais
dela.

**Como testar esta receita**: segui os 5 passos abaixo pra achar, de ponta a ponta, o botão
"Comprar" da loja (do clique até o handler até a tabela) sem saber de antemão onde ficava —
bateu exatamente com o que [`02-arquitetura.md`](../02-arquitetura.md) documenta como
exemplo. **Como saber que deu certo**: você consegue citar arquivo+linha nos 4 lugares
(view, pacote, handler, tabela) sem grep às cegas.

## Passo 1 — clique com `?debug=true`

Abra `http://localhost:5180/?user=...&key=...&debug=true`, abra o F12 → Console, clique no
elemento. O log do clique mostra:

```
[click] "cellOpen" → bagAndInfo.bag.BagView  (arquivo: src/game/bagAndInfo/bag/BagView.ts)
```

Sem saber nada antes, você já tem o **arquivo TS da tela/botão** e o nome AS3 original da
classe. Se o que você quer achar é uma imagem/ícone, o mesmo log mostra a arte
(`flash/ui/.../shapes/N.png`) — ver
[`trocar-icone-imagem.md`](./trocar-icone-imagem.md).

Sem conseguir clicar (ex. é algo que só acontece no servidor, como um evento agendado),
pule pro passo 3 com o nome do pacote (visto no log geral) ou peça ajuda ao
[glossário](../06-glossario.md) pra achar o termo em inglês/código.

## Passo 2 — da view pro pacote

No arquivo TS da view, ache o `addEventListener(MouseEvent.CLICK, ...)` do botão, siga até o
método que ele chama. Normalmente termina numa chamada
`SocketManager.Instance.out.sendAlgumaCoisa(...)` — isso é um método de
`apps/client/src/game/ddt/manager/GameSocketOut.ts`. Dentro dele, `new
PackageOut(ePackageType.ALGUMA_COISA)` dá o **código do pacote**.

Se a ação é imediata e client-only (não manda pacote — ex. abrir uma tela puramente local),
pare aqui: não tem servidor envolvido.

## Passo 3 — do pacote pro handler

```
[packet] ↑ enviado 44 (0x002C) BUY_GOODS — 37 bytes
```

Com o código em mãos (visto no passo 2 ou no log de pacotes), procure em
`apps/game/HANDLERS.md` (tabela código → nome → status → arquivo) ou grep direto:

```bash
grep -rn "r.player(44" apps/game/src/handlers/
```

Isso leva ao handler (`apps/game/src/handlers/<sistema>/<arquivo>.ts`), que lê o pacote na
mesma ordem que o cliente escreveu e faz a lógica real.

## Passo 4 — do handler pra tabela

Dentro do handler, qualquer `ctx.templates.algumaCoisa` ou `db.select().from(game.Tabela)`
aponta a tabela do Postgres (`packages/db/src/schema/*.ts`). O comentário de cabeçalho do
handler quase sempre já cita a tabela E o arquivo `.cs` original
(`vendor/DDTank41/.../XyzHandler.cs`) — leia-o primeiro, economiza grep.

## Passo 5 — da tabela pro admin (editar sem código)

Se a tabela tem um recurso no painel admin (`apps/admin/src/resources/*.ts`), dá pra editar
direto por lá sem tocar em código. Confira:

```bash
grep -rln '"game\.\"MinhaTabela\"\|table: .*MinhaTabela' apps/admin/src/resources/
```

Sem recurso admin: edite via `drizzle-kit studio` (`pnpm --filter @ddt/db db:studio`) numa
conta/linha de teste, ou crie um `ResourceDef` novo (copie um `apps/admin/src/resources/*.ts`
parecido).

## Atalho mental

```
clique (?debug=true) → arquivo TS da view → GameSocketOut.sendX → código do pacote
     → apps/game/HANDLERS.md → handler .ts → tabela Postgres → recurso admin
```

Qualquer um desses 5 elos pode faltar (ação client-only não tem pacote; tabela sem admin
ainda) — quando faltar, documente no próprio handler/recurso em vez de inventar.
