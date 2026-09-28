import json
import urllib.request
import urllib.parse
import time

WEBHOOK_BASE = 'https://script.google.com/macros/s/AKfycbwXEJ1C4pbmwfxU332ZhOO5iNH7XxlWpbyNHqvIGouBQwtUE6dRpN4VnxCidqf0C0BL/exec'

def post_gas(payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(WEBHOOK_BASE, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

print("1. かずひろ先生の厳選Web解説記事（190件）を一括インポート中...")
with open('kazuhiro_final_articles.json', 'r', encoding='utf-8') as f:
    articles = json.load(f)

# 40件ずつ分割インポート
for i in range(0, len(articles), 40):
    batch = articles[i:i+40]
    payload = {
        "action": "batchImportVideos",
        "videos": [{
            "title": a['title'],
            "url": a['url'],
            "category": a['category'],
            "timestamps": "",
            "channel": a['author']
        } for a in batch]
    }
    res = post_gas(payload)
    print(f"   ・バッチ [{i+1}〜{min(i+40, len(articles))}]: 追加 {res.get('added')} 件 (総行数: {res.get('newTotalRows')})")
    time.sleep(1)

print("\n2. G列の自動分類（検索対象フラグ）を実行中...")
class_res = post_gas({"action": "classifyAndFilterVideos"})
print("   結果:", class_res)
