# Cliente novo em PixiJS (60fps+) — estudo de viabilidade

Status: estudo (2026-10-20). Decisão do dono até aqui: Flash 4.1 + Ruffle/launcher primeiro, PixiJS depois.

## Tamanho do que existe hoje (cliente 4.1)

- Código AS3: `vendor/DDTank41/Source Flash` — **2.517 arquivos, ~442 mil linhas**.
- Arte: ~140 SWFs (~61 MB) em `vendor/DDTank41` + recursos servidos por `apps/api` (`/resource`, mapas,
  ícones, personagens montados por camadas).
- O cliente roda a 24-30 fps de timeline; o Ruffle emula isso. 60fps de verdade exige cliente novo
  (interpolação de movimento/projétil, render GPU), não dá pra "acelerar" o SWF.

## O que já está pronto e reaproveita 100%

- `packages/protocol` — codec binário, crypto, framing TCP/WebSocket, códigos de pacote (TS).
- `packages/fight` — física de tiro, mapa destrutível, IA/PvE — o cálculo é do servidor, o cliente novo só
  desenha e manda input. Isso é a parte mais difícil de um DDTank e já existe.
- `apps/api` — todos os XML/templates que o cliente lê (itens, mapas, loja, missões).
- O servidor não muda: o cliente novo fala o MESMO protocolo do 4.1, então Flash e Pixi podem conviver
  (jogador escolhe), e dá pra migrar tela por tela.

## O que precisa ser feito

| Bloco | Trabalho | Dificuldade |
|---|---|---|
| Extração de arte | SWF → spritesheets/atlas (FFDec/JPEXS em lote), MovieClips de personagem/arma/efeito → sequências de frames ou Spine; personagem é montado por camadas (cabelo/rosto/roupa/arma) | Alta (volume), mas mecânica/automatizável |
| Batalha | mapa + terreno destrutível (máscara), câmera, mira/força, projéteis interpolados a 60fps, efeitos, HUD | Alta — é o coração; ~1-2 meses focados |
| Lobby/hall/salas | hall, lista de salas, sala de espera, matchmaking | Média |
| UI (centenas de telas) | bolsa, loja, ferreiro, guilda, casamento, fazenda, eventos… cada uma é um formulário com arte | Alta (volume) — maior parte do tempo total |
| Texto/i18n | já temos PT-BR do 4.1 (`tools/i18n`), reusa | Baixa |
| Áudio | extrair MP3 dos SWFs | Baixa |

## Estimativa honesta

- **MVP jogável** (login → hall → sala → batalha PvP/PvE completa, bolsa/loja básicas): **2-3 meses**
  de trabalho focado.
- **Paridade com o 4.1** (todas as telas/features): **9-12+ meses** — o volume de UI domina.
- Risco técnico baixo (servidor/física/protocolo prontos); risco de escopo alto (quantidade de telas).

## Caminho recomendado (incremental, sem jogar fora o Flash)

1. **Pipeline de arte primeiro**: script que extrai personagem por camadas + 3-4 mapas + armas em atlas.
2. **Visualizador de batalha** em Pixi que toca um replay gravado do servidor (prova os 60fps e a física
   do lado do cliente sem precisar de UI nenhuma).
3. **Batalha jogável** em Pixi (entra numa sala criada pelo Flash, por exemplo) — o resto continua no Flash.
4. Hall + salas, depois telas por ordem de uso (bolsa, loja, ferreiro…). Cada tela pronta sai do Flash.
5. Quando a paridade chegar, o Flash vira legado.

Stack: PixiJS v8 (WebGPU com fallback WebGL), TS, Vite, o mesmo `packages/protocol` via WebSocket (já
temos WS no `apps/game`). Desktop: o mesmo build num Electron/Tauri (o `apps/launcher` atual).
