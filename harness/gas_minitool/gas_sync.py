"""Shared helper: Apps Script API access with the user's clasp credentials."""
import json, urllib.request, urllib.parse, os, sys

CLASPRC = r'C:\Users\四季　かしま\.clasprc.json'
API = 'https://script.googleapis.com/v1/projects/{}/content'

def token():
    t = json.load(open(CLASPRC, encoding='utf-8'))['tokens']['default']
    data = urllib.parse.urlencode({'client_id': t['client_id'], 'client_secret': t['client_secret'],
                                   'refresh_token': t['refresh_token'], 'grant_type': 'refresh_token'}).encode()
    with urllib.request.urlopen(urllib.request.Request('https://oauth2.googleapis.com/token', data=data)) as r:
        return json.loads(r.read())['access_token']

def headers():
    return {'Authorization': f'Bearer {token()}', 'Content-Type': 'application/json'}

def pull(script_id, out_dir):
    with urllib.request.urlopen(urllib.request.Request(API.format(script_id), headers=headers())) as r:
        files = json.loads(r.read())['files']
    os.makedirs(out_dir, exist_ok=True)
    for f in files:
        ext = '.json' if f['type'] == 'JSON' else ('.html' if f['type'] == 'HTML' else '.js')
        open(os.path.join(out_dir, f['name'] + ext), 'w', encoding='utf-8').write(f['source'])
    return [f['name'] for f in files]

def push(script_id, src_dir):
    files = []
    for name in sorted(os.listdir(src_dir)):
        p = os.path.join(src_dir, name)
        base, ext = os.path.splitext(name)
        if ext == '.json' and base == 'appsscript':
            files.append({'name': 'appsscript', 'type': 'JSON', 'source': open(p, encoding='utf-8').read()})
        elif ext in ('.js', '.gs'):
            files.append({'name': base, 'type': 'SERVER_JS', 'source': open(p, encoding='utf-8').read()})
    body = json.dumps({'files': files}).encode()
    req = urllib.request.Request(API.format(script_id), data=body, headers=headers(), method='PUT')
    with urllib.request.urlopen(req) as r:
        return [f['name'] for f in json.loads(r.read())['files']]

if __name__ == '__main__':
    cmd, sid, d = sys.argv[1], sys.argv[2], sys.argv[3]
    print(cmd, (pull if cmd == 'pull' else push)(sid, d))
