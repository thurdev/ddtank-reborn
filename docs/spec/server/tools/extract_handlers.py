"""Extract every client->server packet handler (and sub-command handler) from Game.Server.

Usage: python docs/spec/server/tools/extract_handlers.py
Writes docs/spec/server/tools/out/handlers-raw.md and handlers.json

For each handler class: attribute code (resolved through the enums), C# file,
ordered packet reads (with the local variable name when assigned), Bussiness
calls, *Mgr calls, LoginServer (center) calls, Out.SendXxx calls, raw GSPacketIn
codes built, and LanguageMgr keys used.  It is a heuristic text scan -- the
hand-written 01-packet-handlers.md is the authoritative spec.
"""
import json
import os
import re
from cslib import ROOT, read, rel, strip_comments, classes, parse_enums, walk

OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

ATTRS = {
    "PacketHandler": "client",
    "ConsortiaHandleAttbute": "consortia(129)",
    "FarmHandleAttbute": "farm(81)",
    "GameRoomHandleAttbute": "gameroom(94)",
    "HotSpringCommandAttbute": "hotspring(191)",
    "LittleGame": "littlegame(166)",
    "MarryCommandAttbute": "marry(249)",
    "PetHandleAttbute": "pet(68)",
    "RingStationHandleAttbute": "ringstation(404)",
    "GameCommandAttbute": "ringstation-game",
    "WorldBossHandle": "worldboss(102)",
    "ConsortiaTask": "consortia-task",
    "ChatCommand": "chat-command",
    "Cmd": "gm-command",
}

READ_RE = re.compile(
    r"(?:(?:\b[\w<>\[\]]+\s+)?(\w+(?:\.\w+)*)\s*(?:\+|-)?=\s*)?(?:\((\w+)\)\s*)?\b(\w+)\.(Read(?:Int|Byte|Boolean|String|Short|Long|Double|Float|UInt|DateTime|Bytes|UShort|Single|Int16|Int32|Int64)\w*)\s*\(([^)]*)\)")
NEW_BUSS_RE = re.compile(r"\b(\w+)\s+(\w+)\s*=\s*new\s+(\w+Bussiness)\s*\(")
NEW_BUSS2_RE = re.compile(r"new\s+(\w+Bussiness)\s*\(\s*\)\s*\)?\s*\.(\w+)\s*\(")
MGR_RE = re.compile(r"\b(\w+Mgr|\w+Manager|WorldMgr|GameMgr|RoomMgr)\.(\w+)\s*\(")
LOGIN_RE = re.compile(r"LoginServer\.(\w+)\s*\(")
OUT_RE = re.compile(r"\bOut\.(Send\w+)\s*\(")
PKT_RE = re.compile(r"new\s+GSPacketIn\s*\(\s*((?:\(\w+\)\s*)?[\w\.]+)")
LANG_RE = re.compile(r'GetTranslation\s*\(\s*"([^"]+)"')
PLAYER_RE = re.compile(r"\b(?:Player|player|client\.Player)\.((?:Remove|Add|Update|Send|On|Take|Save|Clear|Use|Check|Reset|Get|Load|Set)\w*)\s*\(")


def resolve(expr, enums):
    expr = expr.strip()
    expr = re.sub(r"^\((?:byte|int|short|ushort|sbyte)\)\s*", "", expr)
    try:
        return int(expr, 0), None
    except ValueError:
        pass
    m = re.match(r"(\w+)\.(\w+)$", expr)
    if m and m.group(1) in enums and m.group(2) in enums[m.group(1)]:
        return enums[m.group(1)][m.group(2)], expr
    return None, expr


