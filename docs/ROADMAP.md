# Roadmap

## Fase 1 — Flash original + stack nova (ATUAL)
- Cliente: SWF original (DDTank 4.1) rodando via launcher desktop (Flash projector / Ruffle desktop) e no navegador via Ruffle.
- Servidor reescrito em Node/TS (`apps/game`, `apps/api`), Postgres (Neon), site React (`apps/web`), painel admin (`apps/admin`).
- Protocolo binário original mantido byte-a-byte (o cliente Flash não muda, salvo patches mínimos).
- Meta: eu + amigo jogando PvP, PvE, GvG, bots, tudo configurável no admin, hospedado de graça.

## Fase 2 — Cliente novo em PixiJS (PLANEJADO)
Motivo: Flash/Ruffle laga muito; objetivo é FPS alto e estável (60 fps), rodar em qualquer navegador e no celular.
- Stack: PixiJS v8 (WebGL 2D) + TypeScript. Não three.js (3D desnecessário), não Unity (build web pesado, C#).
- Mesmo protocolo da Fase 1 → servidor não muda; cliente Flash serve de referência 1:1.
- Física/dano/pacotes compartilhados em `packages/*` entre cliente e servidor (previsão idêntica).
- Assets extraídos dos SWFs com JPEXS FFDec → spritesheets PNG + JSON de animação; trocáveis pelo admin.
- Telas replicadas a partir do código AS3 (`vendor/DDTank41/Source Flash`).
- Ordem: login/lobby/sala/batalha+bots/bolsa/loja → PvE/guilda/GvG/missões/eventos → resto.
