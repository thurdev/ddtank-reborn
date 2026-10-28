# Trocar um ícone/imagem existente

Existem **duas famílias** de imagem no jogo, com fluxo de edição diferente. Descubra qual é
antes de editar.

**Como verificar esta receita**: lida por completo (`ASSETS.md`, `DEBUG.md`,
`apps/api/src/routes/admin.ts`, `apps/api/src/lib/item-icon.ts`, `apps/admin/src/pages/
Assets.tsx`, `apps/admin/src/resources/ItemIconGenerator.tsx`) e confirmada contra o código
real; **não executada ao vivo** nesta tarefa porque `apps/client/public/assets` é uma
junction somente-leitura no worktree (o dono está remapeando essas mesmas imagens no
checkout principal agora — tocar nelas aqui seria sobrescrever o trabalho dele). Pra
confirmar você mesmo: abra `?debug=true`, clique no elemento, confira que o caminho do log
bate com o padrão descrito abaixo.

## Família A — arte de UI exportada de SWF (hall, botões, janelas)

Vem de `apps/client/public/assets/flash/ui/...` (cada SWF virou uma pasta com
`library.json` + PNGs — ver [`docs/client-pixi/ASSETS.md`](../../client-pixi/ASSETS.md)).
Servida DIRETO pelo Vite, sem backend no meio.

1. **Ache o arquivo**: `?debug=true` → clique no elemento → o log mostra algo como
   `arte: flash/ui/vietnam/swf/hall #13 → flash/ui/vietnam/swf/hall/shapes/13.png`.
2. **Edite**: troque esse PNG no disco **mantendo o nome exato**. Pode mudar a resolução —
   o jogo desenha no retângulo (`r: [x,y,w,h]`) do caractere no `library.json`, então um PNG
   2x fica nítido no mesmo lugar sem editar JSON.
3. **Recarregue** a página (Vite serve o arquivo novo direto, sem build). Se tiver subido o
   dev server antes de a arte existir, reinicie-o (ele não vigia `public/assets`).
4. Quer mudar posição/tamanho, não só a imagem: edite o `r` do caractere no `library.json`
   da mesma pasta, ou o layout XML da UI (`/flash/ui/vietnam/xml/`, servido pela API).

**Como saber que deu certo**: a imagem nova aparece sem erro no console e sem
`[flash] não implementado` novo; o log `load` do `?debug=true` mostra a mesma URL (nome
não muda, só o conteúdo do arquivo).

## Família B — ícone de item / recurso servido pela API (`/resource/image/...`, `/api/admin/item-icons/...`)

Itens (bolsa/loja), roupas, mapas, armas **não** vêm de SWF — vêm do pacote de recursos
servido por `apps/api` (`ctx.resources`, árvores case-insensitive sobre o diretório
compilado). Esses SIM têm overlay via admin, sem precisar reiniciar nada:

### Ícone de item (o mais comum)

1. Admin → **Itens** → abra o item → botão **"Gerar ícone (IA)"**
   (`apps/admin/src/resources/ItemIconGenerator.tsx`) — chama
   `POST /api/admin/items/:templateId/icon/generate` (Recraft, usa nome/categoria/descrição
   do item como prompt; dá pra escrever um prompt manual no campo de texto).
2. Confira a prévia (fica em `icon-drafts/`, não é o ícone real ainda) e clique
   **"Aceitar"** — `POST /api/admin/items/:templateId/icon/accept` grava no caminho real
   (`itemIconRel(CategoryID, Pic, NeedSex)`, `apps/api/src/lib/item-icon.ts`) e registra o
   overlay (`ctx.resources.trees[0].add(...)`) — o ícone some do cache (`iconCache.delete`)
   e a próxima requisição já serve o novo.
3. Sem IA, quer subir uma imagem sua pronta: o mesmo mecanismo de overlay é genérico
   (`POST /api/admin/assets`, campo `folder` + arquivo) — suba com `folder`/nome igual ao
   `rel` que `itemIconRel()` calcularia pra aquele item (mesma função usada no passo 2;
   confira os valores de categoria em `apps/api/src/lib/item-icon.ts:9-40`).

### Outro recurso do jogo (mapa, skin, etc.)

Admin → **Arquivos e imagens** (`apps/admin/src/pages/Assets.tsx`) → escolha a pasta
(`images/items`, `images/skins`, `images/pve`, `images/news`, `ui`, `sounds`) → **Enviar**.
Isso é pro material do **site** (`apps/web`), não pro cliente de jogo — pra sobrescrever um
recurso que o CLIENTE de jogo lê em `/resource/image/...` (fora de SWF), use o mesmo
endpoint genérico (`POST /api/admin/assets`) com `folder` apontando pro caminho real do
recurso (ex. `resource/image/arm/x/1`) — o upload vira overlay (`ctx.resources.trees[0]`),
servido antes do arquivo original, sem reiniciar `apps/api`.

**Como saber que deu certo**: `GET /api/admin/item-icons/<templateId>.png` (ou o caminho do
recurso) devolve a imagem nova na hora, sem reiniciar `apps/api` (cache de ícone já é
invalidado pelo próprio `accept`). Pra outros recursos, `GET /api/admin/assets/misses`
confirma se o caminho que você mirou é realmente o que o cliente pede (lista de misses
reais).

## Removendo uma troca

`DELETE /api/admin/assets/:key` remove o overlay — o original (vendor/compilado) volta a
aparecer. A Família A não tem "remover": é só restaurar o PNG original no disco (git
checkout do arquivo, se estiver versionado fora do `.gitignore`).
