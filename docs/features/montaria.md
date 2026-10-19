# Montaria (Mount, `horse.swf`)

> Parte 1 de `m4-montaria` (`docs/plan/TASKS.md`): posse, nível/alimentação, habilidades e o bônus de
> combate de verdade. Corrida de Montaria (`horseRace.swf`) fica pro `m4-montaria-2`. 6600 only — a 4.1
> nunca manda o pacote 260 (não existe no enum dela).

## 1. O que é no jogo

A Montaria é um "pet" de combate: o jogador escolhe um visual (mesmo sem nenhum item, nível 0 já dá bônus
passivo), alimenta com itens pra subir de nível (ganhando mais bônus + 1 habilidade nova por nível de
verdade) e pode treinar as habilidades ganhas com outro item. Separado disso, existe um sistema de
"montarias especiais" ("cherish"/desenho de montaria): um item colecionável que, ao ser consumido, desbloqueia
permanentemente uma montaria cosmética diferente — **TODA montaria especial já desbloqueada contribui com o
bônus de stats ao mesmo tempo**, não só a que está "ativa" visualmente (confirmado lendo o C# decompilado,
`PlayerHorse.GetPicCherishs` nunca filtra por `Active`).

## 2. Onde fica no código

| Ação | Cliente (AS3) | Pacote | Servidor TS | C# original |
|---|---|---|---|---|
| Login: cria a linha se não existir, manda estado completo | `horse/HorseManager.as` `pkgHandler` | `260/1 GET_ALL_DATA` + `260/8 HORSE_PICCHERISH_INFO` (só servidor→cliente) | `session/login.ts` | `GamePlayer.cs:3646` `Horse.UpdateHorsePacket()` |
| Trocar/equipar montaria (visual simples ou já desbloqueada) | `sendHorseChangeHorse` | `260/2 CHANGE_HORSE` | [`changeHorse`](../../apps/game/src/handlers/montaria/montaria.ts) | `ChangeHorse.cs` |
| Alimentar (subir nível/exp) | `sendHorseUpHorse` | `260/3 UP_HORSE` | [`upHorse`](../../apps/game/src/handlers/montaria/montaria.ts) | `UpHorse.cs` |
| Treinar uma habilidade | `sendHorseUpSkill` | `260/5 UP_SKILL` | [`upSkill`](../../apps/game/src/handlers/montaria/montaria.ts) | `UpSkill.cs` |
| Equipar/desequipar habilidade num slot | `sendHorseTakeUpDownSkill` | `260/6 TAKE_UP_DOWN_SKILL` | [`takeUpDownSkill`](../../apps/game/src/handlers/montaria/montaria.ts) | `TakeUpDownSkill.cs` |
| Ativar montaria especial (consome o item) | `sendActiveHorsePicCherish` | `260/7 ACTIVE_HORSEPICCHERISH` | [`activeHorsePicCherish`](../../apps/game/src/handlers/montaria/montaria.ts) | `ActiveHorsePicCherish.cs` |
| Bônus de combate (nível + especiais) | — | — | [`game/stats.ts computeStats`](../../apps/game/src/game/stats.ts) | `PlayerEquipInventory.cs:385-404` / `GamePlayer.GetBaseAttack`/`GetBaseDefence` |
| Templates (`Mount_Template`, `Mount_Draw_Template`, `Mount_Skill_Template`, `Mount_SKill_Get_Template`) | — | — | [`db/templates.ts loadMontaria`](../../apps/game/src/db/templates.ts) | `Game.Logic/MountMgr.cs` |
| Modelo puro (serialização JSON, cálculo de feed/skill-up) | — | — | [`game/montaria.ts`](../../apps/game/src/game/montaria.ts) | `Game.Server.GameUtils/PlayerHorse.cs` |
| Persistência (`player."Mount_Data"`) | — | — | [`db/montaria.ts`](../../apps/game/src/db/montaria.ts) | `PlayerBussiness.GetSingleMountData`/`AddMountDatas`/`UpdateMountData` |

Tabelas (`Mount_Data`, `Mount_Template`, `Mount_Draw_Template`, `Mount_Skill_Template`,
`Mount_SKill_Get_Template`, `Mount_SKill_Element_Tempalate`) já existiam desde a migração `0013` (m1-schema)
com seed real (9/81/15/105/90/135 linhas). Nenhuma migração nova nesta tarefa.

## 3. Alcançável?

Sim, direto no cliente 6600: `HorseManager.loadModule()` abre a tela quando `Grade >= 28` e a missão 568
está concluída — isso é só um gate de UI do cliente (igual o original, o servidor nunca checou nível nenhum
nos handlers reais), então um cliente modificado sempre alcançaria os pacotes; o servidor aqui também nunca
exige nível, fiel ao original.

## 4. Fluxo passo a passo

