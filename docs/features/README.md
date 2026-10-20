# Documentação de features — índice

> Pra quem quer **aprender a modificar o jogo**: cada link abaixo é uma feature (uma
> tela/menu do jogo), com a mesma estrutura: 1) o que é no jogo, 2) onde fica no código
> (cliente → pacote → servidor → C# original → banco), 3) fluxo passo a passo, 4) receitas
> "quero mudar X", 5) testes que cobrem.
>
> Primeiro leia [COMO-FUNCIONA.md](./COMO-FUNCIONA.md) — arquitetura geral (como um
> clique vira um pacote, vira uma mudança salva) + glossário de termos (`TemplateID`,
> `Place`, `BagType`, `Property1`...). Pra achar rápido uma ação específica por tela,
> também tem [docs/MAPA-DO-JOGO.md](../MAPA-DO-JOGO.md) (gerado automaticamente,
> `node tools/docs/game-map.mjs`).
>
> Código sempre em inglês (nomes de função/arquivo); esta documentação em PT-BR.

## Lobby e conta
| Feature | Doc |
|---|---|
| Lobby (tela principal, sala de espera) | [lobby.md](./lobby.md) |
| Login / conta (entrar, senha da bolsa, código anti-bot, configurações) | [login-conta.md](./login-conta.md) |
| Bolsa e personagem (inventário, equipar, atributos, títulos) | [bolsa-personagem.md](./bolsa-personagem.md) |
| Amigos / chat privado / convidar amigos | [amigos.md](./amigos.md) |
| Correio | [correio.md](./correio.md) |
| VIP | [vip.md](./vip.md) |

## Loja e progressão de equipamento
| Feature | Doc |
|---|---|
| Loja | [loja.md](./loja.md) |
| Forja — Ferraria (Fortalecer/Montar/Compor/Transferir/Fundir) e Forno (Dourar/Evolução/Energia latente/Gemas) | [forja.md](./forja.md) |
| Totem | [totem.md](./totem.md) |
| Álbum (coleção de visuais) | [album.md](./album.md) |
| Presentes (dar presente/charme pra um amigo) | [presentes.md](./presentes.md) |
| Cartas | [cartas.md](./cartas.md) |
| Mascote | [mascote.md](./mascote.md) |
| Leilão | [leilao.md](./leilao.md) |

## Jogar
| Feature | Doc |
|---|---|
| Missões | [missoes.md](./missoes.md) |
| Salas e batalha (PvP) | [salas-batalha.md](./salas-batalha.md) |
| PvE / Masmorras | [pve-masmorras.md](./pve-masmorras.md) |
| Labirinto | [labirinto.md](./labirinto.md) |
| Boss mundial | [boss-mundial.md](./boss-mundial.md) |

## Social
| Feature | Doc |
|---|---|
| Sociedade (guilda) | [sociedade.md](./sociedade.md) |
| Casamento / Igreja | [casamento.md](./casamento.md) |
| Termas | [termas.md](./termas.md) |
| Fazenda | [fazenda.md](./fazenda.md) |
| Academia (mestre/aprendiz) | [academia.md](./academia.md) |

## Eventos
| Feature | Doc |
|---|---|
| Eventos (cada ícone do lobby: baú da galinha, roleta, loteria, calendário, liga de elite, minigames...) | [eventos.md](./eventos.md) |

## Administração
| Feature | Doc |
|---|---|
| Admin (painel, CRUD de tabelas do jogo) | [admin.md](./admin.md) |
| Atualização ao vivo ("Aplicar agora" — o que atualiza sem relogar e o que não) | [hot-update.md](./hot-update.md) |

---
Status de porte C#→TS citado em cada doc vem de `research/qa/packet-coverage.tsv` (tabela
código → pacote → arquivo) e `research/qa/port-plan.md`; confirmado lendo o handler real
quando os dois discordavam (a ferramenta de coverage é só um scan do cliente, erra pra
pacotes com sub-roteador por subcódigo).
