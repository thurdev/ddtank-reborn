/**
 * Caminhos do ícone de um item (template `game.Shop_Goods`), espelhando o cliente Flash:
 * `PathManager.solveGoodsPath(CategoryID, Pic, NeedSex == 1, "icon", hairType, "1", Level, gunBack, Property1)`
 * chamado por `ddt/view/character/IconLayer.as:34` (param6 = "1", param10 = "").
 * Fonte: `vendor/DDTank41/Source Flash/src/ddt/manager/PathManager.as:194-309`; constantes de categoria em
 * `ddt/data/EquipType.as:163-327` (TYPES em :231).
 */

/** Categorias usadas pelo `solveGoodsPath` (`EquipType.as`). */
const C = {
  HAIR: 3, // EquipType.as:167
  ARM: 7, // :175
  ARMLET: 8, // :177
  RING: 9, // :179
  UNFRIGHTPROP: 11, // :183
  TASK: 12, // :185
  SUITS: 13, // :187
  NECKLACE: 14, // :189
  WING: 15, // :191
  CHATBALL: 16, // :193
  OFFHAND: 17, // :195
  CARDBOX: 18, // :197
  HEALSTONE: 19, // :199
  TEXP: 20, // :201
  TEXP_TASK: 23, // :203
  GIFTGOODS: 25, // :217
  CARDEQUIP: 26, // :219
  TEMPWEAPON: 27, // :209
  TEMPARMLET: 28, // :211
  TEMPRING: 29, // :213
  ACTIVE_TASK: 30, // :207
  TEMP_OFFHAND: 31, // :215
  SEED: 32, // :323
  MANURE: 33, // :325
  FOOD: 34, // :309
  PET_EGG: 35, // :311
  VEGETABLE: 36, // :327
  BADGE: 40, // :313
  PET_EQUIP_ARM: 50, // :319
  PET_EQUIP_HEAD: 51, // :317
  PET_EQUIP_CLOTH: 52, // :315
} as const;

/** `EquipType.TYPES` (EquipType.as:231): pasta do tipo de equipamento por CategoryID. */
const TYPES = ["", "head", "glass", "hair", "eff", "cloth", "face", "arm", "armlet", "ring", "", "", "", "suits", "necklace", "wing", "chatBall", "", "", "", "", "", "", "", "", "", "", "", "armlet", "ring"];

/**
 * Caminhos relativos candidatos (abaixo do mount `/resource/`) para o ícone do item, na ordem de preferência.
 * Equipamentos com sexo (`image/equip/<m|f>/...`) devolvem as duas variantes, o sexo do item primeiro
 * (o cliente usa `NeedSex == 1` → `m/`, senão `f/` — IconLayer.as:34 + PathManager.as:237).
 *
 * Como lê esse código (cada variável):
 * `categoryId` CategoryID do template (param1); `pic` campo Pic do template = nome da pasta (param2);
 * `needSex` NeedSex do template (1 masculino, 2 feminino, 0 qualquer); `p` pic limpo; `cat` categoryId inteiro;
 * `masc` true quando o cliente escolheria `m/` (param3); `tipo` pasta `EquipType.TYPES[cat]` (_loc13_);
 * `semSexo` anel/bracelete/colar (sem pasta m/f e arquivo `icon.png`, PathManager.as:238/252);
 * `sexos` ordem m/f tentada; `out` lista de caminhos devolvida.
 */
export function itemIconRel(categoryId: number, pic: string, needSex: number): string[] {
  const p = String(pic ?? "").trim();
  if (!p) return [];
  const cat = Math.trunc(Number(categoryId));

  // PathManager.as:204-213 — arma: image/arm/<pic>/1/icon.png (ícone não leva o "/0|/1" do gunBack)
  if (cat === C.ARM || cat === C.TEMPWEAPON) return [`image/arm/${p}/1/icon.png`];
  // :214-217
  if (cat === C.UNFRIGHTPROP) return [`image/unfrightprop/${p}/icon.png`];
  // :218-221
  if (cat === C.TASK) return [`image/task/${p}/icon.png`];
  // :222-225
  if (cat === C.CHATBALL) return [`image/specialprop/chatBall/${p}/icon.png`];

  // :226-256 — equipamentos de personagem
  if (cat < 10 || cat === C.SUITS || cat === C.NECKLACE || cat === C.TEMPARMLET || cat === C.TEMPRING) {
    const tipo = TYPES[cat] ?? "";
    const semSexo = cat === C.ARMLET || cat === C.RING || cat === C.NECKLACE || cat === C.TEMPARMLET || cat === C.TEMPRING;
    // :250-253 — sem m/f; param4 continua "icon" → icon.png
    if (semSexo) return [`image/equip/${tipo}/${p}/icon.png`];
    // :240-244 — param4 "icon" vira "icon_" + param6 ("1"); cabelo não usa hairType no ícone (:230)
    const masc = needSex === 1;
    const sexos = masc ? ["m", "f"] : ["f", "m"];
    return sexos.map((s) => `image/equip/${s}/${tipo}/${p}/icon_1.png`);
  }

  // :257-260
  if (cat === C.WING) return [`image/equip/wing/${p}/icon.png`];
  // :261-264
  if (cat === C.OFFHAND || cat === C.TEMP_OFFHAND) return [`image/equip/offhand/${p}/icon.png`];
  // :265-268
  if (cat === C.GIFTGOODS) return [`image/gift/${p}/icon.png`];
  // :269-272 — carta é .jpg
  if (cat === C.CARDEQUIP) return [`image/card/${p}/icon.jpg`];
  // :273-276
  if (cat === C.CARDBOX) return [`image/cardbox/${p}/icon.png`];
  // :277-280
  if (cat === C.HEALSTONE) return [`image/equip/recover/${p}/icon.png`];
  // :281-284 (EFFECT=30 é o mesmo valor de ACTIVE_TASK)
  if (cat === C.TEXP || cat === C.TEXP_TASK || cat === C.ACTIVE_TASK || cat === C.BADGE) return [`image/unfrightprop/${p}/icon.png`];
  // :285-288 — semente/verdura usam seed.png
  if (cat === C.SEED || cat === C.VEGETABLE) return [`image/farm/Crops/${p}/seed.png`];
  // :289-292
  if (cat === C.MANURE) return [`image/farm/Fertilizer/${p}/icon.png`];
  // :293-296
  if (cat === C.FOOD || cat === C.PET_EGG) return [`image/unfrightprop/${p}/icon.png`];
  // :297-308
  if (cat === C.PET_EQUIP_CLOTH) return [`image/petequip/cloth/${p}/icon.png`];
  if (cat === C.PET_EQUIP_ARM) return [`image/petequip/arm/${p}/icon.png`];
  if (cat === C.PET_EQUIP_HEAD) return [`image/petequip/hat/${p}/icon.png`];
  // :309 — resto (FRIGHTPROP=10, 21, 22, 24, ...): image/prop/<pic>/icon.png
  return [`image/prop/${p}/icon.png`];
}
