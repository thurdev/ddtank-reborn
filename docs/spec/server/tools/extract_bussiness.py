"""Map Bussiness/*.cs methods -> stored procedures -> params -> result columns.

Usage: python docs/spec/server/tools/extract_bussiness.py
Writes docs/spec/server/tools/out/bussiness-procs.md and .json
"""
import json
import os
import re
from cslib import ROOT, read, rel, strip_comments, methods, classes, walk

OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

CALL_RE = re.compile(r"db\.(GetReader|RunProcedure|GetDataTable|GetDataSet|ExecuteNonQuery)\s*\(")
PARAM_RE = re.compile(r'new\s+SqlParameter\s*\(\s*"@?(\w+)"\s*(?:,\s*([^;]*?))?\)\s*[,;\}\n]')
COL_RE = re.compile(r'(?<!AppSettings)\[\s*"(\w+)"\s*\]')
COL_ANY_RE = re.compile(r'(?<!AppSettings)\[\s*"(\w+)"\s*\]')
DIRECTION_RE = re.compile(r'\[(\d+)\]\.Direction\s*=\s*ParameterDirection\.(\w+)')
HELPER_CALL_RE = re.compile(r"\b(\w+)\s*\(\s*(?:\w*[Rr]eader\w*|dr|rd|row|dataRow\d*|item)\s*\)")


def first_string(src, start):
    # find first string literal (or identifier) after "(" at start
    depth = 0
    i = start
    while i < len(src):
        c = src[i]
        if c == '"':
            j = src.find('"', i + 1)
            return src[i + 1:j]
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth < 0:
                return None
        elif c == "," and depth == 0:
            # skip "ref reader,"
            pass
        i += 1
    return None


def call_args(src, start):
    depth = 0
    i = start
    while i < len(src):
        if src[i] == "(":
            depth += 1
        elif src[i] == ")":
            if depth == 0:
                return src[start:i]
            depth -= 1
        i += 1
    return src[start:]


def main():
    files = list(walk(["Bussiness"]))
    all_methods = {}  # name -> list of (class, body)
    per_class = []
    for f in files:
        src = strip_comments(read(f))
        for attrs, cname, cbody in classes(src):
            ms = list(methods(cbody))
            per_class.append((rel(f), cname, ms))
            for name, rt, params, body, off in ms:
                all_methods.setdefault(name, []).append((cname, body))

    def helper_cols(name, seen):
        cols = []
        for cname, body in all_methods.get(name, []):
            for c in COL_ANY_RE.findall(body):
                if c not in cols:
                    cols.append(c)
            for h in HELPER_CALL_RE.findall(body):
                if h not in seen:
                    seen.add(h)
                    for c in helper_cols(h, seen):
                        if c not in cols:
                            cols.append(c)
        return cols

    rows = []
    for path, cname, ms in per_class:
        for name, rt, params, body, off in ms:
            calls = []
            for m in CALL_RE.finditer(body):
                args = call_args(body, m.end())
                proc = None
                sm = re.search(r'"([^"]+)"', args)
                if sm:
                    proc = sm.group(1)
                else:
                    parts = [a.strip() for a in args.split(",")]
                    proc = "<" + (parts[1] if m.group(1) == "GetReader" and len(parts) > 1 else parts[0]) + ">"
                calls.append((m.group(1), proc))
            if not calls:
                continue
            sqlparams = []
            for pm in PARAM_RE.finditer(body):
                p = pm.group(1)
                if p not in sqlparams:
                    sqlparams.append(p)
            dirs = DIRECTION_RE.findall(body)
            cols = []
            for c in COL_RE.findall(body):
                if c not in cols:
                    cols.append(c)
            seen = set()
            for h in HELPER_CALL_RE.findall(body):
                if h == name:
                    continue
                seen.add(h)
                for c in helper_cols(h, seen):
                    if c not in cols:
                        cols.append(c)
            helpers = sorted(set(HELPER_CALL_RE.findall(body)) - {name})
            rows.append({
                "file": path,
                "class": cname,
                "method": name,
                "signature": f"{rt} {name}({params})",
                "calls": calls,
                "params": sqlparams,
                "directions": dirs,
                "columns": cols,
                "helpers": helpers,
                "line": None,
            })

    with open(os.path.join(OUT, "bussiness-procs.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=1, ensure_ascii=False)

    procs = {}
    for r in rows:
        for kind, p in r["calls"]:
            procs.setdefault(p, []).append(f'{r["class"]}.{r["method"]}')

    lines = []
    cur = None
    for r in rows:
        if r["class"] != cur:
            cur = r["class"]
            lines.append(f"\n### {cur} (`{r['file']}`)\n")
            lines.append("| Method | Kind | Stored procedure | Params (@) | Result columns read |")
            lines.append("|---|---|---|---|---|")
        kinds = ", ".join(sorted(set(k for k, _ in r["calls"])))
        pr = ", ".join(f"`{p}`" for _, p in dict.fromkeys(r["calls"]))
        params = ", ".join(r["params"])
        if r["directions"]:
            params += " (" + ", ".join(f"[{i}]={d}" for i, d in r["directions"]) + ")"
        cols = ", ".join(r["columns"])
        if r["helpers"]:
            cols += (" " if cols else "") + "(via " + ", ".join(r["helpers"]) + ")"
        sig = r["signature"].replace("|", "\\|")
        lines.append(f"| `{sig}` | {kinds} | {pr} | {params} | {cols} |")
    with open(os.path.join(OUT, "bussiness-procs.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    with open(os.path.join(OUT, "procs-index.md"), "w", encoding="utf-8") as f:
        f.write("| Stored procedure | Called by |\n|---|---|\n")
        for p in sorted(procs, key=str.lower):
            f.write(f"| `{p}` | {', '.join(sorted(set(procs[p])))} |\n")
    print(len(rows), "methods,", len(procs), "procs")


if __name__ == "__main__":
    main()
