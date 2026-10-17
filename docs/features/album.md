# Álbum (Coleção de visuais)

## 1. O que é no jogo
O "Álbum" (`AvatarCollection` no cliente) é a aba da Bolsa onde o jogador ativa, pra
cada peça de fantasia **que ele já possui**, um registro permanente de coleção. Cada
peça pertence a um "conjunto" (`AvatarID`/`ID` de `ClothGroupTemplateInfo`/
`ClothPropertyTemplateInfo`, o mesmo ID nas duas tabelas). Ativar cobra Ouro e, ao
reunir metade ou todas as peças do conjunto, o jogador ganha um bônus permanente de
Dano/Guarda (não é temporário — fica enquanto o conjunto continuar com aquele número
de peças). No Reborn, ativar peça, persistir a coleção e o bônus de atributo estão
todos **portados**.

## 2. Onde fica no código
| O que | Servidor TS | C# original | Tabelas |
|---|---|---|---|
| Ativar peça do conjunto (gasta Ouro) | 402/3 AVATAR_COLLECTION | [`avatarCollectActive`](../../apps/game/src/handlers/progressao/colecao-de-visuais.ts#L24) `handlers/progressao/colecao-de-visuais.ts:24`, registro em `progressao/index.ts` | `AvatarCollectionHandler.cs:17-99` | `game."ClothGroupTemplateInfo"`, `game."ClothPropertyTemplateInfo"`, `player."Sys_Users_AvatarCollection"` |
| Renovar (402/4) | — | [`avatarCollection`](../../apps/game/src/handlers/progressao/colecao-de-visuais.ts#L61) sub 4 | `AvatarCollectionHandler.cs:100-192` | — |
| Bônus de Dano/Guarda do conjunto (half/full) | — | [`getAvatarCollectionBonus`](../../apps/game/src/game/stats.ts#L180) `game/stats.ts:180`, usado em `getBaseAttack`/`getBaseDefence` | `GamePlayer.GetBaseAttack` (`GamePlayer.cs:2538-2556`) / `GetBaseDefence` (`:2626-2644`) | mesmas tabelas acima |
| Persistência da coleção | [`loadAvatarCollection`/`saveAvatarCollection`](../../apps/game/src/db/avatar-collection.ts#L47) `db/avatar-collection.ts:47,57` | `PlayerAvatarCollection.LoadFromDatabase/SaveToDatabase` | `player."Sys_Users_AvatarCollection"` |
| Cache dos templates de conjunto | [`templates.ts:443`](../../apps/game/src/db/templates.ts#L443) (`clothGroups`, `clothProperties`, `countClothGroupWithID`) | `ClothGroupTemplateInfoMgr`/`ClothPropertyTemplateInfoMgr` | `game."ClothGroupTemplateInfo"`, `game."ClothPropertyTemplateInfo"` |
| Pacote de lista (servidor→cliente, no login) | [`Out.avatarCollect`](../../apps/game/src/packets/out.ts#L258) | — | — |

## 3. Fluxo passo a passo
1. Jogador abre a aba Álbum e clica numa peça que já tem equipada/na bolsa: cliente
   manda `402/3 AVATAR_COLLECTION` com `setId` (o `AvatarID`), `templateId` (o item) e
   `sex`.
2. `avatarCollectActive()` confere posse do item (`equipBag.getItemByTemplateID`),
   acha o conjunto (`ClothGroupTemplateInfo` por `setId+templateId+sex`) e a linha de
   bônus (`ClothPropertyTemplateInfo` por `setId`), cobra `group.Cost` em Ouro, e
   adiciona a peça à coleção do jogador (cria a linha se for a primeira peça daquele
   conjunto).
3. Ao atingir **metade** das peças do conjunto (`Math.floor(total/2)`), a coleção fica
   `IsActive=true` por 10 dias (`UserAvatarCollectionInfo.ActiveAvatar`,
   `colecao-de-visuais.ts:47-52`) e o cliente recebe `402/4 AVATAR_COLLECTION DELAY_TIME`
   com o prazo.
4. **Bônus de atributo** (`getAvatarCollectionBonus`, `game/stats.ts`): toda vez que
   `updatePlayerProperties()` roda, cada conjunto que o jogador possui é checado contra
   `countClothGroupWithID(AvatarID)` (total de peças do conjunto):
   - peças ∈ [metade, total) → soma `ClothPropertyTemplateInfo.Damage`/`.Guard` **uma vez**
     em `baseAttack`/`baseDefence`;
   - peças == total (conjunto completo) → soma **em dobro**.
   Isso é exatamente igual ao original (`GamePlayer.GetBaseAttack`/`GetBaseDefence`,
   loop sobre `AvatarCollect.GetAvatarPropertyActived()`). **Não portado de propósito**:
   o C# tem um bug de digitação (`current.IsActive = current.IsExit` em vez de `==`,
   `PlayerAvatarCollection.cs:80`) que força `IsActive=true` em toda coleção existente a
   cada recálculo de stats, só como efeito colateral de montar a lista — isso não muda o
   valor do bônus (que é calculado direto por contagem de peças, não por `IsActive`), e
   `loadAvatarCollection` já só carrega linhas `IsExit=true`, então não há nada pra
   reproduzir aqui.
5. Ao sair/relogar, a coleção é persistida (`saveAvatarCollection`, grava a lista
   `"TemplateID,Sex|..."` em `Data`) e recarregada no login seguinte — o bônus volta a
   ser aplicado automaticamente porque `recalcStats()` lê `this.avatarCollect` de novo.

## 4. Quero mudar…
- **Custo em Ouro por peça / qual peça pertence a qual conjunto**: tabela
  `game."ClothGroupTemplateInfo"` (`Cost`, `TemplateID`, `Sex`, `ID`=conjunto) — sem
  recurso admin dedicado ainda.
- **Bônus de Dano/Guarda do conjunto**: tabela `game."ClothPropertyTemplateInfo"`
  (campos `Damage`, `Guard`; também tem `Attack/Defend/Agility/Luck/Blood` mas o C#
  original nunca lê esses outros campos pra stats — só Damage/Guard) — idem, sem admin.
- **Renovar conjunto (402/4)**: recurso desligado também no C# original (mensagem fixa
  "Tinh nang chua mo"/"Função ainda não disponível") — implementar exigiria decidir um
  custo de renovação que não existe em nenhuma fonte, então foi deixado como está.

## 5. Testes
- `apps/game/test/progression.test.ts` — ativar peça (402/3) end-to-end.
- `apps/game/test/persist-all.test.ts` (describe "Progressão gravada pelo protocolo")
  — ativa 1 de 2 peças (atinge a metade), confere desconto de Ouro, `IsActive=true` e
  persistência da lista de itens após sair e logar de novo.
- `apps/game/test/formulas.test.ts` — `getAvatarCollectionBonus` isolado: sem peças
  suficientes não soma nada, metade soma uma vez, completo soma em dobro, e o valor
  chega em `baseAttack`/`baseDefence` via `computeStats`.
- Status: **OK** — ativar peça, persistir a coleção e o bônus de Dano/Guarda (half/full)
  estão todos portados e testados.
