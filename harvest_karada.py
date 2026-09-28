import subprocess
import json
import urllib.request
import time

WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwXEJ1C4pbmwfxU332ZhOO5iNH7XxlWpbyNHqvIGouBQwtUE6dRpN4VnxCidqf0C0BL/exec'

# カラダ研究所（正式URL: channel/UCHQw8yGouhHGLUdLz-scUjQ）
CHANNELS = [
    {
        'name': 'カラダ研究所',
        'url': 'https://www.youtube.com/channel/UCHQw8yGouhHGLUdLz-scUjQ/videos',
        'category': '3D解剖・バイオメカニクス'
    }
]

def fetch_title(video_id):
    url = f"https://noembed.com/embed?url=https://www.youtube.com/watch?v={video_id}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get('title')
    except Exception:
        pass
    
    try:
        w_url = f"https://www.youtube.com/watch?v={video_id}"
        req2 = urllib.request.Request(w_url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ja-JP,ja;q=0.9'
        })
        with urllib.request.urlopen(req2, timeout=5) as resp2:
            import re
            m = re.search(r'<title>(.+?)</title>', resp2.read().decode('utf-8'))
            if m:
                return m.group(1).replace(' - YouTube', '').strip()
    except Exception:
        pass
    return None

def send_batch_to_gas(videos):
    payload = json.dumps({
        'action': 'batchImportVideos',
        'videos': videos
    }).encode('utf-8')
    
    req = urllib.request.Request(
        WEBHOOK_URL,
        data=payload,
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))

def process_channel(ch):
    print(f"\n==========================================")
    print(f"▶ チャンネル解析開始: {ch['name']} ({ch['url']})")
    print(f"==========================================")

    cmd = [
        'python', '-m', 'yt_dlp',
        '--flat-playlist',
        '--print', '%(id)s',
        ch['url']
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    vids = [line.strip() for line in res.stdout.splitlines() if len(line.strip()) == 11]
    unique_vids = []
    seen = set()
    for v in vids:
        if v not in seen:
            seen.add(v)
            unique_vids.append(v)

    print(f"✅ {ch['name']}: 全 {len(unique_vids)} 本の動画IDを検出")
    
    batch = []
    total_added = 0
    count = 0

    for vid in unique_vids:
        count += 1
        title = fetch_title(vid)
        if not title:
            title = f"{ch['name']} 動画 ({vid})"
        
        batch.append({
            'title': title,
            'url': f"https://www.youtube.com/watch?v={vid}",
            'category': ch['category'],
            'channel': ch['name']
        })

        if count % 20 == 0 or count == len(unique_vids):
            print(f"  [{count}/{len(unique_vids)}] GASへ送信中 ({len(batch)}件)...")
            try:
                gas_res = send_batch_to_gas(batch)
                print(f"   -> 反映完了: 新規追加 {gas_res.get('added')}件 (現在シート総行数: {gas_res.get('newTotalRows')})")
                total_added += gas_res.get('added', 0)
            except Exception as e:
                print(f"   ❌ 送信エラー: {e}")
            batch = []
            time.sleep(0.5)

    print(f"🎉 {ch['name']} 完了: 新規登録 {total_added} 件")

if __name__ == '__main__':
    for ch in CHANNELS:
        process_channel(ch)
