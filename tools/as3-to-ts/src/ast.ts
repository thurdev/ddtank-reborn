/**
 * AST do AS3. Só o necessário pra emitir TS fiel — não é um AST genérico.
 * Todo nó tem `pos` (offset no arquivo .as) e pode ter `comments` (comentários
 * que vinham logo antes dele no fonte original).
 */

export interface NodeBase {
  pos: number;
  comments?: string[];
}

/** Referência de tipo AS3: `int`, `Vector.<String>`, `*`, `flash.display.Sprite`, `void`. */
export interface TypeRef {
  name: string;
  params?: TypeRef[];
}

// ---------------------------------------------------------------- expressões
export type Expr =
  | { kind: "num"; pos: number; value: string }
  | { kind: "str"; pos: number; value: string }
  | { kind: "regex"; pos: number; value: string }
  | { kind: "xml"; pos: number; value: string }
  | { kind: "bool"; pos: number; value: boolean }
  | { kind: "null"; pos: number }
  | { kind: "undefined"; pos: number }
  | { kind: "this"; pos: number }
  | { kind: "super"; pos: number }
  | { kind: "id"; pos: number; name: string; ns?: string }
  | { kind: "member"; pos: number; obj: Expr; name: string; ns?: string }
  | { kind: "index"; pos: number; obj: Expr; index: Expr }
  /** `obj.@name`, `obj.@*`, `obj.@[expr]` */
  | { kind: "attr"; pos: number; obj: Expr; name: string | Expr }
  /** `obj..name` */
  | { kind: "descendants"; pos: number; obj: Expr; name: string; attr?: boolean }
  /** `obj.(predicado)` */
  | { kind: "filter"; pos: number; obj: Expr; pred: Expr }
  /** `Vector.<T>` usado como valor (ex.: `new Vector.<int>()`) */
  | { kind: "vectorType"; pos: number; elem: TypeRef }
  | { kind: "call"; pos: number; callee: Expr; args: Expr[] }
  | { kind: "new"; pos: number; callee: Expr; args: Expr[] | null }
  /** `new <T>[a, b]` */
  | { kind: "vectorLit"; pos: number; elem: TypeRef; items: Expr[] }
  | { kind: "unary"; pos: number; op: string; arg: Expr }
  | { kind: "update"; pos: number; op: "++" | "--"; prefix: boolean; arg: Expr }
  | { kind: "binary"; pos: number; op: string; left: Expr; right: Expr }
  | { kind: "assign"; pos: number; op: string; left: Expr; right: Expr }
  | { kind: "cond"; pos: number; test: Expr; then: Expr; else: Expr }
  | { kind: "array"; pos: number; items: (Expr | null)[] }
  | { kind: "object"; pos: number; props: { key: string; keyKind: "id" | "str" | "num"; value: Expr }[] }
  | { kind: "func"; pos: number; fn: FunctionNode }
  | { kind: "comma"; pos: number; exprs: Expr[] }
  | { kind: "paren"; pos: number; expr: Expr };

// ---------------------------------------------------------------- comandos
export interface VarDeclarator {
  name: string;
  type?: TypeRef;
  init?: Expr;
}

export type Stmt = NodeBase &
  (
    | { kind: "block"; body: Stmt[] }
    | { kind: "var"; isConst: boolean; decls: VarDeclarator[] }
    | { kind: "expr"; expr: Expr }
    | { kind: "if"; test: Expr; then: Stmt; else?: Stmt }
    | { kind: "for"; init?: Stmt | null; test?: Expr | null; update?: Expr | null; body: Stmt }
    /** `for (k in obj)` (each=false) / `for each (v in obj)` (each=true) */
    | { kind: "forin"; each: boolean; left: Stmt | Expr; right: Expr; body: Stmt }
    | { kind: "while"; test: Expr; body: Stmt }
    | { kind: "dowhile"; test: Expr; body: Stmt }
    | { kind: "switch"; disc: Expr; cases: { test: Expr | null; body: Stmt[]; comments?: string[] }[] }
    | { kind: "return"; arg?: Expr }
    | { kind: "break"; label?: string }
    | { kind: "continue"; label?: string }
    | { kind: "throw"; arg: Expr }
    | { kind: "try"; block: Stmt[]; handlers: { param: string; type?: TypeRef; body: Stmt[] }[]; finalizer?: Stmt[] }
    | { kind: "label"; label: string; body: Stmt }
    | { kind: "empty" }
    | { kind: "function"; fn: FunctionNode }
    /** `use namespace x;` / `default xml namespace = ...` — ignorados no emit */
    | { kind: "directive"; text: string }
  );

export interface Param {
  name: string;
  type?: TypeRef;
  init?: Expr;
  rest?: boolean;
}

export interface FunctionNode {
  name?: string;
  params: Param[];
  returnType?: TypeRef;
  body: Stmt[] | null;
  pos: number;
  /** usa `arguments` (precisa virar `function`, não arrow) */
  usesArguments?: boolean;
}

// ---------------------------------------------------------------- declarações
export interface Modifiers {
  access: "public" | "private" | "protected" | "internal" | string;
  isStatic: boolean;
  isOverride: boolean;
  isFinal: boolean;
  isNative: boolean;
  isDynamic: boolean;
}

export interface FieldMember extends NodeBase {
  kind: "field";
  mods: Modifiers;
  isConst: boolean;
  name: string;
  type?: TypeRef;
  init?: Expr;
}

export interface MethodMember extends NodeBase {
  kind: "method";
  mods: Modifiers;
  accessor?: "get" | "set";
  name: string;
  fn: FunctionNode;
}

export type Member = FieldMember | MethodMember;

export interface ClassDecl extends NodeBase {
  kind: "class";
  name: string;
  mods: Modifiers;
  extends?: string;
  implements: string[];
  members: Member[];
  /** código solto dentro do corpo da classe (inicializador estático) */
  staticInit: Stmt[];
}

export interface InterfaceDecl extends NodeBase {
  kind: "interface";
  name: string;
  mods: Modifiers;
  extends: string[];
  members: MethodMember[];
}

export interface FunctionDecl extends NodeBase {
  kind: "function";
  name: string;
  mods: Modifiers;
  fn: FunctionNode;
}

export interface VarDecl extends NodeBase {
  kind: "var";
  mods: Modifiers;
  isConst: boolean;
  decls: VarDeclarator[];
}

export interface NamespaceDecl extends NodeBase {
  kind: "namespace";
  name: string;
  uri?: string;
}

export type Decl = ClassDecl | InterfaceDecl | FunctionDecl | VarDecl | NamespaceDecl;

export interface Program {
  file: string;
  pkg: string;
  imports: string[];
  /** declarações dentro do `package { }` (normalmente 1 classe) */
  decls: Decl[];
  /** classes auxiliares fora do bloco package (visíveis só no arquivo) */
  privateDecls: Decl[];
  /** `import` fora do package (usados pelas classes privadas) */
  privateImports: string[];
  headerComments: string[];
}
