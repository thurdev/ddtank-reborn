/**
 * E4X (XML do ActionScript 3) em TypeScript.
 *
 * O cliente lê TODOS os templates do servidor (itens, loja, missões, mapas…)
 * e o layout da UI via E4X. O transpilador converte a sintaxe:
 *
 *   xml.@ID            → xml.attribute("ID")
 *   xml.Item           → xml.child("Item")
 *   xml..Item          → xml.descendants("Item")
 *   xml.Item.(@ID==1)  → xml.child("Item").filter(($filterItem) => ...)
 *   xml.@ID = 3        → xml.setAttribute("ID", 3)
 *
 * Quando o código acessa XML por uma variável sem tipo (`obj.Item` com
 * `obj:*`), o Proxy devolvido pelos construtores resolve do mesmo jeito.
 *
 * Semântica seguida (igual ao Flash Player): ignoreWhitespace,
 * ignoreComments e ignoreProcessingInstructions = true; `toString()` de
 * conteúdo simples devolve só o texto; conversão pra string/número usa
 * `toString()` (então `xml.@ID == "3"` e `int(xml.@ID)` funcionam).
 */

export type NodeKind = "element" | "text" | "attribute" | "comment" | "processing-instruction";

/** nó interno da árvore XML (compartilhado entre os wrappers XML/XMLList) */
export class XNode {
  kind: NodeKind;
  name: string;
  value = "";
  attrs: XNode[] = [];
  children: XNode[] = [];
  parent: XNode | null = null;
  constructor(kind: NodeKind, name = "") {
    this.kind = kind;
    this.name = name;
  }
  clone(): XNode {
    const n = new XNode(this.kind, this.name);
    n.value = this.value;
    for (const a of this.attrs) { const c = a.clone(); c.parent = n; n.attrs.push(c); }
    for (const ch of this.children) { const c = ch.clone(); c.parent = n; n.children.push(c); }
    return n;
  }
}

