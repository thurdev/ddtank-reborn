# Fazenda

## 1. O que é no jogo
A **Fazenda**: cada jogador tem um terreno com 8 campos iniciais (dá pra
alugar mais, até 24). Em cada campo o jogador **planta** uma semente
(`Semear`), espera (ou paga pra **acelerar o crescimento**), **colhe** quando
madura, e pode **expandir** (alugar por semana/mês) ou **arrasar** um campo
plantado. Também dá pra visitar a fazenda de um amigo e **roubar** um pouco da
colheita madura dele, e contratar um **ajudante** (NPC) que planta/colhe
sozinho por um tempo contratado. A tela de loja da fazenda (`FarmShopView`)
usa o fluxo normal de loja (`44 BUY_GOODS`, ver [loja.md](./loja.md)), não um
sub-código próprio do pacote `81`.

> Jogadores "guerreiros" (flag `coupleBossBoxNum === 9` em
> `player."Sys_Users_Extra"`, ligada ao evento de casamento/boss do casal — ver
> [casamento.md](./casamento.md)) **não têm acesso** à fazenda: o handler
> retorna de cara pra esses (`isWarrior()`, `estado.ts:37`). Também exige
> nível mínimo (`Grade >= 25`, constante `MIN_GRADE`, `estado.ts:29`).

## 2. Onde fica no código
`apps/game/src/handlers/fazenda/` com 1 arquivo por ação do jogo (nome = o que
o jogador vê na tela): `estado.ts` (sem tela própria, infra), `entrar-fazenda.ts`,
`plantar.ts`, `fertilizar.ts`, `colher.ts`, `expandir-terreno.ts`, `ajudante.ts`,
`compor-comida.ts`, `pacote-diario.ts`, `index.ts`.

Todas as ações usam o **mesmo pacote** `81 FARM`, despachado por um
`switch (type)` dentro de `registerFazenda` (`index.ts:36`, não um
`SubRouter` da registry — cada sub tem formato muito diferente pra caber num
roteador genérico).

