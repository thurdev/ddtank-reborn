"""Concatenate C# sources into compact reading bundles (drops usings, blank lines,
brace-only lines; collapses indentation).  Reading aid used while writing the spec.

Usage: python compact_sources.py <outdir> <dir-or-file> [...]
Writes <outdir>/bundle_NN.txt, ~1800 lines each.
"""
import os
import re
import sys
from cslib import ROOT, read, rel, strip_comments


def compact(src):
    out = []
    for line in strip_comments(src).split("\n"):
        s = line.rstrip()
        if not s.strip():
            continue
        if re.match(r"\s*using\s+[\w\.]+\s*;", s) or re.match(r"\s*namespace\s", s):
            continue
        if s.strip() in ("{", "}", "};", "});"):
            continue
        if re.search(r"log\.(Info|Debug|Error|Warn)", s) and "(" in s and s.strip().endswith(");"):
            continue
        lead = len(s.expandtabs(4)) - len(s.expandtabs(4).lstrip())
        out.append(" " * (lead // 4) + s.strip())
    return out


def main():
    outdir = sys.argv[1]
    os.makedirs(outdir, exist_ok=True)
    files = []
    for a in sys.argv[2:]:
        p = os.path.join(ROOT, a)
        if os.path.isdir(p):
            for f in sorted(os.listdir(p)):
                if f.endswith(".cs"):
                    files.append(os.path.join(p, f))
        else:
            files.append(p)
    n, buf = 0, []
    for f in files:
        buf.append(f"##### {rel(f)}")
        buf.extend(compact(read(f)))
        if len(buf) > 1800:
            with open(os.path.join(outdir, f"bundle_{n:02d}.txt"), "w", encoding="utf-8") as fo:
                fo.write("\n".join(buf))
            n += 1
            buf = []
    if buf:
        with open(os.path.join(outdir, f"bundle_{n:02d}.txt"), "w", encoding="utf-8") as fo:
            fo.write("\n".join(buf))
    print(n + 1, "bundles")


if __name__ == "__main__":
    main()
