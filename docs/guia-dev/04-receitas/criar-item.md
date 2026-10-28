# Criar um item novo (que faz algo quando usado)

**Como testado**: criado um item de teste (`TemplateID 888001`, categoria 11) direto no
banco de teste (PGlite em memória, vitest), confirmado que **antes** do reload o servidor
não via o item (`templates.findItem` retorna `undefined`) e **depois** de
`ctx.templates.load(db, SERVER_ID)` ele aparece e pode ser dado a um jogador
(`addTemplateToBag`). Teste descartado depois (não comitado) — só a tabela/API foi exercitada
de verdade; a tela do admin e o cliente real não foram clicados nesta tarefa.

## 1. Pelo admin (jeito normal)

1. Admin → **Itens** → **Novo**.
2. **TemplateID**: deixe em branco pra gerar o próximo ID livre automaticamente, ou escolha
   um número livre (confira que não colide — a lista já filtra por faixa).
3. **Categoria** (`CategoryID`): decide o comportamento base — ver
   [itens-funcoes.md](./itens-funcoes.md) pra tabela completa. Pra um consumível simples,
   use **11 Consumível/material**.
4. **Nome**, **Qualidade**, **Pic** (nome da pasta/arquivo de imagem — ver
   [trocar-icone-imagem.md](./trocar-icone-imagem.md)/[adicionar-icone-imagem-nova.md](./adicionar-icone-imagem-nova.md)).
5. Seção **Atributos**: `Attack`/`Defence`/`Agility`/`Luck` só valem pra equipamento
   (categorias 1-9/13-17/40); pra um consumível deixe 0.
6. Seção **Regras**: marque `CanUse` (ou `CanEquip` se for equipamento). `CanDelete=true`
   normalmente (controla se o item é consumido ao usar).
7. **Property1-8**: o campo cru não tem seletor amigável ainda — preencha direto o número
   seguindo a tabela de [itens-funcoes.md §3](./itens-funcoes.md#3-dentro-da-categoria-11-a-genérica--o-que-property1-significa)
   (ex. `Property1=21` + `Property2=<xp>` = pílula de GP).
8. Salvar. O admin já dispara `/reload-templates` no `apps/game` sozinho (não precisa
   reiniciar nada).
9. (Opcional) botão **"Adicionar à loja"** na linha/tile do item: abre um formulário que
   cria a oferta em `game."Shop"` (aba, preço, moeda, limite) sem precisar editar SQL —
   ver `apps/admin/src/resources/items.ts` `addToShopAction`.

## 2. Verificando que deu certo

- **No servidor**: logue, abra o painel de debug de pacotes (`?debug=true`) e dê o item a
  si mesmo via [dar-coisas-ao-jogador.md](./dar-coisas-ao-jogador.md) — confira que ele
  aparece na bolsa certa (categoria 11 → aba Prop) com o ícone/nome certos.
- **No código** (equivalente ao teste que fiz): `ctx.templates.findItem(templateId)` tem
  que devolver a linha — se vier `undefined` depois de salvar no admin, o
  `/reload-templates` não rodou (confira o log do `apps/game` ou clique manualmente em
  **Servidor → Recarregar templates**).
- **Testar o comportamento de uso**: siga
  [item-com-menu-e-acao.md](./item-com-menu-e-acao.md) pra testar o pacote `183 CARD_USE`
  (ou `186 PROP_USE`) de ponta a ponta.

## 3. Item que dá algo ao ser aberto (caixa) — sem escrever código

Categoria **11** com `Property1=6` (`EquipType.isPackage`) vira uma **caixa** — o menu
mostra "Abrir" em vez de "Usar", e o servidor sorteia recompensas de
`game."Shop_Goods_Box"` (`createItemBox`, `apps/game/src/handlers/bolsa/abrir-caixa.ts:36`)
quando o jogador manda `63 ITEM_OPENUP`. Pra configurar o pool de prêmios: crie linhas em
`Shop_Goods_Box` com o mesmo `TemplateId` da caixa — cada linha com `IsSelect=true` é
**garantida**, e entre as `IsSelect=false` uma é sorteada por peso (`Random`). Hoje sem
recurso admin dedicado pra essa tabela — editar via `drizzle-kit studio`
(`pnpm --filter @ddt/db db:studio`) ou criar um `ResourceDef` novo
(copie `apps/admin/src/resources/items.ts` como base).

## 4. Pra uma ação totalmente nova (não é buff nem caixa)

Veja [item-com-menu-e-acao.md](./item-com-menu-e-acao.md).
