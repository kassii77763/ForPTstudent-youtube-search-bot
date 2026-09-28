import json
import urllib.request

with open('nekocan_full_116.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

print(f"Total items in nekocan_full_116.json: {len(items)}")

videos = []
for it in items:
    vid = it['videoId']
    title = it['title']
    videos.append({
        'title': title,
        'url': f'https://www.youtube.com/watch?v={vid}',
        'category': '看護・解剖生理学',
        'timestamps': '',
        'channel': 'ネコかん'
    })

url = 'https://script.google.com/macros/s/AKfycbwXEJ1C4pbmwfxU332ZhOO5iNH7XxlWpbyNHqvIGouBQwtUE6dRpN4VnxCidqf0C0BL/exec'

batch_size = 40
for i in range(0, len(videos), batch_size):
    batch = videos[i:i+batch_size]
    payload = json.dumps({'action': 'batchImportVideos', 'videos': batch}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        print(f"Batch {i//batch_size + 1}: {res.read().decode('utf-8')}")

payload_filter = json.dumps({'action': 'classifyAndFilterVideos'}).encode('utf-8')
req_filter = urllib.request.Request(url, data=payload_filter, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req_filter) as res:
    print('Filter result:', res.read().decode('utf-8'))

print("All done!")
