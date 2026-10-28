# Item que abre um menu e dispara uma ação customizada (ex. minigame)

Pedido comum: um item que, ao clicar na bolsa, mostra um menu ("Abrir"/"Usar") e, ao
escolher, faz algo totalmente seu — abrir uma janela de minigame, dar uma recompensa
especial, o que for. Esta receita cobre as DUAS pontas: o menu que aparece (cliente) e a
ação que o servidor executa.

**Como verificado**: a ponta do SERVIDOR foi testada de verdade nesta tarefa — item novo
(`CategoryID 11`, `Property1=42` livre) inserido no banco de teste, um handler novo
registrado em `server.handlers.player(498, ...)` consumiu o item e deu recompensa, tudo
confirmado via vitest (pacote enviado pelo `FakeClient`, resposta `3 SYS_MESSAGE` com o
texto certo, ouro creditado, item removido da bolsa). Teste descartado depois (nunca
comitado). A ponta do CLIENTE (qual botão aparece, qual `__cellUse` dispara) foi confirmada
**lendo** o código-fonte real (`CellMenu.ts`, `BagCell.ts`, `EquipType.ts`, `BagView.ts`) —
não clicado num navegador nesta tarefa.

## Ponta 1 — qual botão aparece no menu (cliente)

Quando você clica num item da bolsa, `BagCell` (`apps/client/src/game/bagAndInfo/cell/
BagCell.ts`) mostra `CellMenu` (`apps/client/src/game/bagAndInfo/bag/CellMenu.ts`), que
decide os botões em `CellMenu.show()` checando `EquipType` (`apps/client/src/game/ddt/data/
EquipType.ts`) no template do item:

| Função | Condição | Botão |
|---|---|---|
| `EquipType.isCardBox(info)` | `CategoryID == 18` | **Abrir** |
| `EquipType.isPackage(info)` | `CategoryID == 11 && Property1 == "6"` | **Abrir** |
| `EquipType.isPetEgg(info)` | `CategoryID == 35` | **Abrir** |
| `EquipType.canBeUsed(info)` | `CategoryID == 11 && (Property1=="5" && Property2!="0")` ou `Property1=="21"` | **Usar** |

**Pro seu item novo**: a forma de MENOR esforço é usar `CategoryID 11` e um `Property1`
livre + marcar `CanUse=true` na tabela — mas **`EquipType.canBeUsed` só reconhece alguns
valores de `Property1` hoje** (acima). Pra qualquer OUTRO valor aparecer com botão "Usar",
adicione seu próprio caso a `canBeUsed` (ou um método novo tipo `isMeuMinigame`) e chame no
`CellMenu.show()` — igual o padrão que já existe:

```ts
// EquipType.ts
static isMyMinigameTicket(param1: ItemTemplateInfo): boolean {
  return param1.CategoryID == 11 && param1.Property1 == "777"; // escolha um código livre
}
```

```ts
// CellMenu.ts, dentro de show(), ANTES do else-if genérico:
else if (EquipType.isMyMinigameTicket(_loc4_)) {
  this._list.addChild(this._useitem); // reusa o botão "Usar" existente
}
```

## Ponta 2 — o que acontece ao clicar (cliente → pacote)

O clique no botão "Usar" dispara o evento `CellMenu.USE`, escutado por
`BagView.__cellUse()` (`apps/client/src/game/bagAndInfo/bag/BagView.ts:1133`) — é **esse**
método que decide o que fazer, com uma cadeia de `if` por `TemplateID`/`Property1` (veja os
exemplos reais: `WISHBEAD_*` abre `BagStore`, `COLORCARD` abre `UIModuleTypes.CHANGECOLOR`,
`GEMSTONE` abre a forja). Pro seu item, adicione um `if` igual, ANTES do fallback genérico
(`useCard`/`useProp`):

```ts
// BagView.ts, dentro de __cellUse(), antes do "else if (_loc2_.info.TemplateID != EquipType.TRANSFER_PROP)"
if (_loc2_.info.CategoryID == 11 && _loc2_.info.Property1 == "777") {
  // opção A: tudo client-side (minigame visual sem precisar validar no servidor)
  MyMinigameWindow.instance.open(_loc2_.bagType, _loc2_.place);
  return;
}
```

