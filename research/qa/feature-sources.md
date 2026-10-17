# Feature sources — busca externa (2026-10-11)

Complementa `research/qa/pendencias-sem-fonte.md` (seção 2) e os blocos `port-A..F.md`, que já tinham
esgotado a busca dentro de `vendor/DDTank41` e `vendor/DDT-6600`. Esta sessão buscou em repositórios
GitHub PÚBLICOS de outros forks/vazamentos do mesmo servidor C# (DDTank 3.x/3.4/3.8, GunnyII, "DDTServer",
"DDTank-II" etc.) via `mcp__github__search_code`/`search_repositories`, procurando pelos nomes de handler
exatos do enum `ePackageType` do nosso próprio cliente (`EquipGhostHandler`, `FineStoreSuitHandler`,
`EquipBringUpHandler`, `ItemCellIsClockedHandler`, `ItemRefineryHandler`, `CardLotteryHandler`,
`LightRoadPackageType`, etc.) e por termos em chinês (弹弹堂 服务端).

**Licença**: nenhum dos repositórios abaixo tem um arquivo `LICENSE` — são forks públicos não-oficiais da
mesma linhagem de código C# vazado que já está em `vendor/DDTank41`/`vendor/DDT-6600` (mesmo padrão
`[PacketHandler]`/`Bussiness`/`eBageType`, nomes de classe idênticos, PDBs com os mesmos tipos). Tratados
aqui como "mesma fonte, versão posterior" — mesmo regime de `AGENTS.md` ("Base source, read-only, copie o
que precisar"), não copiados literalmente: o que entra no código TS é a lógica reescrita (campos, fórmula,
validações), com a citação do arquivo+repo pra rastreabilidade, igual ao que já se faz com `vendor/`.

## Encontrado (fonte real)

| Código | Handler | Repo | Caminho | Usável como está? |
|---|---|---|---|---|
| 391 EQUIP_GHOST | `EquipGhostHandler` | `barrydevp/ddt3.8` (e `ddt3.4server`, `nguyenhuuninhneu/ddt3.8`, `yutikeyux/ddt-34-csharp`) | `Game.Server/Packets/Client/EquipGhostHandler.cs` | Lógica completa (fórmula de sucesso, 3 slots: sorte/equip/pedra), mas depende de tabelas novas: `UserEquipGhostInfo` (nível por categoria de equipamento) + `SpiritInfo`/`SpiritMgr` (que stat cada nível dá) — nenhuma das duas existe no schema/dados deste projeto. Precisa inventar a tabela de stats, não só o handler. |
| 308 EQUIP_BRING_UP | `EquipBringUpHandler` | `barrydevp/ddt3.4server` | `Game.Server/Game.Server.Packets/Added/EquipBringUpHandler.cs` | Lógica completa (devorar outros equipamentos ou comprar XP com Money a 35/un, evoluir via `FusionType`/`Property2` da cadeia de templates). Usável quase 1:1 — os templates de equipamento já têm `FusionType`/`Property1-4` no nosso schema (mesmos campos usados pro fundir/evoluir). Candidato mais barato dos 3 "FineStore" que sobraram sem porte. |
| 295 STORE_FINE_SUIT | `FineStoreSuitHandler` | `barrydevp/ddt3.4server` | `Game.Server/Game.Server.Packets/Added/FineStoreSuitHandler.cs` | Lógica completa (gasta item de upgrade pra subir `fineSuitExp`, read-back do nível pela tabela `SetsBuildTempInfo`), mas `SetsBuildTempInfo`/`SetsBuildTempMgr` e a coluna `fineSuitExp` no personagem não existem aqui — precisa de migration + tabela de dados nova (quais itens valem quanto XP, por nível). |
| 313 ITEM_CELL_IS_LOCKED | `ItemCellIsClockedHandler` | `barrydevp/ddt3.4server` | `Game.Server/Game.Server.Packets/Added/ItemCellIsClockedHandler.cs` | Trivial (ler bagType/place/bool, gravar o campo). **IMPLEMENTADO nesta sessão** — `apps/game/src/handlers/forja/trava-slot.ts` — porque nosso `ItemInfo` JÁ tem o campo `cellLocked` (carregado/serializado em `game/item.ts`, coluna `cellLocked` em `packages/db/schema/player.ts:1379`) sem nenhum handler escrevendo nele. Porte 1:1, zero migration. |
| 110 ITEM_REFINERY | `ItemRefineryHandler` | `zsj0613/DDTServer`, `Guardian820/DDTank-II`, `tohru48/DDT-6600`, `andre-pullinen/ddtank-4.5`, `yutikeyux/ddt-5-5` (vários códigos: 110 ou 210 dependendo da versão) | `Game.Server/*/ItemRefineryHandler.cs` | **NÃO é refino de verdade em nenhum deles.** O handler em `zsj0613/DDTServer` (registrado no código 110, igual ao nosso enum) só verifica se a bolsa está travada por senha (`HasBagPassword && IsLocked`) e retorna 0/1 — nenhuma lógica de item/fórmula/custo. Confirma a decisão de `port-A.md`: não existe fonte de refino real pra copiar; fica stub. |

## Confirmado SEM fonte em nenhum lugar pesquisado (zero resultados)

- **104 CARD_LOTTERY / `CardLotteryHandler`** — 0 resultados em `search_code` (qualquer linguagem, qualquer
  repo público indexado pelo GitHub). Confirma `port-B.md`.
- **239/105/11 (GOTO_CARD_LOTTERY/LUCK_LOTTERY/ACTIVE_PULLDOWN)** — não pesquisados individualmente (nomes
  genéricos demais pra busca de código), mas fazem parte do mesmo sistema de loteria do 104 — mesma
  conclusão.
