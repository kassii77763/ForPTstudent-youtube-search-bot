import urllib.request
import re
import json
import time

def harvest_all_nekocan():
    url = 'https://www.youtube.com/@nekocan_nekowo/videos'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja-JP,ja;q=0.9'
    })
    with urllib.request.urlopen(req) as res:
        html = res.read().decode('utf-8')

    m_key = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', html)
    api_key = m_key.group(1)

    m_context = re.search(r'"INNERTUBE_CONTEXT":({.+?}),"INNERTUBE_', html)
    if not m_context:
        m_context = re.search(r'"INNERTUBE_CONTEXT":({.+?})[,\n]', html)
    context = json.loads(m_context.group(1))

    m_data = re.search(r'var ytInitialData\s*=\s*({.+?});</script>', html)
    data = json.loads(m_data.group(1))

    videos = []
    seen_ids = set()

    def extract_from_obj(obj):
        if isinstance(obj, dict):
            if 'lockupViewModel' in obj:
                lvm = obj['lockupViewModel']
                vid = None
                img = lvm.get('contentImage', {}).get('thumbnailViewModel', {}).get('image', {})
                for src in img.get('sources', []):
                    m_vid = re.search(r'/vi/([a-zA-Z0-9_-]{11})/', src.get('url', ''))
                    if m_vid:
                        vid = m_vid.group(1)
                        break
                title = lvm.get('metadata', {}).get('lockupMetadataViewModel', {}).get('title', {}).get('content')
                if vid and title and vid not in seen_ids:
                    seen_ids.add(vid)
                    videos.append({'videoId': vid, 'title': title})

            if 'videoRenderer' in obj:
                vr = obj['videoRenderer']
                vid = vr.get('videoId')
                title_obj = vr.get('title', {})
                title = ''
                if 'runs' in title_obj and len(title_obj['runs']) > 0:
                    title = title_obj['runs'][0].get('text', '')
                elif 'simpleText' in title_obj:
                    title = title_obj.get('simpleText', '')
                if vid and title and vid not in seen_ids:
                    seen_ids.add(vid)
                    videos.append({'videoId': vid, 'title': title})

            for v in obj.values():
                extract_from_obj(v)
        elif isinstance(obj, list):
            for item in obj:
                extract_from_obj(item)

    extract_from_obj(data)
    print(f"Initial page: {len(videos)} videos")

    # Find next continuation token
    def get_token(obj):
        if isinstance(obj, dict):
            if 'continuationCommand' in obj and 'token' in obj['continuationCommand']:
                return obj['continuationCommand']['token']
            for v in obj.values():
                t = get_token(v)
                if t: return t
        elif isinstance(obj, list):
            for item in obj:
                t = get_token(item)
                if t: return t
        return None

    # Get initial token from richGridRenderer
    richGrid = data['contents']['twoColumnBrowseResultsRenderer']['tabs'][1]['tabRenderer']['content']['richGridRenderer']
    token = None
    for c in richGrid.get('contents', []):
        if 'continuationItemRenderer' in c:
            token = c['continuationItemRenderer']['continuationEndpoint']['continuationCommand']['token']
            break

    page = 1
    while token:
        page += 1
        api_url = f"https://www.youtube.com/youtubei/v1/browse?key={api_key}"
        payload = json.dumps({
            "context": context,
            "continuation": token
        }).encode('utf-8')

        req_cont = urllib.request.Request(api_url, data=payload, headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        try:
            with urllib.request.urlopen(req_cont) as res_cont:
                cont_json = json.loads(res_cont.read().decode('utf-8'))
                before_count = len(videos)
                extract_from_obj(cont_json)
                added = len(videos) - before_count
                print(f"Page {page}: +{added} videos (Total: {len(videos)})")
                
                token = get_token(cont_json)
                if not token:
                    print("No more continuation tokens.")
                    break
            time.sleep(0.5)
        except Exception as e:
            print(f"Error on page {page}: {e}")
            break

    print(f"\n🎉 Finished harvesting! Total collected: {len(videos)} videos")
    return videos

if __name__ == '__main__':
    vids = harvest_all_nekocan()
    with open('nekocan_all_videos.json', 'w', encoding='utf-8') as f:
        json.dump(vids, f, ensure_ascii=False, indent=2)
