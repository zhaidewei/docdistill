import json, glob, re

def strip_fences(s):
    s = s.strip()
    s = re.sub(r'^```(?:mermaid)?\n?', '', s)
    s = re.sub(r'\n?```$', '', s)
    return s.strip()

cards = glob.glob('content/cards/*.json')
fixed = 0
for c in cards:
    d = json.load(open(c))
    if d.get('diagram') and '```' in d['diagram']:
        d['diagram'] = strip_fences(d['diagram'])
        with open(c, 'w') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
            f.write('\n')
        fixed += 1
        print(f'Fixed: {d["id"]}')
print(f'Total fixed: {fixed}')
