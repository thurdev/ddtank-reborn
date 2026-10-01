"""Tiny C# source helpers (regex + brace matching) used by the spec extractors.

Not a real parser: good enough for the decompiled DDTank41 sources.
"""
import re
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "vendor", "DDTank41"))


def read(path):
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        return f.read().replace("\r\n", "\n")


def rel(path):
    return os.path.relpath(path, ROOT).replace("\\", "/")


def strip_comments(src):
    # keep string literals intact, drop // and /* */ comments
    out = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c == '"' or (c == '@' and i + 1 < n and src[i + 1] == '"'):
            verbatim = c == '@'
            j = i + (2 if verbatim else 1)
            while j < n:
                if verbatim:
                    if src[j] == '"' and j + 1 < n and src[j + 1] == '"':
                        j += 2
                        continue
                    if src[j] == '"':
                        break
                else:
                    if src[j] == '\\':
                        j += 2
                        continue
                    if src[j] == '"' or src[j] == '\n':
                        break
                j += 1
            out.append(src[i:j + 1])
            i = j + 1
        elif c == "'":
            j = i + 1
            while j < n and src[j] != "'":
                j += 2 if src[j] == '\\' else 1
            out.append(src[i:j + 1])
            i = j + 1
        elif src.startswith("//", i):
            j = src.find("\n", i)
            i = n if j < 0 else j
        elif src.startswith("/*", i):
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def match_brace(src, open_idx):
    """src[open_idx] == '{' -> index of matching '}' (strings skipped)."""
    depth = 0
    i, n = open_idx, len(src)
    while i < n:
        c = src[i]
        if c == '"':
            j = i + 1
            verb = i > 0 and src[i - 1] == '@'
            while j < n:
                if not verb and src[j] == '\\':
                    j += 2
                    continue
                if src[j] == '"':
                    if verb and j + 1 < n and src[j + 1] == '"':
                        j += 2
                        continue
                    break
                j += 1
            i = j + 1
            continue
        if c == "'":
            j = i + 1
            while j < n and src[j] != "'":
                j += 2 if src[j] == '\\' else 1
            i = j + 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return n - 1


METHOD_RE = re.compile(
    r"(?m)^[ \t]*((?:public|private|protected|internal|static|virtual|override|abstract|sealed|async|unsafe|new|\s)+)"
    r"([\w<>\[\],\. ?]+?)\s+(\w+)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*(?:where[^{]*)?\{")


def methods(src):
    """yield (name, return_type, params, body, start_offset)"""
    for m in METHOD_RE.finditer(src):
        name = m.group(3)
        if name in ("if", "while", "for", "foreach", "switch", "using", "lock", "catch"):
            continue
        ob = m.end() - 1
        cb = match_brace(src, ob)
        yield name, m.group(2).strip(), " ".join(m.group(4).split()), src[ob:cb + 1], m.start()


CLASS_RE = re.compile(r"((?:\[[^\]]*\]\s*)*)(?:public\s+|internal\s+|sealed\s+|abstract\s+|static\s+|partial\s+)*class\s+(\w+)[^{]*\{")


def classes(src):
    """yield (attrs_text, class_name, body)"""
    for m in CLASS_RE.finditer(src):
        ob = m.end() - 1
        cb = match_brace(src, ob)
        yield m.group(1), m.group(2), src[ob:cb + 1]


ENUM_RE = re.compile(r"enum\s+(\w+)\s*(?::\s*\w+)?\s*\{([^}]*)\}")


def parse_enums(src):
    res = {}
    for m in ENUM_RE.finditer(strip_comments(src)):
        vals = {}
        cur = -1
        for part in m.group(2).split(","):
            part = part.strip()
            if not part:
                continue
            if "=" in part:
                k, v = [x.strip() for x in part.split("=", 1)]
                try:
                    cur = int(v, 0)
                except ValueError:
                    cur = vals.get(v, cur + 1)
            else:
                k = part
                cur += 1
            vals[k] = cur
        res[m.group(1)] = vals
    return res


def walk(dirs, ext=".cs"):
    for d in dirs:
        base = os.path.join(ROOT, d)
        for dp, dn, fn in os.walk(base):
            dn[:] = [x for x in dn if x not in ("bin", "obj")]
            for f in sorted(fn):
                if f.endswith(ext):
                    yield os.path.join(dp, f)
