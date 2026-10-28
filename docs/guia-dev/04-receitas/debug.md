# Debug — problemas comuns e como diagnosticar

Ferramenta nº 1 pra tudo abaixo: `?debug=true` no cliente (console F12) +
`PACKET_TRACE=true pnpm --filter game dev` no servidor. Detalhe:
[`docs/client-pixi/DEBUG.md`](../../client-pixi/DEBUG.md),
[`01-comecar.md`](../01-comecar.md).

**Como verificado**: lido/confirmado contra `docs/client-pixi/DEBUG.md`,
`docs/client-pixi/BUGS-SERVIDOR.md` (bug real já resolvido, citado como exemplo) e
`apps/api/src/lib/resources.ts`. Não reproduzido um bug novo ao vivo nesta tarefa.

## Tela preta / nada acontece ao clicar

1. F12 → Console com `?debug=true` já aberto. Clique de novo — se o log de `click`
   aparecer, o evento chegou no botão certo (arquivo TS mostrado). Se NÃO aparecer nada,
   o elemento não está recebendo mouse (camada errada, `mouseEnabled=false`, ou está atrás
   de outra coisa — `ddtDebug.under()` com o mouse em cima mostra o que está REALMENTE sob
   o cursor).
2. Clique chegou mas nada visual muda: confira erros vermelhos no console — a pilha aponta
   `src/game/...ts:linha` (source maps ligados). Erro dentro de pacote/evento nunca é
   silencioso no runtime novo (diferente do Flash original, que "travava calado").
3. Nada de erro, nada de pacote saindo: a lógica do botão decidiu não fazer nada (confira
   condição no método — nível insuficiente, bolsa cheia, etc. — normalmente mostra uma
   `MessageTipManager` com um aviso, confira se ela também não está atrás de algo).

## Pacote sai mas a tela não abre / erro "End of file" (`Error #2030`)

**Isto é quase sempre bug de SERVIDOR, não do cliente.** O cliente lê os pacotes
exatamente como o Flash original lia — se o servidor manda os campos em ordem diferente,
faltando um campo, ou com tipo errado, o cliente estoura o fim do pacote. Exemplo real já
corrigido (`docs/client-pixi/BUGS-SERVIDOR.md`): a Fazenda não abria porque
`farmSnapshot` (`apps/game/src/handlers/fazenda/estado.ts`) escrevia os campos em ordem
diferente do que `FarmModelController.__onEnterFarm` lê.

**Como achar**: `?debug=true` mostra o pacote que CHEGOU (nome + bytes) com o erro na
pilha logo depois. Ache o método que lê esse pacote no cliente (`SocketManager.ts` →
`CrazyTankSocketEvent`), confira a ordem EXATA de leitura (`readInt`/`readUTF`/
`readBoolean`/`readDate`...), e compare campo a campo com o `Out.*` que o handler do
servidor manda (`apps/game/src/packets/out.ts`). Se tiver o C# original
(`vendor/DDTank41/Game.Server/Packets/Packets/AbstractPacketLib.cs`), ele é a fonte da
verdade de qual ordem é a certa.

## Masmorra/sala travada (não avança, não termina)

Veja [instancias.md](./instancias.md) §"Diagnosticar" — rode
`pnpm --filter @ddt/fight exec vitest run test/pve-sweep.test.ts` primeiro (confere a
cadeia de missão sem precisar jogar) antes de caçar manualmente. Causa mais comum: um `id`
de `SetupMissions` sem linha em `Mission_Info`.

## Arte faltando (ícone quebrado, retângulo cinza, 404)

- `GET /api/admin/assets/misses` lista os caminhos de recurso que o CLIENTE pediu e não
  achou de verdade (contagem real, não suposição) — `apps/api/src/lib/resources.ts`.
- Pra arte de UI (SWF exportado): confirme que `apps/client/public/assets/...` tem o
  arquivo no caminho EXATO que `?debug=true` mostrou no log de `load`. Reinicie o Vite dev
  server se a arte foi exportada DEPOIS de ele já estar de pé (não vigia `public/assets`).
- Pra ícone de item: `GET /api/admin/item-icons/<id>.png` — 404 significa que nunca foi
  gerado/aceito (ver [trocar-icone-imagem.md](./trocar-icone-imagem.md)).

## Texto em vietnamita/chinês aparecendo

Veja [traducoes.md](./traducoes.md) pra decidir qual dos 3 sistemas (`language.txt`,
overlay de tabela, texto em imagem) é a fonte daquele texto específico.

## `PACKET_TRACE`/`?debug=true` não mostram nada

- Confirme que `apps/game` foi iniciado com a variável (`PACKET_TRACE=true pnpm --filter
  game dev` — se usou `pnpm dev:all`, exporte antes de rodar, ou edite `apps/game/.env`).
- Confirme a URL do cliente tem literalmente `?debug=true` (não `?debug` sozinho).

## "Minha sessão expirou" no login

Quase sempre `DATABASE_URL` não exportado antes de subir `api`/`game` à mão — cada um abre
um PGlite isolado, login funciona mas o socket nunca bate a chave. Ver
[`01-comecar.md`](../01-comecar.md).

## Erro só aparece depois de editar o código do jogo (`src/game`)

Se `src/game` ainda é gerado (antes do congelamento — confira se `src/game/.frozen`
existe), rodar o transpilador de novo PERDE sua edição manual. Salve como patch
(`tools/as3-to-ts/patches/`, ver
[`docs/client-pixi/TRANSPILADOR.md`](../../client-pixi/TRANSPILADOR.md)) ou confirme que
o congelamento já aconteceu antes de editar direto.
