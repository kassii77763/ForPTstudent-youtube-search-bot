import urllib.request
import json
import time

with open('nekocan_candidate_ids.json', 'r', encoding='utf-8') as f:
    candidates = json.load(f)

null_vids = [k for k, v in candidates.items() if v is None]
print(f"Total null vids: {len(null_vids)}")

valid_nekocan = []

for i, vid in enumerate(null_vids):
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as res:
            d = json.loads(res.read().decode('utf-8'))
            author = d.get('author_name', '')
            title = d.get('title', '')
            if 'ネコかん' in author or 'nekocan' in author.lower() or 'ネコ' in author:
                valid_nekocan.append({
                    'title': title,
                    'url': f'https://www.youtube.com/watch?v={vid}',
                    'category': '看護・解剖生理学',
                    'timestamps': '',
                    'channel': 'ネコかん'
                })
                print(f"[{i+1}/{len(null_vids)}] [MATCH] {author} - {title[:30]}")
            else:
                print(f"[{i+1}/{len(null_vids)}] [OTHER] {author}")
    except Exception as e:
        print(f"[{i+1}/{len(null_vids)}] [ERR {vid}] {e}")
    time.sleep(0.1)

print(f"\nFound {len(valid_nekocan)} additional ネコかん videos!")

if valid_nekocan:
    gas_url = 'https://script.google.com/macros/s/AKfycbwXEJ1C4pbmwfxU332ZhOO5iNH7XxlWpbyNHqvIGouBQwtUE6dRpN4VnxCidqf0C0BL/exec'
    payload = json.dumps({'action': 'batchImportVideos', 'videos': valid_nekocan}).encode('utf-8')
    req = urllib.request.Request(gas_url, data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        print("Import result:", res.read().decode('utf-8'))
    
    payload_filter = json.dumps({'action': 'classifyAndFilterVideos'}).encode('utf-8')
    req_filter = urllib.request.Request(gas_url, data=payload_filter, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req_filter) as res:
        print('Filter result:', res.read().decode('utf-8'))