// ------------------------------------------------------------------ parser
const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decode(s: string): string {
  if (!s.includes("&")) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e] ?? m;
  });
}
function encodeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function encodeAttr(s: string): string {
  return encodeText(s).replace(/"/g, "&quot;");
}

export class XMLParseError extends Error {}

/** Parser XML pequeno e rápido (sem DOM, roda no navegador e no Node). Devolve os nós de topo. */
export function parseXml(src: string): XNode[] {
  const top: XNode[] = [];
  const stack: XNode[] = [];
  let i = 0;
  const n = src.length;
  const push = (node: XNode) => {
    const p = stack[stack.length - 1];
    if (p) { node.parent = p; p.children.push(node); } else top.push(node);
  };
  while (i < n) {
    const lt = src.indexOf("<", i);
    const textEnd = lt < 0 ? n : lt;
    if (textEnd > i) {
      const raw = src.slice(i, textEnd);
      const t = decode(raw).trim();
      if (t) { const tn = new XNode("text"); tn.value = t; push(tn); }
      i = textEnd;
      continue;
    }
    // i aponta pra '<'
    if (src.startsWith("<!--", i)) { const e = src.indexOf("-->", i); i = e < 0 ? n : e + 3; continue; }
    if (src.startsWith("<![CDATA[", i)) {
      const e = src.indexOf("]]>", i);
      const tn = new XNode("text");
      tn.value = src.slice(i + 9, e < 0 ? n : e);
      push(tn);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (src.startsWith("<?", i)) { const e = src.indexOf("?>", i); i = e < 0 ? n : e + 2; continue; }
    if (src.startsWith("<!", i)) { const e = src.indexOf(">", i); i = e < 0 ? n : e + 1; continue; }
    if (src[i + 1] === "/") {
      const e = src.indexOf(">", i);
      stack.pop();
      i = e < 0 ? n : e + 1;
      continue;
    }
    // tag de abertura
    let j = i + 1;
    while (j < n && !/[\s/>]/.test(src[j]!)) j++;
    const el = new XNode("element", src.slice(i + 1, j));
    // atributos
    for (;;) {
      while (j < n && /\s/.test(src[j]!)) j++;
      const c = src[j];
      if (c === ">" || c === "/" || c === undefined) break;
      let k = j;
      while (k < n && !/[\s=/>]/.test(src[k]!)) k++;
      const an = src.slice(j, k);
      while (k < n && /\s/.test(src[k]!)) k++;
      let val = "";
      if (src[k] === "=") {
        k++;
        while (k < n && /\s/.test(src[k]!)) k++;
        const q = src[k];
        if (q === '"' || q === "'") {
          const e = src.indexOf(q, k + 1);
          val = src.slice(k + 1, e < 0 ? n : e);
          k = e < 0 ? n : e + 1;
        } else {
          let e = k;
          while (e < n && !/[\s>]/.test(src[e]!)) e++;
          val = src.slice(k, e);
          k = e;
        }
      }
      const a = new XNode("attribute", an);
      a.value = decode(val);
      a.parent = el;
      el.attrs.push(a);
      j = k;
    }
    push(el);
    if (src[j] === "/") { i = src.indexOf(">", j) + 1; continue; }
    stack.push(el);
    i = j + 1;
  }
  return top;
}

// ------------------------------------------------------------------ serialização
function simple(node: XNode): boolean {
  if (node.kind !== "element") return true;
  return !node.children.some((c) => c.kind === "element");
}
function textOf(node: XNode): string {
  if (node.kind !== "element") return node.value;
  return node.children.filter((c) => c.kind === "text").map((c) => c.value).join("");
}
function toXMLString(node: XNode, indent = 0): string {
  const pad = " ".repeat(indent);
  switch (node.kind) {
    case "text": return pad + encodeText(node.value);
    case "attribute": return encodeAttr(node.value);
    case "comment": return `${pad}<!--${node.value}-->`;
    case "processing-instruction": return `${pad}<?${node.name} ${node.value}?>`;
  }
  const attrs = node.attrs.map((a) => ` ${a.name}="${encodeAttr(a.value)}"`).join("");
  if (!node.children.length) return `${pad}<${node.name}${attrs}/>`;
  if (node.children.length === 1 && node.children[0]!.kind === "text") {
    return `${pad}<${node.name}${attrs}>${encodeText(node.children[0]!.value)}</${node.name}>`;
  }
  const inner = node.children.map((c) => toXMLString(c, indent + 2)).join("\n");
  return `${pad}<${node.name}${attrs}>\n${inner}\n${pad}</${node.name}>`;
}

function nameMatch(node: XNode, name: string): boolean {
  if (name === "*") return true;
  const local = node.name.includes(":") ? node.name.slice(node.name.indexOf(":") + 1) : node.name;
  return node.name === name || local === name;
}

function toNodes(v: unknown): XNode[] {
  if (v instanceof XMLList) return v.$nodes;
  if (v instanceof XML) return [v.$node];
  const s = String(v);
  if (/^\s*</.test(s)) return parseXml(s);
  const t = new XNode("text");
  t.value = s;
  return [t];
}

// ------------------------------------------------------------------ proxy (acesso dinâmico)
const isIndex = (p: string) => /^\d+$/.test(p);

function makeProxy<T extends XML | XMLList>(target: T): T {
  return new Proxy(target, {
    get(t, p, r) {
      if (typeof p !== "string" || p in t) return Reflect.get(t, p, r);
      if (isIndex(p)) return (t as XMLList | XML).$item(Number(p));
      if (p.startsWith("@")) return t.attribute(p.slice(1));
      return t.child(p);
    },
    set(t, p, v, r) {
      if (typeof p !== "string" || p in t) return Reflect.set(t, p, v, r);
      if (isIndex(p)) { (t as XMLList).$setItem?.(Number(p), v); return true; }
      if (p.startsWith("@")) { t.setAttribute(p.slice(1), v); return true; }
      t.setChild(p, v);
      return true;
    },
    has(t, p) {
      if (typeof p !== "string" || p in t) return Reflect.has(t, p);
      if (isIndex(p)) return Number(p) < t.length();
      return t.child(p).length() > 0;
    },
  });
}

// ------------------------------------------------------------------ XML
export class QName {
  constructor(public uri: string, public localName: string) {}
  toString(): string { return this.uri ? `${this.uri}::${this.localName}` : this.localName; }
}

export class Namespace {
  constructor(public prefix = "", public uri = "") {
    if (arguments.length === 1) { this.uri = prefix; this.prefix = ""; }
  }
  toString(): string { return this.uri; }
}

export class XML {
  static ignoreWhitespace = true;
  static ignoreComments = true;
  static ignoreProcessingInstructions = true;
  static prettyPrinting = true;
  static prettyIndent = 2;

  declare $node: XNode;

  constructor(src?: unknown) {
    let node: XNode;
    if (src instanceof XNode) node = src;
    else if (src instanceof XML) node = src.$node.clone();
    else if (src instanceof XMLList) node = src.$nodes.length === 1 ? src.$nodes[0]!.clone() : new XNode("text");
    else if (src === undefined || src === null || src === "") { node = new XNode("text"); }
    else {
      const nodes = parseXml(String(src));
      const els = nodes.filter((x) => x.kind === "element");
      if (els.length > 1) throw new TypeError("Error #1088: The markup in the document following the root element must be well-formed.");
      node = els[0] ?? nodes[0] ?? new XNode("text");
      node.parent = null;
    }
    Object.defineProperty(this, "$node", { value: node, writable: true, enumerable: false });
    return makeProxy(this);
  }

  // --- navegação
  child(name: string | number): XMLList {
    if (typeof name === "number") return new XMLList(this.$node.children[name] ? [this.$node.children[name]!] : []);
    return new XMLList(this.$node.children.filter((c) => c.kind === "element" && nameMatch(c, name)), this.$node, name);
  }
  children(): XMLList { return new XMLList(this.$node.children.slice(), this.$node, "*"); }
  elements(name = "*"): XMLList { return new XMLList(this.$node.children.filter((c) => c.kind === "element" && nameMatch(c, name))); }
  text(): XMLList { return new XMLList(this.$node.children.filter((c) => c.kind === "text")); }
  comments(): XMLList { return new XMLList([]); }
  processingInstructions(): XMLList { return new XMLList([]); }
  attribute(name: string | QName): XMLList {
    const n = String(name);
    return new XMLList(this.$node.attrs.filter((a) => nameMatch(a, n)), this.$node, "@" + n);
  }
  attributes(): XMLList { return new XMLList(this.$node.attrs.slice()); }
  descendants(name = "*"): XMLList {
    const out: XNode[] = [];
    const attr = name.startsWith("@");
    const nm = attr ? name.slice(1) : name;
    const walk = (n: XNode) => {
      for (const c of n.children) {
        if (attr) { for (const a of c.attrs) if (nameMatch(a, nm)) out.push(a); }
        else if (c.kind === "element" && nameMatch(c, nm)) out.push(c);
        if (c.kind === "element") walk(c);
      }
    };
    if (attr) for (const a of this.$node.attrs) if (nameMatch(a, nm)) out.push(a);
    walk(this.$node);
    return new XMLList(out);
  }
  parent(): XML | undefined { return this.$node.parent ? new XML(this.$node.parent) : undefined; }
  filter(pred: (item: XML) => unknown): XMLList { return new XMLList([this.$node]).filter(pred); }

  // --- informação
  name(): QName | null { return this.$node.kind === "text" ? null : new QName("", this.$node.name); }
  localName(): string | null { const n = this.$node.name; return n.includes(":") ? n.slice(n.indexOf(":") + 1) : n || null; }
  nodeKind(): string { return this.$node.kind; }
  length(): number { return 1; }
  childIndex(): number { return this.$node.parent ? this.$node.parent.children.indexOf(this.$node) : -1; }
  hasSimpleContent(): boolean { return simple(this.$node); }
  hasComplexContent(): boolean { return !simple(this.$node); }
  hasOwnProperty(p: string): boolean {
    if (p.startsWith("@")) return this.$node.attrs.some((a) => nameMatch(a, p.slice(1)));
    return this.$node.children.some((c) => c.kind === "element" && nameMatch(c, p));
  }
  contains(v: unknown): boolean { return v instanceof XML && v.$node === this.$node; }
  namespace(): Namespace { return new Namespace(); }
  inScopeNamespaces(): Namespace[] { return []; }
  namespaceDeclarations(): Namespace[] { return []; }
  addNamespace(_ns: unknown): XML { return this; }
  removeNamespace(_ns: unknown): XML { return this; }
  setNamespace(_ns: unknown): void {}
  normalize(): XML { return this; }

  // --- edição
  setAttribute(name: string, v: unknown): void {
    const val = v instanceof XMLList || v instanceof XML ? v.toString() : String(v);
    const a = this.$node.attrs.find((x) => x.name === name);
    if (a) a.value = val;
    else { const n = new XNode("attribute", name); n.value = val; n.parent = this.$node; this.$node.attrs.push(n); }
  }
  deleteAttribute(name: string): void { this.$node.attrs = this.$node.attrs.filter((a) => !nameMatch(a, name)); }
  /** `xml.nome = valor` */
  setChild(name: string, v: unknown): void {
    const idx = this.$node.children.findIndex((c) => c.kind === "element" && nameMatch(c, name));
    let nodes: XNode[];
    if (v instanceof XML || v instanceof XMLList) nodes = toNodes(v).map((x) => x.clone());
    else {
      const el = new XNode("element", name);
      const t = new XNode("text");
      t.value = String(v);
      t.parent = el;
      el.children.push(t);
      nodes = [el];
    }
    for (const x of nodes) x.parent = this.$node;
    if (idx < 0) this.$node.children.push(...nodes);
    else {
      // substitui o primeiro, remove os demais com o mesmo nome (E4X [[Put]])
      this.$node.children.splice(idx, 1, ...nodes);
      this.$node.children = this.$node.children.filter((c, i) => i <= idx + nodes.length - 1 || !(c.kind === "element" && nameMatch(c, name)));
    }
  }
  appendChild(v: unknown): XML {
    for (const x of toNodes(v)) { const c = x.parent ? x.clone() : x; c.parent = this.$node; this.$node.children.push(c); }
    return this;
  }
  prependChild(v: unknown): XML {
    const ns = toNodes(v).map((x) => { const c = x.parent ? x.clone() : x; c.parent = this.$node; return c; });
    this.$node.children.unshift(...ns);
    return this;
  }
  insertChildAfter(ref: unknown, v: unknown): XML {
    const r = ref instanceof XML ? ref.$node : ref instanceof XMLList ? ref.$nodes[0] : null;
    const i = r ? this.$node.children.indexOf(r) : -1;
    const ns = toNodes(v).map((x) => { const c = x.parent ? x.clone() : x; c.parent = this.$node; return c; });
    this.$node.children.splice(i + 1, 0, ...ns);
    return this;
  }
  insertChildBefore(ref: unknown, v: unknown): XML {
    const r = ref instanceof XML ? ref.$node : ref instanceof XMLList ? ref.$nodes[0] : null;
    let i = r ? this.$node.children.indexOf(r) : this.$node.children.length;
    if (i < 0) i = this.$node.children.length;
    const ns = toNodes(v).map((x) => { const c = x.parent ? x.clone() : x; c.parent = this.$node; return c; });
    this.$node.children.splice(i, 0, ...ns);
    return this;
  }
  setChildren(v: unknown): XML {
    this.$node.children = [];
    return this.appendChild(v);
  }
  replace(name: string | number, v: unknown): XML {
    if (typeof name === "number") {
      const ns = toNodes(v).map((x) => { const c = x.clone(); c.parent = this.$node; return c; });
      this.$node.children.splice(name, 1, ...ns);
    } else this.setChild(name, v);
    return this;
  }
  setName(n: string): void { this.$node.name = String(n); }
  setLocalName(n: string): void { this.$node.name = String(n); }
  copy(): XML { return new XML(this.$node.clone()); }

  $item(i: number): XML | undefined { return i === 0 ? this : undefined; }

  // --- conversão
  toString(): string {
    const n = this.$node;
    if (n.kind === "attribute" || n.kind === "text") return n.value;
    if (simple(n)) return textOf(n);
    return toXMLString(n);
  }
  toXMLString(): string { return toXMLString(this.$node); }
  valueOf(): XML { return this; }
  [Symbol.toPrimitive](): string { return this.toString(); }
  toJSON(): string { return this.toXMLString(); }
  *[Symbol.iterator](): Iterator<XML> { yield this; }
}

// ------------------------------------------------------------------ XMLList
export class XMLList {
  declare $nodes: XNode[];
  /** de onde veio (pra `lista.foo = x` / atribuição em XMLList vazio) */
  declare $target: XNode | null;
  declare $targetName: string | null;

  constructor(src?: unknown, target: XNode | null = null, targetName: string | null = null) {
    let nodes: XNode[];
    if (Array.isArray(src)) nodes = src as XNode[];
    else if (src instanceof XMLList) nodes = src.$nodes.slice();
    else if (src instanceof XML) nodes = [src.$node];
    else if (src === undefined || src === null || src === "") nodes = [];
    else nodes = parseXml(String(src));
    Object.defineProperty(this, "$nodes", { value: nodes, writable: true, enumerable: false });
    Object.defineProperty(this, "$target", { value: target, writable: true, enumerable: false });
    Object.defineProperty(this, "$targetName", { value: targetName, writable: true, enumerable: false });
    return makeProxy(this);
  }

  length(): number { return this.$nodes.length; }
  $item(i: number): XML | undefined { const n = this.$nodes[i]; return n ? new XML(n) : undefined; }
  $setItem(i: number, v: unknown): void {
    const old = this.$nodes[i];
    if (!old) return;
    if (old.kind === "attribute") { old.value = String(v); return; }
    const p = old.parent;
    const ns = toNodes(v).map((x) => x.clone());
    if (p) { const k = p.children.indexOf(old); for (const x of ns) x.parent = p; p.children.splice(k, 1, ...ns); }
    this.$nodes.splice(i, 1, ...ns);
  }
  child(name: string | number): XMLList {
    const out: XNode[] = [];
    for (const n of this.$nodes) {
      if (typeof name === "number") { const c = n.children[name]; if (c) out.push(c); }
      else for (const c of n.children) if (c.kind === "element" && nameMatch(c, name)) out.push(c);
    }
    return new XMLList(out, this.$nodes.length === 1 ? this.$nodes[0]! : null, typeof name === "string" ? name : null);
  }
  children(): XMLList { return new XMLList(this.$nodes.flatMap((n) => n.children)); }
  elements(name = "*"): XMLList { return new XMLList(this.$nodes.flatMap((n) => n.children.filter((c) => c.kind === "element" && nameMatch(c, name)))); }
  text(): XMLList { return new XMLList(this.$nodes.flatMap((n) => (n.kind === "text" ? [n] : n.children.filter((c) => c.kind === "text")))); }
  comments(): XMLList { return new XMLList([]); }
  processingInstructions(): XMLList { return new XMLList([]); }
  attribute(name: string | QName): XMLList {
    const nm = String(name);
    return new XMLList(this.$nodes.flatMap((n) => n.attrs.filter((a) => nameMatch(a, nm))), this.$nodes.length === 1 ? this.$nodes[0]! : null, "@" + nm);
  }
  attributes(): XMLList { return new XMLList(this.$nodes.flatMap((n) => n.attrs)); }
  descendants(name = "*"): XMLList {
    return new XMLList(this.$nodes.flatMap((n) => new XML(n).descendants(name).$nodes));
  }
  parent(): XML | undefined {
    const p = this.$nodes[0]?.parent;
    if (!p || this.$nodes.some((n) => n.parent !== p)) return undefined;
    return new XML(p);
  }
  filter(pred: (item: XML) => unknown): XMLList {
    return new XMLList(this.$nodes.filter((n) => !!pred(new XML(n))));
  }
  contains(v: unknown): boolean { return v instanceof XML && this.$nodes.includes(v.$node); }
  copy(): XMLList { return new XMLList(this.$nodes.map((n) => n.clone())); }
  hasSimpleContent(): boolean {
    if (this.$nodes.length === 0) return true;
    if (this.$nodes.length === 1) return simple(this.$nodes[0]!);
    return !this.$nodes.some((n) => n.kind === "element");
  }
  hasComplexContent(): boolean { return !this.hasSimpleContent(); }
  hasOwnProperty(p: string): boolean {
    if (isIndex(p)) return Number(p) < this.$nodes.length;
    return this.child(p).length() > 0;
  }
  name(): QName | null { return this.$nodes.length === 1 ? new XML(this.$nodes[0]!).name() : null; }
  localName(): string | null { return this.$nodes.length === 1 ? new XML(this.$nodes[0]!).localName() : null; }
  nodeKind(): string { return this.$nodes.length === 1 ? this.$nodes[0]!.kind : "list"; }
  childIndex(): number { return this.$nodes.length === 1 ? new XML(this.$nodes[0]!).childIndex() : -1; }
  normalize(): XMLList { return this; }

  // edição (delegam pro único item, ou criam no alvo)
  private one(): XML {
    if (this.$nodes.length === 1) return new XML(this.$nodes[0]!);
    if (this.$nodes.length === 0 && this.$target && this.$targetName && !this.$targetName.startsWith("@")) {
      const el = new XNode("element", this.$targetName);
      el.parent = this.$target;
      this.$target.children.push(el);
      this.$nodes.push(el);
      return new XML(el);
    }
    throw new TypeError("Error #1086: The method only works on lists containing one item.");
  }
  setAttribute(name: string, v: unknown): void { for (const n of this.$nodes) new XML(n).setAttribute(name, v); if (!this.$nodes.length) this.one().setAttribute(name, v); }
  deleteAttribute(name: string): void { for (const n of this.$nodes) new XML(n).deleteAttribute(name); }
  setChild(name: string, v: unknown): void { this.one().setChild(name, v); }
  appendChild(v: unknown): XML { return this.one().appendChild(v); }
  prependChild(v: unknown): XML { return this.one().prependChild(v); }
  insertChildAfter(r: unknown, v: unknown): XML { return this.one().insertChildAfter(r, v); }
  insertChildBefore(r: unknown, v: unknown): XML { return this.one().insertChildBefore(r, v); }
  setChildren(v: unknown): XML { return this.one().setChildren(v); }
  replace(n: string | number, v: unknown): XML { return this.one().replace(n, v); }
  setName(n: string): void { this.one().setName(n); }
  setLocalName(n: string): void { this.one().setLocalName(n); }

  toString(): string {
    if (this.hasSimpleContent()) {
      return this.$nodes.filter((n) => n.kind !== "comment" && n.kind !== "processing-instruction").map((n) => new XML(n).toString()).join("");
    }
    return this.toXMLString();
  }
  toXMLString(): string { return this.$nodes.map((n) => toXMLString(n)).join("\n"); }
  valueOf(): XMLList { return this; }
  [Symbol.toPrimitive](): string { return this.toString(); }
  toJSON(): string { return this.toXMLString(); }
  *[Symbol.iterator](): Iterator<XML> { for (const n of this.$nodes) yield new XML(n); }
}

/** `XML(x)` (conversão, não `new`) */
export function $toXML(v: unknown): XML {
  if (v instanceof XML) return v;
  if (v instanceof XMLList) {
    if (v.$nodes.length === 1) return new XML(v.$nodes[0]!);
    throw new TypeError("Error #1088: XMLList com mais de um item não converte pra XML.");
  }
  return new XML(v);
}

/** `XMLList(x)` */
export function $toXMLList(v: unknown): XMLList {
  if (v instanceof XMLList) return v;
  if (v instanceof XML) return new XMLList([v.$node]);
  return new XMLList(v);
}

export function isXMLName(s: unknown): boolean {
  return typeof s === "string" && /^[A-Za-z_][\w.-]*$/.test(s);
}
