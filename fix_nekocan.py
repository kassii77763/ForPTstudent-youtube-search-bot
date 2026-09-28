import json
import urllib.request
import re
from deep_crawler import fetch_channel_videos

WEBHOOK_BASE = 'https://script.google.com/macros/s/AKfycbwXEJ1C4pbmwfxU332ZhOO5iNH7XxlWpbyNHqvIGouBQwtUE6dRpN4VnxCidqf0C0BL/exec'

def post_gas(payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(WEBHOOK_BASE, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        return res.read().decode('utf-8')

# 1. 誤ったチャンネルの動画（現在F列が「ネコかん」となっている動画）を削除
print("1. 既存の誤った「ネコかん」動画をスプレッドシートから削除中...")
del_res = post_gas({
    "action": "deleteChannelVideos",
    "channel": "ネコかん"
})
print("削除結果:", del_res)

# 2. 正しいチャンネル「@nekocan_nekowo」から全動画を取得
print("\n2. 正しいチャンネル @nekocan_nekowo から動画を収集中...")
raw_videos = fetch_channel_videos('@nekocan_nekowo', max_pages=10)
print(f"取得できた動画総数: {len(raw_videos)} 件")

# 3. タイムスタンプ取得（各動画ページから説明文のタイムスタンプを抽出）
processed_videos = []
for i, v in enumerate(raw_videos):
    vid = v['videoId']
    title = v['title']
    v_url = f"https://www.youtube.com/watch?v={vid}"
    
    timestamps_text = ""
    try:
        req_v = urllib.request.Request(v_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_v, timeout=5) as resp:
            v_html = resp.read().decode('utf-8', errors='ignore')
            m_desc = re.search(r'"shortDescription":"(.*?)"', v_html)
            if m_desc:
                desc = m_desc.group(1).encode().decode('unicode_escape', errors='ignore')
                ts_lines = [l.strip() for l in desc.split('\\n') if re.search(r'\b\d{1,2}:\d{2}', l)]
                if ts_lines:
                    timestamps_text = "\n".join(ts_lines)
    except Exception as e:
        pass
    
    processed_videos.append({
        "title": title,
        "url": v_url,
        "category": "看護・解剖生理学",
        "timestamps": timestamps_text,
        "channel": "ネコかん"
    })
    print(f"[{i+1}/{len(raw_videos)}] {title[:35]}... (TS: {'あり' if timestamps_text else 'なし'})")

# 4. GASにインポート
print("\n4. スプレッドシートへ登録中...")
# 50件ずつバッチインポート
batch_size = 30
for i in range(0, len(processed_videos), batch_size):
    batch = processed_videos[i:i+batch_size]
    res_import = post_gas({
        "action": "importCustomVideos",
        "videos": batch
    })
    print(f"バッチ {i//batch_size + 1} 登録結果:", res_import)

# 5. G列のフィルタリング自動分類を実行
print("\n5. 検索フラグの自動更新...")
res_filter = post_gas({
    "action": "classifyAndFilterVideos"
})
print("フィルタ結果:", res_filter)
print("\n全行程完了！")
