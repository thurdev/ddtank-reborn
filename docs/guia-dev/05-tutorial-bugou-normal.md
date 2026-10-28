# Tutorial guiado: "Castelo do Bugou (Pve 1) no Normal ainda está bugado"

Relato: a masmorra **Lâu đài Gà** ("Castelo do Bugou"/Gulu Kingdom, `Pve_Info` ID 1) no
**Normal** ainda tem um bug conhecido e **não corrigido** — registrado em
[`docs/qa/PVE-QA.md`](../qa/PVE-QA.md) ("1 | Lâu đài Gà | ... | Normal ⚠️ `OnShooted`
null (donor-fiel) | ...") e em [`docs/guides/pve.md` §1.3](../guides/pve.md). Este tutorial
te leva até o ponto exato do bug com dados reais — a partir daí, **você** decide a correção
e aplica. Cada passo tem uma `<details>` com dica (se quiser pensar sozinho primeiro) e uma
com a resposta (se quiser confirmar).

> Por que eu (a IA) não corrigi isto já: o pedido foi documentação, e esta tarefa é
> especificamente pra você PRATICAR o processo de achar/corrigir — não só ler a resposta.
> O código abaixo é 100% real (copiado do repositório), só a correção final fica por sua
> conta.

## Passo 0 — Reproduzir

Esta masmorra já foi corrigida duas vezes antes (migrações `0027`/`0028` e `0030`/`0031` —
ver `docs/guides/pve.md` §1.1/1.2): a cadeia de fases e as cartas já funcionam até o fim.
O bug que resta é uma **corrida rara**, não uma trava — pode não aparecer em toda tentativa.

1. `pnpm dev:all`, entre com uma conta de teste (nunca a conta real do dono).
2. Prédio **Ải viễn chinh** → **Bắt đầu** → *Phó bản* → escolha **Lâu đài Gà** →
   dificuldade **Normal** → comece a masmorra (sozinho ou com outro jogador de teste).
3. Avance até a fase 3 (a luta do "Rei Galinha" — dois reis em sequência, no mesmo mapa).
4. Fique atirando sem parar bem no momento em que o PRIMEIRO rei morre e o SEGUNDO
   aparece.

<details><summary>Dica — por que isso é difícil de reproduzir manualmente</summary>

O bug é uma corrida entre dois eventos que normalmente não colidem: "o tiro do jogador
acerta algo" (que roda imediatamente) e "o motor confere se pode trocar de chefe" (que roda
no próprio ritmo do jogo, não na hora do tiro). Jogando manualmente é sorte. A forma
CONFIÁVEL de reproduzir é um teste automatizado — passo 1 abaixo já te dá o caminho.

</details>

<details><summary>Resposta — reprodução confiável (não precisa jogar manualmente)</summary>

`packages/fight/test/pve-playthrough-sweep.test.ts` já reproduziu isto de verdade jogando
com bots reais (é como o bug foi achado originalmente, tarefa `pve-qa` 2026-10-27). Pra ver
o erro de novo sem esperar sorte:

```bash
PVE_SWEEP=1 pnpm --filter @ddt/fight exec vitest run test/pve-playthrough-sweep.test.ts
```

Isso roda TODAS as combinações (masmorra, dificuldade) — o Gulu Kingdom Normal é uma delas.
O log (`console.log`, não falha o teste) relata os problemas "ainda em aberto" encontrados.

</details>

## Passo 1 — Observar

Com `?debug=true` no cliente e `PACKET_TRACE=true` no servidor, o que você procura é um
erro no **log do SERVIDOR** (não do cliente) do tipo:

```
pve script GameServerScript.AI.Messions.GT1173 OnShooted error: Cannot read properties of null (reading 'Say')
```

