# Animações — como funcionam e como editar/criar

Nenhum SWF roda em tempo de execução. Cada timeline de SWF foi convertida pra dados
(`library.json`) + `MovieClip` (`packages/flash/src/display/MovieClip.ts`) interpreta esses
dados do mesmo jeito que o Flash Player interpretava a timeline original.

**Como verificado**: lido/confirmado contra `packages/flash/src/swf/library-types.ts`,
`MovieClip.ts` (API real, citada com número de linha abaixo) e o cabeçalho de
`docs/client-pixi/FLASH-RUNTIME.md` (regra dos frame scripts). Não renderizado num cliente
real nesta tarefa — é leitura de código, não execução.

## O formato (`library.json`)

Cada "SWF" exportado é uma pasta com `library.json` (tipos em `packages/flash/src/swf/
library-types.ts`):

- `chars[id]`: um caractere — `shape`/`bitmap`/`text` (imagem + retângulo `r`), `sprite`
  (**a timeline**), `button` (estados up/over/down/hit), `font`, `sound`.
- `classes`: nome de linkage (ex. `asset.hall.okBtn`) → `{ char, base }` (qual caractere e
  qual classe TS/Flash serve de base — `MovieClip`, `BitmapData`, `SimpleButton`...).
- `sprite.tl` (timeline): `f[frame] = [{ d, id, m, ct, nm, fl, bl, cl }]` — por profundidade
  `d`: qual caractere `id` aparece, com matriz `m` (posição/escala/rotação), cor `ct`, nome
  `nm`, filtros `fl`, blend `bl`, máscara `cl`.
- `sprite.tl.fs` (frame scripts): código do SWF original (`stop`/`play`/`gotoAndPlay(label)`/
  `gotoAndStop`/`nextFrame`/`prevFrame`) extraído pelo exportador — ver §"Frame scripts"
  abaixo.

## API de controle (igual AS3, `MovieClip.ts`)

| Método/getter | Linha | Faz o mesmo que no Flash |
|---|---|---|
| `mc.play()` | `:171` | Toca a partir do frame atual. |
| `mc.stop()` | `:172` | Para no frame atual. |
| `mc.gotoAndPlay(frame\|label)` | `:183` | Vai pro frame/label e toca. |
| `mc.gotoAndStop(frame\|label)` | `:178` | Vai pro frame/label e para. |
| `mc.nextFrame()` / `.prevFrame()` | `:173-174` | Avança/volta 1 frame e para. |
| `mc.currentFrame` / `.totalFrames` | `:139-140` | Posição atual / total de frames. |

Chame esses métodos normalmente nas suas views TS, igual qualquer `MovieClip` do AS3
original — não tem API nova pra aprender.

## Frame scripts (o `stop()`/`gotoAndPlay()` DENTRO do próprio símbolo)

Muitos personagens/monstros/efeitos têm uma timeline com segmentos nomeados
("stand"/"walk"/"attack"/"die") e cada segmento termina com um `stop()` ou
`gotoAndPlay("stand")` **escrito no próprio SWF** (não na view que usa o símbolo) — é assim
que o Flash original evitava vazar de "attack" direto pra "die" sem comando externo.

O exportador (`tools/swf-export/src/swf-classes.ts`) decompila esse código (via FFDec) e
guarda os padrões simples em `sprite.tl.fs`; `MovieClip.$initSymbol` liga isso chamando os
**métodos da instância** (`this.stop()`, `this.gotoAndPlay(...)`), nunca a timeline direto —
importante porque a classe BASE do símbolo pode sobrescrever esses métodos com uma máquina
de estados própria (ex. `road.game.resource.ActionMovie`), e despachar pelo método deixa
esse override valer, igual o AS3 original (`FLASH-RUNTIME.md` linha ~58-77).

**Consequência prática**: se você editar um símbolo com segmentos (frame-by-frame) e
adicionar/remover frames no MEIO de um segmento, o frame script daquele segmento (que
referencia o número de frame absoluto onde `stop()` acontece) pode ficar incoerente —
reexporte (veja abaixo) em vez de só editar PNGs quando mudar a ESTRUTURA da timeline
(quantidade/ordem de frames), não só a arte de cada frame.

## Como editar uma animação existente, frame a frame

1. Ache a pasta (`?debug=true`, clique no elemento animado — mesmo processo de
   [trocar-icone-imagem.md](./trocar-icone-imagem.md)).
2. Abra o `library.json` daquela pasta e ache o `sprite` (pelo `id` usado na classe que
   você quer mudar).
3. Cada entrada de `f[frame]` é uma lista de instâncias nessa posição de profundidade —
   editar a matriz `m` move/escala/rotaciona o caractere NESSE frame específico; trocar o
   `id` troca qual imagem aparece nesse frame.
4. Trocar só a IMAGEM de um frame (sem mudar estrutura): edite o PNG do caractere
   referenciado (mesmo fluxo de trocar-icone-imagem.md) — nenhuma mudança no `library.json`
   necessária.
5. Recarregue a página — o Vite serve os arquivos estáticos direto, sem build.

## Como adicionar uma animação/efeito NOVO (ex. nova animação de arma)

A forma recomendada é partir de um SWF de origem de verdade (desenhado em alguma
ferramenta que exporte SWF, ou um FLA editado), e **reexportar** em vez de escrever
`library.json` à mão:

```bash
cd tools/swf-export && npm install
npx tsx src/main.ts --only resource/image/bomb/bullet/bullet999 --force   # exporta só este
```

Sem ferramenta de SWF disponível: você pode compor uma timeline nova com caracteres que já
existem (reusar formas/bitmaps de outros SWFs via `id` + `classes`) editando o
`library.json` à mão — funciona, mas é trabalho manual por frame; prefira isso só pra
timelines curtas (2-4 frames).

## Como criar uma animação nova inteiramente em código (sem SWF)

Pra efeitos simples (um flash de cor, um "pulso"), não precisa de timeline exportada — use
`Graphics`/`Tween` como qualquer código AS3 original faria, desenhando com
`Shape`/`Sprite.graphics` dentro da sua própria classe TS. Isso é só código normal do jogo,
sem passar por `library.json`.

## Como "pré-visualizar" sem jogar até lá

Use o teste automático do cliente pra navegar direto até a tela/batalha que usa a
animação (`apps/client/scripts/smoke.mjs`, roteiro `SMOKE_CLICKS`, ver
[`docs/client-pixi/COMO-RODAR.md`](../../client-pixi/COMO-RODAR.md)) e tire print no momento
certo (`shot:arquivo.png` no roteiro) — mais rápido que repetir manualmente toda vez que
você edita um frame.