def main():
    enums = {}
    for f in walk(["Game.Server", "Game.Base", "Game.Logic"]):
        s = read(f)
        if "enum " in s:
            for k, v in parse_enums(s).items():
                enums.setdefault(k, v)
    with open(os.path.join(OUT, "enums.json"), "w", encoding="utf-8") as f:
        json.dump(enums, f, indent=1)
    rev = {}
    for k, v in enums.get("ePackageType", {}).items():
        rev.setdefault(v, []).append(k)

    rows = []
    for f in walk(["Game.Server"]):
        src = strip_comments(read(f))
        for attrs, cname, body in classes(src):
            for am in re.finditer(r"\[(\w+)\s*\(([^\]]*)\)\s*\]", attrs):
                aname = am.group(1)
                if aname not in ATTRS:
                    continue
                args = am.group(2)
                first = args.split(",")[0] if aname != "ChatCommand" else args
                code, sym = resolve(first, enums)
                desc = ""
                dm = re.search(r'"([^"]*)"', args)
                if dm:
                    desc = dm.group(1)
                if aname in ("ChatCommand", "Cmd"):
                    code = None
                    sym = desc
                reads = []
                for rm in READ_RE.finditer(body):
                    var, cast, obj, fn, _ = rm.groups()
                    if obj not in ("packet", "pkg", "packetIn", "gSPacketIn", "pkgIn", "data", "msg", "p"):
                        continue
                    t = fn[4:] or "?"
                    reads.append(f"{t}" + (f"({cast})" if cast else "") + (f" {var}" if var else ""))
                buss_vars = {}
                for bm in NEW_BUSS_RE.finditer(body):
                    buss_vars[bm.group(2)] = bm.group(3)
                for bm in re.finditer(r"using\s*\(\s*(\w+Bussiness)\s+(\w+)\s*=", body):
                    buss_vars[bm.group(2)] = bm.group(1)
                for bm in re.finditer(r"using\s+(\w+Bussiness)\s+(\w+)\s*=", body):
                    buss_vars[bm.group(2)] = bm.group(1)
                buss = []
                for var, typ in buss_vars.items():
                    for cm in re.finditer(r"\b" + re.escape(var) + r"\.(\w+)\s*\(", body):
                        x = f"{typ}.{cm.group(1)}"
                        if x not in buss and cm.group(1) != "Dispose":
                            buss.append(x)
                for bm in NEW_BUSS2_RE.finditer(body):
                    x = f"{bm.group(1)}.{bm.group(2)}"
                    if x not in buss:
                        buss.append(x)
                def uniq(it):
                    out = []
                    for x in it:
                        if x not in out:
                            out.append(x)
                    return out
                mgr = uniq(f"{a}.{b}" for a, b in MGR_RE.findall(body))
                login = uniq(LOGIN_RE.findall(body))
                outs = uniq(OUT_RE.findall(body))
                pkts = []
                for p in PKT_RE.findall(body):
                    c, s = resolve(p, enums)
                    pkts.append(f"{c}" if c is not None and s is None else (f"{c}={s}" if c is not None else p.strip()))
                pkts = uniq(pkts)
                lang = uniq(LANG_RE.findall(body))
                pcalls = uniq(PLAYER_RE.findall(body))
                rows.append({
                    "group": ATTRS[aname],
                    "attr": aname,
                    "code": code,
                    "symbol": sym,
                    "names": rev.get(code, []) if aname == "PacketHandler" else [],
                    "desc": desc,
                    "class": cname,
                    "file": rel(f),
                    "reads": reads,
                    "bussiness": buss,
                    "mgr": mgr,
                    "center": login,
                    "out": outs,
                    "packets": pkts,
                    "player": pcalls,
                    "lang": lang,
                    "lines": body.count("\n"),
                })
    rows.sort(key=lambda r: (r["group"] != "client", r["group"], r["code"] if r["code"] is not None else 99999, r["class"]))
    with open(os.path.join(OUT, "handlers.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=1, ensure_ascii=False)

    lines = ["# Raw handler extraction (generated by extract_handlers.py -- do not edit)\n"]
    cur = None
    for r in rows:
        if r["group"] != cur:
            cur = r["group"]
            lines.append(f"\n## {cur}\n")
            lines.append("| Code | Name(s) | Class / file | Reads (in order) | Bussiness | Mgr | Center | Replies (Out.* / GSPacketIn) | Player calls |")
            lines.append("|---|---|---|---|---|---|---|---|---|")
        nm = "/".join(r["names"]) if r["names"] else (r["symbol"] or "")
        e = lambda xs: "; ".join(xs).replace("|", "\\|")
        lines.append(
            f"| {r['code']} | {nm} | {r['class']} `{r['file']}` ({r['lines']}L) | {e(r['reads'])} | {e(r['bussiness'])} | {e(r['mgr'])} | {e(r['center'])} | {e(r['out'] + ['pkt ' + p for p in r['packets']])} | {e(r['player'])} |")
    with open(os.path.join(OUT, "handlers-raw.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    from collections import Counter
    print(Counter(r["group"] for r in rows))


if __name__ == "__main__":
    main()
