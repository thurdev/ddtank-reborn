# Glossário

Termos do jogo — PT-BR, nome em VN/CN quando aparece na interface original, e o
identificador em código (geralmente em inglês, herdado do C# original). Veja também
[`docs/features/COMO-FUNCIONA.md`](../features/COMO-FUNCIONA.md), que tem um glossário mais
longo focado em arquitetura.

| Termo | Nome original (VN/CN) | No código | O que é |
|---|---|---|---|
| Masmorra/instância | Phó bản | `Pve_Info` | Uma masmorra PvE (ex. "Lâu đài Gà"/Bugo Castle). `Type` 4=masmorra, 5=laboratório, 10=tutorial, 3/14=chefe. |
| Fase | — | `Mission_Info` | Um estágio dentro de uma masmorra (`Id` referenciado por `SetupMissions`). |
| Dificuldade | Dễ/Thường/Khó/Ác mộng | `hardLevel`/`HardLevel` | `0` Fácil (Simple/Easy), `1` Normal, `2` Difícil (Hard), `3` Terror, `4` Épico, `5` Pesadelo. |
| Corpo vivo | — | `Living` | Classe base de qualquer coisa que luta (jogador ou NPC) no motor de combate. |
| Monstro comum | — | `SimpleNpc` | NPC sem turno próprio, age na "fase dos NPCs". |
| Chefe | — | `SimpleBoss` | NPC com turno próprio (como um jogador). |
| Começar | Bắt đầu | — | Botão de iniciar sala/masmorra. |
| Preparar/Pronto | Chuẩn bị | `playerState` | Estado "pronto" antes de começar. |
| Item/template | — | `Shop_Goods` (tabela), `ItemTemplateInfo`/`ItemTemplate` (classe) | Um modelo de item (PK `TemplateID`). |
| ID de template | — | `TemplateID` | Identidade de um item em qualquer tabela/pacote. |
| Categoria do item | — | `CategoryID` | O que o item É (equipamento, consumível, caixa...) — ver [itens-funcoes.md](./04-receitas/itens-funcoes.md). |
| Parâmetro do item | — | `Property1`..`Property8` | O que o item FAZ — significado depende de `CategoryID`. |
| Bolsa | Túi đồ | `BagType` (0 equip, 1 prop, 5 caddy, 11 clã...) | Qual "compartimento" de inventário. |
| Sociedade/clã | Công hội | `Consortia` | Guilda. |
| Casa de banho/Termas | Nhà tắm | `termas` | Sistema social (ver `docs/features/termas.md`). |
| Capela/Casamento | Nhà thờ | `casamento` | Sistema de casamento. |
| Honra | — | `myHonor` | Moeda do sistema de Totem. |
| GP | — | `addGP` | Experiência (XP) do jogador. |
| Mérito | — | `Offer` | Moeda de evento/elite. |
| Cupom | — | `Money` | Moeda secundária (premium-like, sem vantagem de jogo real no projeto). |
| Ouro | Vàng | `Gold` | Moeda principal. |
| Medalha/Presente | — | `GiftToken`/`Medal` | Moedas de evento. |
| Nível de VIP | — | `VIPLevel` | Status VIP do jogador (via carta, não compra de vantagem). |
| Permissão de PvE | — | `PvePermission` | Quais dificuldades de quais masmorras o jogador já destravou. |
| Canal | Kênh | `Server_List` (linha), `SERVER_ID` | Um "servidor"/mundo dentro do mesmo jogo (múltiplos processos `apps/game`). |
| Tipo de cliente | — | `clientKind` (`"41"`/`"6600"`) | Qual versão do protocolo/cliente está conectado. |
| Pacote | — | `GSPacket`/`PacketOut`/`PackageIn` | Uma mensagem binária cliente↔servidor. |
| Handler | — | `HandlerDef`, `r.player(code, name, fn)` | Função que trata um código de pacote. |
| SWF exportado | — | pasta com `library.json` + PNGs | Timeline/arte de um SWF original, convertida pra dado. |
| Linkage | — | `classes` (no `library.json`) | Nome que o jogo usa pra pedir um símbolo (`asset.hall.okBtn`). |
| Script PvE | — | `AMissionControl`/`APVEGameControl`/`ABrain` | Classe que controla fase/masmorra/IA de NPC, convertida do C# original. |
| Vendor/doador | — | `vendor/DDTank41`, `vendor/DDTank4.1` | Código-fonte original C#, somente leitura. |
| Overlay | — | `ctx.resources.trees[0]` | Arquivo enviado pelo admin que é servido NO LUGAR do original, sem apagá-lo. |
| Template cacheado | — | `Templates` (classe), `/reload-templates` | Cache em memória de toda tabela de configuração do jogo. |

## Siglas e abreviações comuns no código

| Sigla | Significa |
|---|---|
| `GP` | Growth Points (experiência) |
| `HP`/`Blood` | Pontos de vida |
| `ATK`/`DEF`/`AGI`/`LUK` | Ataque/Defesa/Agilidade/Sorte |
| `PvE`/`PvP` | Player vs. Environment / Player vs. Player |
| `GvG` | Guild vs. Guild (sociedade vs. sociedade) |
| `NPC` | Non-Player Character |
| `AI`/`IA` | Inteligência artificial (do NPC/chefe) |
| `VN`/`CN` | Vietnamita / Chinês (idiomas de origem do texto não traduzido) |
| `FFDec` | JPEXS Free Flash Decompiler (ferramenta de exportação de SWF) |

## Onde cada termo "vira código"

Pra qualquer termo do jogo que não está aqui, o caminho mais rápido é
[`04-receitas/como-achar-qualquer-coisa.md`](./04-receitas/como-achar-qualquer-coisa.md):
clique com `?debug=true` e siga clique → classe → pacote → handler → tabela.