| Sub (byte) | Ação (cliente AS3) | Servidor TS | C# original | Status |
|---|---|---|---|---|
| 1 ENTER_FARM | `enterFarm` — entrar na própria fazenda ou na de alguém (`ownerId`) | [`enterFarm`](../../apps/game/src/handlers/fazenda/entrar-fazenda.ts#L14) `entrar-fazenda.ts:14` | `Farm/Handle/EnterFarm.cs` | partial |
| 16 EXIT_FARM | `exitFarm` | [`exitFarm`](../../apps/game/src/handlers/fazenda/entrar-fazenda.ts#L24) `entrar-fazenda.ts:24` | `Farm/Handle/ExitFarm.cs` | partial |
| 2 GROW_FIELD | `seeding` — plantar semente da `FarmBag` num campo | [`growField`](../../apps/game/src/handlers/fazenda/plantar.ts#L15) `plantar.ts:15` | `FarmHandleMgr`/seeding | partial |
| 18 FRAM_GROP_FASTFORWARD | `fastForwardGrop` — acelerar (Cupom ou Ouro) um campo ou todos | [`growFastForward`](../../apps/game/src/handlers/fazenda/fertilizar.ts#L20) `fertilizar.ts:20` | `Farm/Handle/FarmGropFastforward.cs` | partial |
| 4 GAIN_FIELD | `toGather` — colher (próprio) ou roubar (de amigo) | [`gainField`](../../apps/game/src/handlers/fazenda/colher.ts#L16) `colher.ts:16` | `GameUtils/PlayerFarm.cs` (`GainFriendFields`) | partial |
| 7 KILLCROP_FIELD | `toKillCrop` — arrasar plantação de um campo | [`killCropField`](../../apps/game/src/handlers/fazenda/colher.ts#L47) `colher.ts:47` | — | partial |
| 6 PAY_FIELD | `toSpread` — alugar/expandir campos (semana ou mês) | [`payField`](../../apps/game/src/handlers/fazenda/expandir-terreno.ts#L15) `expandir-terreno.ts:15` | — | partial |
| 8 HELPER_PAY_FIELD | `toHelperRenewMoney` — renovar validade do slot de ajudante | [`helperPayField`](../../apps/game/src/handlers/fazenda/ajudante.ts#L20) `ajudante.ts:20` | — | partial |
| 9 HELPER_SWITCH_FIELD | `sendBeginHelper`/`toFarmHelper` — contratar/desligar ajudante | [`helperSwitchField`](../../apps/game/src/handlers/fazenda/ajudante.ts#L32) `ajudante.ts:32` | — | partial |
| 3 ACCELERATE_FIELD | `doMature` — adubar 1 campo com Estrume (`CategoryID 33`) | [`accelerateField`](../../apps/game/src/handlers/fazenda/fertilizar.ts#L36) `fertilizar.ts:36` | sem handler C# (nunca existiu — feature nova, ver seção 4) | **OK** (feature nova, não é porte) |
| 5 COMPOSE_FOOD | `sendCompose` — compor ração/comida a partir de vegetais | [`composeFood`](../../apps/game/src/handlers/fazenda/compor-comida.ts#L31) `compor-comida.ts:31`, receitas em `COMPOSE_RECIPES` (`compor-comida.ts:24`) | sem handler C# (nunca existiu — feature nova) | **OK** (feature nova) |
| 20 FARM_GIFTPACKS | `giftPacks` — presente de ouro 1x/dia por fazenda visitada | [`farmGiftPacks`](../../apps/game/src/handlers/fazenda/pacote-diario.ts#L20) `pacote-diario.ts:20` | sem handler C# (nunca existiu — feature nova) | **OK** (feature nova) |
| "Poultry" (aves) | — | **não existe no cliente** (grep por "poultry" em todo `Source Flash/src` não acha nada) | `UserFarmInfo.PoultryState` só um campo morto no C# | não é feature — não há nada pra portar |

Além do pacote `81`, o cliente também manda `135` (`arrange` —
reorganizar/empilhar campos da fazenda) que **não tem handler nenhum** no
servidor (nem em `fazenda/` nem em outro arquivo) — status `MISSING` em
`research/qa/packet-coverage.tsv`.

Tabelas usadas: `player."Sys_User_Farm"` (uma linha por jogador: ajudante,
árvore do casal, etc.) e `player."Sys_User_Field"` (uma linha por campo
plantado/alugado). Sementes e colheita são itens normais de
`game."Shop_Goods"` guardados nas bolsas `BagType.FarmBag` (13, sementes) e
`BagType.Vegetable` (14, citada no glossário — na prática a colheita cai na
`PropBag` via `giveOrMail()`, `estado.ts:108`, não direto na bolsa `Vegetable`).

## 3. Fluxo passo a passo

### Plantar → acelerar → colher (fluxo principal)
1. Jogador abre a fazenda: cliente manda `81` sub `1` (`ENTER_FARM`) com
   `ownerId = 0` (a própria). `enterFarm` (`entrar-fazenda.ts:14`) devolve um
   snapshot (`farmSnapshot`, sub `1`) com todos os campos carregados de
   `player."Sys_User_Field"` (`loadFarm()`, `estado.ts:48`, cria os 8 campos
   iniciais na primeira vez).
2. Jogador arrasta uma semente (item da `FarmBag`) pro campo: `81` sub `2`
   (`GROW_FIELD`) com `seedTpl` (TemplateID da semente) e `fieldId`.
   `growField` (`plantar.ts:15`) confere que o campo está desbloqueado
   (`isUnlocked`) e vazio (`SeedID === 0`), tira a semente da bolsa
   (`inv.removeCountFromStack`), e grava no campo: `GainCount =
   seedTpl.Property2` (quanto vai colher), `FieldValidDate =
   seedTpl.Property3` (minutos pra maturar, mínimo 1), `PlantTime = agora`.
3. **Maturar**: `isRipe()` (`estado.ts:40`) compara
   `(agora − PlantTime)/60000 + AccelerateTime >= FieldValidDate`. Sem
   acelerar, o jogador só precisa esperar os minutos de `FieldValidDate`
   passarem (não há timer no servidor — a maturação é calculada sob demanda,
   quando o cliente pergunta/tenta colher).
4. **Acelerar** (opcional): `81` sub `18`
   (`FRAM_GROP_FASTFORWARD`) com `useGiftToken` (paga em Cupom vinculado ou em
   Cupom normal/`Money`), `all` (todos os campos prontos pra acelerar ou só
   um) e `fieldId`. Cada campo acelerado ganha `+30 minutos`
   (`FAST_GROW_SUB_MIN`, `estado.ts:28`) de `AccelerateTime`; custo =
   `FastGrowNeedMoney` (config, padrão 10) **vezes a quantidade de campos**
   acelerados de uma vez (`fertilizar.ts:27-31`).
5. **Colher**: `81` sub `4` (`GAIN_FIELD`) com `ownerId = 0` (ou o próprio
   id) e `fieldId`. Confere `isRipe()`; busca o molde da semente
   (`Property4` = TemplateID do produto colhido); dá `GainCount` unidades
   via `giveOrMail()` (bolsa se tiver espaço, senão manda por correio com o
   item anexado — `estado.ts:108-116`); zera o campo (`SeedID = 0`).

### Roubar de um amigo
1. Jogador visita a fazenda do amigo: `81` sub `1` com `ownerId` do amigo.
   `enterFarm` (`entrar-fazenda.ts:14`) carrega o estado da fazenda dele (do
   jogador online em memória, se estiver, senão direto do banco) e marca
   `s.viewing = ownerId`.
2. `81` sub `4` (`GAIN_FIELD`, `colher.ts:16`) com o `ownerId` do amigo e o
   `fieldId`: só funciona se o campo estiver maduro **e** `GainCount > 9` —
   ou seja, só dá pra roubar enquanto a colheita ainda está "fresca" (regra
   espelhada de `PlayerFarm.GainFriendFields` no original, literal em
   `colher.ts:36`). Tira **1 unidade** do `GainCount` do dono, dá 1 unidade
   pro visitante, e avisa o dono (se estiver online) com o campo atualizado.

### Expandir terreno (alugar campos 8-23)
1. `81` sub `6` (`PAY_FIELD`, `expandir-terreno.ts:15`): lista de `fieldId` +
   `months` (`0` = semana, outro valor = mês — mesma convenção de "AUnit" da
   loja).
2. Preço por campo: `FarmFieldWeekPrice`/`FarmFieldMonthPrice` (config,
   padrão `5000`/`18000` ouro); duração em horas:
   `FarmFieldWeekHours`/`FarmFieldMonthHours` (padrão `168`/`720`,
   `expandir-terreno.ts:20`). `total = preço × quantidade de campos` pago de
   uma vez em Ouro. Se o campo já tinha prazo pago no futuro, o novo prazo
   **soma** a partir do prazo atual (não troca); senão conta a partir de
   agora.

### Ajudante (helper)
1. **Contratar/desligar**: `81` sub `9` (`HELPER_SWITCH_FIELD`,
   `ajudante.ts:32`) com `on`, `seedId`, `seedTime` (minutos do ciclo),
   `seedCount`, `getCount` (colheita/campos auto), `payType` (`-2` = Cupom
   vinculado, outro = Cupom normal) e um `price` — **ignorado** (ver correção
   de segurança abaixo).
2. Ligar o ajudante **limpa todos os campos do jogador** (espelha o
   original: contratar o ajudante reinicia o terreno pra ele assumir).
3. **Renovar o slot do ajudante** (não o contrato de semente, o "direito" de
   ter ajudante): `81` sub `8` (`HELPER_PAY_FIELD`, `ajudante.ts:20`) com
   `validity` (dias); preço `FarmHelperWeekPrice`/`FarmHelperMonthPrice`
   (padrão `100`/`300`), pago em Cupom (`Money`+`MoneyLock`).

### Correção de segurança: exploit do preço do ajudante
O C# original (`FarmHandler.cs` via `PlayerFarmInventory`) lia o campo
`price` **direto do pacote** e cobrava exatamente esse valor ao contratar o
ajudante (sub `9`) — um pacote forjado podia contratar de graça ou por
qualquer valor baixo. O port **ignora esse campo** (`pkt.readInt(); //
client-sent price — IGNORED`, `ajudante.ts:40`) e calcula o preço no servidor:
`perMin (config FarmHelperPricePerMin, padrão 2) × seedTime × seedCount`
(`ajudante.ts:41-42`). Testado em
`apps/game/test/marriage-farm-auction.test.ts` (ver seção 5).

## 4. Quero mudar…
- **O que cada semente rende e quanto tempo leva**: não é config do
  servidor — é a própria linha do item-molde da semente em
  `game."Shop_Goods"`: `Property2` = quantidade colhida (`GainCount`),
  `Property3` = minutos pra maturar (`FieldValidDate`), `Property4` =
  TemplateID do produto que cai na bolsa ao colher. Editar via admin (recurso
  de itens, `apps/admin/src/resources/items.ts`) ou SQL direto na tabela.
- **Minutos ganhos por acelerar**: constante `FAST_GROW_SUB_MIN = 30`
  (`estado.ts:28`).
- **Custo de acelerar**: config `FastGrowNeedMoney` (padrão `10` por campo),
  lida em `fertilizar.ts:27` — `game."Server_Config"`.
- **Preço/duração de expandir terreno**: configs `FarmFieldWeekHours`/
  `FarmFieldMonthHours`/`FarmFieldWeekPrice`/`FarmFieldMonthPrice`
  (`expandir-terreno.ts:20-21`).
- **Preço do ajudante**: config `FarmHelperPricePerMin` (padrão `2`,
  `ajudante.ts:41`) pro contrato de semente; `FarmHelperWeekPrice`/
  `FarmHelperMonthPrice` (padrão `100`/`300`, `ajudante.ts:22`) pro slot do
  ajudante.
- **Nível mínimo pra ter fazenda**: constante `MIN_GRADE = 25`
  (`estado.ts:29`).
- **Quantos campos iniciais / capacidade máxima**: constantes
  `STARTER_FIELDS = 8` e `FIELD_CAPACITY = 24` (`estado.ts:25-26`).
- **Regra de roubo (GainCount > 9 pra poder roubar)**: literal `f.GainCount <=
  9` dentro de `gainField` (`colher.ts:36`) — mudar esse número muda a partir
  de qual sobra de colheita um amigo pode roubar.
- **Minutos ganhos por adubar (sub 3)**: `Property1` do item de Estrume
  (`CategoryID 33`) é lido direto — não é config, é a própria linha do item em
  `game."Shop_Goods"`.
- **Receitas de compor comida (sub 5)**: tabela `COMPOSE_RECIPES`
  (`compor-comida.ts:24`, literal no código — copiada de
  `apps/api/assets/request/foodcomposelist.xml`, 12 linhas: 3 comidas × 4
  vegetais × 10 cada). O C# original (`FoodComposeListInfo`) nunca leu isso de
  tabela nenhuma, então não existe `game.*` pra essa receita — editar aqui
  significa mudar a constante no arquivo, não uma linha de banco.
- **Presente de ouro ao visitar (sub 20)**: config `FarmGiftPacksMoney`
  (padrão `500`, `pacote-diario.ts:30`), `game."Server_Config"`. Controlado
  por jogador visitado/dia via `Sys_User_Farm.FriendCrop` (string de
  histórico, não uma tabela separada).
- Essas três (`3`/`5`/`20`) são **features novas**, não porte de C# — o
  original nunca implementou nenhuma (confirmado por grep nos três repositórios
  vendor); documentado como tal no cabeçalho de cada arquivo pra não confundir
  com um porte de comportamento real. Ver `research/qa/port-D.md` ("Pass 2")
  pro levantamento completo.
- **Portar `135` (arrange — reorganizar campos)**: não tem handler nenhum
  ainda (nem stub); é um pacote próprio, separado do `81`. Ver
  `docs/MAPA-DO-JOGO.md` seção Fazenda.

## 5. Testes
- `apps/game/test/marriage-farm-auction.test.ts` (compartilhado com
  [casamento.md](./casamento.md) e [leilao.md](./leilao.md) — citando só os
  blocos de fazenda):
  - `describe("81 FARM — plant, fast-forward, harvest (main flow)")`: planta
    semente real da `FarmBag` (`332100`, Lúa Mì), acelera (confirma que cobra
    `FastGrowNeedMoney` em Money), colhe e confirma que o produto
    (`334104`) cai na bolsa na quantidade certa (`Property2`), e que o campo
    pode ser replantado depois.
  - `describe("81 FARM — helper price exploit")`: confirma que o preço
    cobrado ao ligar o ajudante é o calculado no servidor
    (`FarmHelperPricePerMin × seedTime × seedCount`), não o `price` forjado
    que o pacote de teste manda (`1`).
- `apps/game/test/farm-compose-hotspring-rooms.test.ts` — adubar consome o
  fertilizante certo, compor comida consome os 4 ingredientes (e falha sem
  consumo parcial se faltar algum), presente de ouro só 1x/dia por dono
  visitado.
- Status: **quase tudo OK**. Plantar/acelerar/colher/roubar/expandir/ajudante/
  adubar/compor comida/presente de visita — todos implementados e testados.
  **Falta de verdade**: só o pacote `135` (`arrange` — reorganizar campos),
  que não tem handler nenhum ainda (nem stub). "Poultry" não é uma lacuna —
  não existe no cliente, não há nada pra implementar (ver seção 2). O handler
  `81 FARM` ainda está marcado `"partial"` no registro só por causa do `135`
  separado e de sub-casos desconhecidos cair no `default` (log, sem crash).
