# Instâncias PvE (masmorras) — cadeia completa e diagnóstico

Guia detalhado com exemplos de código: [`docs/guides/pve.md`](../../guides/pve.md) — esta
página é o resumo "onde entro e o que confiro primeiro", focado em diagnosticar.

**Como verificado**: lido/confirmado contra `docs/guides/pve.md`, `docs/qa/PVE-QA.md`
(achados reais de 3 tarefas de QA anteriores) e `apps/api/src/lib/pve-diagnostics.ts`. Não
jogado numa masmorra real nesta tarefa.

## A cadeia (de cima pra baixo)

```
Pve_Info (masmorra)         ID = MapId da sala
  └─ *GameScript (por dificuldade: Simple/Normal/Hard/Terror)
       └─ Game.SetupMissions("id1,id2,...")
            └─ Mission_Info (fase)            cada id precisa ter uma linha, senão a cadeia
                 └─ Script (classe da fase)    termina ali mesmo que o script/NPC funcione
                      └─ Game.CreateNpc/CreateBoss(NPC_Info.ID, x, y, ...)
                           └─ Script (IA do NPC/chefe)
            └─ Drop_Condiction (CondictionType=5 "Copy") → Drop_Item   cartas ao fim da fase
```

**O jeito mais comum de "masmorra bugada"**: um `id` da lista de `SetupMissions` não tem
linha em `Mission_Info` (fica tudo normal até ali, a masmorra simplesmente TERMINA cedo —
"tela preta"/"volta pro saguão sem terminar"). Segundo mais comum: a fase existe e funciona,
mas a carta final sai vazia (`Drop_Condiction` não lista a missão). Ver §1.1/1.2 de
`docs/guides/pve.md` pra dois casos reais já corrigidos desse tipo exato.

## Diagnosticar

1. **Admin → Instâncias → abra a masmorra → aba Diagnóstico**: chama
   `GET /api/admin/dungeons/:id/diagnostics` (`apps/api/src/lib/pve-diagnostics.ts`) —
   reconstrói a cadeia de verdade (não só lê a tabela) e avisa quando uma sessão referenciada
   por `SetupMissions` não existe, ou quando falta `Drop_Condiction` pra carta.
2. **Varredura automática** (sem precisar jogar): `packages/fight/test/pve-sweep.test.ts`
   confere TODA combinação (masmorra, dificuldade) e reporta cadeias quebradas via
   `console.log` (não falha o teste — é instrumento de diagnóstico, não regressão):
   ```bash
   pnpm --filter @ddt/fight exec vitest run test/pve-sweep.test.ts
   ```
3. **Cartas sem fonte**: mesma ideia, mas pra `Drop_Condiction`/`Drop_Item`:
   ```bash
   pnpm --filter @ddt/fight exec vitest run test/pve-cards-sweep.test.ts
   ```
4. **Jogar de verdade com bots** (o único que detecta bug de SCRIPT/ENGINE, não só dado
   faltando): mais lento, roda fora da suíte normal:
   ```bash
   PVE_SWEEP=1 pnpm --filter @ddt/fight exec vitest run test/pve-playthrough-sweep.test.ts
   ```
5. **Manual no cliente**: `?debug=true` + `PACKET_TRACE=true` no servidor — jogue a fase e
   confira os pacotes `91 GAME_CMD` indo/voltando; erro de script aparece no log do
   servidor como `pve script ... error` (não trava o jogo — cada chamada de script tem
   try/catch, igual o C# original).

## Admin — editar cada peça

| Peça | Página admin | Campos principais |
|---|---|---|
| Masmorra | **Instâncias PvE** | `ID`, `Name`, `Type` (4 masmorra/5 lab/10 tutorial/3-14 chefe), `LevelLimits`, `*GameScript` por dificuldade |
| Fase | **Fases PvE** | `Id`, `Name`/`Title`/`Success`/`Failure`, `TotalTurn`, `Script`, `TakeCard` |
| NPC | **NPCs** | `ID`, `Blood`, `Attack`/`Defence`/`Agility`/`Lucky`, `Script` (IA), `DropId` |
| Drops/cartas | sem página dedicada hoje | `game."Drop_Condiction"`/`"Drop_Item"` via `drizzle-kit studio` |

Depois de qualquer edição, **Recarregar templates** (automático pelo admin, ou manual em
Servidor) antes de testar — o servidor cacheia tudo em memória.

## Escrever/corrigir um script

Ver [`docs/guides/pve.md` §5](../../guides/pve.md#5-escrever-um-script) — classes base
`AMissionControl`/`APVEGameControl`/`ABrain`, API completa em
[`03-api-referencia.md`](../03-api-referencia.md). Scripts manuais (correções a um script
gerado do doador) vão em `packages/fight/src/pve/scripts/manual/`, registrados em
`manual/index.ts` — **nunca edite `generated/`**, é regenerado.

## Tutorial guiado completo

Quer praticar isso num bug de verdade que ainda existe? Veja
[`05-tutorial-bugou-normal.md`](../05-tutorial-bugou-normal.md).
