# Adicionar um ícone/imagem nova (que não existia)

Diferente de [trocar-icone-imagem.md](./trocar-icone-imagem.md) (substituir algo que já
existe): aqui você está criando uma imagem em um caminho **que o jogo ainda não pede**,
porque vai aparecer num elemento novo (novo botão, novo item, nova tela).

**Como verificar**: lido/confirmado contra o código (mesmos arquivos da receita anterior +
`packages/flash/src/swf/library-types.ts`); não executado ao vivo pelo mesmo motivo
(assets read-only no worktree).

## Caso 1 — ícone de um item novo

É o caso mais comum. Siga [criar-item.md](./criar-item.md) primeiro (cria a linha em
`Shop_Goods` com um `Pic` novo) — o ícone em si usa o MESMO fluxo de
[trocar-icone-imagem.md § Ícone de item](./trocar-icone-imagem.md#ícone-de-item-o-mais-comum):
"Gerar ícone (IA)" ou upload manual. Não tem diferença entre "trocar" e "adicionar" aqui —
o `itemIconRel()` calcula o caminho a partir de `CategoryID`/`Pic`/`NeedSex`, exista ou não
um arquivo lá ainda; se não existir, o admin mostra o placeholder até você gerar/subir um.

## Caso 2 — ícone/imagem nova dentro de uma tela de UI (SWF) existente

Ex.: adicionar um botão novo a uma janela que já existe. Você NÃO pode simplesmente "jogar
um PNG novo" em `apps/client/public/assets` e esperar o jogo usar — o jogo só carrega o que
está descrito no `library.json` daquele SWF exportado (`chars[id]`, `classes`). Duas opções:

- **Reaproveitar um caractere que já existe** noutro SWF/posição: dê um novo
  `ComponentFactory.Instance.creatBitmap("linkage.existente")` na view TS (ver
  [nova-tela-cliente.md](./nova-tela-cliente.md)) — zero arte nova.
- **Arte de verdade nova**: a forma suportada hoje é adicionar a imagem como **bitmap puro**
  via `Bitmap`/`Loader` carregando um PNG solto (não um símbolo do SWF). Salve o PNG em
  `apps/client/public/assets/<seu-caminho-livre>.png` e na view TS:

  ```ts
  import { Loader } from "@ddt/flash/display/Loader";
  import { URLRequest } from "@ddt/flash/net/URLRequest";
  import { Event } from "@ddt/flash/events/Event";

  const loader = new Loader();
  loader.contentLoaderInfo.addEventListener(Event.COMPLETE, () => {
    this.addChild(loader.content!); // loader.content é o Bitmap carregado
  });
  loader.load(new URLRequest("assets/meu-caminho/icone-novo.png"));
  ```

  (`Loader`/`URLRequest` são a mesma API do AS3 original — ver
  `packages/flash/src/display/Loader.ts`; é exatamente assim que o jogo já carrega SWFs e
  imagens soltas, então funciona sem precisar de nada novo no runtime).

- Pra editar DEPOIS do congelamento do transpilador (quando `src/game` for código-fonte
  normal), você também pode registrar o novo caractere direto no `library.json` do SWF de
  destino (`chars[novoId] = {type:"bitmap", r:[x,y,w,h], ...}` + referência em `classes`) e
  usar `ComponentFactory` normalmente — mais trabalho, mas fica igual a um asset "nativo".

## Caso 3 — ícone de recurso novo servido pela API (`/resource/image/...`)

Mesmo endpoint de overlay de
[trocar-icone-imagem.md § Outro recurso](./trocar-icone-imagem.md#outro-recurso-do-jogo-mapa-skin-etc):
`POST /api/admin/assets` com `folder`/nome igual ao caminho que o código vai pedir (ex. o
`Pic` de uma masmorra nova: `resource/image/map/<Pic>/icon.png`, ver
[instancias.md](./instancias.md)). Como o caminho ainda não existe, não tem "original" por
baixo — o upload passa a ser a única fonte, e some se você deletar o overlay.

**Como saber que deu certo**: abra a URL do recurso direto no navegador
(`http://localhost:8080/resource/image/...` ou `/api/admin/item-icons/<id>.png`) — 200 com a
imagem nova, não 404/placeholder.
