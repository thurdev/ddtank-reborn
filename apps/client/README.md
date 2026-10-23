# @ddt/client — cliente DDTank 4.1 em TypeScript + PixiJS

Cliente do jogo sem Flash: o AS3 original convertido pra TS (`tools/as3-to-ts`) rodando sobre
`@ddt/flash` (API do Flash reimplementada em PixiJS v8). Arte exportada dos SWFs por `tools/swf-export`.

`src/game/` e `public/assets/` são gerados localmente e não vão pro git.

```bash
pnpm --filter @ddt/client dev   # http://localhost:5180
```

Guia completo (rodar, arquitetura, debug, assets, pacotes, status): [docs/client-pixi/](../../docs/client-pixi/README.md).
