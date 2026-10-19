# Passe Clássico (Growth Package)

## 1. O que é no jogo
"Passe Clássico" é a tradução escolhida pra `growthpackage.swf` (battle pass):
um trilho de **9 marcos por NÍVEL** (Grade >= 10/20/30/40/45/50/55/60/65).
Cada marco entrega um pacote de itens de verdade por **correio**, sempre em
ordem (nunca pula marco), uma vez cada. No cliente, o ícone fica no hall; ao
clicar, se nenhum marco foi resgatado ainda, aparece um alerta de "comprar";
depois do 1º resgate, clicar em qualquer marco já visível manda direto pegar
o item (sem alerta).

> **Decisão de design (sem pay-to-win, ver `README.md`)**: no servidor
> original, o "comprar" do 1º marco debita **Money** (cupom, moeda real).
> Aqui debita **Gold** (moeda comum, ganhável jogando — drop, missão, venda),
> **nunca Money**. Gold foi escolhido em vez de Honra (`myHonor`) porque Honra
> é só de PvP/ranqueado e excluiria quem joga só PvE do trilho inteiro; Gold é
> universal (todo jogador ganha jogando, de qualquer jeito) e já é o sumidouro
> comum de outras compras configuráveis do jogo (ajudante da fazenda, buff do
> juramento do rei — mesmo padrão `Server_Config` + `removeGold`). **Preço
> default = 0** (1º marco também sai de graça, só por nível — o mais seguro
> possível). Do 2º marco em diante nunca cobra nada, do jeito que o próprio
> design original já fazia (só o 1º resgate paga).

## 2. Onde fica no código
| Ação | Cliente (AS3) | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|---|
| Ícone do hall / abrir a tela | `growthPackage/GrowthPackageManager.as`, `hallIcon/view/HallRightIconView.as:593` | 84 ACTIVITY_PACKAGE sub-cmd 1 (`GROWTHPACKAGE_ISOPEN`=3, push no login) | [`sendGrowthPackageLoginState`](../../apps/game/src/handlers/eventos/passe-classico.ts) `handlers/eventos/passe-classico.ts`, chamado de `session/login.ts` | `GamePlayer.cs:3635-3639` (6600) | `game."Server_Config"` (`IsPromotePackageOpen`) |
| Comprar o 1º marco | `growthPackage/GrowthPackageManager.as` (`sendGrowthPackageOpen`) | 84 ACTIVITY_PACKAGE sub-cmd 1, sub-sub-cmd 1 (`GROWTHPACKAGE_OPEN`) | [`growthPackageHandler`](../../apps/game/src/handlers/eventos/passe-classico.ts) `handlers/eventos/passe-classico.ts`, registrado em `eventos/index.ts` | `ActivityPackageHandler.cs:23-117` (6600; **comentado/morto no 4.1**, ver nota abaixo) | `player."Sys_Active_System_Data"` (`AvailTime`) |
| Pegar o item de um marco já visível | `growthPackage/view/GrowthPackageItem.as:116` (`sendGrowthPackageGetItems`) | 84 ACTIVITY_PACKAGE sub-cmd 1, sub-sub-cmd 2 (`GROWTHPACKAGE_UPDATEDATA`) | mesmo `growthPackageHandler` acima | mesmo `ActivityPackageHandler.cs` case 2 | mesma tabela acima |
| Pacote de itens de cada marco | `growthPackage/data/GrowthPackageInfo.as` (carregado via `ActivitySystemItemsDataAnalyzer`) | `/activitysystemitems.ashx` (já existia, servido nativamente) | `ctx.templates.growthPackage(tier)` em `db/templates.ts`, lendo `game."Activity_System_Item"` `ActivityType=20` | `ActiveMgr.GetGrowthPackage(layer)` | `game."Activity_System_Item"` (58 linhas reais, Quality 0-8) |

**Nota sobre o C# original**: `ActivityPackageHandler.cs` existe nas DUAS
versões, mas só está realmente ligado na 6600 —

