# Cliente DDTank em TypeScript + PixiJS (sem Flash)

O cliente Flash do DDTank 4.1 (442 mil linhas de ActionScript 3 + ~3.000 SWFs)
convertido pra **TypeScript rodando em PixiJS (WebGL)**. Não sobra nenhum
SWF nem Flash/Ruffle em tempo de execução: o código é TS, a arte é PNG/JPG +
JSON, a música é MP3.

| Onde | O que é |
|---|---|
| `apps/client` | o jogo (Vite). `src/main.ts` = entrada; `src/game/**` = código do jogo |
| `packages/flash` | a "API do Flash" reescrita sobre PixiJS (`Sprite`, `MovieClip`, `TextField`, `Socket`...) |
| `apps/client/public/assets` | arte exportada dos SWFs (PNG + `library.json` por SWF) e músicas (MP3) |
| `tools/as3-to-ts` | conversor AS3 → TS (usado até o congelamento) |
| `tools/swf-export` | conversor SWF → PNG/JSON e FLV → MP3 (roda uma vez) |

## Leia nesta ordem

1. [COMO-RODAR.md](COMO-RODAR.md) — subir local, logar, build.
2. [ARQUITETURA.md](ARQUITETURA.md) — como as peças se encaixam (boot, display, rede).
3. [DEBUG.md](DEBUG.md) — `?debug=true`: clique mostra arquivo/arte, pacotes nomeados, ferramentas.
4. [ASSETS.md](ASSETS.md) — **trocar imagens** (é só editar PNG).
5. [PACOTES.md](PACOTES.md) — protocolo cliente ↔ servidor, como ver e criar pacotes.
6. [FLASH-RUNTIME.md](FLASH-RUNTIME.md) — o `packages/flash`: o que existe, como completar API que falta.
7. [TRANSPILADOR.md](TRANSPILADOR.md) — como o AS3 virou TS, patches, congelamento.

## Situação (2026-10-23)

- Boot completo: config, login (HTTP + socket WebSocket), criação de personagem,
  tela de carregamento (com o minijogo do hamster), **saguão funcionando**.
- Modo debug, log de pacotes, teste automático (`apps/client/scripts/smoke.mjs`).
- Em andamento: exportação dos SWFs de recurso (bombas, monstros, efeitos,
  asas) e revisão tela a tela (batalha, loja, bolsa, guilda...).
- Ainda não congelado: `apps/client/src/game` é regenerado pelo transpilador
  (edições manuais vão como patch — ver TRANSPILADOR.md). Depois do
  congelamento o TS gerado vira o código-fonte normal e o AS3 sai de cena.
