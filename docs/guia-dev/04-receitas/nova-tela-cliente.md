# Nova tela/janela/botão no cliente

**Como verificado**: lido/confirmado contra código real (`HonorUpIcon.ts`/
`TotemRightView.ts` como exemplo de ícone do hall que abre janela, `ComponentFactory.ts`/
`ComponentModel.ts` pro mecanismo de estilo XML, `LayerManager.ts` pra camadas). Não aberto
num cliente real nesta tarefa.

## Duas formas de montar uma tela — escolha pela situação

### Forma A — direto em código (mais simples, recomendada pra tela 100% nova)

Você NÃO precisa passar pelo sistema de "estilo XML" (`ComponentFactory
.creatComponentByStylename`) pra criar algo novo — é só instanciar sua classe TS
normalmente, igual qualquer objeto:

```ts
// MeuModal.ts — classe nova, sem equivalente AS3 (ou com, se você está migrando algo)
import { Sprite } from "@ddt/flash/display/Sprite";
import { ComponentFactory } from "../com/pickgliss/ui/ComponentFactory";
// ... importe os controles que precisar (BaseButton, FilterFrameText, etc.)

export class MeuModal extends Sprite {
  constructor() {
    super();
    const bg = ComponentFactory.Instance.creatBitmap("algum.linkage.existente");
    this.addChild(bg);
    // posicione/adicione filhos normalmente
  }
}
```

Pra abrir: use `LayerManager` (mesma camada que toda janela usa) — exemplo real
(`apps/client/src/game/totem/view/HonorUpIcon.ts:52-54`, um ícone do hall abrindo uma
janela):

```ts
import { LayerManager } from "../com/pickgliss/ui/LayerManager";

const modal = new MeuModal();
LayerManager.Instance.addToLayer(modal, LayerManager.GAME_DYNAMIC_LAYER, true, LayerManager.BLCAK_BLOCKGOUND);
```

(`true` = mostra fundo escurecido; `LayerManager.BLCAK_BLOCKGOUND` é o estilo desse fundo —
confira as constantes disponíveis em `LayerManager.ts`).

### Forma B — pelo sistema de "estilo" (XML), pra ficar igual ao resto do jogo

A maioria das telas do jogo usa `ComponentFactory.Instance.creatComponentByStylename("nome.do.estilo")`
em vez de `new MinhaClasse()` direto — a vantagem é que posição/tamanho/skin ficam
configuráveis via XML (servido pela API em `/flash/ui/vietnam/xml/`) sem recompilar. Pra
registrar um estilo novo, adicione uma entrada `<Component name="..." classname="..." .../>`
no arquivo XML do "set" certo (`ComponentModel.addComponentSet`, carregado por nome de
set — confira qual arquivo em `apps/api/assets/flash/ui/vietnam/xml/`). Mais trabalho que a
Forma A; só vale a pena se a tela precisa ser reposicionável sem rebuild.

## Abrir a partir de um botão do hall

Ache o container de ícones do hall (ex. `TotemRightView.ts` segura `_honorUpIcon`), crie seu
próprio ícone (Sprite com um `BaseButton`/`SimpleBitmapButton`, igual `HonorUpIcon.ts`):

```ts
export class MeuIcone extends Sprite {
  constructor() {
    super();
    const btn = ComponentFactory.Instance.creatComponentByStylename("meuIcone.btn"); // ou crie o botão em código
    btn.addEventListener(MouseEvent.CLICK, () => {
      const modal = new MeuModal();
      LayerManager.Instance.addToLayer(modal, LayerManager.GAME_DYNAMIC_LAYER, true, LayerManager.BLCAK_BLOCKGOUND);
    });
    this.addChild(btn);
  }
}
```

Depois adicione `this._meuIcone = new MeuIcone(); this.addChild(this._meuIcone);` na view
do hall que já lista os outros ícones (posição/arte é problema separado — veja
[adicionar-icone-imagem-nova.md](./adicionar-icone-imagem-nova.md) pro ícone em si).

## Enquanto o transpilador ainda roda (antes do congelamento)

`apps/client/src/game` é **regenerado** a partir do AS3 original
(`npx tsx tools/as3-to-ts/src/main.ts`) — editar um arquivo gerado se perde na próxima
rodada. Se a tela nova é um arquivo **novo** (`MeuModal.ts`, sem `.as` correspondente), não
tem problema: o transpilador nunca toca em arquivos que não gerou. Editando um arquivo
EXISTENTE (ex. adicionando a chamada em `TotemRightView.ts`), salve a mudança como patch:

```
tools/as3-to-ts/patches/totem/view/TotemRightView.ts.json
[{ "why": "adiciona MeuIcone ao hall", "find": "trecho exato existente", "replace": "trecho novo" }]
```

Depois do congelamento (`node tools/as3-to-ts/freeze.mjs`, ver
[`docs/client-pixi/TRANSPILADOR.md`](../../client-pixi/TRANSPILADOR.md)), `src/game` vira
código-fonte normal — edite direto, sem patch.

## Como testar

`apps/client/scripts/smoke.mjs` com `SMOKE_CLICKS` pra navegar até o botão novo e
`SMOKE_EVAL`/`ddtDebug.find("meuIcone")` pra confirmar que existe na árvore —
ver [`docs/client-pixi/COMO-RODAR.md`](../../client-pixi/COMO-RODAR.md). Manual:
`?debug=true`, clique no ícone, confirme no log que o clique bate na sua classe.