- **4.1** (`vendor/DDTank41/Game.Server/Packets/Client/ActivityPackageHandler.cs:31-134`):
  o `case GROWTHPACKAGE` inteiro está dentro de um `#region` **100% comentado**
  (`//case (int)GrowthPackageType.GROWTHPACKAGE: ...`) — nunca rodou em
  produção 4.1.
- **6600** (`vendor/DDT-6600/Source/Game.Server/Game.Server.Packets.Client/ActivityPackageHandler.cs:23-117`):
  o MESMO `case` está **descomentado**, com lógica real (débito de moeda +
  checagem de nível + entrega via correio + avanço do marco).

## 3. Alcançável?
- **Cliente 4.1 (o que o jogo usa hoje, Fase 1 do `README.md`)**: **NÃO**. O
  dispatch do pacote fica comentado em
  `vendor/DDTank41/Source Flash/src/ddt/manager/SocketManager.as:1032-1035`
  (`/*if(_loc2_==GrowthPackageType.GROWTHPACKAGE){...}else*/`), e não existe
  pasta `growthPackage/` nem `growthpackage.swf` em `vendor/DDTank41` nem em
  `apps/api/assets/flash` — o recurso cliente simplesmente não existe pra essa
  versão. Dead code dos dois lados (cliente E, como visto acima, também no C#).
- **Cliente 6600** (`?client=6600` no site, migração em andamento — ver
  `docs/plan/MIGRACAO-6600.md`): **SIM**. `GrowthPackageManager.instance.setup()`
  roda no boot (`ddt/DDT.as:354`) e o clique no ícone despacha pra valer
  (`HallRightIconView.as:593-594`). `growthpackage.swf`/`growthPackage.xml`
  são servidos automaticamente pelo fallback genérico `/flash6600/*` →
  `vendor/DDT-6600/.../ui/turkey/` (`apps/api/src/routes/static.ts`) — sem
  overlay próprio ainda, então o texto que aparece é o turco original (ver
  seção 6, `m5-growthpackage`). O ícone do hall só aparece quando o admin liga
  `IsPromotePackageOpen` (`Server_Config`, default **fechado**, igual ao C#
  original — `GameProperties.cs:240`).

## 4. Fluxo passo a passo
1. No login (cliente 6600 só), se `IsPromotePackageOpen` estiver ligado,
   o servidor manda `84/1/3` (`ISOPEN=true`) + `84/1/1` (estado atual:
   `AvailTime` + 9 flags de conclusão) — `sendGrowthPackageLoginState`.
2. Cliente manda `84` com dois ints: família `1` (`GROWTHPACKAGE`) + sub-cmd
   (`1` OPEN ou `2` UPDATEDATA). `eventos/index.ts` lê o 1º int e despacha
   pra `growthPackageHandler` (sub-cmd 1) ou `activityPackageHandler` (sub-cmd
   2, Ativação do Pintinho — inalterado).
3. `growthPackageHandler` (mesma ordem de checagem do C# original): bolsa
   trancada → nada; throttle de 500ms (`lastGrowthPackageClaim`, mesmo campo
   em memória do `LastOpenGrowthPackage` original, não persiste) → reenvia o
   estado atual sem processar; nível insuficiente pro marco atual (`Grade <
   GROWTH_LEVEL_NEED[tier]`) → mensagem + reenvia estado, nada muda.
4. Se sub-cmd `1` (OPEN) **e** o preço (`PromotePackagePrice`, Gold) é > 0:
   confere saldo **antes** de debitar (bug do original corrigido, ver seção
   5) — sem saldo, mensagem + reenvia estado, nada é cobrado.
5. Busca os itens do marco atual (`ctx.templates.growthPackage(tier)`,
   `Activity_System_Item` `ActivityType=20` filtrado por `Quality=tier`),
   filtra por sexo (`NeedSex`, mesma regra do original) e manda por correio
   (`mailItems`). Se algo foi mandado: avança `AvailTime` (+1), salva em
   `player."Sys_Active_System_Data"`, responde `84/1/2` com o novo estado.

## 5. Bug do original corrigido (nunca repetir)
No C# 6600 (`case 1`, sub-cmd OPEN), `MoneyDirect` debita a moeda **ANTES**
de checar o nível (`method_0`). Se o nível não bate, o código faz
`return 0` direto — **sem reembolso** — e o jogador perde a moeda sem receber
nada. Aqui a ordem é invertida: nível e saldo são checados **antes** de
debitar qualquer coisa. Isso não é um exploit que beneficia o jogador (é
dano a ele), mas cai na mesma regra do `AGENTS.md`/orientação do dono de
nunca replicar um comportamento ruim do original.

## 6. Quero mudar…
- **Ligar/desligar o ícone**: admin → página de configuração do servidor
  (recurso genérico `game-config` sobre `game."Server_Config"`, mesma tabela
  de sempre) → linha `Name="IsPromotePackageOpen"`, `Value="1"` (ligado) ou
  `"0"`/ausente (desligado, default).
- **Preço do 1º marco**: mesma tela, linha `Name="PromotePackagePrice"`,
  `Value` em **Gold** (não Money). Default `0` (ausente = grátis). Só o 1º
  marco cobra; os outros 8 são sempre de graça contanto que o nível bata —
  igual ao design original.
- **Recompensa de cada marco**: `game."Activity_System_Item"`
  (`ActivityType=20`, uma linha por item, `Quality`=índice do marco 0-8) —
  admin → recurso `activity-items` (mesma tabela que `/activitysystemitems.ashx`
  já serve pro cliente, então mudar aqui atualiza a tela E a entrega real ao
  mesmo tempo, sem dessincronizar).
- **Níveis dos marcos**: fixos em código (`GROWTH_LEVEL_NEED` em
  `passe-classico.ts`) — `[10,20,30,40,45,50,55,60,65]`, mesmos números do
  `GrowthPackageModel.gradeList` do cliente. Mudar aqui exige também editar
  o AS3 (fora do escopo deste servidor), então não é um valor pra admin tocar.

## 7. Limitação conhecida (cliente não foi alterado, só servidor)
O cliente 6600 (`GrowthPackageManager.as:173-192`) decide se manda o pacote
de compra comparando **`Self.Money`** (cupom) contra
`ServerConfigManager.growthPackagePrice` ANTES de mandar `sendGrowthPackageOpen`
— se achar que não tem Money suficiente, redireciona pra tela de recarga e
**nunca chega a mandar o pacote**, mesmo que o jogador tenha Gold de sobra.
Com o preço default (`0`) isso nunca acontece (`0 < 0` é sempre falso). Se o
admin configurar um preço em Gold **maior que zero**, jogadores com saldo de
Money abaixo desse número (praticamente todo mundo, servidor sem
pay-to-win) vão cair nessa tela sem conseguir comprar, mesmo com Gold
suficiente. Corrigir de verdade exige remendar o AS3 do `growthpackage.swf`
(fora do escopo deste agente — cliente/arte) — listado como `m5-growthpackage`
abaixo. **Recomendação**: manter o preço em `0` até esse remendo existir.

## 8. Trabalho de cliente/arte pendente (não feito aqui)
- `m5-growthpackage`: (a) corrigir o AS3 citado na seção 7 pra comparar Gold
  em vez de Money; (b) remaster HD + tradução PT-BR do `growthpackage.swf`
  (hoje serve o original em turco, sem overlay — mesma pendência de
  `m5-remaster-telas-novas`/`m5-i18n-telas-novas` em `docs/plan/TASKS.md`).

## 9. Testes + status
- `apps/game/test/client-6600-m4-passe-classico.test.ts`: fechado por
  padrão (nada no login, OPEN é no-op), aberto (login manda ISOPEN+estado),
  nível insuficiente (nada cobrado/avançado), preço `0` (1º marco grátis,
  recompensa real por correio), preço configurado sem saldo (nada cobrado —
  cobre o bug corrigido da seção 5), preço configurado com saldo (cobra só
  o 1º marco, os seguintes são de graça).
- Status: **OK** no servidor (packet 84 sub-cmd 1, admin gate, preço em Gold
  configurável, recompensa real via `Activity_System_Item`). **Falta**:
  remaster/PT-BR do SWF e o remendo de UI client-side da seção 7 (ambos
  `m5-growthpackage`, fora do escopo deste agente).
