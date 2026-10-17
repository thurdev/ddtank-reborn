/**
 * Geração de ícone de item via IA (Recraft) pro editor de itens do admin: monta o prompt com as regras visuais
 * do DDTank, chama a API e devolve os bytes já no tamanho que o cliente Flash espera pra aquela categoria.
 * Chave: `RECRAFT_API_KEY` (env) ou o arquivo `.env.recraft` na raiz do repo (mesmo lookup de `tools/i18n/ai/rc.mjs`,
 * que já tem esse fluxo funcionando) — nunca logada/impressa, nunca commitada.
 * Docs: https://www.recraft.ai/docs — `POST /v1/images/generations` (multipart: prompt, model, size, n).
 *
 * Como lê esse código (cada variável):
 * - `STYLE_RULES`: bloco fixo (sem acento) com o estilo 2D cartoon/chibi do DDTank, anexado a todo prompt.
 * - `semAcento(s)`: remove diacríticos (NFD + strip combining marks) — exigência do provedor de IA.
 * - `buildIconPrompt(item)`: monta o prompt final a partir de nome/categoria/descrição do item.
 * - `iconSizeFor(sampleAbsPath)`: lê width/height de um ícone já existente da mesma categoria (quando houver)
 *   pra gerar e redimensionar pro tamanho exato que o cliente espera; sem amostra, cai em 78x78 (padrão observado
 *   em `vendor/_assets/merged/image/**\/icon*.png`).
 * - `recraftApiKey()`: lê a chave (env ou `.env.recraft`), lança se nenhuma existir.
 * - `generateIconPng(prompt, size)`: chama a Recraft, devolve os bytes PNG (não redimensionados ainda).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Jimp } from "jimp";

/** Nome de categoria (PT-BR, sem acento) só pra dar contexto ao prompt — não precisa casar 1:1 com ITEM_CATEGORIES do admin. */
const CATEGORY_HINT: Record<number, string> = {
  1: "chapeu, acessorio de cabeca",
  2: "oculos",
  3: "cabelo",
  5: "roupa, traje de personagem cartoon",
  6: "mascara ou rosto",
  7: "arma de longo alcance estilo gunbound/worms (bazuca, canhao, arma catapulta)",
  8: "bracelete, acessorio de pulso",
  9: "anel",
  11: "item de batalha ou material consumivel, pedra/pergaminho/pocao magica",
  13: "traje completo de personagem cartoon",
  14: "colar",
  15: "asas fantasiosas",
  16: "balao de chat decorativo",
  17: "arma secundaria, item de suporte em combate",
  18: "caixa ou bau de recompensa fechado",
};

/**
 * Regras fixas de estilo visual (sem acento, EN+PT misto tolerado pelo modelo): 2D cartoon/chibi casual, cores
 * vivas, contorno grosso escuro, luz especular, sombreamento cel suave, objeto unico centralizado, fundo
 * transparente, sem texto/letras, formato quadrado, legivel em miniatura — igual aos icones originais do jogo.
 */
const STYLE_RULES =
  "2D cartoon chibi casual game icon art style, like DDTank or Gunbound, bright saturated colors, " +
  "glossy specular highlights, thick dark outline, soft cel shading, single centered object, " +
  "plain transparent background, no text, no letters, no watermark, square composition, " +
  "simple readable silhouette at small thumbnail size, game asset icon, high detail but clean shapes";

/** Remove diacriticos (á->a, ç->c, ...) — exigencia do prompt (nenhum acento). */
export function semAcento(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export interface ItemParaIcone {
  name: string;
  categoryId: number;
  description?: string | null;
}

/** Monta o prompt final (sem acento) a partir dos dados do item. */
export function buildIconPrompt(item: ItemParaIcone): string {
  const hint = CATEGORY_HINT[item.categoryId] ?? "item generico de jogo";
  const partes = [
    `Game icon of: ${semAcento(item.name)}.`,
    `Item type: ${hint}.`,
    item.description ? `Flavor: ${semAcento(item.description).slice(0, 160)}.` : "",
    STYLE_RULES,
  ].filter(Boolean);
  return semAcento(partes.join(" "));
}

/** width/height de um PNG (lê o header, sem depender de libs de imagem). */
function pngSize(abs: string): { w: number; h: number } | null {
  try {
    const buf = readFileSync(abs);
    if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch {
    return null;
  }
}

/** Tamanho alvo do ícone (ex. 78x78, o padrão dos assets do cliente); usa uma amostra da mesma pasta/categoria quando existe. */
export function iconSizeFor(sampleAbsPath?: string): { w: number; h: number } {
  const amostra = sampleAbsPath && existsSync(sampleAbsPath) ? pngSize(sampleAbsPath) : null;
  return amostra ?? { w: 78, h: 78 };
}

/** Lê `RECRAFT_API_KEY` do env ou do `.env.recraft` na raiz do repo (mesmo contrato de `tools/i18n/ai/rc.mjs`). */
export function recraftApiKey(repoRoot: string): string {
  if (process.env.RECRAFT_API_KEY) return process.env.RECRAFT_API_KEY;
  const p = join(repoRoot, ".env.recraft");
  if (existsSync(p)) {
    const m = readFileSync(p, "utf8").match(/RECRAFT_API_KEY=(\S+)/);
    if (m?.[1]) return m[1];
  }
  throw new Error("RECRAFT_API_KEY não configurada (env ou .env.recraft na raiz do repo)");
}

/**
 * Gera a imagem na Recraft e devolve os bytes PNG originais (ainda no tamanho que a API devolver, normalmente
 * grande/quadrado) — quem chama redimensiona pro tamanho real do ícone com `resizePng`.
 */
export async function generateIconPng(apiKey: string, prompt: string): Promise<Buffer> {
  const form = new FormData();
  form.set("prompt", prompt);
  form.set("model", "recraftv4_1_pro");
  form.set("n", "1");
  form.set("image_format", "png"); // default da Recraft é webp; Jimp (puro JS, sem libs nativas) não decodifica webp
  const res = await fetch("https://external.api.recraft.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Recraft images/generations ${res.status}: ${text.slice(0, 600)}`);
  const json = JSON.parse(text) as { data?: { url?: string; b64_json?: string }[] };
  const item = json.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item?.url) return Buffer.from(await (await fetch(item.url)).arrayBuffer());
  throw new Error("Recraft não devolveu imagem: " + text.slice(0, 300));
}

/**
 * Redimensiona um PNG (bytes) pro tamanho alvo (ver `iconSizeFor`), mantendo fundo transparente.
 * Como lê esse código (cada variável): `img` imagem decodificada; `lado`/`x`/`y` corte quadrado centralizado
 * quando a saída da IA não vem quadrada (o ícone do jogo sempre é quadrado).
 */
export async function resizePng(png: Buffer, size: { w: number; h: number }): Promise<Buffer> {
  const img = await Jimp.fromBuffer(png);
  if (img.bitmap.width !== img.bitmap.height) {
    const lado = Math.min(img.bitmap.width, img.bitmap.height);
    const x = Math.floor((img.bitmap.width - lado) / 2);
    const y = Math.floor((img.bitmap.height - lado) / 2);
    img.crop({ x, y, w: lado, h: lado });
  }
  img.resize({ w: size.w, h: size.h });
  return img.getBuffer("image/png");
}
