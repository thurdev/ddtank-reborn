/**
 * Lexer de ActionScript 3 (o dialeto que o mxmlc/FFDec gera e que está em
 * `vendor/DDTank41/Source Flash/src`).
 *
 * Gera uma lista de tokens + uma lista separada de comentários (com posição),
 * pra o parser poder anexar comentários aos nós e o emissor preservar a
 * documentação original no TS gerado.
 *
 * Pontos não triviais:
 * - Regex vs divisão: decidido pelo token significativo anterior (mesma regra
 *   do JS).
 * - Literais XML (`var x:XML = <a/>`) são lidos sob demanda pelo parser via
 *   {@link Lexer.readXmlLiteral}, porque só o parser sabe que está numa posição
 *   de expressão.
 * - `>>`/`>>>`/`>=` podem ser partidos pelo parser quando fecham `Vector.<T>`.
 */

export type TokKind = "id" | "num" | "str" | "regex" | "xml" | "punct" | "eof";

export interface Token {
  kind: TokKind;
  value: string;
  /** offset no arquivo */
  pos: number;
  end: number;
  /** linha (1-based) */
  line: number;
  /** houve quebra de linha entre o token anterior e este (pra ASI) */
  nlBefore: boolean;
}

export interface Comment {
  text: string;
  pos: number;
  end: number;
  line: number;
  block: boolean;
}

const PUNCTS = [
  ">>>=", "...", "===", "!==", ">>>", "<<=", ">>=", "&&=", "||=",
  "::", "..", "==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=",
  "&=", "|=", "^=", "<<", ">>",
  ".", ",", ";", ":", "?", "(", ")", "[", "]", "{", "}", "<", ">", "+", "-", "*", "/", "%",
  "&", "|", "^", "!", "~", "=", "@",
];

/** Palavras após as quais `/` começa uma regex (e não uma divisão). */
const REGEX_AFTER_KEYWORDS = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "is", "as",
]);

export class LexError extends Error {}

export class Lexer {
  readonly tokens: Token[] = [];
  readonly comments: Comment[] = [];
  private i = 0;
  private line = 1;

  constructor(readonly src: string, readonly file = "?") {}

  run(): this {
    let nl = false;
    for (;;) {
      nl = this.skipSpace() || nl;
      if (this.i >= this.src.length) {
        this.tokens.push({ kind: "eof", value: "", pos: this.i, end: this.i, line: this.line, nlBefore: true });
        return this;
      }
      const t = this.next(nl);
      this.tokens.push(t);
      nl = false;
    }
  }

  private err(msg: string): never {
    throw new LexError(`${this.file}:${this.line}: ${msg}`);
  }

  /** Pula espaço e comentários; retorna true se passou por quebra de linha. */
  private skipSpace(): boolean {
    const s = this.src;
    let nl = false;
    while (this.i < s.length) {
      const c = s.charCodeAt(this.i);
      if (c === 10) { nl = true; this.line++; this.i++; continue; }
      if (c === 32 || c === 9 || c === 13 || c === 0xfeff || c === 0xa0 || c === 11 || c === 12) { this.i++; continue; }
      if (c === 47 /* / */) {
        const d = s.charCodeAt(this.i + 1);
        if (d === 47) {
          const start = this.i;
          let e = s.indexOf("\n", this.i);
          if (e < 0) e = s.length;
          this.comments.push({ text: s.slice(start, e).replace(/\r$/, ""), pos: start, end: e, line: this.line, block: false });
          this.i = e;
          continue;
        }
        if (d === 42) {
          const start = this.i;
          const startLine = this.line;
          const e = s.indexOf("*/", this.i + 2);
          if (e < 0) this.err("comentário de bloco sem fim");
          const text = s.slice(start, e + 2);
          for (let k = 0; k < text.length; k++) if (text.charCodeAt(k) === 10) { this.line++; nl = true; }
          this.comments.push({ text, pos: start, end: e + 2, line: startLine, block: true });
          this.i = e + 2;
          continue;
        }
      }
      break;
    }
    return nl;
  }

  private prevSignificant(): Token | undefined {
    return this.tokens[this.tokens.length - 1];
  }

  private regexAllowed(): boolean {
    const p = this.prevSignificant();
    if (!p) return true;
    if (p.kind === "num" || p.kind === "str" || p.kind === "regex" || p.kind === "xml") return false;
    if (p.kind === "id") return REGEX_AFTER_KEYWORDS.has(p.value);
    return !(p.value === ")" || p.value === "]" || p.value === "}");
  }

