#!/usr/bin/env python3
"""Generate the Tank.Request (.ashx) endpoint catalog for the DDTank41 port.

Usage:
    python docs/spec/request/tools/extract_endpoints.py vendor/DDTank41 > docs/spec/request/00a-endpoint-catalog.md
    python docs/spec/request/tools/extract_endpoints.py vendor/DDTank41 --json out.json

Heuristic, regex based (no C# parser). For every .ashx under Tank.Request it records:
  * URL path, handler class, code-behind file
  * request params  (context.Request["x"], Request.QueryString/Form/Params["x"])
  * auth            (admin-IP check, RSA "p" blob, key/md5 signature, AppSettings used)
  * Bussiness calls -> stored procedures (resolved one level through vendor/DDTank41/Bussiness/*.cs)
  * output mode     (static file build "<File>.xml" zlib/plain, direct zlib BinaryWrite, plain Response.Write)
  * XML element / attribute names (inline + FlashUtils.CreateXxx builders, Road.Flash/Road.Flash/FlashUtils.cs)
  * client usage    (literal "<name>.ashx" / built "<File>.xml" in Source Flash/src; boot if referenced from
                     ddt/loader/StartupResourceLoader.as boot queue)
  * sample          (decompressed head of the shipped Tank.Request/<File>.xml or <File>_out.xml, if present)
"""
import glob, json, os, re, sys, zlib, collections
sys.stdout.reconfigure(encoding='utf-8')

ROOT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'vendor/DDTank41'
REQ = os.path.join(ROOT, 'Tank.Request')
SL = chr(92)

def rd(p):
    try:
        return open(p, encoding='utf-8-sig', errors='ignore').read()
    except OSError:
        return ''

def rel(p, base=ROOT):
    return os.path.relpath(p, base).replace(SL, '/')

def skip(p):
    q = p.replace(SL, '/')
    return '/obj/' in q or '/bin/' in q or '/packages/' in q

# ---------- Bussiness: method -> procs ----------
proc_of = collections.defaultdict(set)      # "Class.Method" -> procs
calls_of = collections.defaultdict(set)     # "Class.Method" -> called methods (same class)
for f in glob.glob(os.path.join(ROOT, 'Bussiness', '**', '*.cs'), recursive=True):
    if skip(f): continue
    t = rd(f)
    cm = re.search(r'class\s+(\w+)', t)
    if not cm: continue
    cls = cm.group(1)
    heads = list(re.finditer(r'\n\s*public\s+(?:static\s+|virtual\s+|override\s+)*[\w<>\[\],\s\.]+?\s+(\w+)\s*\(', t))
    for i, h in enumerate(heads):
        body = t[h.end(): heads[i + 1].start() if i + 1 < len(heads) else len(t)]
        key = f'{cls}.{h.group(1)}'
        for p in re.findall(r'(?:GetReader|RunProcedure|GetDataTable|GetDataSet|ExecuteNonQuery|RunProcedureReader)\s*\([^"]*"([^"]+)"', body):
            proc_of[key].add(p)
        for m in re.findall(r'\b(\w+)\s*\(', body):
            calls_of[key].add(m)
methods_by_name = collections.defaultdict(list)
for k in list(proc_of) + list(calls_of):
    methods_by_name[k.split('.')[1]].append(k)

def procs_for(cls, meth):
    key = f'{cls}.{meth}'
    out = set(proc_of.get(key, ()))
    for c in calls_of.get(key, ()):
        out |= proc_of.get(f'{cls}.{c}', set())
    if not out:  # class unknown (e.g. Managers) -> try by name
        for k in methods_by_name.get(meth, []):
            out |= proc_of.get(k, set())
    return out

# ---------- FlashUtils builders ----------
fu = rd(os.path.join(ROOT, 'Road.Flash', 'Road.Flash', 'FlashUtils.cs'))
builders = {}
heads = list(re.finditer(r'public\s+static\s+XElement\s+(\w+)\s*\(', fu))
for i, h in enumerate(heads):
    body = fu[h.end(): heads[i + 1].start() if i + 1 < len(heads) else len(fu)]
    els = re.findall(r'new\s+XElement\s*\(\s*"(\w+)"', body)
    attrs = re.findall(r'new\s+XAttribute\s*\(\s*"(\w+)"', body)
    builders[h.group(1)] = (els, list(dict.fromkeys(attrs)))

