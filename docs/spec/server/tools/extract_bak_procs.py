"""Best-effort recovery of stored-procedure bodies from the SQL Server .bak files
(vendor/DDTank41/Database/*.bak) by scanning UTF-16LE text for CREATE PROCEDURE.
Pages are not reassembled, so long procs can be truncated/split; treat the
table list as a hint, not ground truth. Restore the .bak into SQL Server for the real thing.

Usage: python extract_bak_procs.py -> out/proc-tables.json, out/proc-tables.md
"""
import json
import os
import re
from cslib import ROOT

OUT = os.path.join(os.path.dirname(__file__), "out")
PROC_RE = re.compile(r"(?i)create\s+proc(?:edure)?\s+(?:\[?dbo\]?\.)?\[?(\w+)\]?")
TAB_RE = re.compile(r"(?i)\b(?:from|join|into|update|delete\s+from|merge)\s+(?:\[?dbo\]?\.)?\[?([A-Za-z_]\w*)\]?")
KW = {"select", "set", "where", "values", "inserted", "deleted", "as", "on", "and", "or", "the", "dbo", "with", "top", "openrowset", "sys", "table"}


def main():
    res = {}
    for db in ["Player34.bak", "Game34.bak", "Db_Membership.bak"]:
        path = os.path.join(ROOT, "Database", db)
        if not os.path.exists(path):
            continue
        s = open(path, "rb").read().decode("utf-16-le", errors="ignore")
        ms = list(PROC_RE.finditer(s))
        for i, m in enumerate(ms):
            end = ms[i + 1].start() if i + 1 < len(ms) else m.end() + 20000
            body = s[m.end():min(end, m.end() + 20000)]
            # stop at first long run of non-printables (page boundary garbage)
            cut = re.search(r"[\x00-\x08\x0e-\x1f�]{8,}", body)
            if cut:
                body = body[:cut.start()]
            tabs = []
            for t in TAB_RE.findall(body):
                if t.lower() in KW or t.startswith("@") or t.startswith("#"):
                    continue
                if t not in tabs:
                    tabs.append(t)
            params = []
            for p in re.findall(r"@(\w+)\s+(?:int|bigint|nvarchar|varchar|bit|datetime|smallint|tinyint|float|decimal|money|ntext|text|char|nchar|real)", body[:1500], re.I):
                if p not in params:
                    params.append(p)
            e = res.setdefault(m.group(1), {"db": db.replace(".bak", ""), "tables": [], "params": []})
            for t in tabs:
                if t not in e["tables"]:
                    e["tables"].append(t)
            for p in params:
                if p not in e["params"]:
                    e["params"].append(p)
    with open(os.path.join(OUT, "proc-tables.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, indent=1)
    with open(os.path.join(OUT, "proc-tables.md"), "w", encoding="utf-8") as f:
        f.write("| Proc | DB | Tables referenced (best effort) | Declared params |\n|---|---|---|---|\n")
        for k in sorted(res, key=str.lower):
            v = res[k]
            f.write(f"| `{k}` | {v['db']} | {', '.join(v['tables'])} | {', '.join(v['params'])} |\n")
    print(len(res), "procs recovered")


if __name__ == "__main__":
    main()
