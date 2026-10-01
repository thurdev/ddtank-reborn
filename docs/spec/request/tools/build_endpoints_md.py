#!/usr/bin/env python3
"""Build docs/spec/request/00-endpoints.md = tools/endpoints_head.md + summary table, and 00a-endpoint-catalog.md.
Usage: python docs/spec/request/tools/build_endpoints_md.py vendor/DDTank41
"""
import os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
root = sys.argv[1] if len(sys.argv) > 1 else 'vendor/DDTank41'
out = subprocess.run([sys.executable, os.path.join(here, 'extract_endpoints.py'), root], capture_output=True, text=True, encoding='utf-8', check=True).stdout
spec = os.path.dirname(here)
open(os.path.join(spec, '00a-endpoint-catalog.md'), 'w', encoding='utf-8').write(out)
lines = out.split('\n')
start = next(i for i, l in enumerate(lines) if l.startswith('Endpoints:'))
end = next(i for i, l in enumerate(lines) if l.startswith('## 1.'))
head = open(os.path.join(here, 'endpoints_head.md'), encoding='utf-8').read()
open(os.path.join(spec, '00-endpoints.md'), 'w', encoding='utf-8').write(head + '\n'.join(lines[start:end]).rstrip() + '\n')
print('ok')