Se o minigame precisa de validação/recompensa de servidor (quase sempre o caso — ouro,
item, XP), a janela client-side manda um pacote próprio quando o jogador "ganha" —
siga [novo-pacote.md](./novo-pacote.md) pra criar `GameSocketOut.sendMyMinigame(...)`. Se a
ação é simples (consumir o item e dar uma recompensa fixa, sem UI própria), o caminho mais
curto é **nem abrir janela nenhuma** e mandar direto o pacote genérico de uso
(`sendUseCard`/`sendUseProp`, código `183`/`186`) — nesse caso seu item cai automaticamente
no fallback de `cardUse()` do servidor (buff genérico) OU você intercepta por `Property1`
dentro do próprio `cardUse()` (ponta 3).

## Ponta 3 — o que o servidor faz (handler)

Você tem duas opções de onde colocar a lógica — escolha pela complexidade:

### Opção A — reaproveitar `183 CARD_USE` (mais simples)

Adicione um `if (t.Property1 === 777)` dentro de `cardUse()`
(`apps/game/src/handlers/bolsa/usar-carta.ts`), no mesmo padrão dos casos `21`
(pílula de GP) e `23` (VIP) que já existem ali:

```ts
if (t.Property1 === 777) {
  if (!item.isValidItem(ctx.now())) continue;
  if (bag && t.CanDelete && !bag.removeCountFromStack(item, 1)) continue; // consome ANTES de dar o prêmio (anti-dupe)
  p.addGold(500);
  p.sendMessage(0, "Minigame! Você ganhou 500 de ouro.");
  continue;
}
```

### Opção B — pacote próprio (quando precisa de parâmetros que `CARD_USE` não manda)

Registre um handler novo, seguindo exatamente [novo-pacote.md](./novo-pacote.md) — é o
padrão que testei de verdade nesta tarefa:

```ts
// apps/game/src/handlers/bolsa/minigame.ts (exemplo)
export function openMinigame(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const bagType = pkt.readByte();
  const place = pkt.readInt();
  const bag = p.getInventory(bagType);
  const item = bag?.getItemAt(place);
  if (!bag || !item || item.template.Property1 !== 777) return p.sendMessage(0, "Item inválido.");
  if (!bag.removeCountFromStack(item, 1)) return; // consome primeiro (anti-dupe), igual abrir-caixa.ts
  p.addGold(500);
  p.sendMessage(0, "Minigame! Você ganhou 500 de ouro.");
}

export function registerMinigame(r: HandlerRegistry): void {
  r.player(498, "OPEN_MINIGAME", openMinigame); // escolha um código LIVRE e < 512
}
```

**Importante, achado ao testar**: o dispatcher dropa silenciosamente qualquer código de
pacote **>= 512** (`apps/game/src/session/client.ts:84`, `if (code < 0 || code >= 512)
return;` — comentário "PacketProcessor drops codes >= 512"). Escolha sempre um código livre
abaixo de 512 (confira que não colide com `apps/game/HANDLERS.md`).

## Padrão anti-dupe (sempre)

Consuma o item **antes** de dar a recompensa (`bag.removeCountFromStack(item, n)` retorna
`false` se não conseguir — aí você aborta sem ter dado nada). É o mesmo padrão de
`abrir-caixa.ts:75` (`openBox`) e `usar-carta.ts` (`cardUse`) — repetir o pacote (replay,
lag, duplo clique) nunca duplica a recompensa porque o item já não está mais lá na segunda
tentativa.

## Como testar a sua versão

Use o padrão exato que verifiquei (adapte pro seu `TemplateID`/código de pacote):

```ts
const { c, player } = await loggedIn(server);
const p = player();
// ... addTemplateToBag do seu item, achar o place via bag.lastAdded[0].Place ...
c.out(498, (pkg) => { pkg.writeByte(1); pkg.writeInt(place); });
const r = await c.code(3); // 3 SYS_MESSAGE
expect(r.pkt.readInt()).toBe(0);
expect(r.pkt.readString()).toContain("500");
```

Detalhe completo de `loggedIn()`/`FakeClient`: [testes.md](./testes.md). No cliente real,
`?debug=true` mostra o pacote saindo (`↑ enviado 498 ...`) e a resposta chegando — confirme
visualmente que o menu mostra o botão certo e a mensagem aparece no chat.
