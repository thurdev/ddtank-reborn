# Arquitetura

```
 navegador
 ┌──────────────────────────────────────────────────────────────────┐
 │ apps/client/src/main.ts   (= playgame.aspx + Loading.swf)        │
 │   lê ?user&key, liga o Player, carrega Loading                   │
 │                                                                  │
 │ apps/client/src/game/**   CÓDIGO DO JOGO (ex-AS3, agora TS)      │
 │   Loading → DDT_Loading → NormalLuncher → ddt.DDT.lunch()        │
 │   pickgliss (UI), ddt.* (managers, telas), game.* (batalha)...   │
 │        │ usa a API do Flash                                       │
 │        ▼                                                          │
 │ packages/flash  (@ddt/flash)  "Flash Player" sobre PixiJS        │
 │   display/  Sprite, MovieClip, Bitmap, TextField... → nós Pixi   │
 │   events/   EventDispatcher com captura/bolha                    │
 │   net/      URLLoader (fetch), Socket (WebSocket), SharedObject  │
 │   swf/      SwfLibrary: "SWF" exportado (library.json + PNG)     │
 │   as3.ts    regras da linguagem AS3 (int, is/as, E4X, estáticos)│
 │   player.ts loop de frames, mouse, teclado, foco                 │
 │        │                                                          │
 │        ▼  PixiJS v8 (WebGL)                                       │
 └──────────────────────────────────────────────────────────────────┘
        │ HTTP (config.xml, Request/*.ashx, templates XML)  │ WebSocket (pacotes binários)
        ▼                                                    ▼
   apps/api :8080                                        apps/game :9300/ws
```

## Princípios

1. **O código do jogo é o original.** Nada de reescrever tela por tela: o AS3
   foi convertido mecanicamente (ver [TRANSPILADOR.md](TRANSPILADOR.md)) e
   roda com a mesma lógica. Bug de comportamento = bug no runtime
   (`packages/flash`) ou no conversor, quase nunca no jogo.
2. **A API do Flash é reimplementada, não emulada.** `Sprite`, `MovieClip`,
   `TextField` são classes TS que calculam tudo com as regras do Flash
   (matriz, bounds, hit-test, ordem de eventos) e só usam o Pixi pra desenhar.
3. **SWF vira dado.** Cada SWF vira uma pasta com `library.json` (timelines,
   posições, filtros, textos) + PNGs. Quando o jogo "carrega um SWF", o
   `Loader` carrega essa pasta e registra as classes (`asset.hall.xxx`).
4. **Servidor não muda.** Mesmo protocolo binário do Flash, só que por
   WebSocket (`Socket` do shim → `apps/game` /ws).

## Boot

| Passo | Flash | Agora |
|---|---|---|
| página | `playgame.aspx` (flashvars) | `main.ts` lê `?user&key` |
| entrada | `Loading.swf` | classe `Loading` (TS) + arte `assets/flash/loading` |
| config | `config.xml`, `md5.xml` | iguais, da API |
| sem personagem | `1.png` (RegisterLuncher) | `register.*` (TS) — criação de personagem |
| tutorial | `3.png` | `road7th.*` do 3.png (TS) |
| com personagem | `DDT_Loading.swf` → `2.png` (núcleo) | `DDT_Loading` (TS); `2.png` é "biblioteca virtual" (o núcleo já é `src/game`) |
| UI | `ui/vietnam/swf/*.swf` | `assets/flash/ui/vietnam/swf/*/library.json` |
| login | `Login.ashx` + socket TCP | `Login.ashx` + WebSocket |

## Frames e desenho

- Lógica a `stage.frameRate` (25 fps, igual ao Flash): avança timelines,
  `ENTER_FRAME`, frame scripts, `EXIT_FRAME`, `RENDER`.
- Desenho a cada `requestAnimationFrame` (60+ fps). Mudanças de Graphics,
  BitmapData e texto sobem pra GPU uma vez por desenho (`render-queue.ts`).

## Diferenças conscientes em relação ao Flash

- Sem cache de SWF no SharedObject e sem checagem md5/"road7" (não há SWF).
- `Socket` é WebSocket; endereço resolvido no boot (`setSocketResolver`).
- Música de fundo: `.flv` → `.mp3` (`NetStream` toca via `<audio>`).
- Campos de digitação usam `<input>` HTML de verdade por cima do canvas
  (teclado de celular, IME, colar funcionam).
