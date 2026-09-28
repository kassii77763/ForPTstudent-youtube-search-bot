import urllib.request
import re
import json
import time

playlists = [
    'PLEcCTbMGZJCkc43E7plJRA7geM_bzjkjo',
    'PLEcCTbMGZJCkNDmiUiFKzr4s24rqSTwOv',
    'PLEcCTbMGZJCmFfjEXNLJmn3h0lc7sNgkq',
    'PLEcCTbMGZJCneoCcIJ9qTD03vuC6i560g',
    'PLEcCTbMGZJCk6a1u0qCeek5sOB-rgCR5P',
    'PLEcCTbMGZJCkPgjBDUbI9cmSnEZyi8r0w',
    'PLEcCTbMGZJCk0k4bpBShlV8u1h2LjvOMZ',
    'PLEcCTbMGZJCl7Uwz8orZRxUnlZbwGcfNg',
    'PLEcCTbMGZJCkVH1WgBZ3NHU51haNlT2-X',
    'PLEcCTbMGZJCm4m-AO-ybHCruUUiumhNHF',
    'PLEcCTbMGZJCmmKk8LDKaZqZxGOcIm2JVG',
    'PLEcCTbMGZJCkMixBtmn4AbFK73UQb0_kI',
    'PLEcCTbMGZJCkEV-H1mwUMzqQMCCwy0Uzb',
    'PLEcCTbMGZJCnS3_3D8yWsB8MFHCNYOH4l',
    'PLEcCTbMGZJCl9bPsHNpCvBhUWMRXklDpq',
    'PLEcCTbMGZJCnSQxFHcOqM91y9HuaflUv2',
    'PLEcCTbMGZJCn0khmP0EsKcyDM5f71E2WX',
    'PLEcCTbMGZJCmVrVbEHnikLIM3JQkH3qpg',
    'PLEcCTbMGZJCklOatZHsikh0ktwYCkNYFv',
    'PLEcCTbMGZJCkmk4apO-dr-tCfTRb2pimk',
    'PLEcCTbMGZJCmNLwMKXi7WgVoXSx0gHZtW',
    'PLEcCTbMGZJCniAYl2mlqnXk9W6GadPHZi'
]

# Load existing 70 videos
with open('nekocan_all_videos.json', 'r', encoding='utf-8') as f:
    existing_videos = json.load(f)

all_vids_dict = {v['videoId']: v['title'] for v in existing_videos}
print(f"Base videos count: {len(all_vids_dict)}")

# Also collect shorts
for sub in ['shorts', 'streams']:
    u = f'https://www.youtube.com/@nekocan_nekowo/{sub}'
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req) as res:
            html = res.read().decode('utf-8')
            m = re.findall(r'\"videoId\":\"([a-zA-Z0-9_-]{11})\"', html)
            for vid in m:
                if vid not in all_vids_dict:
                    all_vids_dict[vid] = None
    except Exception as e:
        pass

# Collect from playlists
for pid in playlists:
    u = f'https://www.youtube.com/playlist?list={pid}'
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req) as res:
            html = res.read().decode('utf-8')
            m = re.findall(r'\"videoId\":\"([a-zA-Z0-9_-]{11})\"', html)
            for vid in m:
                if vid not in all_vids_dict:
                    all_vids_dict[vid] = None
    except Exception as e:
        pass

print(f"Total video IDs accumulated: {len(all_vids_dict)}")
with open('nekocan_candidate_ids.json', 'w', encoding='utf-8') as f:
    json.dump(all_vids_dict, f, ensure_ascii=False, indent=2)
