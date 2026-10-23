# Transpilador AS3 → TypeScript (`tools/as3-to-ts`)

Converte o fonte AS3 do cliente (`vendor/DDTank41/Source Flash/src`, 2.517
arquivos) + o AS3 descompilado dos SWFs de boot/registro/tutorial
(`tools/as3-to-ts/extra-src`) em TS em `apps/client/src/game` — um `.ts` por
`.as`, mesmos nomes, comentários e estrutura.

```bash
npx tsx tools/as3-to-ts/src/main.ts      # ~10 s; relatório em src/game/TRANSPILE-REPORT.md
```

## Etapas

| Arquivo | Faz |
|---|---|
| `lexer.ts`, `parser.ts`, `ast.ts` | lê AS3 (inclui E4X, `Vector.<T>`, namespaces) |
| `project.ts` | tabela de símbolos: classes do jogo + API do Flash (`playerglobal/`) |
| `emit.ts` | gera TS com as regras do AS3 (tabela abaixo) |
| `cycles.ts` | simula a ordem de carga dos módulos ES e quebra ciclos de import que dariam erro |
| `main.ts` | junta tudo, aplica patches, grava só o que mudou, gera `all.ts` |

## O que muda na conversão

| AS3 | TS gerado | Por quê |
|---|---|---|
| `foo` (membro sem `this`) | `this.foo` / `Classe.foo` | escopo do AS3 inclui membros |
| `addEventListener(E, onX)` | `$m(this, "onX")` | método do AS3 já vem ligado ao objeto |
| `var i:int = a / 2` | `int(a / 2)` | int trunca |
| `campo:Number = "10"` (XML) | `Number(...)` / `$dset` | AS3 converte ao gravar |
| `x is T` / `x as T` | `$is(x, T)` / `$as(x, T)` | inclui interfaces e tipos primitivos |
| `xml.@id`, `xml..Item`, `xml.(@a==1)` | `.attribute("id")`, `.descendants`, `.filter(...)` | E4X |
| `dict[obj]` | `dict.get(obj)` | chave objeto |
| `for each (v in o)` | `for (v of $each(o))` | |
| campos com valor inicial | `$class(..., { fields() { ... } })` | rodam **antes** do construtor da mãe, como no AS3 |
| `static var x = Algo.f()` | `$statics(...)` | inicializa no 1º uso da classe, como no AS3 |
| `private var _x` repetido na hierarquia | `_x$Classe` | em AS3 cada classe tem o seu |
| `this.x = ...; super(...)` | temporária `$pre_x` + `super(...$pre(new.target, { x: $pre_x }, [args]))` | JS não deixa usar `this` antes do `super`; o `$init` da raiz grava `x` antes dos construtores (igual ao AS3) |
| `"Đồng ý"` (texto fixo no código) | `"Confirmar"` | literais exatos de `tools/as3-to-ts/i18n/strings.pt-BR.json` são traduzidos na geração |

## Patches

Enquanto o transpilador ainda é rodado, edição manual no TS gerado se perde.
Por isso correções no código do jogo vão como **patch**:

```
tools/as3-to-ts/patches/<caminho do .ts>.json
[ { "why": "motivo", "find": "trecho exato", "replace": "trecho novo" } ]
```

O `find` precisa existir exatamente 1 vez; se o gerado mudar, o transpilador
avisa `FALHARAM: ...`. Patches atuais: remover checagem md5/"road7" de SWF,
cache de SWF no SharedObject, e o log de pacotes do modo debug.

## Congelamento (fim da conversão)

Quando o jogo estiver estável:

1. Rodar o transpilador uma última vez (com os patches).
2. Versionar `apps/client/src/game` (tirar do `.gitignore`).
3. Apagar `tools/as3-to-ts/extra-src`, `patches/` e deixar o transpilador só
   como histórico. Daí em diante **edite o TS direto** — é o código-fonte.
