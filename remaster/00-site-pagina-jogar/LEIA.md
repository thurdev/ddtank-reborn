# Página "Jogar" estilo DD Clássico — o que é imagem e o que é código

Referência: `inputs/referencia-ddclassico.png`.

Gere com IA (prompts em `prompts/`), salve em `outputs/` com o mesmo nome:
1. `01-fundo-noturno` — fundo da página (escuro, noturno, personagens nos cantos).
2. `02-logo-ddreborn` — logo (fundo transparente).
3. `03-moldura-pergaminho` — moldura com buraco 5:3 no centro e painéis laterais vazios.

NÃO gere como imagem (eu faço em código, no site React):
- As tabelas de ângulo/força (Âng. 20/30/50/65 × distância 1–20): calculadas pelo nosso motor de física (`@ddt/fight`), corretas para esta versão, editáveis no admin.
- O jogo em si fica no buraco central (1000×600, Ruffle) e a régua de distância embaixo.
