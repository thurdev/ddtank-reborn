# Arte, sons e como editar

Nenhum SWF é usado em tempo de execução. Cada SWF original foi exportado UMA
vez para uma pasta em `apps/client/public/assets/`:

```
assets/
  index.json                                ← lista de todas as "bibliotecas"
  flash/ui/vietnam/swf/hall/                ← era ui/vietnam/swf/hall.swf
    library.json                            ← estrutura (timelines, posições, filtros, textos, classes)
    shapes/13.png                           ← formas vetoriais rasterizadas (pelo id do caractere)
    images/10_asset.hallSaveFile.okBtn.png  ← bitmaps (id + nome de linkage)
    sounds/5_asset.xxx.mp3                  ← sons embutidos
  resource/image/bomb/bullet/bullet121/     ← era resource/image/bomb/bullet/bullet121.swf
  resource/sound/1002.mp3                   ← música de fundo (era .flv)
```

Os caminhos são **os mesmos que o jogo pede** (em minúsculas), sem `.swf`.

## Trocar uma imagem

1. Descubra qual é: abra o jogo com `?debug=true` e clique nela — o log mostra
   `arte: flash/ui/vietnam/swf/hall #13 → flash/ui/vietnam/swf/hall/shapes/13.png`.
   (Ou `ddtDebug.under()` com o mouse em cima.)
2. Edite/substitua o PNG **mantendo o nome**. Pode mudar a resolução: o jogo
   desenha no retângulo original (`r` do caractere no `library.json`), então
   um PNG 2x fica nítido no mesmo lugar.
3. Recarregue a página (Vite serve direto, sem build).

Mudar posição/tamanho: edite o `r: [x, y, largura, altura]` do caractere no
`library.json`, ou o layout XML da UI (servido pela API em
`/flash/ui/vietnam/xml/`).

## Imagens que não vêm de SWF

Itens, roupas, mapas, armas etc. continuam vindo do pacote de recursos
servido pela API (`/resource/image/...`, PNG/JPG) — já são editáveis.

## Exportar de novo (só quando mudar a origem)

```bash
cd tools/swf-export && npm install
npx tsx src/main.ts --set ui                  # 119 SWFs de interface (~15 min)
npx tsx src/main.ts --set resource --jobs 3   # ~3.000 SWFs de recurso (horas)
npx tsx src/main.ts --only swf/hall --force   # um só
FFMPEG=<ffmpeg> npx tsx src/sounds.ts         # músicas FLV → MP3
```

Precisa de Java (FFDec em `vendor/_tools/ffdec`). A tradução PT-BR dos SWFs
(`apps/api/assets/flash/**`) tem prioridade sobre o original. Relatório em
`assets/EXPORT-REPORT.txt`.

## Formato do `library.json`

Tipos em `packages/flash/src/swf/library-types.ts`. Resumo:

- `chars[id]`: `shape`/`bitmap`/`text` (imagem + retângulo), `sprite`
  (timeline), `button` (estados up/over/down/hit), `etext` (campo de texto
  com fonte/cor/tamanho), `sound`, `font`.
- `classes`: nome de linkage (`asset.hall.okBtn`) → caractere e classe base
  (MovieClip, BitmapData, SimpleButton...).
- timeline: `f[frame] = [{ d: profundidade, id, m: matriz, ct: cor, nm: nome, fl: filtros, bl: blend, cl: máscara }]`.