# ---------- client usage ----------
CLIENT = os.path.join(ROOT, 'Source Flash', 'src')
client_lits = collections.defaultdict(set)
for f in glob.glob(os.path.join(CLIENT, '**', '*.as'), recursive=True):
    t = rd(f)
    for m in re.finditer(r'"([A-Za-z_/]+\.(?:ashx|xml))', t):
        client_lits[m.group(1).split('/')[-1].lower()].add(rel(f, CLIENT))
boot = set()
sl = rd(os.path.join(CLIENT, 'ddt', 'loader', 'StartupResourceLoader.as'))
fn_bodies = {}
fh = list(re.finditer(r'function\s+(\w+)\s*\(', sl))
for i, h in enumerate(fh):
    fn_bodies[h.group(1)] = sl[h.end(): fh[i + 1].start() if i + 1 < len(fh) else len(sl)]
for name in re.findall(r'addLoader\(this\.(\w+)\(\)\)', sl):
    for lit in re.findall(r'"([A-Za-z_]+\.(?:ashx|xml))', fn_bodies.get(name, '')):
        boot.add(lit.lower())
for lit in re.findall(r'solveRequestPath\("([A-Za-z_]+\.(?:ashx|xml))', sl):
    boot.add(lit.lower())

# ---------- samples ----------
def sample(file_base):
    for cand in (file_base + '.xml', file_base + '_out.xml', file_base + '_Out.xml', file_base + '_OUT.xml'):
        for p in glob.glob(os.path.join(REQ, '**', cand), recursive=True):
            if skip(p): continue
            raw = open(p, 'rb').read()
            comp = raw[:1] == b'\x78'
            try:
                txt = zlib.decompress(raw).decode('utf-8', 'ignore') if comp else raw.decode('utf-8-sig', 'ignore')
            except Exception:
                continue
            m = re.search(r'<Result[^>]*>', txt)
            if not m:
                return rel(p), comp, txt[:500]
            root_tag = m.group(0)
            items = re.findall(r'<(?!/)(\w+)\b[^>]*?/?>', txt[m.end():m.end() + 20000])
            first = re.search(r'<(?!/)\w+\b[^>]*?/?>', txt[m.end():])
            child = first.group(0) if first else ''
            if len(child) > 900: child = child[:900] + ' …'
            n = len(re.findall(r'<' + re.escape(items[0]) + r'\b', txt)) if items else 0
            return rel(p), comp, f'{root_tag}\n  {child}\n  <!-- … {n} <{items[0] if items else ""}> elements -->\n</Result>'
    return None