- **145 LIGHTROAD_SYSTEM/GUILDMEMBERWEEK_SYSTEM/ACTIVITY_SYSTEM** — `LightRoadPackageType` aparece em TODOS
  os forks pesquisados (incl. os mais novos, DDT-6600/5.5), mas sempre como o enum do CLIENTE (`.as`) ou a
  declaração do enum do SERVIDOR (`LightRoadPackageType.cs`) — nenhum resultado trouxe uma classe
  `[PacketHandler]` real ligada a 145 que faça algo além do que já documentamos em `port-C.md`
  (`ActiveSystemHandler` só trata o sub-byte 8 e nem manda a resposta). Decorativo em todas as versões
  pesquisadas, não só na nossa.
- **弹弹堂 服务端** (busca em chinês por "servidor DDTank") — só achou 2 repositórios não relacionados
  (um "jogo single-player Spring Boot/Vue3" e um projeto vazio) — nenhuma fonte de servidor real adicional
  além dos forks C# já encontrados via busca em inglês.

## Decisão

- **313 ITEM_CELL_IS_LOCKED**: implementado (ver `apps/game/src/handlers/forja/trava-slot.ts`,
  teste em `apps/game/test/forge-persist.test.ts`).
- **391 EQUIP_GHOST, 308 EQUIP_BRING_UP, 295 STORE_FINE_SUIT**: **IMPLEMENTADOS 2026-10-11** — ver
  `apps/game/src/handlers/forja/espirito-do-equipamento.ts`/`aprimorar.ts`/`refinar-conjunto.ts`
  (owner aprovou mudança de schema). CORREÇÃO em relação ao levantamento original desta sessão (abaixo):
  nenhuma das 3 precisou de migration pra dados DO PERSONAGEM — `fineSuitExp` e `GhostEquipList` JÁ
  existiam em `player."Sys_Users_Detail"` (reservados, nunca escritos por handler nenhum); e a tabela de
  template do 295 (`SetsBuildTemp`) JÁ existia no catálogo original como `game."Sets_Build_Temp"` (70
  linhas reais, seed `packages/db/seed/game/Sets_Build_Temp.json.gz`, idêntica ao `Request/SetsBuildTemp.xml`
  do fork) — só nunca tinha sido carregada por `apps/game`. Só o 391 precisou de tabela nova de verdade
  (`app."SpiritInfo"`, dados reais do fork, sem equivalente no catálogo original — ver
  `packages/db/src/schema/app.ts` + `packages/db/drizzle/0010_forja_specs_seed.sql`). 308 não precisou de
  nenhum dado novo (reusa `FusionType`/`Property1-4` já existentes). Testes: `apps/game/test/forge-ghost.test.ts`,
  `forge-bringup.test.ts`, `forge-fine-suit.test.ts`.
- **110/111 ITEM_REFINERY**: ficou STUB (ver `apps/game/src/handlers/forja/refinaria.ts` pro design
  próprio sem fonte C# que assumiu esses códigos).
- **135 (farm arrange)**: SEM fonte em lugar nenhum (nem vendor, nem os forks externos). Design novo
  implementado nesta sessão — ver `apps/game/src/handlers/fazenda/arrumar.ts`.
- **104/105/239/11 loteria, 145 decorativo**: reconfirmado sem fonte em nenhum lugar — mantém a decisão
  já tomada em `port-B.md`/`port-C.md` (stub documentado).

## Specs (histórico — já implementadas, ver "Decisão" acima; texto original mantido por rastreabilidade)

<details><summary>Levantamento original (antes da implementação) — algumas suposições sobre "precisa de
migration" se mostraram erradas (fineSuitExp/GhostEquipList/SetsBuildTemp já existiam no catálogo
original), corrigido na seção "Decisão" acima</summary>

### 391 EQUIP_GHOST — "Espírito do equipamento" (Forja)
Bancada de 3 slots (StoreBag: 0=sorte, 1=arma/equipamento, 2=pedra). Cada tentativa consome 1 pedra (+1
item de sorte se presente) e tenta subir 1 nível (máx. 10) de um "espírito" ligado à CATEGORIA do
equipamento (arma/elmo/roupa compartilham o mesmo nível de espírito dentro da mesma categoria — não é por
item individual). Taxa de sucesso cai conforme o nível sobe e sobe com a tendência da pedra e o bônus do
item de sorte (fórmula do fork: `5 * (100 + sorte.Property2) * 2^(2^(pedraLevel-1) + 2 - nívelAtual) / 10000`).

### 295 STORE_FINE_SUIT — "Refinar conjunto" (Forja)
Uma barra de XP do personagem (`fineSuitExp`) sobe consumindo um item específico (`Property2` XP por
unidade); ao cruzar limiares de uma tabela de níveis (`SetsBuildTempInfo`: XP necessário por nível),
desbloqueia um bônus de conjunto.

### 308 EQUIP_BRING_UP — "Aprimorar" (mais barato dos 3)
Já quase portável 1:1: equipamento-alvo no slot 0 da bancada "devora" outros equipamentos (ganha XP =
XP original do item devorado, ajustado por nível/qualidade se o devorado for de tier mais alto) OU compra
XP direto com Money (35 Money por ponto de XP). Ao acumular XP suficiente (`Property2` do próximo item na
cadeia `FusionType`), evolui pro próximo item da cadeia, preservando os bônus. Implementado reusando a
MESMA cadeia `FusionType` que `fundir.ts`/evolução já usam (sem colisão observada).

</details>
