import urllib.request
import re
import json
import time

systematic_cats = [
    ("sa1", "人体の構成"),
    ("sa10", "運動器系"),
    ("sa2", "循環器系"),
    ("sa8", "神経系"),
    ("sa3", "呼吸器系"),
    ("sa4", "消化器系"),
    ("sa5", "泌尿器系"),
    ("sa6", "生殖器系"),
    ("sa7", "内分泌系"),
    ("sa9", "感覚器系")
]

articles = []
seen = set()

for slug, cat_name in systematic_cats:
    url = f"https://www.anatomy.tokyo/category/systematic/{slug}/"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as res:
            html = res.read().decode('utf-8')
            # 記事カードのリンクを抽出
            matches = re.findall(r'<a[^>]+href="(https://www\.anatomy\.tokyo/[^"]+)"[^>]*class="[^"]*p-postList__link[^"]*"[^>]*>[\s\S]*?<h2[^>]*class="[^"]*p-postList__title[^"]*"[^>]*>([\s\S]*?)</h2>', html)
            print(f"[{cat_name}] Matches: {len(matches)}")
            for link, raw_title in matches:
                title = re.sub(r'<[^>]+>', '', raw_title).strip()
                if link in seen: continue
                seen.add(link)
                articles.append({
                    "title": f"【徹底的解剖学】{title}",
                    "url": link,
                    "category": f"解剖学（{cat_name}）",
                    "timestamps": "",
                    "keywords": f"{cat_name} {title}",
                    "author": "かずひろ先生【徹底的解剖学】",
                    "status": "ON",
                    "image": "https://www.anatomy.tokyo/wp-content/uploads/2021/04/cropped-cropped-site-icon-1.png"
                })
        time.sleep(0.3)
    except Exception as e:
        print(f"Error on {slug}: {e}")

print(f"Total systematic articles: {len(articles)}")
with open("kazuhiro_systematic_articles.json", "w", encoding="utf-8") as f:
    json.dump(articles, f, ensure_ascii=False, indent=2)
