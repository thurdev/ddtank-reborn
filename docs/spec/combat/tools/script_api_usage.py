#!/usr/bin/env python3
"""Inventory of the scripting API used by donor PvE scripts and whether DDTank41's Game.Logic provides it.

Usage: python script_api_usage.py <vendor-dir> [--json out.json]
  <vendor-dir> must contain DDTank41/ and DDTank4.1/.
Outputs Markdown: for every member name invoked through Game./Body./m_body./((PVEGame)Game). etc.
in DDTank4.1/Source Server/Game.Server.Scripts/AI, the call count and whether a member with
that name is declared in DDTank41/Game.Logic (and in the donor's own Game.Logic).
"""
import re, sys, os, glob, collections, json
sys.stdout.reconfigure(encoding='utf-8')
V = sys.argv[1] if len(sys.argv) > 1 else 'vendor'
scripts = glob.glob(os.path.join(V, 'DDTank4.1/Source Server/Game.Server.Scripts/AI/**/*.cs'), recursive=True)
RECV = r'(?:\(\s*\(\s*PVEGame\s*\)\s*Game\s*\)|\(\s*Game\s+as\s+PVEGame\s*\)|pveGame|Game|Body|m_body|base\.Game|base\.Body|m_game)'
pat = re.compile(RECV + r'\s*\.\s*([A-Za-z_]\w*)\s*(\()?')
uses = collections.Counter(); calls = {}
files_using = collections.defaultdict(set)
for f in scripts:
    t = open(f, encoding='utf-8-sig', errors='ignore').read()
    for m in pat.finditer(t):
        n = m.group(1); uses[n] += 1; calls[n] = calls.get(n, False) or bool(m.group(2))
        files_using[n].add(os.path.basename(f))

def decls(root):
    names = set()
    for f in glob.glob(os.path.join(root, '**/*.cs'), recursive=True):
        if os.sep + 'obj' + os.sep in f: continue
        t = open(f, encoding='utf-8-sig', errors='ignore').read()
        for m in re.finditer(r'(?:public|internal|protected)\s+(?:static\s+|virtual\s+|override\s+|new\s+|readonly\s+|abstract\s+|event\s+)*[\w<>\[\],\.\s]+?\s+([A-Za-z_]\w*)\s*(?:\(|\{|=>|;|=)', t):
            names.add(m.group(1))
    return names
d41 = decls(os.path.join(V, 'DDTank41/Game.Logic'))
d4 = decls(os.path.join(V, 'DDTank4.1/Source Server/Game.Logic'))
rows = []
for n, c in uses.most_common():
    rows.append({'member': n, 'uses': c, 'call': calls[n], 'in41': n in d41, 'inDonor': n in d4, 'files': len(files_using[n])})
if '--json' in sys.argv:
    json.dump(rows, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)
print(f'Scripts scanned: {len(scripts)}; distinct members: {len(rows)}; missing in DDTank41: {sum(not r["in41"] for r in rows)}\n')
print('| member | kind | uses | files | in DDTank41 Game.Logic | in donor Game.Logic |')
print('|---|---|---|---|---|---|')
for r in rows:
    print(f"| `{r['member']}` | {'method' if r['call'] else 'prop/field'} | {r['uses']} | {r['files']} | {'yes' if r['in41'] else '**NO**'} | {'yes' if r['inDonor'] else 'no'} |")
