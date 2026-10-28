# Adicionar um pacote novo (cliente ↔ servidor)

**Como verificado**: todo o lado SERVIDOR testado de ponta a ponta nesta tarefa (handler
novo registrado em `server.handlers.player(...)`, pacote enviado por um `FakeClient` real,
resposta recebida e conteúdo confirmado via vitest). Achado ao testar: **códigos de pacote
`>= 512` são dropados silenciosamente** pelo dispatcher — detalhe que não estava em nenhum
doc antes desta tarefa. O lado CLIENTE foi confirmado lendo o código-fonte real
(`GameSocketOut.ts`/`SocketManager.ts`/`ePackageType.ts`), não testado com o cliente de
verdade.

## 1. Escolha o código

Pacotes são identificados por um número (`code`), **livre nos dois lados** mas com uma
regra rígida: **tem que ser menor que 512** — o dispatcher do servidor dropa qualquer
pacote com `code >= 512` sem log nenhum (`apps/game/src/session/client.ts:84`,
`if (code < 0 || code >= 512) return;`). Confira que o número que você quer usar não está
ocupado: `grep -rn "r.player(SEU_NUMERO" apps/game/src/handlers/` e
`apps/game/HANDLERS.md`.

## 2. Lado cliente — enviar

Em `apps/client/src/game/ddt/manager/GameSocketOut.ts`, adicione o nome do código em
`apps/client/src/game/ddt/data/socket/ePackageType.ts` e um método de envio:

```ts
// ePackageType.ts
static readonly MINHA_ACAO: number = 498; // < 512, livre

// GameSocketOut.ts
sendMinhaAcao(bagType: number, place: number): void {
  const pkg = new PackageOut(ePackageType.MINHA_ACAO);
  pkg.writeByte(bagType);
  pkg.writeInt(place);
  this.sendPackage(pkg);
}
```

Chame `SocketManager.Instance.out.sendMinhaAcao(...)` de dentro da view/botão que vai
disparar a ação.

## 3. Lado cliente — receber uma resposta (se precisar)

Se o servidor manda um pacote de volta com dado próprio (não só `3 SYS_MESSAGE`), trate em
`SocketManager.ts`: ache o `switch` por código, adicione um `case` que lê o `PackageIn` na
mesma ordem que o servidor escreveu e dispara um `CrazyTankSocketEvent` pra quem escuta.

## 4. Lado servidor — handler

```ts
// apps/game/src/handlers/<sistema>/minha-acao.ts
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import { GSPacket } from "@ddt/protocol";

export function minhaAcao(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const bagType = pkt.readByte();
  const place = pkt.readInt();
  // ... lógica real ...
  p.sendMessage(0, "Feito!");
}

export function registerMinhaAcao(r: HandlerRegistry): void {
  r.player(498, "MINHA_ACAO", minhaAcao);
}
```

Registre a função `registerMinhaAcao` no índice do sistema
(`apps/game/src/handlers/<sistema>/index.ts`) e atualize
`apps/game/HANDLERS.md` (tabela código → nome → status → notas).

## 5. Teste (o roteiro que usei de verdade)

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server.stop(); });

it("MINHA_ACAO responde com SYS_MESSAGE", async () => {
  const { c } = await loggedIn(server);
  c.out(498, (pkg) => { pkg.writeByte(1); pkg.writeInt(0); });
  const r = await c.code(3); // 3 SYS_MESSAGE
  expect(r.pkt.readInt()).toBe(0);
  expect(r.pkt.readString()).toBe("Feito!");
});
```

`c.out(code, fill)` monta e manda o `PackageOut`; `c.code(code, sub?)` espera a próxima
resposta com esse código (lança com a lista de códigos recebidos se der timeout — útil pra
descobrir que código o servidor respondeu de verdade quando não é o que você esperava).
Detalhe completo do harness: [testes.md](./testes.md).

## 6. Verificar no cliente real

`?debug=true` mostra `↑ enviado 498 (0x01F2) MINHA_ACAO — N bytes` e a resposta
`↓ recebido 3 ...`. Se o pacote sair mas nada voltar, confirme que o código é `< 512` (passo
1) e que `registerMinhaAcao` foi chamado no boot (procure `MINHA_ACAO` no log de erro — um
handler que lança exceção aparece como `erro tratando pacote 498` no console, não trava o
resto da conexão).
