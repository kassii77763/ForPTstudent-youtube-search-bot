/**
 * とある夜間部PT学生の学習帖 - インタラクティブ制御スクリプト
 * 単元別キュレーションデータのレンダリングとタブ・フィルター制御
 */

// キュレーションデータ（現役学生が実際に救われた神動画セット）
const CURATION_DATA = {
  anatomy: {
    name: '解剖学',
    units: [
      { id: 'all', name: 'すべて' },
      { id: 'bone_joint', name: '骨・関節系' },
      { id: 'muscle', name: '骨格筋・起始停止' },
      { id: 'nerve', name: '中枢・末梢神経' },
      { id: 'cardio', name: '脈管・循環器' }
    ],
    videos: [
      {
        id: 'a1',
        unit: 'bone_joint',
        title: '【完全マスター】上肢の骨と関節運動学まとめ',
        channel: 'かずひろ先生の解剖学講義',
        thumbnail: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: '肩甲上腕関節と烏口肩峰アーチの立体構造がこれ1本で一発理解。実習の触診テスト前に3回復習しました。',
        duration: '18:40',
        tag: '骨・関節'
      },
      {
        id: 'a2',
        unit: 'muscle',
        title: '大腿四頭筋・ハムストリングスの起始停止と支配神経',
        channel: 'カラダ研究所',
        thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: '単に暗記するのではなく「なぜその作用が起きるのか」をモーメントアームの視点から解説してくれる神回。',
        duration: '14:25',
        tag: '筋系'
      },
      {
        id: 'a3',
        unit: 'nerve',
        title: '脳神経12対の語呂合わせと機能（運動・感覚・副交感）',
        channel: 'イラストで学ぶ解剖生理学 ゴロー',
        thumbnail: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: '1年次の解剖中間試験でクラス全員が救われた伝説のアニメーション動画。ノートまとめは即やめてこれ見ましょう。',
        duration: '12:15',
        tag: '神経系'
      },
      {
        id: 'a4',
        unit: 'cardio',
        title: '心臓の解剖と冠動脈の走行・刺激伝導系',
        channel: '西島ゼミ【PT/OT国試】',
        thumbnail: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: '国試に出る洞結節・房室結節の伝導順序とヒス束の枝分かれが一撃で頭に入ります。過去問頻出ポイントが網羅。',
        duration: '09:50',
        tag: '循環器'
      }
    ]
  },
  physiology: {
    name: '生理学',
    units: [
      { id: 'all', name: 'すべて' },
      { id: 'action_potential', name: '膜電位・神経興奮' },
      { id: 'muscle_contraction', name: '筋収縮機構' },
      { id: 'autonomic', name: '自律神経・反射' },
      { id: 'respiration', name: '呼吸・循環生理' }
    ],
    videos: [
      {
        id: 'p1',
        unit: 'action_potential',
        title: '静止膜電位と活動電位の発生機序（Na+/K+ポンプ）',
        channel: 'ネコかん【医療系学生応援】',
        thumbnail: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: '脱分極・再分極・過分極のイオンの動きを会話形式でスッキリ理解。教科書のグラフが動いて見えます。',
        duration: '15:10',
        tag: '膜電位'
      },
      {
        id: 'p2',
        unit: 'muscle_contraction',
        title: '筋収縮の滑り説・カルシウムイオンとトロポニンの役割',
        channel: 'イラストで学ぶ解剖生理学 ゴロー',
        thumbnail: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: '筋小胞体からのCa2+放出とアクチン・ミオシンの結合が手描きイラストで視覚的に直感理解できます。',
        duration: '11:30',
        tag: '筋収縮'
      },
      {
        id: 'p3',
        unit: 'autonomic',
        title: '交感神経 vs 副交感神経 受容体と効果器のまとめ',
        channel: 'イラストで学ぶ解剖生理学 ゴロー',
        thumbnail: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: 'α受容体・β受容体の作用を血管収縮や気管支拡張のストーリーで覚えられます。薬理学にもつながる重要回。',
        duration: '16:05',
        tag: '自律神経'
      },
      {
        id: 'p4',
        unit: 'respiration',
        title: '呼吸商とヘモグロビン酸素解離曲線のシフト要因',
        channel: '西島ゼミ【PT/OT国試】',
        thumbnail: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: 'pH低下、温度上昇、2,3-DPG増加で右方シフトする理屈が国試頻出。丸暗記ではなく論理で解けるようになります。',
        duration: '08:45',
        tag: '呼吸生理'
      }
    ]
  },
  kinesiology: {
    name: '運動学',
    units: [
      { id: 'all', name: 'すべて' },
      { id: 'gait', name: '正常歩行分析・周期' },
      { id: 'joint_mechanics', name: '関節バイオメカニクス' },
      { id: 'lever', name: 'テコ・重心・モーメント' }
    ],
    videos: [
      {
        id: 'k1',
        unit: 'gait',
        title: '歩行周期（立脚相・遊脚相）の筋活動と床反力ベクトル',
        channel: 'カラダ研究所',
        thumbnail: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: '初期接地（IC）から荷重応答（LR）で前脛骨筋と大殿筋がどう遠心性収縮するか、CGアニメで完全に掴めます。',
        duration: '21:15',
        tag: '歩行分析'
      },
      {
        id: 'k2',
        unit: 'joint_mechanics',
        title: '膝関節のスクリューホーム運動（終末回旋運動）のメカニズム',
        channel: 'かずひろ先生の解剖学講義',
        thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: '大腿骨の内側顆と外側顆の大きさの違いから自然に理解できる。実習先バイザーの口頭試問対策にもなりました。',
        duration: '13:50',
        tag: '膝関節'
      },
      {
        id: 'k3',
        unit: 'lever',
        title: '第1のテコ・第2のテコ・第3のテコの人体での実例',
        channel: '西島ゼミ【PT/OT国試】',
        thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
        url: 'https://www.youtube.com',
        memo: '頭蓋骨と環椎（第1）、つま先立ち（第2）、前腕の屈曲（第3）の図解。試験で配点が高い計算問題の土台になります。',
        duration: '10:20',
        tag: '力学'
      }
    ]
  }
};