  private next(nl: boolean): Token {
    const s = this.src;
    const start = this.i;
    const c = s[this.i]!;
    const mk = (kind: TokKind, value: string): Token => ({ kind, value, pos: start, end: this.i, line: this.line, nlBefore: nl });

    // identificador / palavra-chave
    if (/[A-Za-z_$§À-￿]/.test(c)) {
      let j = this.i + 1;
      while (j < s.length && /[A-Za-z0-9_$§À-￿]/.test(s[j]!)) j++;
      this.i = j;
      return mk("id", s.slice(start, j));
    }
    // número
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[this.i + 1] ?? ""))) {
      let j = this.i;
      if (c === "0" && (s[j + 1] === "x" || s[j + 1] === "X")) {
        j += 2;
        while (/[0-9a-fA-F]/.test(s[j] ?? "")) j++;
      } else {
        while (/[0-9]/.test(s[j] ?? "")) j++;
        if (s[j] === "." && /[0-9]/.test(s[j + 1] ?? "")) { j++; while (/[0-9]/.test(s[j] ?? "")) j++; }
        else if (s[j] === "." && !/[.A-Za-z_]/.test(s[j + 1] ?? "")) j++;
        if (s[j] === "e" || s[j] === "E") {
          let k = j + 1;
          if (s[k] === "+" || s[k] === "-") k++;
          if (/[0-9]/.test(s[k] ?? "")) { j = k; while (/[0-9]/.test(s[j] ?? "")) j++; }
        }
      }
      this.i = j;
      return mk("num", s.slice(start, j));
    }
    // string
    if (c === '"' || c === "'") {
      let j = this.i + 1;
      while (j < s.length && s[j] !== c) {
        if (s[j] === "\\") j++;
        else if (s[j] === "\n") this.line++;
        j++;
      }
      if (j >= s.length) this.err("string sem fim");
      this.i = j + 1;
      return mk("str", s.slice(start, j + 1));
    }
    // regex
    if (c === "/" && this.regexAllowed()) {
      let j = this.i + 1;
      let inClass = false;
      while (j < s.length) {
        const ch = s[j];
        if (ch === "\\") { j += 2; continue; }
        if (ch === "\n") this.err("regex sem fim");
        if (inClass) { if (ch === "]") inClass = false; }
        else if (ch === "[") inClass = true;
        else if (ch === "/") break;
        j++;
      }
      j++;
      while (/[a-z]/i.test(s[j] ?? "")) j++;
      this.i = j;
      return mk("regex", s.slice(start, j));
    }
    // literal XML (E4X) em posição de expressão
    if (c === "<" && /[A-Za-z!]/.test(s[this.i + 1] ?? "") && this.regexAllowed()) {
      const p = this.prevSignificant();
      if (!(p && (p.value === "." || p.value === "new"))) {
        const { text, end } = readXmlLiteral(s, this.i);
        for (let k = 0; k < text.length; k++) if (text.charCodeAt(k) === 10) this.line++;
        this.i = end;
        return mk("xml", text);
      }
    }
    for (const p of PUNCTS) {
      if (s.startsWith(p, this.i)) {
        this.i += p.length;
        return mk("punct", p);
      }
    }
    this.err(`caractere inesperado ${JSON.stringify(c)}`);
  }
}

/**
 * Lê um literal XML começando em `pos` (que aponta pra `<`). Retorna o texto
 * cru e a posição final. Suporta tags aninhadas, auto-fechadas, comentários,
 * CDATA e `{expr}` (devolvido cru — o emissor trata).
 */
export function readXmlLiteral(src: string, pos: number): { text: string; end: number } {
  let i = pos;
  let depth = 0;
  for (;;) {
    if (i >= src.length) throw new LexError("literal XML sem fim");
    if (src.startsWith("<!--", i)) { i = src.indexOf("-->", i) + 3; continue; }
    if (src.startsWith("<![CDATA[", i)) { i = src.indexOf("]]>", i) + 3; continue; }
    if (src[i] === "<") {
      const closing = src[i + 1] === "/";
      let j = i + 1;
      let q: string | null = null;
      let brace = 0;
      while (j < src.length) {
        const ch = src[j];
        if (q) { if (ch === q) q = null; }
        else if (ch === "{") brace++;
        else if (ch === "}") brace--;
        else if (brace === 0 && (ch === '"' || ch === "'")) q = ch;
        else if (brace === 0 && ch === ">") break;
        j++;
      }
      const selfClose = src[j - 1] === "/";
      if (closing) depth--;
      else if (!selfClose) depth++;
      i = j + 1;
      if (depth === 0) return { text: src.slice(pos, i), end: i };
      continue;
    }
    i++;
  }
}
