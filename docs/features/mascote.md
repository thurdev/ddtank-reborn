# Mascote

## 1. O que é no jogo
A bolsa de mascotes (pets): adotar, alimentar, renomear, liberar, reverter
evolução, equipar/trocar habilidade, "subir estrela" (rising star), evoluir, formar
(fusão de forma), colocar pra seguir/chamar, lutar/não lutar junto, e comprar item
de EXP de pet. Tudo entra pelo mesmo pacote guarda-chuva `68 PET`.

## 2. Onde fica no código
Desde a refatoração de legibilidade, o roteador de `68 PET` mora em
`apps/game/src/handlers/mascote/` — um arquivo por ação, montado em
`mascote/index.ts` (dispatcher `petCommand()`, um `switch` por sub-código, não
mais um `SubRouter`).

| Ação (sub-código de `68 PET`) | Servidor TS | C# original | Tabelas |
|---|---|---|---|
| Roteador geral | [`petCommand`](../../apps/game/src/handlers/mascote/index.ts#L48) `mascote/index.ts:48` | `PetHandler.cs` → `PetLogicProcessor` | `game."Pet_Template_Info"`, `player."Sys_Users_Pet"` |
| Bolsa do mascote (consultar) | sub 1 | [`updatePet`](../../apps/game/src/handlers/mascote/listar.ts) `listar.ts` | `UpdatePet.cs` | — |
| Chocar ovo | sub 2 | [`addPet`](../../apps/game/src/handlers/mascote/chocar-ovo.ts) `chocar-ovo.ts` | `AddPet.cs` | `game."Pet_Template_Info"` |
| Alimentar | sub 4 | [`feed`](../../apps/game/src/handlers/mascote/alimentar.ts) `alimentar.ts` | `FeedPet.cs` | `game."Pet_Moe_Property"` |
| Adotar / atualizar oferta | sub 5/6 | [`refresh`/`adopt`](../../apps/game/src/handlers/mascote/adotar.ts) `adotar.ts` | `RefereshPet.cs`/`AdoptPet.cs` | `game."Pet_Template_Info"` |
| Equipar habilidade | sub 7 | [`equipSkill`](../../apps/game/src/handlers/mascote/habilidade.ts) `habilidade.ts` | `EquipSkillPet.cs` | `game."Pet_Skill_Info"` |
| Soltar pet | sub 8 | [`release`](../../apps/game/src/handlers/mascote/soltar.ts) `soltar.ts` | `ReleasePet.cs` | `player."Sys_Users_Pet"` |
| Renomear | sub 9 | [`rename`](../../apps/game/src/handlers/mascote/renomear.ts) `renomear.ts` | `RenamePet.cs` | `player."Sys_Users_Pet"` |
| Levar pra luta (equipar/desequipar) | sub 17 | [`fight`](../../apps/game/src/handlers/mascote/equipar-luta.ts) `equipar-luta.ts` | `FightPet.cs` | — |
| Reverter | sub 18 | [`revert`](../../apps/game/src/handlers/mascote/reverter.ts) `reverter.ts` | `RevertPet.cs` | `player."Sys_Users_Pet"` |
| Equipar/remover item de pet | sub 20/21 | [`addEquip`/`delEquip`](../../apps/game/src/handlers/mascote/equipamento.ts) `equipamento.ts` | `AddPetEquip.cs`/`DelPetEquip.cs` | — |
| Estrela ascendente | sub 22 | [`risingStar`](../../apps/game/src/handlers/mascote/estrela-ascendente.ts) `estrela-ascendente.ts` | `PetRisingStar.cs` | `game."Pet_Star_Exp"` |
| Evolução | sub 23 | [`evolution`](../../apps/game/src/handlers/mascote/evolucao.ts) `evolucao.ts` | `PetEvolution.cs` | — |
| Devorar | sub 33 | [`eat`](../../apps/game/src/handlers/mascote/devorar.ts) `devorar.ts` | `EatPet.cs` | — |
| Lógica pura (nível por GP, prop, evolução, fome) | — | [`game/pets.ts`](../../apps/game/src/game/pets.ts) | `PetMgr.cs`, `UsersPetInfo.cs` | — |
| `216 CARDS_DATA` (cartas, tela separada, mesmo pacote histórico) | [`cardCommand`](../../apps/game/src/handlers/mascote/cartas.ts) `mascote/cartas.ts` | `CardDataHandler.cs` | ver [cartas.md](./cartas.md) |

## 3. Fluxo passo a passo (exemplo: alimentar)
1. Cliente manda `68 PET` sub `4` (`PetsEatView`) com o item de comida e a quantidade.
2. `petCommand()` (`mascote/index.ts`) lê o sub-código e chama `feed()`
   (`mascote/alimentar.ts`), que usa `feedPet()` de `game/pets.ts`: calcula o
   quanto a comida reduz a "fome" (`PetHappyStar`, via `reduceProp()`) e aumenta
   GP/propriedades (`buildProp()`).
3. `petLevelForGp()`/`petGpForLevel()` (`game/pets.ts:88,96`) recalculam o nível do
   pet a partir do GP acumulado, limitado por `petMaxLevel(breakGrade)` (`:62`).
4. `petsChanged()` (`mascote/comum.ts`) notifica o cliente (stats e/ou lista de
   pets) e marca o pet sujo pra salvar.

## 4. Quero mudar…
- **Nível máximo por grau de evolução (`breakGrade`)**: `petMaxLevel()` em
  `apps/game/src/game/pets.ts:62`.
- **GP necessário por nível**: tabela `game."Pet_Level"` (carregada em `levelGp` de
  `PetTables`, `game/pets.ts:16`).
- **Quanto a fome do pet reduz com cada alimento**: `reduceProp()`
  (`game/pets.ts:55`) + tabela `game."Pet_Moe_Property"`.
- **Habilidades disponíveis por tipo/nível**: `petSkillsByKind()` (`game/pets.ts:111`)
  + tabelas `game."Pet_Skill_Info"`/`game."Pet_Skill_Template_Info"`.
- **Custo de "subir estrela"**: tabela `game."Pet_Star_Exp"`.
- Nenhuma dessas tabelas tem recurso dedicado no admin ainda (editar via SQL/seed,
  ou criar `ResourceDef` em `apps/admin/src/resources/`).

## 5. Testes
- `apps/game/test/pets-advanced.test.ts` — adoção, reversão, atributo de pet equipado.
- `apps/game/test/pets-cards-vip.test.ts` — `describe("pets (PetMgr / UsersPetInfo)")`.
- Status: **OK** (sub-códigos principais implementados) — ver `research/qa/packet-coverage.tsv` código `68 PET` pra lista completa.
