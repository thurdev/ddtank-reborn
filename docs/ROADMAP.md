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

## Localização PT-BR (próxima após correções do core)
- Textos: `ui/vietnam/language.txt` (cliente, ~3.5k linhas), `Languages/Language-vn.txt` (servidor, ~4.1k), nomes/descrições no banco (itens, missões, mapas, NPCs) → tudo PT-BR, editável em Admin > Textos.
- Imagens com texto (botões/títulos dentro dos SWFs/PNGs), em ordem de custo:
  1. Procurar arte PT-BR original (DDTank Brasil / 337) — Wayback, GitHub, fóruns.
  2. Extrair imagens com FFDec, detectar as que têm texto, re-renderizar o texto PT-BR no mesmo estilo (fonte gorda, gradiente, contorno, sombra) via script.
  3. Casos difíceis (texto integrado ao desenho): Recraft API (inpainting) — precisa da chave do usuário.
- Saída vai para o overlay de assets do admin (prioridade sobre o pack); SWFs originais intactos.

## Redesign premium do site + admin (DEPOIS do jogo 100% funcional)
- Refazer `apps/web` do zero com design moderno/premium, mantendo o estilo de botões "3D/toy" (o usuário gosta do estilo do admin).
- Tema: NÃO zinc/preto chapado — algo "high tech" (cores e profundidade, glow, gradientes), dark mas vivo.
- Imagens: gerar via Higgsfield ou Recraft (o que tiver crédito); imagens do jogo melhoradas (upscale/arte nova) para o site.
- Motion: animações e microinterações (entrada, hover, transições de página).
- Admin: reorganizar tabelas, resolver relações (joins) — mostrar nomes em vez de IDs (ex.: item, mapa, NPC, missão linkados), navegação entre registros relacionados, filtros melhores.

## "Reborn" visual do jogo (DEPOIS do jogo 100% funcional)
- Manter a identidade/charme do DDTank Flash original (old school) — layouts e estilo reconhecíveis, não copiar o remake em outra língua.
- Arte refeita e atualizada: tema dark/"night mode" (lobby à noite, UI escura moderna), design levemente inovador sem perder o estilo antigo.
- Itens com design novo: armas, roupas/looks dos bonecos, acessórios, ícones.
- Tudo via overlay de assets (admin), mesmos nomes/tamanhos/âncoras dos arquivos originais → cliente não muda e tudo continua funcionando.
- Atenção técnica: avatares são camadas por slot (cabelo, rosto, roupa, arma...) com frames de animação alinhados — cada peça nova precisa respeitar tamanho, pivô e frames do original (pipeline: extrair original → gerar/redesenhar → validar dimensões/alinhamento automaticamente → pré-visualizar no admin).
- Ferramentas: Higgsfield / Recraft (o que tiver crédito) + scripts de pós-processo.
- Método: cada peça nova é feita A PARTIR da original, layer por layer (image-to-image / redesenho sobre o original), nunca do zero — garante mesma silhueta, pivô e frames.
- Ferramenta: Recraft primeiro (tem crédito); Higgsfield só após virar o mês (sem crédito em out/2026).

## Decisão de versão (2026-10-02)
Ficamos na 4.1: única versão com código-fonte completo (servidor + cliente AS3 + banco + mapas) e já roda no Ruffle.
5.5 só existe como binários (`Servidor5.5.rar`, fóruns) — possível no futuro via decompilação ILSpy/FFDec reaproveitando protocolo/gerador de schema/fight engine/launcher/site/admin; reavaliar se o pacote 5.5 aparecer.
