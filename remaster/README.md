# Kit de remaster (IA) — DDTank Reborn

Cada pasta é uma categoria, em ordem de prioridade:

| Pasta | O que é |
|---|---|
| `01-loading` | telas de carregamento |
| `02-lobby-hall` | saguão/lobby (fundo `hall__12.jpg` é o principal) + legendas dos prédios |
| `03-janelas` | janelas (bolsa, loja, missões, correio, guilda…) |
| `04-botoes-titulos` | botões e títulos |
| `05-icones` | ícones |
| `06-combate-outros` | combate e resto |

Dentro de cada uma:
- `inputs/` — imagem ORIGINAL do jogo (use como referência no Higgsfield).
- `prompts/` — prompt pronto para cada imagem (mesmo nome, `.txt`).
- `outputs/` — cole aqui a imagem gerada **com o MESMO nome do input** (pode ser `.png`; tamanho maior tudo bem, eu redimensiono).

`manifest.csv` liga cada arquivo ao SWF/ID original — é por ele que eu reimporto tudo no jogo.

## Como gerar (Higgsfield web)
1. Modelo: Soul 2.0 (gerações grátis). Proporção mais próxima da imagem (lobby/loading 1000×600 → 16:9 ou 3:2).
2. Anexe a imagem de `inputs/` como referência.
3. Cole o prompt do `.txt`.
4. Salve em `outputs/` com o mesmo nome.

## Dicas para o Soul seguir a imagem
O Soul é um modelo de GERAÇÃO (não editor): ele cria uma imagem nova "inspirada" na referência. Para ficar fiel:
- O prompt precisa DESCREVER a imagem inteira com posições ("centro: coliseu…, canto inferior esquerdo: ponte…") — veja `02-lobby-hall/prompts/hall__12.txt` como modelo.
- Diga explicitamente o que NÃO fazer: "no extra buildings, no people, not photorealistic, not 3D, not a diorama".
- Gere 4 variações e escolha a mais fiel; se ele insistir em mudar a cena, use "Color Transfer"/referência de estilo + o prompt descritivo.
- Para botões/ícones pequenos: Soul tende a inventar — melhor um modelo de edição (Nano Banana / Seedream) quando houver crédito.

Quando tiver algumas prontas, me avise: eu redimensiono para o tamanho exato, recorto/aplico transparência e reempacoto nos SWFs, e você vê no jogo.

## Regras que todos os prompts já seguem (aprendidas nos testes)
- Mesmo layout/posições do original; nada novo (sem logos, emblemas, personagens extras).
- Texto: só o texto PT-BR indicado, escrito UMA vez; nada de números/letras extras (a IA erra números — régua e tabelas são feitas em código).
- Onde o original é transparente: fundo verde puro #00FF00 (eu recorto automaticamente).
- Assets muito largos/finos: desenhados como uma faixa centralizada no verde (eu recorto).
- Dark mode nas superfícies claras de UI; ícones e personagens mantêm as cores.
- Se a saída tiver texto duplicado/errado, logo de outro jogo ou coisa inventada: renomeie para `.REFAZER.png` e gere de novo.
