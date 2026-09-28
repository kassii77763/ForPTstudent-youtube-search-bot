import json
import urllib.request
import urllib.parse

WEBHOOK_BASE = 'https://script.google.com/macros/s/AKfycbwXEJ1C4pbmwfxU332ZhOO5iNH7XxlWpbyNHqvIGouBQwtUE6dRpN4VnxCidqf0C0BL/exec'

def post_gas(payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(WEBHOOK_BASE, data=data, headers={'Content-Type': 'application/json'})
    # urllib automatically follows 302 redirects
    with urllib.request.urlopen(req) as res:
        return res.read().decode('utf-8')

print("1. かずひろ先生のYouTube動画をクリーンアップ中...")
res = post_gas({
    "action": "deleteChannelVideos",
    "channel": "かずひろ先生"
})
print("結果:", res)
