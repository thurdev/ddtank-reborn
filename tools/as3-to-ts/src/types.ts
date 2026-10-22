/**
 * Tipos resolvidos usados na inferência do emissor.
 *
 * `RType.fqn` é o nome completo da classe (`flash.display.Sprite`,
 * `ddt.manager.SocketManager`) ou um builtin (`int`, `uint`, `Number`,
 * `String`, `Boolean`, `Array`, `Object`, `XML`, `XMLList`, `Function`,
 * `Class`, `*`, `void`, `Vector`).
 * `classRef` = a expressão é a própria classe (acesso estático), não uma instância.
 */
export interface RType {
  fqn: string;
  params?: RType[];
  classRef?: boolean;
}

export const ANY: RType = { fqn: "*" };
export const INT: RType = { fqn: "int" };
export const UINT: RType = { fqn: "uint" };
export const NUMBER: RType = { fqn: "Number" };
export const STRING: RType = { fqn: "String" };
export const BOOLEAN: RType = { fqn: "Boolean" };
export const XML_T: RType = { fqn: "XML" };
export const XMLLIST_T: RType = { fqn: "XMLList" };
export const ARRAY_T: RType = { fqn: "Array" };

export const isIntT = (t?: RType) => !!t && !t.classRef && (t.fqn === "int" || t.fqn === "uint");
export const isNumT = (t?: RType) => !!t && !t.classRef && (t.fqn === "int" || t.fqn === "uint" || t.fqn === "Number");
export const isXmlT = (t?: RType) => !!t && !t.classRef && (t.fqn === "XML" || t.fqn === "XMLList");
export const isDictT = (t?: RType) => !!t && !t.classRef && t.fqn === "flash.utils.Dictionary";
export const isVectorT = (t?: RType) => !!t && !t.classRef && t.fqn === "Vector";

/** builtins de topo que existem em JS com a mesma semântica (não importa nada) */
export const JS_GLOBALS = new Set([
  "Math", "Number", "String", "Array", "Object", "Boolean", "Date", "RegExp", "JSON", "Error", "TypeError",
  "RangeError", "ReferenceError", "SyntaxError", "EvalError", "URIError", "isNaN", "parseInt", "parseFloat",
  "isFinite", "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI", "escape", "unescape",
  "NaN", "Infinity", "undefined", "Function",
]);

/** builtins AS3 sem equivalente JS direto → vêm de `@ddt/flash/as3` */
export const AS3_RUNTIME_GLOBALS = new Set([
  "int", "uint", "trace", "XML", "XMLList", "Vector", "Namespace", "QName", "isXMLName", "Class",
  "ArgumentError", "SecurityError", "VerifyError", "DefinitionError", "UninitializedError",
]);

/** métodos de XML/XMLList (chamada `x.nome()` não é acesso a filho) */
export const XML_METHODS = new Set([
  "addNamespace", "appendChild", "attribute", "attributes", "child", "childIndex", "children", "comments",
  "contains", "copy", "descendants", "elements", "hasComplexContent", "hasOwnProperty", "hasSimpleContent",
  "inScopeNamespaces", "insertChildAfter", "insertChildBefore", "length", "localName", "name", "namespace",
  "namespaceDeclarations", "nodeKind", "normalize", "parent", "prependChild", "processingInstructions",
  "propertyIsEnumerable", "removeNamespace", "replace", "setChildren", "setLocalName", "setName",
  "setNamespace", "text", "toString", "toXMLString", "valueOf",
]);

/** palavras que não podem ser nome de variável em TS/ESM estrito */
export const RESERVED_LOCALS = new Set([
  "enum", "await", "yield", "let", "static", "implements", "interface", "package", "private", "protected",
  "public", "arguments", "eval",
]);
