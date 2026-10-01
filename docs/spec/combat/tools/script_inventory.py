#!/usr/bin/env python3
"""PvE script inventory: which AI script classes the DDTank41 database references vs which
classes exist in the DDTank4.1 donor (Game.Server.Scripts).  DDTank41 itself ships NO script sources.

Usage: python script_inventory.py <vendor-dir> > 01a-script-inventory.md
Reads the SQL Server backup vendor/DDTank41/Database/Game34.bak as raw bytes and pulls every
"GameServerScript.AI.<Game|Messions|NPC>.<Class>" string (UTF-16LE and ASCII).  Because .bak pages
store adjacent columns contiguously, extracted names may carry trailing garbage; a ref is matched
to the longest donor class name that is a prefix of it.  Unmatched refs are cleaned heuristically
(trailing 'GameServerScript' removed) and listed as MISSING (verify manually in the restored DB:
Pve_Info.*GameScript, Mission_Info.Script, NPC_Info.Script).
"""
import re, sys, os, glob, collections
sys.stdout.reconfigure(encoding='utf-8')
V = sys.argv[1] if len(sys.argv) > 1 else 'vendor'
bak = open(os.path.join(V, 'DDTank41/Database/Game34.bak'), 'rb').read()
raw = set()
for m in re.finditer(rb'(?:[\x20-\x7e]\x00){6,}', bak):
    raw.add(m.group().decode('utf-16le'))
for m in re.finditer(rb'[\x20-\x7e]{6,}', bak):
    raw.add(m.group().decode())
refs = set()
for s in raw:
    for m in re.finditer(r'GameServerScript\.AI\.(Game|Messions|NPC)\.([A-Za-z_][A-Za-z0-9_]*)', s):
        refs.add((m.group(1), m.group(2)))
D = os.path.join(V, 'DDTank4.1/Source Server/Game.Server.Scripts/AI')
donor = {}
for f in glob.glob(D + '/**/*.cs', recursive=True):
    t = open(f, encoding='utf-8-sig', errors='ignore').read()
    ns = re.search(r'namespace\s+GameServerScript\.AI\.(\w+)', t)
    for m in re.finditer(r'public\s+class\s+(\w+)\s*:\s*(\w+)', t):
        donor[(ns.group(1) if ns else '?', m.group(1))] = (os.path.relpath(f, D).replace(chr(92), '/'), m.group(2))
found, missing = set(), set()
for ns, name in refs:
    c = [k for k in donor if k[0] == ns and name.startswith(k[1])]
    if c:
        found.add(max(c, key=lambda k: len(k[1])))
    else:
        n = re.sub(r'GameServerScript$', '', name)
        n = re.sub(r'(?<=[a-z])\d+$', '', n) if not re.search(r'\d{3,}', n) else n
        missing.add((ns, n))
unused = sorted(set(donor) - found)
print('# Appendix — PvE script inventory (generated)\n')
print('> `python docs/spec/combat/tools/script_inventory.py vendor`. DDTank41 ships **no** script sources (scripts are compiled at boot from a `scripts/` folder that is not in the repo; `Game.Server/GameServer.cs:985-996`, `Fighting.Server/FightServer.cs:90-101`). All implementations below come from the donor `vendor/DDTank4.1/Source Server/Game.Server.Scripts/AI`.\n')
by = collections.Counter(ns for ns, _ in refs)
print(f'- DB-referenced script names (raw, deduped): {len(refs)} ({dict(by)})')
print(f'- Donor classes: {len(donor)} (Game {sum(1 for k in donor if k[0]=="Game")}, Messions {sum(1 for k in donor if k[0]=="Messions")}, NPC {sum(1 for k in donor if k[0]=="NPC")})')
print(f'- Referenced and available in donor: **{len(found)}**')
print(f'- Referenced but missing in donor (heuristic, verify): **{len(missing)}**')
print(f'- Donor classes not referenced by the DDTank41 DB: {len(unused)}\n')
print('## Missing (referenced by DB, no donor class)\n')
for ns in ('Game', 'Messions', 'NPC'):
    xs = sorted(n for k, n in missing if k == ns)
    print(f'**{ns}** ({len(xs)}): ' + ', '.join(f'`{x}`' for x in xs) + '\n')
print('## Available (referenced and present in donor)\n')
print('| namespace | class | base | donor file |\n|---|---|---|---|')
for k in sorted(found):
    print(f'| {k[0]} | `{k[1]}` | {donor[k][1]} | `{donor[k][0]}` |')
print('\n## Donor-only (present in donor, not referenced by DDTank41 DB)\n')
for ns in ('Game', 'Messions', 'NPC'):
    xs = [k[1] for k in unused if k[0] == ns]
    print(f'**{ns}** ({len(xs)}): ' + ', '.join(f'`{x}`' for x in xs) + '\n')