// 状態管理
let currentSubject = 'anatomy';
let currentUnit = 'all';

// DOM要素
const unitFilterEl = document.getElementById('unit-filter');
const videoGridEl = document.getElementById('video-grid');
const subjectTabs = document.querySelectorAll('.tab-btn');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  renderFilters();
  renderVideos();
});

// タブのイベントリスナー設定
function setupTabs() {
  subjectTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetSubject = tab.getAttribute('data-subject');
      if (targetSubject === currentSubject) return;

      // タブアクティブ更新
      subjectTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // 状態更新
      currentSubject = targetSubject;
      currentUnit = 'all';

      // 再描画
      renderFilters();
      renderVideos();
    });
  });
}

// フィルターチップのレンダリング
function renderFilters() {
  const subjectData = CURATION_DATA[currentSubject];
  unitFilterEl.innerHTML = '';

  subjectData.units.forEach(unit => {
    const chip = document.createElement('button');
    chip.className = `unit-chip ${unit.id === currentUnit ? 'active' : ''}`;
    chip.textContent = unit.name;
    chip.setAttribute('data-unit-id', unit.id);

    chip.addEventListener('click', () => {
      currentUnit = unit.id;
      // チップのアクティブ更新
      document.querySelectorAll('.unit-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderVideos();
    });

    unitFilterEl.appendChild(chip);
  });
}

// 動画グリッドのレンダリング
function renderVideos() {
  const subjectData = CURATION_DATA[currentSubject];
  const filteredVideos = currentUnit === 'all'
    ? subjectData.videos
    : subjectData.videos.filter(v => v.unit === currentUnit);

  videoGridEl.innerHTML = '';

  if (filteredVideos.length === 0) {
    videoGridEl.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted); background: var(--surface-card); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        現在、この単元の厳選動画を整理・追加中です。リクエストはLINE Botから受け付けています。
      </div>
    `;
    return;
  }

  filteredVideos.forEach(video => {
    const card = document.createElement('article');
    card.className = 'video-card';
    card.innerHTML = `
      <div class="video-thumb-container">
        <img class="video-thumb" src="${video.thumbnail}" alt="${escapeHtml(video.title)}" loading="lazy">
        <span class="video-tag-pill">${escapeHtml(video.tag)}</span>
        <span class="video-duration">${escapeHtml(video.duration)}</span>
      </div>
      <div class="video-info">
        <div class="video-channel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
          </svg>
          <span>${escapeHtml(video.channel)}</span>
        </div>
        <h3 class="video-title">${escapeHtml(video.title)}</h3>
        <p class="video-memo">💡 <strong>先輩メモ:</strong> ${escapeHtml(video.memo)}</p>
        <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="video-link-btn">
          YouTubeで動画を見る
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </div>
    `;
    videoGridEl.appendChild(card);
  });
}

// XSS防止エスケープ関数
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
