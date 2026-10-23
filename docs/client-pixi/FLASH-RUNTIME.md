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
| `text/` | `TextField` (desenho em canvas, HTML do Flash, `<input>` real pra digitar), `TextFormat` |
| `events/` | `EventDispatcher` (prioridade, captura, bolha), eventos |
| `net/` | `URLLoader` (fetch), `Socket` (WebSocket), `SharedObject` (localStorage), `NetStream` (música) |
| `swf/` | `SwfLibrary` (carrega `library.json` + PNG e cria símbolos), tipos do formato |
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
