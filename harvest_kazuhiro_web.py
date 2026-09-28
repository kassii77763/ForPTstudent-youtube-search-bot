import urllib.request
import json
import re
import html
import time

def clean_html(raw_html):
    clean = re.sub(r'<[^<]+?>', '', raw_html)
    return html.unescape(clean).strip()

def harvest_kazuhiro():
    print("▶ かずひろ先生のWebサイト (anatomy.tokyo) から主要解説記事を収集中...")
    
    # カテゴリ一覧を取得
    cats_url = "https://www.anatomy.tokyo/wp-json/wp/v2/categories?per_page=100"
    req = urllib.request.Request(cats_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as res:
            cats = json.loads(res.read().decode('utf-8'))
    except Exception as e:
        print("Categories fetch error:", e)
        return []

    cat_map = {c['id']: c['name'] for c in cats}
    
    # 記事を収集 (最大300件程度)
    all_articles = []
    seen_urls = set()
    page = 1
    
    while page <= 10:
        posts_url = f"https://www.anatomy.tokyo/wp-json/wp/v2/posts?per_page=50&page={page}"
        req = urllib.request.Request(posts_url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as res:
                posts = json.loads(res.read().decode('utf-8'))
                if not posts:
                    break
                
                for p in posts:
                    title = clean_html(p.get('title', {}).get('rendered', ''))
                    link = p.get('link', '').strip()
                    if not link or link in seen_urls:
                        continue
                    seen_urls.add(link)
                    
                    # 単問の過去問（例: "2017年 あマ指 問題25"）や単なる演習は省き、概念・まとめ・解剖学解説を優先
                    content_html = p.get('content', {}).get('rendered', '')
                    
                    # 記事内の最初の画像を探す
                    img_match = re.search(r'<img[^>]+src="([^">]+)"', content_html)
                    img_url = img_match.group(1) if img_match else ""
                    
                    # カテゴリ名
                    p_cats = p.get('categories', [])
                    cat_names = [cat_map.get(cid, '') for cid in p_cats if cid in cat_map]
                    cat_str = " / ".join([c for c in cat_names if c and "一問一答" not in c])
                    if not cat_str:
                        cat_str = "解剖生理学Web解説"
                    
                    # キーワード候補（タイトルから医学用語を軽く抽出 or カテゴリ）
                    keywords = ", ".join(cat_names)
                    
                    all_articles.append({
                        "title": title,
                        "url": link,
                        "category": cat_str,
                        "timestamps": "", # Web記事なので空
                        "keywords": keywords,
                        "author": "かずひろ先生【徹底的解剖学】",
                        "status": "ON",
                        "image": img_url
                    })
                
                print(f"   ・Page {page}: 累計 {len(all_articles)} 件収集")
                page += 1
                time.sleep(0.5)
        except Exception as e:
            print(f"Page {page} finished or error: {e}")
            break

    print(f"✅ かずひろ先生のWeb記事: 合計 {len(all_articles)} 件の収集完了")
    
    with open("kazuhiro_articles.json", "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    
    return all_articles

if __name__ == '__main__':
    harvest_kazuhiro()