1. Login (6600 only): se não existir `player."Mount_Data"` pra esse `UserID`, cria uma com
   `curLevel`/`curExp` do `Mount_Template` Grade 0 (`CreateHorse`, sempre existe — Grade 0 já tem
   `AddDamage=7`/`AddGuard=15`/`MagicAttack=30`/`MagicDefence=30`/`AddBlood=260`, só não conta enquanto
   `curUseHorse==0`). Manda `260/1` com o estado completo + `260/8` com as montarias especiais já
   desbloqueadas (vazio pra conta nova) + `260/2` se já tinha uma montaria equipada antes.
2. `260/2 CHANGE_HORSE(tag)`: troca o visual. `tag=0` desmonta. A borda 0↔diferente-de-0 é o que liga/desliga
   o bônus do `Mount_Template` do nível atual — trocar entre duas montarias "normais" (ambas != 0) não muda
   stat nenhum (o bônus depende só do nível, não de qual tag está ativo).
3. `260/3 UP_HORSE(count)`: gasta até `count` "Pílulas de Melhoria de Estrela" (TemplateID 11164,
   `Property2=100` exp cada) da bolsa (`PropBag`) — clampado pela quantidade real que o jogador tem. Cobra
   ANTES de conceder (remove os itens, só depois soma o exp — nunca debita sem dar nada, nunca dá sem
   debitar). Se cruzar o próximo degrau (`Mount_Template.Experience` do nível+1), sobe UM nível por chamada
   (igual ao original — mesmo que o exp dê pra subir 2+ níveis de uma vez) e, se esse nível tiver
   `SkillID > 0`, concede a habilidade nova (`260/4`, push separado do ack `260/3`).
4. `260/5 UP_SKILL(skillId, count)`: mesma mecânica de gasto, mas com "Esferas de Melhoria de Habilidade"
   (TemplateID 11165, `Property2=10` exp) numa habilidade que o jogador já tem. O id da habilidade pode
   EVOLUIR pro próximo da escada (`Mount_SKill_Get_Template`, agrupado por `Type`) quando o novo exp cruza o
   próximo degrau — nunca regride.
5. `260/6 TAKE_UP_DOWN_SKILL(skillId, slot)`: só organiza qual habilidade fica em qual dos 3 slots de
   batalha (`slot` 1-3, `0` = remover). Não afeta stat nenhum (habilidade é usada em luta, não é bônus
   passivo) — sempre confirma (ack), mesmo se o id não for uma habilidade que o jogador tem (igual ao
   original).
6. `260/7 ACTIVE_HORSEPICCHERISH(place)`: consome 1 cópia do item no slot `place` da `PropBag` cujo
   `TemplateID` bate com algum `Mount_Draw_Template.TemplateId`. Ativa aquela montaria especial (equipa o
   visual, manda `260/7` + `260/2`) — se for a 1ª vez que esse id é desbloqueado, o bônus de stats dele passa
   a contar (soma incondicional de todo item já desbloqueado, não só o "ativo").

## 5. Anti-P2W (decisão de design)

O custo de alimentar/treinar a montaria no original **nunca é um débito direto de moeda dentro do pacote
260** — é sempre consumir um ITEM que já está na bolsa (`PropBag`), igual aqui. Os dois itens-base
(`11164`/`11165`) têm `CanDrop=true` no template real (ganháveis jogando, não só comprados) — a mesma régua
usada em `docs/features/passe-classico.md` (preferir um caminho ganhável a um gasto de moeda premium).

Achado durante esta tarefa (não é um comportamento NOVO introduzido aqui): a única linha hoje viva de
`game."Shop"` que vende o item `11164` é `ShopID=1` (a loja principal "de sempre"), com preço em **Money**
(`APrice1=-1`, convenção de `handlers/loja/preco.ts`). É dado em massa herdado do dump original completo
(a tabela `Shop`/`Shop_Goods` inteira, ~5000/7600 linhas, já seedada desde antes desta tarefa) — re-precificar
essa linha específica tocaria uma tabela grande e compartilhada com a área de loja (`m2-loja`/`m3-ashx`) por
um item só, fora do escopo pedido aqui ("mount ownership/level-up/feed/skills/equip"). Registrado aqui pra
quem for revisar a economia da loja como um todo: se quiser fechar esse caminho específico (ou trocar pra
Gold), é uma mudança isolada em `game."Shop"` linha `ID=1116401`/`1116501`, não nos handlers de Montaria.

Nenhum exploit NOVO foi introduzido: o `count` do cliente em `260/3`/`260/5` é sempre clampado por
`Math.min(requested, owned)` antes de qualquer gasto — um `count` negativo ou maior que o possuído nunca
gera um gasto negativo nem um ganho inflado.

## 6. Bugs corrigidos vs. o original (não repetidos de propósito)

