# `packages/flash` — a API do Flash sobre PixiJS

Tudo que o jogo importa de `flash.*` vem de `@ddt/flash/<pacote>/<Classe>`
(ex.: `@ddt/flash/display/Sprite`). Mais o runtime da linguagem
(`@ddt/flash/as3`).

| Pasta/arquivo | Conteúdo |
|---|---|
| `as3.ts` | `$class` (registro de classes), `$init` (campos antes do construtor da mãe), `$m` (método ligado), `$statics` (estáticos preguiçosos), `$is`/`$as`, `int`/`uint`, `$each`/`$keys`, `$sort`/`sortOn`, `$dset`, `hasOwnProperty` do AS3 |
| `xml.ts` | E4X completo (XML/XMLList, `@atributo`, `..descendentes`, filtros) |
| `debug.ts` | modo debug (`?debug=true`) e `ddtDebug` |
| `player.ts` | cria o palco no canvas, loop de frames, mouse, teclado, foco, fullscreen |
| `display/` | `DisplayObject` (matriz/bounds/hit-test próprios), containers, `Sprite`, `MovieClip` (timeline), `Graphics`, `Bitmap`/`BitmapData` (canvas + GPU), `Loader`, `Stage`, `SimpleButton` |
| `text/` | `TextField` (desenho em canvas, HTML do Flash, `<input>` real pra digitar), `TextFormat` (converte "14"/"0xFFF" vindos do XML), `StyleSheet` (CSS do `htmlText`) |
| `external/` | `ExternalInterface`: chama funções JS da página (ou da página pai, se o cliente estiver num iframe do site; senão `postMessage({type:"ddt-external"})`); aceita código `"function(){...}"` como o Flash |
| `events/` | `EventDispatcher` (prioridade, captura, bolha), eventos |
| `net/` | `URLLoader` (fetch), `Socket` (WebSocket), `SharedObject` (localStorage), `NetStream` (música), `FileReference` (salvar print / abrir arquivo pelo navegador) |
| `swf/` | `SwfLibrary` (carrega `library.json` + PNG e cria símbolos; fila de no máx. 24 downloads ao mesmo tempo), tipos do formato |
| `filters/` | filtros do Flash → filtros Pixi (`convert.ts`) |
| `media/` | `Sound`/`SoundChannel` em WebAudio |
| `gen/` | metadados gerados (membros públicos das classes do Flash pro `describeType`) |

## API que falta

Classes pouco usadas nasceram como **esqueleto** gerado do playerglobal
(constantes certas, métodos que avisam `[flash] não implementado: X` no
console). Quando aparecer o aviso:

1. Abra o arquivo (`packages/flash/src/<pacote>/<Classe>.ts`).
2. Troque o `$todo(...)` pela implementação.

Gerar esqueleto de classe nova que o jogo passou a usar:
`npx tsx tools/as3-to-ts/src/gen-flash-skeletons.ts` (não sobrescreve nada).

## Regras que evitam bugs (aprendidas na conversão)

- **Construtor de classe do shim não chama setter/método público** que uma
  subclasse do jogo pode sobrescrever (use campo/método `$interno`). No AS3 o
  construtor nativo não chamava; aqui a subclasse ainda não estaria pronta.
- Campos internos do shim começam com `$` (não colidem com o jogo).
- Números vindos de fora podem ser string (XML): converta com `+x`/`Number()`
  onde o Flash converteria (construtores de `geom`, setters).
- Texturas de `ImageBitmap` são pré-multiplicadas (`premultiplied-alpha`).
- Eventos de "broadcast" (`ENTER_FRAME`, `EXIT_FRAME`, `ACTIVATE`...) vão pra
  todo mundo que escuta, mesmo fora do palco (`broadcastTargets`).
- AS3 deixa gravar campo **antes do `super()`** e o construtor da mãe pode
  chamar método sobrescrito que lê esse campo (`Player._info` → `Living` →
  `reset()`). O transpilador emite `super(...$pre(new.target, {campos}, [args]))`
  e o `$init` da classe raiz grava os campos antes de qualquer construtor.
- Erro dentro de handler de pacote não some mais: `ByteSocket` e
  `QueueManager` mostram no console qual pacote/evento quebrou (no original
  ia calado pro servidor e o jogo "travava").
- `Shape` com preenchimento 100% transparente (técnica comum do Flash pra
  criar área de clique invisível sobre a arte de fundo, ex. ícones do hall)
  vira PNG 100% transparente no exportador; o hit-test por alfa (`alpha-hit.ts`)
  nunca acertaria. Corrigido: imagem 100% transparente faz o hit-test cair pro
  retângulo inteiro da forma em vez do alfa do pixel.
- **Frame scripts da própria classe do símbolo** (`addFrameScript` compilado
  dentro do ABC do SWF de asset — ex. um personagem/monstro cuja timeline tem
  segmentos "stand/walk/attack/die" e cada um termina com `stop()` ou
  `gotoAndPlay("stand")` pra não vazar pro próximo segmento): o exportador
  (`tools/swf-export/src/swf-classes.ts`) decompila esse código via FFDec e
  extrai os padrões simples (`stop/play/gotoAndPlay/gotoAndStop/nextFrame/prevFrame`)
  pra `TimelineT.fs` no `library.json`; `MovieClip.$initSymbol` liga isso em
  `$scripts` chamando os MÉTODOS da instância (`this.stop()`,
  `this.gotoAndPlay(...)`), não a timeline direto — importante porque a
  classe BASE real do símbolo (resolvida por `SwfLibrary.$makeClass` via
  `$tryCls(base)`, ex. `road.game.resource.ActionMovie`) pode sobrescrever
  esses métodos com uma máquina de estados própria, e despachar pelo método
  deixa esse override valer, igual ao AS3 original. Sem isso, qualquer
  MovieClip de asset com múltiplos segmentos na timeline nunca para sozinho:
  `$advance()` sempre avança e dá a volta no fim, varrendo TODOS os
  segmentos em sequência pra sempre (ex.: monstro "parado" cicla
  stand→walk→attack→die→stand sem parar, corpo continua animando depois de
  morrer). Bug "best-effort": statement do frame script que não é um desses
  padrões simples é ignorado e vira aviso no `EXPORT-REPORT.txt` em vez de
  quebrar o resto do frame script.
