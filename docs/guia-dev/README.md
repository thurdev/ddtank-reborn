# Guia do Dev — mexer no DDTank Reborn

Guia prático pra quem vai manter e evoluir o jogo sozinho: trocar ícone, criar item, mexer
em instância PvE, adicionar tela, pacote, evento — e saber debugar quando algo quebra.
Escrito no estilo "docs do Spigot": cada página é curta, tem caminho de arquivo real e
trecho de código real, sem enrolação. PT-BR no texto, identificadores (nomes de classe,
tabela, variável) em inglês como estão no código.

Isto **complementa** `docs/features/*` (um doc por sistema do jogo, "o que é/onde fica/
fluxo/quero mudar/testes") e `docs/client-pixi/*` (arquitetura do cliente). Este guia é a
porta de entrada; quando precisar de detalhe fundo, ele linka pra lá.

## Comece aqui

1. **[01-comecar.md](./01-comecar.md)** — subir o stack, logar, debug, onde ficam os logs.
2. **[02-arquitetura.md](./02-arquitetura.md)** — as peças (cliente ↔ servidor ↔ banco) e o
   caminho de um clique até o banco e de volta, com um exemplo real (comprar na loja).
3. **[03-api-referencia.md](./03-api-referencia.md)** — referência das APIs mais usadas do
   servidor (`GamePlayer`, salas, motor de luta, script de PvE, templates, pacotes, i18n).
4. **[04-receitas/](./04-receitas/)** — um arquivo por tarefa comum, cada um testado de
   verdade antes de escrever (veja o cabeçalho de cada arquivo pra saber como testar/saber
   que deu certo):
   - [como-achar-qualquer-coisa.md](./04-receitas/como-achar-qualquer-coisa.md) — comece por
     aqui se não souber onde algo mora. 5 passos genéricos: clique → classe → pacote → handler → tabela.
   - [trocar-icone-imagem.md](./04-receitas/trocar-icone-imagem.md)
   - [adicionar-icone-imagem-nova.md](./04-receitas/adicionar-icone-imagem-nova.md)
   - [criar-item.md](./04-receitas/criar-item.md)
   - [itens-funcoes.md](./04-receitas/itens-funcoes.md) — como a **função** de um item é
     definida (categoria, Property1-8, CanUse…) e onde cada categoria é tratada no código.
   - [item-com-menu-e-acao.md](./04-receitas/item-com-menu-e-acao.md) — item que abre um
     menu (Abrir/Usar) e dispara uma ação customizada (minigame, recompensa).
   - [totem-mascote-e-sistemas.md](./04-receitas/totem-mascote-e-sistemas.md) — totem, pet,
     cartas, gemas, asas, títulos: onde cada um mora.
   - [animacoes.md](./04-receitas/animacoes.md)
   - [dar-coisas-ao-jogador.md](./04-receitas/dar-coisas-ao-jogador.md)
   - [novo-pacote.md](./04-receitas/novo-pacote.md)
   - [nova-tela-cliente.md](./04-receitas/nova-tela-cliente.md)
   - [salas.md](./04-receitas/salas.md)
   - [instancias.md](./04-receitas/instancias.md)
   - [eventos.md](./04-receitas/eventos.md)
   - [missoes-quests.md](./04-receitas/missoes-quests.md)
   - [traducoes.md](./04-receitas/traducoes.md)
   - [testes.md](./04-receitas/testes.md)
   - [debug.md](./04-receitas/debug.md)
   - [migracoes-banco.md](./04-receitas/migracoes-banco.md)
5. **[05-tutorial-bugou-normal.md](./05-tutorial-bugou-normal.md)** — tutorial guiado: ache e
   corrija você mesmo um bug real que ainda existe no Castelo do Bugou (Pve 1) no Normal.
6. **[06-glossario.md](./06-glossario.md)** — termos do jogo (PT-BR/VN/CN/código).

## O que NÃO é este guia

Não repete o que já está em `docs/features/*.md` (que cobre cada sistema em detalhe) nem em
`docs/client-pixi/*.md` (arquitetura funda do cliente). Este guia referencia os dois o tempo
todo — leia-os quando a receita apontar.