- **`GetBaseDefence` soma `AddDamage` em vez de `AddGuard`** (`GamePlayer.cs`, decompilado): o trecho que
  soma o bônus da montaria pra Armadura usa literalmente a MESMA expressão (`mountTemplate.AddDamage`) que o
  trecho de Ataque usa — bug de copy-paste que faz o campo `Mount_Template.AddGuard` nunca ser lido em
  lugar nenhum e dobra o `AddDamage` (uma vez em Ataque, outra em Armadura). Corrigido pra ler `AddGuard` em
  `game/stats.ts getBaseDefence` — o split "cherish" (`AddHurt` pro ataque, `AddGuard` pra defesa` no
  `Mount_Draw_Template`) já mostrava que o campo certo existia e era só esse ponto que errou.
- **`ActiveHorsePicCherish.cs` nunca recomputa stats na borda desmontado→montado quando o "cherish" já era
  dono antigo**: só o `PlayerHorse.ActiveHorsePicCherish` interno recomputa quando um desenho NOVO é
  adicionado ao dicionário — reativar um desenho que o jogador já tinha (vindo de `curUseHorse==0`) nunca
  dispara `UpdatePlayerProperties()` no caminho real, deixando o bônus do nível (`Mount_Template`, que
  depende só de `curUseHorse>0`) temporariamente ausente até algum outro recálculo não relacionado acontecer.
  Não é um exploit (prejudica o jogador, nunca beneficia), mas é a mesma categoria de "comportamento ruim do
  original" que `docs/features/passe-classico.md` §5 já tratou — aqui sempre recomputamos depois de
  qualquer mudança em `curUseHorse`/montarias especiais.

## 7. Não portado (gaps documentados, não "esquecidos")

- **Bônus grátis da Escritura** (`Player.Extra.UseDeed(12)`/`UseDeed(13)`, 2 usos grátis de alimentar / 3 de
  treinar skill enquanto a Escritura — `DEED_MAIN`, `m3-king-bless-deed` — está ativa): mesma categoria do
  gap já registrado em `handlers/progressao/juramento-do-rei.ts` (o dicionário de efeito por-atributo da
  Escritura/Bênção do Rei nunca foi ligado a `game/stats.ts`). Não implementado aqui pra não duplicar lógica
  de reconstrução do dicionário fora do lugar que já documentou a lacuna.
- **Visual pros OUTROS jogadores** (`PlayerCharacter.MountsType` em `Sys_Users_Detail`, usado pelo hall pra
  desenhar qual montaria cada jogador está usando): não existe coluna `MountsType` no nosso schema (gap
  anterior a esta tarefa, já citado em `apps/game/src/game/player.ts` no comentário de `hallPetsId`) — o
  jogador vê/sente o próprio bônus real (stats, HUD), mas outros jogadores no hall não veem a montaria
  equipada. Corrigir exigiria uma coluna nova + religar o broadcast de dress do hall (`hall-6600/visual.ts`),
  fora do pedido desta tarefa.
- **Corrida de Montaria** (`horseRace.swf`, pacote `282 HORSERACE`): `m4-montaria-2`.

## 8. Quero mudar…

- **Taxa de exp por item**: não é um número nosso — vem direto do `Property2` do item real
  (`game."Shop_Goods"` TemplateID 11164/11165, admin → recurso de itens). Mudar o item muda a taxa nos dois
  lados (compra E consumo) ao mesmo tempo, sem dessincronizar.
- **Curva de nível/habilidade**: `game."Mount_Template"` (por `Grade`) e `game."Mount_SKill_Get_Template"`
  (por `Type`, a escada de uma habilidade) — tabelas de template comuns, editáveis como qualquer outra no
  admin de itens/templates.

## 9. Trabalho de cliente/arte pendente (não feito aqui)

`m5-remaster-telas-novas`: `horse.swf` (2.1 MB, a maior tela nova do 6600 até agora) continua 100% em turco,
sem overlay PT-BR/HD — fora do escopo deste agente (backend/protocolo).

## 10. Testes + status

- `apps/game/test/client-6600-m4-montaria.test.ts` (12): login cria a linha + pushes 260/1 e 260/8 vazios;
  4.1 nunca manda 260; equipar/desequipar liga e desliga o bônus do nível; alimentar cobra antes de conceder,
  clampa pela quantidade real, sobe de nível e concede a habilidade nova; sem item nenhum não manda ack;
  treinar habilidade evolui o id pela escada certa; skill não desbloqueada recusa sem cobrar; equipar/
  desequipar habilidade sempre confirma; ativar montaria especial consome o item, manda os 2 acks (260/7 +
  260/2) e soma o bônus mesmo vindo de desmontado; item inválido no slot recusa sem consumir nada.
- Status: **OK** no servidor (posse/nível/feed/skills/equip + bônus de stats real). **Falta**: Corrida de
  Montaria (`m4-montaria-2`) e remaster/PT-BR do SWF (`m5-remaster-telas-novas`).
