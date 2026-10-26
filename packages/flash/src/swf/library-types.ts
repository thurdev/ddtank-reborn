/**
 * Formato do `library.json` gerado por tools/swf-export a partir de cada SWF
 * original. É só dado: imagens em PNG/JPG ao lado, nenhum SWF em runtime.
 *
 *   assets/<caminho do SWF sem .swf>/library.json
 *   assets/<caminho do SWF sem .swf>/shapes/13.png       ← formas vetoriais rasterizadas
 *   assets/<caminho do SWF sem .swf>/images/10_asset.x.png ← bitmaps
 *   assets/<caminho do SWF sem .swf>/sounds/5_asset.y.mp3
 *
 * Pra trocar uma arte: substitua o PNG mantendo o nome (pode mudar o tamanho;
 * a posição/escala vem do `r` do caractere — ver docs/client-pixi/ASSETS.md).
 */

/** [a, b, c, d, tx, ty] — matriz do Flash em pixels */
export type Mat = [number, number, number, number, number, number];
/** [rMul, gMul, bMul, aMul, rAdd, gAdd, bAdd, aAdd] — multiplicadores 0..1, offsets -255..255 */
export type CXForm = [number, number, number, number, number, number, number, number];
/** [x, y, largura, altura] em pixels */
export type RectT = [number, number, number, number];

export type FilterT =
  | { t: "glow"; color: number; alpha: number; bx: number; by: number; s: number; inner?: boolean; ko?: boolean }
  | { t: "shadow"; color: number; alpha: number; bx: number; by: number; s: number; angle: number; dist: number; inner?: boolean; ko?: boolean; hide?: boolean }
  | { t: "blur"; bx: number; by: number; q: number }
  | { t: "matrix"; m: number[] }
  | { t: "bevel"; hc: number; ha: number; sc: number; sa: number; bx: number; by: number; s: number; angle: number; dist: number; type: string }
  | { t: "gglow"; colors: number[]; alphas: number[]; ratios: number[]; bx: number; by: number; s: number; angle: number; dist: number };

/** uma operação de timeline num frame */
export type Op =
  | {
      /** profundidade (camada) */
      d: number;
      /** id do caractere colocado (ausente = só modifica o que já está na profundidade) */
      id?: number;
      /** modifica objeto existente (PlaceFlagMove) */
      mv?: 1;
      m?: Mat;
      ct?: CXForm;
      /** nome de instância (vira propriedade do pai: `mc.btn`) */
      nm?: string;
      /** posição de morph (0..65535) */
      r?: number;
      /** é máscara das profundidades até `cl` */
      cl?: number;
      fl?: FilterT[];
      bl?: string;
      vis?: 0 | 1;
      cab?: 1;
    }
  | { rm: number };

/**
 * Frame script simples da CLASSE do próprio símbolo (`addFrameScript` dentro
 * do ABC embutido no SWF de asset, ex. `Living007.frame41(){ stop(); }`) —
 * não é código do jogo (esse já é TS normal), é o script que o Flash
 * compilava DENTRO do caractere pra ele mesmo parar/saltar em certos frames
 * (ex. "stand" faz loop até outra ação pedir `gotoAndPlay`, "die" para no
 * último frame). Ver `tools/swf-export/src/swf-classes.ts`.
 */
export type FrameScriptOp =
  | { op: "stop" }
  | { op: "play" }
  | { op: "next" }
  | { op: "prev" }
  | { op: "goto"; to: number | string; play: boolean };

export interface TimelineT {
  /** número de frames */
  n: number;
  /** rótulo → frame (1-based) */
  labels?: Record<string, number>;
  /** f[i] = operações do frame i+1 */
  f: Op[][];
  /** sons iniciados em cada frame: f index → ids */
  snd?: Record<number, number[]>;
  /** frame (0-based, igual addFrameScript) → ops do frame script da própria classe do símbolo */
  fs?: Record<number, FrameScriptOp[]>;
}

export type CharT =
  /** hit = máscara de clique (forma invisível no Flash que recebe clique — ver tools/swf-export/src/hitmasks.ts) */
  | { k: "shape"; img: string; r: RectT; hit?: string }
  | { k: "morph"; img: string; r: RectT }
  | { k: "bitmap"; img: string; w: number; h: number }
  | { k: "sprite"; tl: TimelineT; grid?: RectT }
  | { k: "button"; up: Op[]; over: Op[]; down: Op[]; hit: Op[]; grid?: RectT; menu?: boolean }
  | { k: "etext"; r: RectT; p: EditTextT }
  | { k: "text"; img?: string; r: RectT }
  | { k: "sound"; file: string }
  | { k: "font"; name: string; bold?: boolean; italic?: boolean }
  | { k: "binary"; file: string };

export interface EditTextT {
  text?: string;
  html?: boolean;
  font?: string;
  /** px */
  size?: number;
  color?: number;
  alpha?: number;
  align?: "left" | "right" | "center" | "justify";
  multiline?: boolean;
  wordWrap?: boolean;
  password?: boolean;
  readOnly?: boolean;
  selectable?: boolean;
  border?: boolean;
  maxChars?: number;
  leading?: number;
  leftMargin?: number;
  rightMargin?: number;
  indent?: number;
  autoSize?: boolean;
  embed?: boolean;
  variable?: string;
}

export interface LibraryT {
  version: 1;
  /** caminho do SWF original (só referência) */
  swf: string;
  frameRate: number;
  width: number;
  height: number;
  chars: Record<string, CharT>;
  /** nome de linkage (classe AS3) → caractere e classe base do Flash */
  classes: Record<string, { id: number; base: string }>;
  /** timeline principal */
  main: TimelineT;
}

/** operação de colocar/mover (não-remoção) */
export type PlaceOp = Extract<Op, { d: number }>;
