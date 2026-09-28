import urllib.request
import json

url = 'https://script.google.com/macros/s/AKfycbwXEJ1C4pbmwfxU332ZhOO5iNH7XxlWpbyNHqvIGouBQwtUE6dRpN4VnxCidqf0C0BL/exec'
payload = json.dumps({'action': 'classifyAndFilterVideos'}).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as res:
    print('Filter result:', res.read().decode('utf-8'))
