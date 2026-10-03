# Página "Jogar" estilo DD Clássico — o que é imagem e o que é código

Referência: `inputs/referencia-ddclassico.png`.

Gere com IA (prompts em `prompts/`), salve em `outputs/` com o mesmo nome:
1. `01-fundo-noturno` — fundo da página.
2. `02-logo-ddreborn` — logo (fundo verde #00FF00, eu recorto).
3. Peças da moldura (fundo verde, eu recorto e monto):
   - `03a-ponta-pergaminho` (ponta esquerda; a direita eu espelho)
   - `03b-coluna-dourada`
   - `03c-canto-dourado` (eu giro para os 4 cantos)
   - `03d-textura-tecido-escuro` (textura repetível)
   - `03e-textura-pergaminho` (textura repetível)

Feito em CÓDIGO (React/CSS), com medidas exatas — NÃO peça pra IA:
- Geometria da moldura: buraco 1000×600 exato para o jogo, painéis laterais, posições.
- Régua de distância embaixo do jogo (marcações exatas, alinhadas com a distância do jogo).
- Tabelas de ângulo/força (calculadas pelo motor de física).
IA não consegue números/medidas exatas — por isso a régua saiu errada.
