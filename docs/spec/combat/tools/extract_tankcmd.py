#!/usr/bin/env python3
"""Extract the eTankCmdType (GAME_CMD = 0x5B/91) sub-command table from the DDTank41 C# sources.

Usage: python extract_tankcmd.py <path-to-vendor/DDTank41> > tankcmd.md

For every C# method that builds a GSPacketIn(91 / GAME_CMD) and writes a sub-command byte,
it records the ordered sequence of Write* calls (server -> client).  For every
[GameCommand(code)] handler in Game.Logic/Cmd it records the ordered Read* calls (client -> server).
Heuristic (regex based): loops/conditionals are flattened, marked with the source line so a human can
verify.  Output is a Markdown table.
"""
import re, sys, os, glob, collections
sys.stdout.reconfigure(encoding="utf-8")

root = sys.argv[1] if len(sys.argv) > 1 else 'vendor/DDTank41'
enum_src = open(os.path.join(root, 'Game.Logic/eTankCmdType.cs'), encoding='utf-8-sig').read()
codes = {}
for name, val in re.findall(r'(\w+)\s*=\s*(-?(?:0x[0-9A-Fa-f]+|\d+))', enum_src):
    codes[name] = int(val, 0)
by_code = collections.defaultdict(list)
for n, v in codes.items():
    by_code[v].append(n)

def code_of(expr):
    expr = expr.strip()
    m = re.search(r'eTankCmdType\.(\w+)', expr)
    if m: return codes.get(m.group(1))
    m = re.fullmatch(r'\(?(?:byte|int)?\)?\s*(0x[0-9A-Fa-f]+|\d+)', expr)
    if m: return int(m.group(1), 0)
    return None

WRITE = re.compile(r'\.\s*(Write(?:Byte|Int|Short|Long|Boolean|String|DateTime|Double|Float|UTF|Bytes))\s*\((.*?)\);')
READ = re.compile(r'\.\s*(Read(?:Byte|Int|Short|Long|Boolean|String|DateTime|Double|Float|UTF|Bytes))\s*\(')
TYPES = {'WriteByte':'u8','WriteInt':'i32','WriteShort':'i16','WriteLong':'i64','WriteBoolean':'bool','WriteString':'str',
         'WriteDateTime':'date','WriteDouble':'f64','WriteFloat':'f32','WriteBytes':'bytes',
         'ReadByte':'u8','ReadInt':'i32','ReadShort':'i16','ReadLong':'i64','ReadBoolean':'bool','ReadString':'str',
         'ReadDateTime':'date','ReadDouble':'f64','ReadFloat':'f32','ReadBytes':'bytes'}

s2c = collections.defaultdict(list)   # code -> [(file:line, method, fields)]
files = [f for f in glob.glob(os.path.join(root, '**/*.cs'), recursive=True) if '/obj/' not in f.replace(chr(92),'/')]
for f in files:
    rel = os.path.relpath(f, root).replace(chr(92), '/')
    try: lines = open(f, encoding='utf-8-sig', errors='ignore').read().split('\n')
    except Exception: continue
    i = 0
    while i < len(lines):
        ln = lines[i]
        if re.search(r'new\s+GSPacketIn\s*\(\s*(91|\(\w+\)\s*ePackageTypeLogic\.GAME_CMD|\(byte\)\s*ePackageTypeLogic\.GAME_CMD|\(short\)\s*ePackageTypeLogic\.GAME_CMD|\(byte\)ePackageType\.GAME_CMD|\(short\)ePackageType\.GAME_CMD)', ln):
            # find first WriteByte within next 6 lines
            code = None; start = i
            for j in range(i, min(i + 8, len(lines))):
                m = re.search(r'\.WriteByte\s*\((.*?)\);', lines[j])
                if m:
                    code = code_of(m.group(1)); start = j; break
            if code is None: i += 1; continue
            fields = []
            depth = 0
            for j in range(start + 1, min(start + 160, len(lines))):
                l = lines[j]
                if re.search(r'SendToAll|SendTCP|SendToTeam|return\s+pkg|return\s+gSPacketIn|SendToPlayerExceptSelf', l): break
                if re.search(r'new\s+GSPacketIn', l): break
                for m in WRITE.finditer(l):
                    fields.append(f'{TYPES[m.group(1)]} {m.group(2).strip()[:60]}')
                if re.search(r'\b(foreach|for)\s*\(', l): fields.append(f'-- loop @{j+1}: {l.strip()[:70]}')
                elif re.search(r'^\s*(if|else)\b', l): fields.append(f'-- cond @{j+1}: {l.strip()[:70]}')
            s2c[code].append((f'{rel}:{start+1}', fields))
        i += 1

c2s = {}
for f in glob.glob(os.path.join(root, 'Game.Logic/Cmd/*.cs')):
    t = open(f, encoding='utf-8-sig', errors='ignore').read()
    m = re.search(r'\[GameCommand\(\s*(.*?)\s*,', t)
    if not m: continue
    code = code_of(m.group(1))
    body = t[t.find('HandleCommand'):]
    reads = [TYPES[x] for x in READ.findall(body)]
    c2s[code] = (os.path.relpath(f, root).replace(chr(92),'/'), reads)

print('| code | names | C->S handler (reads) | S->C emitters (writes, first per site) |')
print('|---|---|---|---|')
for code in sorted(set(list(by_code) + list(s2c) + list(c2s)), key=lambda x: (x is None, x)):
    if code is None: continue
    names = '/'.join(sorted(by_code.get(code, ['?'])))
    c = c2s.get(code)
    cs = f'`{c[0]}`: ' + ', '.join(c[1]) if c else ''
    ss = '<br>'.join(f'`{site}`: ' + '; '.join(fl)[:400] for site, fl in s2c.get(code, [])[:4])
    print(f'| {code} | {names} | {cs} | {ss} |')
