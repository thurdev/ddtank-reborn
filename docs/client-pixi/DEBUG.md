# Modo debug

Abra o jogo com **`?debug=true`** na URL. Tudo aparece no console do
navegador (F12 → Console) ou do launcher.

## O que é logado

| Categoria | Exemplo |
|---|---|
| `click` | `"okBtn" → com.pickgliss.ui.controls.BaseButton` + **arquivo TS**, **AS3 original**, **arte (SWF/símbolo/PNG)**, caminho na tela, posição |
| `packet` | `↑ enviado 1 (0x0001) LOGIN — 156 bytes` / `↓ recebido 64 (0x0040) GRID_GOODS — 801 bytes` (clique no grupo pra ver o pacote) |
| `load` | cada "SWF" (biblioteca exportada), URL carregada |
| `http` | cada requisição (`GET .../templatealllist.xml → 200 (239107 bytes, 6ms)`) |
| `ui` | foco em campo de texto etc. |
| `error` | qualquer erro dentro de evento/timer/pacote — com o pacote ou evento que causou |

Avisos `[flash] não implementado: X` (sempre ligados) mostram API do Flash
que o jogo usou e ainda não existe no `packages/flash` — é a lista de coisas
pra implementar (ver [FLASH-RUNTIME.md](FLASH-RUNTIME.md)).

## Ferramentas no console (`ddtDebug`)

```js
ddtDebug.under()           // o que está debaixo do mouse: classe, arquivos, arte, caminho
ddtDebug.find("okBtn")     // objetos com esse nome
ddtDebug.source(obj)       // arquivos de código/arte de um objeto
ddtDebug.outline(true)     // desenha a caixa do objeto sob o mouse
ddtDebug.only("click", "packet")  // filtra categorias
ddtDebug.all()             // todas
ddtDebug.stage             // o palco (navegue com getChildAt / numChildren)
```

## Achar e consertar um bug — roteiro

1. Reproduza com `?debug=true`.
2. Botão não faz nada? O log do clique diz o arquivo TS do botão; o
   `addEventListener(MouseEvent.CLICK, ...)` dele leva ao handler.
3. Erro no console: a pilha aponta `src/game/...ts:linha` (source maps ligados).
4. Pacote não tratado / dado errado: grupo `↓ recebido` mostra o pacote;
   `ddt/manager/SocketManager.ts` distribui por código.
5. Corrigiu no TS gerado? Enquanto não congelar, salve como patch
   ([TRANSPILADOR.md](TRANSPILADOR.md#patches)).

## Teste automático

`apps/client/scripts/smoke.mjs` (ver [COMO-RODAR.md](COMO-RODAR.md)) roda o jogo
sem janela e lista erros; com página travada mostra a pilha do loop.
