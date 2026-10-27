/**
 * Teste focado no `bitmapRectShapeImg` de `library.ts`: quando uma forma é só
 * um retângulo preenchido por UM bitmap cobrindo o contorno inteiro (padrão
 * comum de autoria no Flash: arte colada como "shape"), o exportador deve
 * usar o bitmap bruto (export "image") em vez da forma rasterizada pelo
 * FFDec — o rasterizador de forma às vezes produz uma franja de cor nos
 * pixels semi-transparentes da borda (visto em `hall.swf`, tarefa
 * "hall-hover" — ver docs/client-pixi/STATUS.md). O bitmap bruto não passa
 * por esse rasterizador, então é imune ao artefato.
 *
 *   npx tsx --test src/library.test.ts   (de tools/swf-export)
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLibrary, type ImageIndex } from "./library.ts";

function emptyImgs(): ImageIndex {
  return { shapes: new Map(), images: new Map(), imageSizes: new Map(), texts: new Map(), morphs: new Map(), sounds: new Map(), binary: new Map() };
}

/** DefineBitsLossless2 (id 1, 10x20px) + DefineShape (id 2) com um único fill
 * de bitmap cobrindo exatamente o shapeBounds — o padrão "bitmap colado como forma". */
function swfXmlRectShape(opts: { shapeW: number; shapeH: number; bitmapWpx?: number; bitmapHpx?: number; fillCount?: number; lineCount?: number }): string {
  const { shapeW, shapeH, bitmapWpx = shapeW / 20, bitmapHpx = shapeH / 20, fillCount = 1, lineCount = 0 } = opts;
  const extraFill = fillCount > 1 ? `<item type="FILLSTYLE" fillStyleType="0" color="FF0000"/>` : "";
  const extraLine = lineCount > 0 ? `<item type="LINESTYLE" width="20"/>` : "";
  return `<swf frameRate="24" frameCount="1">
    <displayRect type="RECT" Xmin="0" Ymin="0" Xmax="2000" Ymax="2000" nbits="16"/>
    <tags>
      <item type="DefineBitsLossless2Tag" characterId="1" bitmapWidth="${bitmapWpx}" bitmapHeight="${bitmapHpx}" bitmapFormat="5"/>
      <item type="DefineShapeTag" shapeId="2">
        <shapeBounds type="RECT" Xmax="${shapeW}" Xmin="0" Ymax="${shapeH}" Ymin="0" nbits="16"/>
        <shapes type="SHAPEWITHSTYLE" numFillBits="1" numLineBits="0">
          <fillStyles type="FILLSTYLEARRAY"><fillStyles>
            <item type="FILLSTYLE" bitmapId="1" fillStyleType="67">
              <bitmapMatrix type="MATRIX" hasRotate="false" hasScale="true" scaleX="20.0" scaleY="20.0" translateX="0" translateY="0"/>
            </item>
            ${extraFill}
          </fillStyles></fillStyles>
          <lineStyles type="LINESTYLEARRAY"><lineStyles>${extraLine}</lineStyles></lineStyles>
          <shapeRecords>
            <item type="StyleChangeRecord" stateMoveTo="true" moveDeltaX="${shapeW}" moveDeltaY="0" stateFillStyle1="true" fillStyle1="1"/>
            <item type="StraightEdgeRecord" vertLineFlag="true" deltaY="${shapeH}"/>
            <item type="StraightEdgeRecord" vertLineFlag="false" deltaX="-${shapeW}"/>
            <item type="StraightEdgeRecord" vertLineFlag="true" deltaY="-${shapeH}"/>
            <item type="StraightEdgeRecord" vertLineFlag="false" deltaX="${shapeW}"/>
            <item type="EndShapeRecord" endOfShape="0"/>
          </shapeRecords>
        </shapes>
      </item>
    </tags>
  </swf>`;
}

test("forma = retângulo preenchido por 1 bitmap cobrindo o contorno inteiro -> usa o bitmap bruto", () => {
  const imgs = emptyImgs();
  imgs.images.set(1, "images/1.png");
  imgs.shapes.set(2, "shapes/2.png");
  const xml = swfXmlRectShape({ shapeW: 200, shapeH: 400 });
  const lib = buildLibrary(xml, "test.swf", imgs, () => {});
  assert.equal(lib.chars[2]?.k, "shape");
  assert.equal((lib.chars[2] as any).img, "images/1.png", "deveria preferir o bitmap bruto (limpo) à forma rasterizada (pode vir com franja de cor)");
});

test("forma com bounds diferente do bitmap (recorte/tile de verdade) -> mantém a forma rasterizada", () => {
  const imgs = emptyImgs();
  imgs.images.set(1, "images/1.png");
  imgs.shapes.set(2, "shapes/2.png");
  // bitmap nasceu 20x20px (400x400 twips) mas a forma só cobre metade da largura -> não é "bitmap colado inteiro"
  const xml = swfXmlRectShape({ shapeW: 200, shapeH: 400, bitmapWpx: 20, bitmapHpx: 20 });
  const lib = buildLibrary(xml, "test.swf", imgs, () => {});
  assert.equal((lib.chars[2] as any).img, "shapes/2.png");
});

test("forma com mais de um fill style -> mantém a forma rasterizada (não é só um bitmap)", () => {
  const imgs = emptyImgs();
  imgs.images.set(1, "images/1.png");
  imgs.shapes.set(2, "shapes/2.png");
  const xml = swfXmlRectShape({ shapeW: 200, shapeH: 400, fillCount: 2 });
  const lib = buildLibrary(xml, "test.swf", imgs, () => {});
  assert.equal((lib.chars[2] as any).img, "shapes/2.png");
});

test("forma com stroke (line style) -> mantém a forma rasterizada (o bitmap sozinho perderia o contorno)", () => {
  const imgs = emptyImgs();
  imgs.images.set(1, "images/1.png");
  imgs.shapes.set(2, "shapes/2.png");
  const xml = swfXmlRectShape({ shapeW: 200, shapeH: 400, lineCount: 1 });
  const lib = buildLibrary(xml, "test.swf", imgs, () => {});
  assert.equal((lib.chars[2] as any).img, "shapes/2.png");
});

test("sem bitmap bruto exportado -> cai pra forma rasterizada sem quebrar", () => {
  const imgs = emptyImgs();
  imgs.shapes.set(2, "shapes/2.png");
  const xml = swfXmlRectShape({ shapeW: 200, shapeH: 400 });
  const lib = buildLibrary(xml, "test.swf", imgs, () => {});
  assert.equal((lib.chars[2] as any).img, "shapes/2.png");
});