(mensagem exata pode variar — o importante é "script ... OnShooted error" e alguma
referência a `null`.) O jogo **não trava** quando isso acontece — o motor PvE isola erro de
script com try/catch (igual o C# original), então a batalha continua; só aquela ação do
script (uma fala do chefe) não acontece. É por isso que o bug é fácil de não notar jogando.

**Admin → Instâncias → Lâu đài Gà → Diagnóstico** não mostra isso — diagnóstico de cadeia
confere se as FASES existem, não erros de runtime dentro de uma fase que já roda. Pra esse
tipo de bug, o log do servidor (ou o sweep do passo 0) é a única fonte.

<details><summary>Dica</summary>

Qual classe de script trata a fase 3 desta masmorra no Normal? Veja
`packages/fight/src/pve/scripts/generated/Game/GuluKingdomNormalGame.ts`.

</details>

<details><summary>Resposta</summary>

```ts
// GuluKingdomNormalGame.ts
OnCreated() {
  this.Game.SetupMissions("1172,1173,1176");
  this.Game.TotalMissionCount = 3;
}
```

A fase `1173` é a luta dos "dois reis" — o script dela (`Mission_Info.Script` da linha
`Id=1173`) é `GameServerScript.AI.Messions.GT1173`
(confirmado no registro `packages/fight/src/pve/scripts/generated/index.ts:727`:
`["GameServerScript.AI.Game.GuluKingdomNormalGame", C46]` pra masmorra, e a classe
`GT1173` registrada com o mesmo padrão pra fase).

</details>

## Passo 2 — Localizar o código exato do bug

Abra `packages/fight/src/pve/scripts/generated/Messions/GT1173.ts`. Ache os métodos
`CanGameOver()` e `OnShooted()`.

<details><summary>Dica</summary>

`CanGameOver()` roda a cada checagem do motor (não a cada tiro). `OnShooted()` roda a cada
vez que QUALQUER tiro acerta algo em cena. Os dois métodos leem/escrevem os MESMOS dois
campos: `this.simpleBoss_0` e `this.simpleBoss_1`. Um deles pode estar `null` quando o
outro roda?

</details>

<details><summary>Resposta — o código exato</summary>

```ts
// CanGameOver() — cria o 2º rei só quando o 1º morre
CanGameOver() {
  super.CanGameOver();
  if (!this.simpleBoss_0.IsLiving && this.int_1 == this.int_4) {
    this.int_1++;
  }
  if (this.int_1 == this.int_5 && this.simpleBoss_1 == null) {
    this.simpleBoss_1 = super.Game.CreateBoss(this.int_1, this.simpleBoss_0.X, this.simpleBoss_0.Y, this.simpleBoss_0.Direction, 1, "");
    // ... (fala, delay, etc.)
  }
  // ...
}

// OnShooted() — roda a cada tiro que acerta algo
OnShooted() {
  super.OnShooted();
  if (this.int_3 == 0) {
    if (this.simpleBoss_0.IsLiving) {
      // ... fala do 1º rei, ok
    }
    else {
      let num2 = super.Game.Random.Next(0, GT1173.string_1.length);
      this.simpleBoss_1.Say(GT1173.string_1[num2], 0, 1500); // <-- AQUI
    }
    this.int_3 = 1;
  }
}
```

**O bug**: `OnShooted()` entra no `else` (1º rei morreu) e chama
`this.simpleBoss_1.Say(...)` **sem checar se `simpleBoss_1` já foi criado**. Se um tiro
acertar algo bem no instante em que o 1º rei acaba de morrer — ANTES do próximo
`CanGameOver()` rodar e criar o `simpleBoss_1` — `this.simpleBoss_1` ainda é `null`, e
`null.Say(...)` quebra.

</details>

## Passo 3 — Comparar com o C# doador

Isto é importante: será que o bug é do **transpilador** (a conversão AS3/C#→TS introduziu
um erro que não existia) ou é um bug **genuíno do jogo original**? Compare com
`vendor/_qa-mission-sources/ddt-34-csharp/Game.Server/GameServerScript/AI/Messions/GT1173.cs`
(fonte C# mais completa que o `vendor/DDTank4.1` tem pra esta classe — ver o comentário em
`packages/fight/src/pve/scripts/manual/gulu-kingdom-king-missing-ctor.ts` que já cita essa
mesma fonte pra outro bug desta masmorra).

<details><summary>Dica</summary>

Procure o método `OnShooted` no arquivo `.cs`. A estrutura do `if/else` é idêntica?

</details>

<details><summary>Resposta</summary>

```csharp
public override void OnShooted()
{
    base.OnShooted();
    if (int_3 == 0)
    {
        if (simpleBoss_0.IsLiving)
        {
            int num = base.Game.Random.Next(0, string_1.Length);
            simpleBoss_0.Say(string_1[num], 0, 1500);
        }
        else
        {
            int num2 = base.Game.Random.Next(0, string_1.Length);
            simpleBoss_1.Say(string_1[num2], 0, 1500);   // <-- mesmo acesso sem checar null
        }
        int_3 = 1;
    }
}
```

**É um bug genuíno do jogo original** (C# original do DDTank 4.1), não um erro de
conversão — o transpilador converteu certo. Isso significa: a correção é uma melhoria
real sobre o original, não uma "restauração" de comportamento — decisão sua se quer
reproduzir o bug fielmente (manter) ou corrigir (jogo melhor que o original). O resto deste
tutorial assume que você quer corrigir.

</details>

## Passo 4 — Formar a hipótese

<details><summary>Dica</summary>

Existe outro método NESTE MESMO arquivo que já faz a checagem certa antes de acessar
`simpleBoss_0`/`simpleBoss_1`. Qual é, e o que ele faz diferente de `OnShooted`?

</details>

<details><summary>Resposta</summary>

`DoOther()` (algumas linhas acima de `OnShooted` no mesmo arquivo) já protege com
`if (this.simpleBoss_0 != null)` antes de usar. `OnShooted` deveria fazer o mesmo tipo de
checagem — tanto pra `simpleBoss_0` (que na prática nunca é `null` depois de
`OnStartGame`, mas custa nada confirmar) quanto, principalmente, pra `simpleBoss_1` (que
PODE ser `null` até `CanGameOver` criar).

**Hipótese**: adicionar uma checagem `!= null` antes de `this.simpleBoss_1.Say(...)`
resolve sem mudar mais nada — se `simpleBoss_1` ainda não existe, simplesmente não tem fala
nenhuma pra tocar nesse tiro (comportamento razoável: o tiro aconteceu "entre" os dois
reis, não tem ninguém pra falar ainda).

</details>

## Passo 5 — Decidir onde corrigir (e por quê)

Duas opções:

- **A. Editar `generated/Messions/GT1173.ts` direto.** NÃO FAÇA — esse arquivo é
  regenerado pelo transpilador (`pnpm --filter @ddt/fight transpile-pve`); sua edição se
  perde na próxima rodada.
- **B. Criar/estender um arquivo em `packages/fight/src/pve/scripts/manual/`** que
  sobrescreve `OnShooted` com a versão corrigida, registrado com o MESMO nome completo
  (`GameServerScript.AI.Messions.GT1173`) — é o padrão usado por TODA correção desta pasta,
  inclusive a outra correção JÁ aplicada nesta mesma masmorra
  (`gulu-kingdom-king-missing-ctor.ts`, que corrige o construtor de `GT1173`/`GK1273`).

<details><summary>Dica — onde colocar</summary>

Você pode estender o arquivo manual que JÁ EXISTE pra esta masmorra
(`gulu-kingdom-king-missing-ctor.ts`, que já sobrescreve `GT1173`/`GK1273`) em vez de criar
um arquivo novo — ele já importa e registra as duas classes.

</details>

<details><summary>Resposta — o patch sugerido</summary>

Em `packages/fight/src/pve/scripts/manual/gulu-kingdom-king-missing-ctor.ts`, adicione o
método `OnShooted` corrigido nas duas classes que já são estendidas ali
(`GT1173Fixed`/`GK1273Fixed` — o Difícil tem a mesma classe `GK1273` com o mesmo bug):

```ts
class GT1173Fixed extends GT1173 {
  constructor() {
    super();
    this.int_1 = 1105; this.int_4 = 1105; this.int_5 = 1106; this.int_6 = 1110;
  }
  // NOVO — corrige o null-deref quando simpleBoss_1 ainda não foi criado
  OnShooted() {
    if (this.int_3 === 0) {
      if (this.simpleBoss_0?.IsLiving) {
        const num = this.Game.Random.Next(0, GT1173.string_1.length);
        this.simpleBoss_0.Say(GT1173.string_1[num], 0, 1500);
      } else if (this.simpleBoss_1) {
        const num2 = this.Game.Random.Next(0, GT1173.string_1.length);
        this.simpleBoss_1.Say(GT1173.string_1[num2], 0, 1500);
      }
      // simpleBoss_1 ainda null: nenhuma fala toca neste tiro — comportamento razoável
      this.int_3 = 1;
    }
  }
}
```

(repita o mesmo padrão em `GK1273Fixed`, usando `GK1273.string_1`). Confira os nomes exatos
dos campos estáticos (`string_1`) no arquivo gerado antes de colar — podem ter nomes
ligeiramente diferentes entre `GT1173`/`GK1273`.

</details>

## Passo 6 — Testar

**Teste unitário** (mais rápido, determinístico — não depende de sorte de timing):

<details><summary>Dica</summary>

Veja o padrão de teste já usado em `packages/fight/test/pve-playthrough-sweep.test.ts` pra
montar um `PveGame` real com a missão 1173. Force a corrida chamando `OnShooted()`
manualmente logo depois que `simpleBoss_0.IsLiving` virar `false`, mas ANTES de chamar
`CanGameOver()`.

</details>

<details><summary>Resposta — esqueleto do teste</summary>

```ts
// packages/fight/test/pve-gt1173-onshooted.test.ts (exemplo — adapte ao harness real do pacote)
import { describe, it, expect } from "vitest";
// importe o que o harness de PvE já usa (ver pve.test.ts pro setup real de PveGame + bots)

it("GT1173.OnShooted não quebra quando simpleBoss_1 ainda não existe", () => {
  // 1. monte um PveGame real na missão 1173 (Mission_Info Script GameServerScript.AI.Messions.GT1173)
  // 2. avance até simpleBoss_0.IsLiving === false (mate o 1º rei)
  // 3. ANTES de chamar canGameOver() de novo, dispare OnShooted() no script da missão
  // 4. expect(...).not.toThrow()
});
```

</details>

**No cliente real**: jogue a fase 3 desta masmorra no Normal várias vezes tentando atirar
bem na transição dos reis; confirme no log do servidor que o erro `OnShooted error` não
aparece mais.

## Passo 7 — Commitar

```bash
git add packages/fight/src/pve/scripts/manual/gulu-kingdom-king-missing-ctor.ts packages/fight/test/<seu-teste>.test.ts
git commit -m "fix(pve): GT1173/GK1273.OnShooted — evita null-deref quando o 2º rei ainda não existe"
```

Depois de testar e commitar, rode o sweep do Passo 0 de novo — ele não deve mais reportar
este problema na lista de "ainda em aberto" (atualize também
`docs/guides/pve.md` §1.3 removendo este item da lista, já que ele documenta exatamente
este bug como pendente).
