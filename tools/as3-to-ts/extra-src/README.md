# extra-src — AS3 que não está em `vendor/DDTank41/Source Flash/src`

Descompilado (FFDec) dos SWFs de inicialização, só como entrada do transpilador:

- `Loading.as`, `DDT_Loading.as`, `NormalLuncher.as`, `RegisterLuncher.as`, `SmallLoading.as`,
  `loading/MainLoading.as` — `DDT_Loading.swf` / `Loading.swf` (boot: config, login, tela de carregamento).
- `register/**` — `1.png` (criação de personagem).
- `road7th/**` etc. que não existem no núcleo — `3.png` (batalha tutorial do primeiro acesso).

O transpilador junta isto com o fonte do núcleo e gera TS em `apps/client/src/game`.
Depois do congelamento (ver docs/client-pixi/TRANSPILADOR.md) esta pasta pode ser apagada.