# ---------- handlers ----------
rows = []
for ashx in sorted(glob.glob(os.path.join(REQ, '**', '*.ashx'), recursive=True), key=lambda p: rel(p, REQ).lower()):
    if skip(ashx): continue
    head = rd(ashx)
    cb = re.search(r'CodeBehind="([^"]+)"', head)
    clsm = re.search(r'Class="([\w\.]+)"', head)
    code_path = os.path.join(os.path.dirname(ashx), cb.group(1)) if cb else ashx + '.cs'
    code = rd(code_path)
    if not code and clsm:
        short = clsm.group(1).split('.')[-1]
        for f in glob.glob(os.path.join(REQ, '**', '*.cs'), recursive=True):
            if not skip(f) and re.search(r'class\s+' + short + r'\b', rd(f)):
                code_path, code = f, rd(f); break
    url = '/' + rel(ashx, REQ)
    params = list(dict.fromkeys(re.findall(r'Request(?:\.QueryString|\.Form|\.Params)?\s*\[\s*"(\w+)"\s*\]', code)))
    auth = []
    if 'ValidAdminIP' in code: auth.append('admin IP (AppSettings AdminIP, `|`-separated; empty = allow all)')
    if re.search(r'RsaDecry', code): auth.append('RSA-encrypted `p` (StaticFunction.RsaCryptor)')
    if re.search(r'Request\s*\[\s*"key"\s*\]|md5|MD5|FormsAuthentication\.HashPasswordForStoringInConfigFile', code): auth.append('key / MD5 signature')
    if re.search(r'PlayerManager\.Login|ValidLogin|CheckLogin|GetUserSingleByUserName|LoginKey|Request\s*\[\s*"pass', code): auth.append('user/password or login key')
    if re.search(r'Request\s*\[\s*"selfid"\s*\]|Request\s*\[\s*"UserID"\s*\]', code, re.I) and not auth: auth.append('none (trusts userId/selfid param)')
    if not auth: auth.append('none')
    appset = sorted(set(re.findall(r'AppSettings\s*\[\s*"(\w+)"\s*\]', code)))
    var_cls = dict((v, c) for c, v in re.findall(r'(\w+Bussiness)\s+(\w+)\s*=\s*new', code))
    dbcalls = set()
    for v, mth in re.findall(r'\b(\w+)\.(\w+)\s*\(', code):
        if v in var_cls: dbcalls.add((var_cls[v], mth))
    for c, mth in re.findall(r'new\s+(\w+Bussiness)\s*\(\s*\)\s*\.(\w+)\s*\(', code):
        dbcalls.add((c, mth))
    mgr = sorted(set(re.findall(r'\b(\w+Mgr)\.(\w+)\s*\(', code)))
    procs = set()
    for c, mth in dbcalls:
        procs |= procs_for(c, mth)
    builds = re.findall(r'CreateCompressXml\s*\((?:[^,]+,)?\s*\w+\s*,\s*"(\w+)"\s*,\s*(true|false)\s*\)', code)
    celeb = re.findall(r'Build(Celeb\w*|EliteMatchPlayerList)\s*\(\s*"(\w+)"\s*(?:,\s*([-\w]+))?\s*(?:,\s*"(\w+)")?', code)
    out = []
    files = []
    for f, comp in builds:
        out.append(f'build static `/{f}.xml` ({"zlib" if comp == "true" else "plain UTF-8"})'); files.append(f)
    for kind, f, order, nc in celeb:
        out.append(f'build static `/{f}.xml` (zlib) via csFunction.Build{kind}' + (f' order={order}' if order else '') + (f' + plain `/{nc}.xml`' if nc else '')); files.append(f)
        if kind.startswith('CelebUsers') or kind == 'CelebUsers': procs |= procs_for('PlayerBussiness', 'GetPlayerPage')
        if 'Consortia' in kind: procs |= procs_for('ConsortiaBussiness', 'GetConsortiaPage')
    if re.search(r'BinaryWrite\s*\(\s*StaticFunction\.Compress', code): out.append('direct zlib body (BinaryWrite(StaticFunction.Compress(xml)))')
    if re.search(r'Response\.Write\s*\(\s*\w+\.ToString\s*\(\s*(?:check:\s*)?false\s*\)', code) or re.search(r'Response\.Write\s*\(\s*result\.ToString', code): out.append('plain XML text (Response.Write, no declaration, indented)')
    elif re.search(r'Response\.Write\s*\(\s*(?:Bulid|Build)\s*\(', code) and files: out.append('response body = text "Build:<file>.xml,Success!" / "IP is not valid!"')
    lits = re.findall(r'Response\.Write\s*\(\s*"([^"]{0,40})"', code)
    if lits: out.append('literal writes: ' + ', '.join(f'`{x}`' for x in dict.fromkeys(lits)))
    ctype = sorted(set(re.findall(r'ContentType\s*=\s*"([^"]+)"', code)))
    cache = []
    if re.search(r'HttpRuntime\.Cache|Cache\s*\[|\.Cache\.Insert', code): cache.append('HttpRuntime.Cache')
    if files: cache.append('static file regenerated on each call (client reads the file)')
    els = re.findall(r'new\s+XElement\s*\(\s*"(\w+)"', code)
    attrs = re.findall(r'new\s+XAttribute\s*\(\s*"(\w+)"', code)
    used_builders = list(dict.fromkeys(re.findall(r'FlashUtils\.(\w+)\s*\(', code)))
    for b in used_builders:
        e, a = builders.get(b, ([], []))
        els += e; attrs += a
    name = os.path.basename(ashx).lower()
    users = set(client_lits.get(name, set()))
    for f in files: users |= client_lits.get((f + '.xml').lower(), set())
    is_boot = name in boot or any((f + '.xml').lower() in boot for f in files)
    smp = None
    for f in files or [os.path.splitext(os.path.basename(ashx))[0]]:
        smp = sample(f)
        if smp: break
    rows.append(dict(url=url, cls=clsm.group(1) if clsm else '?', code=rel(code_path) if code else None,
                     params=params, auth=auth, appsettings=appset, db=sorted(f'{c}.{m}' for c, m in dbcalls), mgr=[f'{a}.{b}' for a, b in mgr],
                     procs=sorted(procs), output=out or ['?'], content_type=ctype, cache=cache,
                     elements=list(dict.fromkeys(els)), attributes=list(dict.fromkeys(attrs)), builders=used_builders,
                     files=files, client=sorted(users), boot=is_boot, sample=smp))

