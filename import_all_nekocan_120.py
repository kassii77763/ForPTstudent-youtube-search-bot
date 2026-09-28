import json
import urllib.request
import re
import time

WEBHOOK_BASE = 'https://script.google.com/macros/s/AKfycbwXEJ1C4pbmwfxU332ZhOO5iNH7XxlWpbyNHqvIGouBQwtUE6dRpN4VnxCidqf0C0BL/exec'

def post_gas(payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(WEBHOOK_BASE, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        return res.read().decode('utf-8')

with open('nekocan_candidate_ids.json', 'r', encoding='utf-8') as f:
    candidates = json.load(f)

print(f"Total candidate IDs to resolve: {len(candidates)}")

final_videos = []

for i, (vid, title) in enumerate(candidates.items()):
    v_url = f"https://www.youtube.com/watch?v={vid}"
    timestamps_text = ""
    resolved_title = title
    
    # If title is missing or we need timestamps, fetch oEmbed or watch page
    if not resolved_title or not timestamps_text:
        try:
            req_v = urllib.request.Request(v_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req_v, timeout=4) as resp:
                v_html = resp.read().decode('utf-8', errors='ignore')
                
                # Check channel author to ensure it belongs to ネコかん
                if 'UCaiJBZYZiJElxd0E9l-VEKw' not in v_html and 'nekocan_nekowo' not in v_html and 'ネコかん' not in v_html:
                    # check title
                    m_auth = re.search(r'"author":"([^"]+)"', v_html)
                    if m_auth and 'ネコかん' not in m_auth.group(1):
                        print(f"Skipping foreign video {vid}: {m_auth.group(1)}")
                        continue
                
                if not resolved_title:
                    m_t = re.search(r'<title>(.*?)( - YouTube)?</title>', v_html)
                    if m_t:
                        resolved_title = m_t.group(1).replace(' - YouTube', '').strip()
                
                m_desc = re.search(r'"shortDescription":"(.*?)"', v_html)
                if m_desc:
                    desc = m_desc.group(1).encode().decode('unicode_escape', errors='ignore')
                    ts_lines = [l.strip() for l in desc.split('\\n') if re.search(r'\b\d{1,2}:\d{2}', l)]
                    if ts_lines:
                        timestamps_text = "\n".join(ts_lines)
        except Exception as e:
            # Fallback for title via oEmbed
            if not resolved_title:
                try:
                    oe_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
                    with urllib.request.urlopen(oe_url, timeout=3) as oe_resp:
                        oe_data = json.loads(oe_resp.read().decode('utf-8'))
                        resolved_title = oe_data.get('title')
                except Exception:
                    resolved_title = f"ネコかん解説動画 ({vid})"

    if not resolved_title:
        resolved_title = f"ネコかん解説動画 ({vid})"

    final_videos.append({
        "title": resolved_title,
        "url": v_url,
        "category": "看護・解剖生理学",
        "timestamps": timestamps_text,
        "channel": "ネコかん"
    })
    
    if (i + 1) % 10 == 0 or (i + 1) == len(candidates):
        print(f"Processed [{i+1}/{len(candidates)}]: {resolved_title[:30]}...")

print(f"\n✅ 有効なネコかん動画: 合計 {len(final_videos)} 件")

# スプレッドシートへ登録（まずは既存のネコかん動画をクリアして全120+件を一括登録）
print("\nスプレッドシートの既存ネコかん動画をクリーンアップ中...")
del_res = post_gas({
    "action": "deleteChannelVideos",
    "channel": "ネコかん"
})
print("削除結果:", del_res)

print("\n全ネコかん動画をバッチ登録中...")
batch_size = 40
for i in range(0, len(final_videos), batch_size):
    batch = final_videos[i:i+batch_size]
    res_import = post_gas({
        "action": "importCustomVideos",
        "videos": batch
    })
    print(f"バッチ {i//batch_size + 1} 登録結果:", res_import)

print("\n検索フラグの自動更新...")
res_filter = post_gas({
    "action": "classifyAndFilterVideos"
})
print("フィルタ結果:", res_filter)
print("\n🎉 全120本超のネコかん動画インポート完了！")
