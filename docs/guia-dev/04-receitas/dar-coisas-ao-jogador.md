# Dar ouro, item, nível, VIP a um jogador

**Como verificado**: `addGold`/`addTemplateToBag` testados de verdade via vitest nesta
tarefa (`loggedIn()` + chamadas diretas — passou). O fluxo do admin ("Dar item") foi
confirmado **lendo** `apps/admin/src/resources/players.ts` +
`apps/api/src/routes/admin.ts` (rota real, não clicado no painel).

## Pelo admin (sem código) — pra um jogador específico

Admin → **Jogadores** → abra o jogador:

- **Ouro/Cupons/Medalhas/Mérito**: edite direto os campos `Gold`/`Money`/`GiftToken`/
  `Medal`/`Offer` no formulário e salve — é um `UPDATE` comum em
  `player."Sys_Users_Detail"`. **Só funciona na hora se o jogador estiver OFFLINE** — se
  ele estiver logado, o próximo save do estado em memória do `apps/game` sobrescreve o
  valor do banco (o `GamePlayer` em memória não sabe que o admin mudou nada).
- **Item**: botão **"Dar item"** (ícone de presente) — escolhe o item (busca por nome),
  quantidade, validade e se vai **por correio** (padrão) ou **direto** ("Enviar por
  correio" desmarcado):
  - **Por correio**: sempre funciona (online ou offline) — grava a carta
    (`sendMail`, tabela de correio) e avisa o `apps/game` (`POST /mail-notice` no canal
    interno) pra acender o ícone na hora se o jogador estiver online.
    Ver [`docs/features/correio.md`](../../features/correio.md).
  - **Direto (sem correio)**: só entrega de verdade se o jogador estiver **online** —
    o admin chama `POST /give-item` no canal interno do `apps/game`
    (`apps/api/src/routes/admin.ts:514`), que entrega na bolsa EM MEMÓRIA
    (`GamePlayer.addTemplateToBag`). Se o jogador não estiver online, o admin cai pra um
    insert direto no banco como fallback (vai aparecer só no próximo login).
- **Nível**: campo `Grade` — mesma ressalva de "só na hora se offline".
- **VIP**: não tem campo direto — dê um item carta de VIP (`CategoryID 11`,
  `Property1=23`, `ValidDate`=dias) pelo fluxo "Dar item" acima; o jogador usa a carta
  normalmente (`cardUse()` → `applyVipDays`, ver
  [itens-funcoes.md §3](./itens-funcoes.md#3-dentro-da-categoria-11-a-genérica--o-que-property1-significa)).

## Por código (dentro de um handler/script)

```ts
p.addGold(1000);              // ouro
p.addMoney(500);               // cupom
p.addGiftToken(10);            // medalha de presente
p.addGP(5000, false);          // XP (false = sem bônus de evento/VIP)
p.info.Grade = 30;              // nível direto (chame p.updateProperties() depois)
p.updateProperties();

const tpl = ctx.templates.findItem(7001)!;
const item = ItemInfo.createFromTemplate(tpl, 1, 101, new Date()); // (template, count, source, now)
p.addTemplateToBag(item, 0, 1); // 0 = bolsa de equipamento; false se não achou espaço
```

Se a bolsa estiver cheia, mande por correio em vez de falhar silenciosamente — padrão real
usado em `apps/game/src/handlers/loja/comprar.ts` (`mailItems`,
`apps/game/src/handlers/bolsa/correio-excedente.ts`):

```ts
if (!p.addTemplateToBag(item, 0, 1)) {
  await mailItems(ctx, p.id, p.info.NickName, "Sistema", "Item", [{ templateId: tpl.TemplateID, count: 1 }]);
}
```

Dar VIP por código: `applyVipDays(p.info, dias, ctx.now())` (`apps/game/src/game/vip.ts`) +
`p.send(Out.openVip(p.info))` + `p.updateProperties()` (mesmo padrão de
`usar-carta.ts` caso `Property1===23`).

## Como testar sem tocar numa conta real

```ts
const { player } = await loggedIn(server); // server = await startServer()
const p = player();
const before = p.info.Gold;
p.addGold(1000);
expect(p.info.Gold).toBe(before + 1000);
```

Detalhe completo do padrão de teste: [testes.md](./testes.md).
