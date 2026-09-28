import urllib.request
import re
import json
import time

def harvest_top_table_of_contents():
    print("▶ かずひろ先生の『系統別解剖学・一問一答目次』から体系的単元記事を抽出中...")
    url = "https://www.anatomy.tokyo/top/"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as res:
        html = res.read().decode('utf-8')
    
    # <a href="...">テキスト</a> を抽出
    links = re.findall(r'<a[^>]+href="(https://www\.anatomy\.tokyo/[^"]+)"[^>]*>([^<]+)</a>', html)
    
    unit_articles = []
    seen = set()
    
    for link, raw_title in links:
        title = raw_title.strip()
        link = link.strip()
        if not title or link in seen:
            continue
        if "category" in link or "exam" in link or "author" in link or "tag" in link:
            continue
        seen.add(link)
        
        # タイトルから大単元（人体の構成、運動器系、循環器系、神経系など）を推定
        category = "解剖生理学Web解説"
        if "運動器" in title or "骨" in title or "筋" in title or "上肢" in title or "下肢" in title or "体幹" in title or "関節" in title:
            category = "運動器系（骨・筋・関節）"
        elif "循環器" in title or "心臓" in title or "動脈" in title or "静脈" in title or "脈管" in title or "血液" in title:
            category = "循環器系（心臓・血管・血液）"
        elif "神経" in title or "脳" in title or "脊髄" in title or "自律神経" in title or "伝導路" in title:
            category = "神経系（中枢・末梢・伝導路）"
        elif "消化" in title or "胃" in title or "腸" in title or "肝臓" in title:
            category = "消化器系"
        elif "呼吸" in title or "肺" in title or "喉頭" in title:
            category = "呼吸器系"
        elif "泌尿" in title or "腎臓" in title or "膀胱" in title:
            category = "泌尿器系"
        elif "内分泌" in title or "ホルモン" in title:
            category = "内分泌系"
        elif "感覚" in title or "視覚" in title or "聴覚" in title or "眼" in title or "耳" in title:
            category = "感覚器系"
        
        unit_articles.append({
            "title": f"【徹底的解剖学】{title}",
            "url": link,
            "category": category,
            "timestamps": "",
            "keywords": title.replace("–", " ").replace("—", " ").replace("【一問一答】", "").strip(),
            "author": "かずひろ先生【徹底的解剖学】",
            "status": "ON",
            "image": "https://www.anatomy.tokyo/wp-content/uploads/2021/04/cropped-cropped-site-icon-1.png" # デフォルト
        })

    print(f"✅ 体系的単元記事: {len(unit_articles)} 件を抽出完了")
    
    with open("kazuhiro_curated_articles.json", "w", encoding="utf-8") as f:
        json.dump(unit_articles, f, ensure_ascii=False, indent=2)
    
    return unit_articles

if __name__ == '__main__':
    harvest_top_table_of_contents()