if '--json' in sys.argv:
    json.dump(rows, open(sys.argv[sys.argv.index('--json') + 1], 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    sys.exit(0)

print('# Appendix A — Tank.Request endpoint catalog (generated)\n')
print('> Generated by `python docs/spec/request/tools/extract_endpoints.py vendor/DDTank41`. Regex-extracted; the hand-written spec in [00-endpoints.md](00-endpoints.md) has precedence. "client" = files in `Source Flash/src` that reference the URL or its built `.xml`; "boot" = requested by `ddt/loader/StartupResourceLoader.as` during the initial loading queue.\n')
print(f'Endpoints: {len(rows)}; static-build: {sum(1 for r in rows if r["files"])}; referenced by client: {sum(1 for r in rows if r["client"])}; boot: {sum(1 for r in rows if r["boot"])}\n')
print('| # | URL | mode | auth | params | procs | client | boot |')
print('|---|---|---|---|---|---|---|---|')
for i, r in enumerate(rows, 1):
    mode = 'build→' + ','.join(f + '.xml' for f in r['files']) if r['files'] else ('zlib' if any('zlib' in o for o in r['output']) else ('xml' if any('XML' in o for o in r['output']) else 'other'))
    print(f"| {i} | `{r['url']}` | {mode} | {'admin-IP' if any('admin' in a for a in r['auth']) else ('RSA' if any('RSA' in a for a in r['auth']) else r['auth'][0].split(' ')[0])} | {', '.join(r['params'][:8])}{' …' if len(r['params']) > 8 else ''} | {', '.join(r['procs'][:4])}{' …' if len(r['procs']) > 4 else ''} | {'yes' if r['client'] else '—'} | {'**boot**' if r['boot'] else ''} |")
print()
for i, r in enumerate(rows, 1):
    print(f"## {i}. `{r['url']}`\n")
    print(f"- Handler: `{r['cls']}` — `{r['code']}`")
    print(f"- Params: {', '.join('`'+p+'`' for p in r['params']) or 'none'}")
    print(f"- Auth: {'; '.join(r['auth'])}" + (f"; AppSettings: {', '.join(r['appsettings'])}" if r['appsettings'] else ''))
    if r['db'] or r['mgr']: print(f"- Data: {', '.join(r['db'] + r['mgr'])}")
    print(f"- Procs: {', '.join('`'+p+'`' for p in r['procs']) or '—'}")
    print(f"- Output: {'; '.join(r['output'])}" + (f"; Content-Type {', '.join(r['content_type'])}" if r['content_type'] else ''))
    if r['cache']: print(f"- Caching: {'; '.join(r['cache'])}")
    if r['elements'] or r['attributes']:
        print(f"- XML: elements {', '.join('`'+e+'`' for e in r['elements'])}; attributes {', '.join(r['attributes'])}" + (f" (builders: {', '.join(r['builders'])})" if r['builders'] else ''))
    print(f"- Client: {', '.join('`'+c+'`' for c in r['client'][:5]) or 'not referenced'}{' …' if len(r['client']) > 5 else ''}{' — **boot**' if r['boot'] else ''}")
    if r['sample']:
        p, comp, txt = r['sample']
        print(f"- Sample (`Tank.Request/{rel(p, 'Tank.Request') if not p.startswith('Tank.Request') else p[len('Tank.Request/'):]}`, {'zlib' if comp else 'plain'}):\n\n```xml\n{txt}\n```")
    print()
