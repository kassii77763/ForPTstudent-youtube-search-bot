/**
 * プロジェクト統括ダッシュボード制御スクリプト
 * とある夜間部PT学生の学習帖 - 管制盤
 */

// ストレージキー
const STORAGE_KEY = 'PT_PORTAL_ADMIN_STATE_v1';

// 初期シードデータ
const INITIAL_DATA = {
  theme: 'dark',
  kpi: {
    lineUsers: 42,
    monthlyPv: 1280,
    videoCount: 11
  },
  tasks: [
    { id: 1, text: '今週の講義単元（脳神経・脳幹）の神動画を3本選定', tag: '平日夜', completed: true },
    { id: 2, text: 'ゴロー先生＆西島ゼミ動画のタイムスタンプ付き要点メモ作成', tag: '平日夜', completed: true },
    { id: 3, text: '定期試験プリントから4択汎用クイズを2問正規化登録', tag: '土曜午前', completed: true },
    { id: 4, text: '単元「膜電位と活動電位」のnoteエッセイ記事を1本公開', tag: '日曜夜', completed: true },
    { id: 5, text: 'Instagram用カルーセル画像（スライド5枚）の台本生成', tag: '日曜夜', completed: false },
    { id: 6, text: 'LINE Botの応答ログ確認と未登録キーワードの類義語登録', tag: '週末', completed: false }
  ],
  curations: [
    {
      id: 'c1',
      category: 'anatomy',
      unit: '骨・関節系 (肩甲上腕関節)',
      teacher: 'かずひろ先生',
      title: '【完全マスター】上肢の骨と関節運動学まとめ',
      url: 'https://www.youtube.com/watch?v=sample1',
      duration: '18:40',
      rating: 5,
      summary: '肩甲上腕関節と烏口肩峰アーチの立体構造がこれ1本で一発理解。実習の触診テスト前に3回復習しました。',
      tags: ['骨・関節', '肩関節', '烏口肩峰アーチ', '解剖学']
    },
    {
      id: 'c2',
      category: 'anatomy',
      unit: '骨格筋・起始停止 (下肢筋群)',
      teacher: 'カラダ研究所',
      title: '大腿四頭筋・ハムストリングスの起始停止と支配神経',
      url: 'https://www.youtube.com/watch?v=sample2',
      duration: '14:25',
      rating: 5,
      summary: '単に暗記するのではなく「なぜその作用が起きるのか」をモーメントアームの視点から解説してくれる神回。',
      tags: ['筋系', '起始停止', '大腿四頭筋', 'ハムストリングス']
    },
    {
      id: 'c3',
      category: 'anatomy',
      unit: '中枢・末梢神経 (脳神経12対)',
      teacher: 'ゴロー先生',
      title: '脳神経12対の語呂合わせと機能（運動・感覚・副交感）',
      url: 'https://www.youtube.com/watch?v=sample3',
      duration: '12:15',
      rating: 5,
      summary: '1年次の解剖中間試験でクラス全員が救われた伝説のアニメーション動画。ノートまとめは即やめてこれ見ましょう。',
      tags: ['神経系', '脳神経12対', '語呂合わせ', '国試必修']
    },
    {
      id: 'c4',
      category: 'anatomy',
      unit: '脈管・循環器 (刺激伝導系)',
      teacher: '西島ゼミ',
      title: '心臓の解剖と冠動脈の走行・刺激伝導系',
      url: 'https://www.youtube.com/watch?v=sample4',
      duration: '09:50',
      rating: 4,
      summary: '国試に出る洞結節・房室結節の伝導順序とヒス束の枝分かれが一撃で頭に入ります。過去問頻出ポイントが網羅。',
      tags: ['循環器', '刺激伝導系', '冠動脈', '西島ゼミ']
    },
    {
      id: 'c5',
      category: 'physiology',
      unit: '膜電位・神経興奮 (活動電位)',
      teacher: 'ネコかん',
      title: '静止膜電位と活動電位の発生機序（Na+/K+ポンプ）',
      url: 'https://www.youtube.com/watch?v=sample5',
      duration: '15:10',
      rating: 5,
      summary: '脱分極・再分極・過分極のイオンの動きを会話形式でスッキリ理解。教科書のグラフが動いて見えます。',
      tags: ['膜電位', '活動電位', 'ナトリウムポンプ', '生理学']
    },
    {
      id: 'c6',
      category: 'physiology',
      unit: '筋収縮機構 (滑り説)',
      teacher: 'ゴロー先生',
      title: '筋収縮の滑り説・カルシウムイオンとトロポニンの役割',
      url: 'https://www.youtube.com/watch?v=sample6',
      duration: '11:30',
      rating: 5,
      summary: '筋小胞体からのCa2+放出とアクチン・ミオシンの結合が手描きイラストで視覚的に直感理解できます。',
      tags: ['筋収縮', '滑り説', 'カルシウム', 'トロポニン']
    },
    {
      id: 'c7',
      category: 'physiology',
      unit: '自律神経・反射 (交感/副交感)',
      teacher: 'ゴロー先生',
      title: '交感神経 vs 副交感神経 受容体と効果器のまとめ',
      url: 'https://www.youtube.com/watch?v=sample7',
      duration: '16:05',
      rating: 5,
      summary: 'α受容体・β受容体の作用を血管収縮や気管支拡張のストーリーで覚えられます。薬理学にもつながる重要回。',
      tags: ['自律神経', '交感神経', '受容体', '生理学']
    },
    {
      id: 'c8',
      category: 'physiology',
      unit: '呼吸・循環生理 (解離曲線)',
      teacher: '西島ゼミ',
      title: '呼吸商とヘモグロビン酸素解離曲線のシフト要因',
      url: 'https://www.youtube.com/watch?v=sample8',
      duration: '08:45',
      rating: 4,
      summary: 'pH低下、温度上昇、2,3-DPG増加で右方シフトする理屈が国試頻出。丸暗記ではなく論理で解けるようになります。',
      tags: ['呼吸生理', '酸素解離曲線', 'ボーア効果', '西島ゼミ']
    },
    {
      id: 'c9',
      category: 'kinesiology',
      unit: '正常歩行分析 (立脚/遊脚)',
      teacher: 'カラダ研究所',
      title: '歩行周期（立脚相・遊脚相）の筋活動と床反力ベクトル',
      url: 'https://www.youtube.com/watch?v=sample9',
      duration: '21:15',
      rating: 5,
      summary: '初期接地（IC）から荷重応答（LR）で前脛骨筋と大殿筋がどう遠心性収縮するか、CGアニメで完全に掴めます。',
      tags: ['歩行分析', '床反力', '筋活動', '運動学']
    },
    {
      id: 'c10',
      category: 'kinesiology',
      unit: '関節バイオメカニクス (ロール＆スライド)',
      teacher: 'かずひろ先生',
      title: '凹凸の法則（凸の法則・凹の法則）と関節モビライゼーション',
      url: 'https://www.youtube.com/watch?v=sample10',
      duration: '13:50',
      rating: 5,
      summary: '関節面が凸か凹かで滑りと転がりの方向が逆になるルール。評価実習・徒手療法の基礎バイブル動画。',
      tags: ['凹凸の法則', 'モビライゼーション', '関節運動学']
    },
    {
      id: 'c11',
      category: 'kinesiology',
      unit: 'テコ・重心・モーメント (力学)',
      teacher: '西島ゼミ',
      title: '第1のテコ・第2のテコ・第3のテコ 生体内の具体例と見分け方',
      url: 'https://www.youtube.com/watch?v=sample11',
      duration: '10:20',
      rating: 4,
      summary: '支点・力点・作用点の位置関係と人体筋骨格のテコ。国試の力学計算問題もこれで即答できるようになります。',
      tags: ['テコ', 'バイオメカニクス', 'モーメント', '国試頻出']
    }
  ],
  quizzes: [
    {
      id: 'q1',
      unit: '生理学 - 活動電位と膜透過性',
      difficulty: 'standard',
      question: '神経細胞の活動電位発生機序において、脱分極相に最も大きく関与するイオンと透過性の変化はどれか。',
      choices: [
        'K+の膜透過性増大による細胞内流入',
        'Na+の電位依存性チャネル開口による細胞内流入',
        'Ca2+の能動輸送による細胞外排出',
        'Cl-の漏洩チャネルからの受動的流出'
      ],
      correct: 2,
      explanation: '脱分極相では、電位依存性Na+チャネルが急速に開口し、電気化学的勾配に従ってNa+が細胞内へ急速に流入します。これによって膜電位が正の方向（オーバーシュート）へ急激に変化します。再分極相では遅延整流性K+チャネルが開き、K+が細胞外へ流出します。',
      videoUrl: 'https://www.youtube.com/watch?v=sample5'
    },
    {
      id: 'q2',
      unit: '運動学 - 歩行周期と筋活動',
      difficulty: 'intermediate',
      question: '正常歩行の初期接地（Initial Contact: IC）から荷重応答期（Loading Response: LR）にかけて、遠心性収縮（エキセントリック収縮）を行う筋はどれか。',
      choices: [
        '大腿筋膜張筋',
        '前脛骨筋',
        '腓腹筋',
        '腸腰筋'
      ],
      correct: 2,
      explanation: '踵接地（IC）直後、足底が急激に床に叩きつけられる（フットスラップ）のを防ぎ、衝撃を緩衝するために前脛骨筋が遠心性収縮（引き伸ばされながら張力を発揮）します。また、大殿筋や大腿四頭筋もこの時期に遠心性に働いて膝折れや体幹の前傾を制動します。',
      videoUrl: 'https://www.youtube.com/watch?v=sample9'
    }
  ],
  requests: [
    {
      id: 'r1',
      date: '2026-10-22',
      status: 'pending',
      topic: '腕神経叢の絞扼部位と走行の覚え方',
      preferredTeacher: 'ゴロー先生または西島ゼミ',
      note: '斜角筋隙・肋鎖間隙・小胸筋下間隙の鑑別テストと絡めて知りたい'
    },
    {
      id: 'r2',
      date: '2026-10-21',
      status: 'done',
      topic: '心電図の波形（P波・QRS・T波）と心筋興奮の対応',
      preferredTeacher: '西島ゼミ',
      note: '国家試験過去問頻出の波形読み取りを希望（キュレーション反映済）'
    },
    {
      id: 'r3',
      date: '2026-10-20',
      status: 'done',
      topic: '歩行周期の各相における床反力ベクトルの向き',
      preferredTeacher: 'カラダ研究所',
      note: '運動学の定期試験対策（キュレーション反映済）'
    }
  ]
};

// State Manager
class DashboardState {
  constructor() {
    this.data = this.loadState();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load local storage, using initial data:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }

  exportJson() {
    return JSON.stringify(this.data, null, 2);
  }

  importJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.curations) {
        this.data = parsed;
        this.saveState();
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON import:', e);
    }
    return false;
  }
}

const state = new DashboardState();

// DOM Elements & App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initRoadmapAndTasks();
  initCurationManager();
  initQuizStudio();
  initMultiChannelGenerator();
  initAIStudio();
  initCommunityQueue();
  initInfrastructure();
});

/* -------------------------------------------------------------
   Theme Management
   ------------------------------------------------------------- */
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (state.data.theme === 'warm') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-warm');
  } else {
    document.body.classList.add('theme-dark');
    document.body.classList.remove('theme-warm');
  }

  toggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('theme-warm')) {
      document.body.classList.remove('theme-warm');
      document.body.classList.add('theme-dark');
      state.data.theme = 'dark';
    } else {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-warm');
      state.data.theme = 'warm';
    }
    state.saveState();
  });
}

/* -------------------------------------------------------------
   Sidebar Navigation
   ------------------------------------------------------------- */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const panes = document.querySelectorAll('.tab-pane');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;
      navItems.forEach(n => n.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const targetPane = document.getElementById(`tab-${targetTab}`);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      // If switching to Multichannel or Infrastructure or AI Studio, update previews
      if (targetTab === 'multichannel') {
        populateMultiChannelSource();
      } else if (targetTab === 'infrastructure') {
        renderAppJsCodeOutput();
      } else if (targetTab === 'ai-studio') {
        populateAIUnitSelector();
      }
    });
  });
}

/* -------------------------------------------------------------
   TAB 1: Roadmap & Weekly Routine
   ------------------------------------------------------------- */
function initRoadmapAndTasks() {
  renderTasks();

  const addBtn = document.getElementById('addWeeklyTaskBtn');
  addBtn.addEventListener('click', () => {
    const text = prompt('新しい週間タスクを入力してください:');
    if (text && text.trim()) {
      state.data.tasks.push({
        id: Date.now(),
        text: text.trim(),
        tag: '手動追加',
        completed: false
      });
      state.saveState();
      renderTasks();
    }
  });
}

function renderTasks() {
  const listEl = document.getElementById('weeklyTaskList');
  listEl.innerHTML = '';

  let completedCount = 0;
  state.data.tasks.forEach(task => {
    if (task.completed) completedCount++;

    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
      <span class="task-label">${escapeHtml(task.text)}</span>
      <span class="task-tag">${escapeHtml(task.tag)}</span>
      <button class="task-delete-btn" data-id="${task.id}" title="削除">&times;</button>
    `;
    listEl.appendChild(li);
  });

  // Calculate rate
  const total = state.data.tasks.length;
  const rate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  document.getElementById('weeklyProgressRate').textContent = `${rate}%`;

  // Attach event handlers
  listEl.querySelectorAll('.task-checkbox').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const targetTask = state.data.tasks.find(t => t.id === id);
      if (targetTask) {
        targetTask.completed = e.target.checked;
        state.saveState();
        renderTasks();
      }
    });
  });

  listEl.querySelectorAll('.task-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      state.data.tasks = state.data.tasks.filter(t => t.id !== id);
      state.saveState();
      renderTasks();
    });
  });
}

/* -------------------------------------------------------------
   TAB 2: Curation Management
   ------------------------------------------------------------- */
function initCurationManager() {
  renderCurations();

  // Filters
  document.getElementById('curationFieldFilter').addEventListener('change', renderCurations);
  document.getElementById('curationTeacherFilter').addEventListener('change', renderCurations);
  document.getElementById('curationSearchInput').addEventListener('input', renderCurations);

  // Modal handlers
  const modal = document.getElementById('curationModal');
  const openModalBtn = document.getElementById('openNewCurationModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const form = document.getElementById('curationForm');

  openModalBtn.addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = '新規神動画キュレーション登録';
    document.getElementById('editItemIndex').value = '-1';
    form.reset();
    modal.classList.add('open');
  });

  const closeModal = () => modal.classList.remove('open');
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const editIdx = parseInt(document.getElementById('editItemIndex').value, 10);
    const tagsArr = document.getElementById('modalTags').value
      .split(',')
      .map(t => t.trim())
      .filter(t => t);

    const newItem = {
      id: editIdx >= 0 ? state.data.curations[editIdx].id : 'c_' + Date.now(),
      category: document.getElementById('modalCategory').value,
      rating: parseInt(document.getElementById('modalRating').value, 10),
      unit: document.getElementById('modalUnit').value.trim(),
      teacher: document.getElementById('modalTeacher').value.trim(),
      duration: document.getElementById('modalDuration').value.trim() || '約15分',
      title: document.getElementById('modalTitleInput').value.trim(),
      url: document.getElementById('modalUrl').value.trim(),
      summary: document.getElementById('modalSummary').value.trim(),
      tags: tagsArr.length > 0 ? tagsArr : ['神動画', '重要']
    };

    if (editIdx >= 0) {
      state.data.curations[editIdx] = newItem;
    } else {
      state.data.curations.unshift(newItem);
    }

    state.data.kpi.videoCount = state.data.curations.length;
    state.saveState();
    closeModal();
    renderCurations();
  });

  document.getElementById('exportToPortalDataBtn').addEventListener('click', () => {
    // Switch to infrastructure tab
    document.querySelector('[data-tab="infrastructure"]').click();
  });
}

function renderCurations() {
  const container = document.getElementById('curationContainer');
  const fieldFilter = document.getElementById('curationFieldFilter').value;
  const teacherFilter = document.getElementById('curationTeacherFilter').value;
  const search = document.getElementById('curationSearchInput').value.toLowerCase().trim();

  container.innerHTML = '';

  const filtered = state.data.curations.filter(item => {
    if (fieldFilter !== 'all' && item.category !== fieldFilter) return false;
    if (teacherFilter !== 'all' && !item.teacher.includes(teacherFilter)) return false;
    if (search) {
      const matchUnit = item.unit.toLowerCase().includes(search);
      const matchTitle = item.title.toLowerCase().includes(search);
      const matchSum = item.summary.toLowerCase().includes(search);
      const matchTeacher = item.teacher.toLowerCase().includes(search);
      const matchTags = item.tags.some(t => t.toLowerCase().includes(search));
      if (!matchUnit && !matchTitle && !matchSum && !matchTeacher && !matchTags) return false;
    }
    return true;
  });

  filtered.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'curation-item-card';

    const stars = '★'.repeat(item.rating || 5) + '☆'.repeat(5 - (item.rating || 5));
    const catClass = `cat-${item.category}`;
    const catLabel = item.category === 'anatomy' ? '解剖学' : item.category === 'physiology' ? '生理学' : '運動学';

    card.innerHTML = `
      <div class="curation-top">
        <span class="curation-cat-badge ${catClass}">${catLabel}</span>
        <span class="curation-stars" title="重要度: ${item.rating}つ星">${stars}</span>
      </div>
      <h3 class="curation-unit">${escapeHtml(item.unit)}</h3>
      <p class="curation-video-title">${escapeHtml(item.title)}</p>
      <div class="curation-teacher-row">
        <span>👨‍🏫 ${escapeHtml(item.teacher)}</span>
        <span>⏱️ ${escapeHtml(item.duration)}</span>
      </div>
      <div class="curation-summary-box">
        ${escapeHtml(item.summary)}
      </div>
      <div class="curation-tags-row">
        ${item.tags.map(t => `<span class="curation-tag">#${escapeHtml(t)}</span>`).join('')}
      </div>
      <div class="curation-actions">
        <a href="${escapeHtml(item.url)}" target="_blank" class="btn btn-subtle btn-xs">動画を開く ↗</a>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-xs edit-curation-btn" data-id="${item.id}">編集</button>
          <button class="btn btn-subtle btn-xs delete-curation-btn" data-id="${item.id}" style="color:var(--accent-crimson)">&times;</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach card edit/delete
  container.querySelectorAll('.edit-curation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const index = state.data.curations.findIndex(c => c.id === id);
      if (index >= 0) {
        openEditCurationModal(index);
      }
    });
  });

  container.querySelectorAll('.delete-curation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (confirm('このキュレーション動画を削除しますか？')) {
        state.data.curations = state.data.curations.filter(c => c.id !== id);
        state.data.kpi.videoCount = state.data.curations.length;
        state.saveState();
        renderCurations();
      }
    });
  });
}

function openEditCurationModal(idx) {
  const item = state.data.curations[idx];
  const modal = document.getElementById('curationModal');
  document.getElementById('modalTitle').textContent = '神動画キュレーション編集';
  document.getElementById('editItemIndex').value = idx;

  document.getElementById('modalCategory').value = item.category;
  document.getElementById('modalRating').value = item.rating || 5;
  document.getElementById('modalUnit').value = item.unit;
  document.getElementById('modalTeacher').value = item.teacher;
  document.getElementById('modalDuration').value = item.duration;
  document.getElementById('modalTitleInput').value = item.title;
  document.getElementById('modalUrl').value = item.url;
  document.getElementById('modalSummary').value = item.summary;
  document.getElementById('modalTags').value = (item.tags || []).join(', ');

  modal.classList.add('open');
}

/* -------------------------------------------------------------
   TAB 3: Quiz Studio
   ------------------------------------------------------------- */
function initQuizStudio() {
  renderQuizList();

  const saveBtn = document.getElementById('saveQuizBtn');
  const clearBtn = document.getElementById('clearQuizFormBtn');

  saveBtn.addEventListener('click', () => {
    const unit = document.getElementById('quizUnitInput').value.trim();
    const diff = document.getElementById('quizDifficultySelect').value;
    const q = document.getElementById('quizQuestionInput').value.trim();
    const c1 = document.getElementById('choice1').value.trim();
    const c2 = document.getElementById('choice2').value.trim();
    const c3 = document.getElementById('choice3').value.trim();
    const c4 = document.getElementById('choice4').value.trim();
    const exp = document.getElementById('quizExplanationInput').value.trim();
    const vid = document.getElementById('quizVideoUrlInput').value.trim();

    const selectedRadio = document.querySelector('input[name="correctChoice"]:checked');
    const correctVal = selectedRadio ? parseInt(selectedRadio.value, 10) : 1;

    if (!unit || !q || !c1 || !c2 || !c3 || !c4) {
      alert('単元名、問題文、4つの選択肢すべてを入力してください。');
      return;
    }

    const newQuiz = {
      id: 'q_' + Date.now(),
      unit,
      difficulty: diff,
      question: q,
      choices: [c1, c2, c3, c4],
      correct: correctVal,
      explanation: exp || '正解の根拠と国家試験出題ポイントを確認しましょう。',
      videoUrl: vid || ''
    };

    state.data.quizzes.unshift(newQuiz);
    state.saveState();
    renderQuizList();
    clearQuizForm();
  });

  clearBtn.addEventListener('click', clearQuizForm);
}

function clearQuizForm() {
  document.getElementById('quizUnitInput').value = '';
  document.getElementById('quizQuestionInput').value = '';
  document.getElementById('choice1').value = '';
  document.getElementById('choice2').value = '';
  document.getElementById('choice3').value = '';
  document.getElementById('choice4').value = '';
  document.getElementById('quizExplanationInput').value = '';
  document.getElementById('quizVideoUrlInput').value = '';
}

function renderQuizList() {
  const container = document.getElementById('quizListContainer');
  const countBadge = document.getElementById('quizCountBadge');
  countBadge.textContent = `${state.data.quizzes.length}問`;
  container.innerHTML = '';

  state.data.quizzes.forEach((item, idx) => {
    const box = document.createElement('div');
    box.className = 'quiz-card-item';
    const diffLabel = item.difficulty === 'standard' ? '国試基礎' : item.difficulty === 'intermediate' ? '標準' : '臨床応用';

    box.innerHTML = `
      <div class="quiz-card-header">
        <span class="badge" style="background:var(--accent-gold-soft);color:var(--accent-gold)">${escapeHtml(item.unit)} (${diffLabel})</span>
        <button class="delete-quiz-btn" data-id="${item.id}" style="background:none;border:none;color:var(--accent-crimson);cursor:pointer;">&times;</button>
      </div>
      <div class="quiz-card-q">問. ${escapeHtml(item.question)}</div>
      <div class="quiz-preview-choices">
        ${item.choices.map((c, i) => `
          <div class="${(i + 1) === item.correct ? 'correct' : ''}">
            ${i + 1}. ${escapeHtml(c)} ${(i + 1) === item.correct ? ' ✓ (正解)' : ''}
          </div>
        `).join('')}
      </div>
      <div class="quiz-card-exp">
        💡 <strong>解説:</strong> ${escapeHtml(item.explanation)}
      </div>
    `;

    container.appendChild(box);
  });

  container.querySelectorAll('.delete-quiz-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (confirm('このクイズを削除しますか？')) {
        state.data.quizzes = state.data.quizzes.filter(q => q.id !== id);
        state.saveState();
        renderQuizList();
      }
    });
  });
}

/* -------------------------------------------------------------
   TAB 4: Multi-Channel Generator
   ------------------------------------------------------------- */
function initMultiChannelGenerator() {
  populateMultiChannelSource();

  // Subtabs switching
  const subtabs = document.querySelectorAll('.channel-subtab');
  const panes = document.querySelectorAll('.channel-pane');

  subtabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subtabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const target = tab.dataset.channel;
      document.getElementById(`output-${target}`).classList.add('active');
    });
  });

  // Generate All button
  document.getElementById('generateAllChannelsBtn').addEventListener('click', () => {
    const select = document.getElementById('genSourceSelect');
    const selectedId = select.value;
    const item = state.data.curations.find(c => c.id === selectedId) || state.data.curations[0];
    if (item) {
      generateMultiChannelDrafts(item);
    }
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.target.dataset.target;
      const text = document.getElementById(targetId).value;
      navigator.clipboard.writeText(text).then(() => {
        const origText = e.target.textContent;
        e.target.textContent = 'コピー完了！ ✓';
        e.target.classList.add('btn-primary');
        setTimeout(() => {
          e.target.textContent = origText;
          e.target.classList.remove('btn-primary');
        }, 2000);
      });
    });
  });
}

function populateMultiChannelSource() {
  const select = document.getElementById('genSourceSelect');
  select.innerHTML = '';
  state.data.curations.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `[${c.category.toUpperCase()}] ${c.unit} (${c.teacher})`;
    select.appendChild(opt);
  });

  if (state.data.curations.length > 0) {
    generateMultiChannelDrafts(state.data.curations[0]);
  }
}

function generateMultiChannelDrafts(item) {
  // 1. Web Markdown
  const webContent = `# 【理学療法士・夜間部学習帖】${item.unit}の要点まとめと神動画講義

> **筆者メモ（現役夜間部PT学生）**:
> 働きながら夜間の専門学校に通う身として、分厚い教科書のノートまとめは真っ先に挫折しました。
> この単元は、以下のYouTube神動画講義と要点整理をセットで回すのが最も速く、定期試験・国家試験でも高得点をキープできています。

---

## 1. 必見の神講義動画
- **講義名**: ${item.title}
- **講師・チャンネル**: ${item.teacher}
- **動画リンク**: [YouTubeで講義を視聴する](${item.url})
- **目安時間**: ${item.duration}

### 💡 夜間部生の推薦理由
${item.summary}

---

## 2. 試験直前に叩き込むべき重要ポイント
${(item.tags || []).map(t => `- **${t}**: 国家試験頻出キーワード。必ず作用機序と結びつけて覚えること。`).join('\n')}

---

## 3. スマホで即検索できるLINE Botを活用しよう
移動中の電車内やベッドの中では、LINE検索Bot（@pt_search_bot）に「${item.unit.split(' ')[0]}」と送信するだけで、3,851本の中から最適な解説動画が即座に返ってきます。ノートを広げられない環境を味方にしましょう。
`;

  // 2. note Essay Style
  const noteContent = `タイトル: 【夜間部PT学生の泥臭い勉強記録】「${item.unit}」で詰みかけた僕が、教科書を閉じて神動画に切り替えた話

こんにちは、昼は働き夜はPT（理学療法士）養成校に通う夜間部学生です。

授業後の睡魔と戦いながら、ぶ厚い解剖生理の教科書をひたすらノートに書き写して「勉強した気」になっていませんか？
僕も入学当初はそうでした。しかし中間試験で大爆死。

そこで完全に勉強法を切り替えました。
「ノートまとめは一切やめて、YouTubeの神解説動画を倍速で3回見て、要点だけをスマホメモに残す」スタイルです。

■ 今回救われた神動画
チャンネル: ${item.teacher}
動画: ${item.title}

${item.summary}

■ 覚えるべきはたったこれだけ
${(item.tags || []).map(t => `・${t}`).join('\n')}

夜間部生にとって最大の敵は「時間のなさ」と「疲労」です。
きれいなノートを作る時間があるなら、動画を見てメカニズムを頭の中でアニメーション化しましょう。

LINEで単元名を送るだけで動画をサクッと教えてくれる無料Botも作ったので、同じように苦しんでいるPT学生仲間はぜひ使ってみてください！
`;

  // 3. SNS Carousel & X Thread
  const snsContent = `【Instagram / TikTok カルーセルスライド 5枚構成台本】
単元: ${item.unit}

[スライド 1: 表紙・超強烈フック]
「教科書10ページ読むよりこの動画1本。
現役夜間部PT学生が本気で救われた『${item.unit}』の神動画まとめ」
（※背景: 暗めの洗練された解剖図＋ゴールドの強調フォント）

[スライド 2: なぜみんなここで挫折するのか？]
「分厚い教科書の文章をノートに写しても、立体の動きやイオンの動きは想像できません。
試験に出るのは『名前』ではなく『メカニズムの前後関係』です。」

[スライド 3: 救世主の神チャンネル]
「『${item.teacher}』のこの動画を見ろ！
タイトル: ${item.title}
神ポイント: ${item.summary}」

[スライド 4: 最低限これだけ覚える暗記チェック]
${(item.tags || []).slice(0, 3).map((t, i) => `① ${t}`).join('\n')}
（※保存して通学電車で毎日見返す用）

[スライド 5: 保存＆CTA（行動喚起）]
「夜間部PT学生が作った学習ポータル＆LINE検索Botで、
3,851本のYouTube講義から最短で神動画を探せます。
プロフリンクまたはLINE『@pt_search_bot』で今すぐ検索！」

---------------------------------------------------
【X (Twitter) スレッド投稿用テキスト】
夜間部PT学生が中間・国試対策で本当に助けられた神動画紹介。

単元: ${item.unit}
推奨講義: ${item.teacher}「${item.title}」

ノートまとめを今すぐやめてこれ見てください。
${item.summary}

#理学療法士 #PT学生 #解剖生理学 #勉強法 #国家試験
`;

  document.getElementById('webText').value = webContent;
  document.getElementById('noteText').value = noteContent;
  document.getElementById('snsText').value = snsContent;
}

/* -------------------------------------------------------------
   TAB 6: AI Studio & Automation Pipeline
   ------------------------------------------------------------- */
function initAIStudio() {
  populateAIUnitSelector();

  // Copy prompt buttons
  document.querySelectorAll('.copy-prompt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.prompt-card');
      const code = card.querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const orig = e.target.textContent;
        e.target.textContent = 'プロンプトをコピー完了！ ✓';
        e.target.classList.add('btn-primary');
        setTimeout(() => {
          e.target.textContent = orig;
          e.target.classList.remove('btn-primary');
        }, 2000);
      });
    });
  });

  // Antigravity Queue Dispatch buttons
  document.querySelectorAll('.ai-generate-save-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.prompt-card');
      const taskType = btn.dataset.taskType;
      const unitSelect = document.getElementById('aiGlobalUnitSelect');
      const unit = unitSelect ? unitSelect.value : '解剖生理学 重要単元';
      const customInput = card.querySelector('.ai-custom-instruction');
      const customPrompt = customInput ? customInput.value.trim() : '';

      const badge = card.querySelector('.ai-exec-badge');
      const previewArea = card.querySelector('.ai-result-preview');
      const pathLabel = card.querySelector('.saved-path-label');
      const textarea = card.querySelector('.preview-textarea');

      // Set Loading State
      const originalBtnText = btn.innerHTML;
      btn.innerHTML = '⏳ Antigravity に投入中...';
      btn.disabled = true;

      badge.className = 'ai-exec-badge badge-running';
      badge.textContent = 'キュー投入中...';

      try {
        const res = await fetch('/api/ai/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskType, unit, customPrompt })
        });

        const data = await res.json();

        if (res.ok && data.status === 'success') {
          // Success State
          badge.className = 'ai-exec-badge badge-success';
          badge.textContent = `✅ キュー登録完了 (${data.taskId})`;

          // Show Preview with details
          previewArea.style.display = 'block';
          pathLabel.textContent = `🛰️ 投入先: Google Antigravity (タスクID: ${data.taskId})`;
          textarea.value = `【Google Antigravity 投入タスク】\nID: ${data.taskId}\n単元: ${unit}\n種別: ${taskType}\n追加指示: ${customPrompt || 'なし'}\n状態: 待機中（Antigravity エージェントが自律着手します）`;

          // Also copy high-precision prompt to clipboard as instant execution option
          const promptTemplate = card.querySelector('code').textContent.replace('{{unit_name}}', unit).replace('{{topic}}', unit);
          const fullClipboardPrompt = `[Antigravity タスク]\n${promptTemplate}\n追加指示: ${customPrompt || '夜間部PT学生向けに最高のクオリティで執筆してください。'}`;
          navigator.clipboard.writeText(fullClipboardPrompt).catch(() => {});

          // Refresh queue list
          fetchAgyQueue();

          const statusEl = document.getElementById('aiGlobalStatus');
          if (statusEl) {
            statusEl.textContent = `🛰️ タスク [${data.taskId}] 投入完了。Antigravity で自律処理されます。`;
          }
        } else {
          throw new Error(data.message || 'キュー登録に失敗しました');
        }
      } catch (err) {
        badge.className = 'ai-exec-badge badge-error';
        badge.textContent = `❌ エラー: ${err.message}`;
        alert(`キュー投入エラー: ${err.message}`);
      } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
      }
    });
  });

  // Close preview buttons
  document.querySelectorAll('.close-preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const preview = e.target.closest('.ai-result-preview');
      if (preview) preview.style.display = 'none';
    });
  });

  // Initial Queue Load and Refresh
  const refreshBtn = document.getElementById('refreshAgyQueueBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', fetchAgyQueue);
  }
  fetchAgyQueue();
}

async function fetchAgyQueue() {
  const container = document.getElementById('agyQueueList');
  const countBadge = document.getElementById('agyQueueCountBadge');
  if (!container) return;

  try {
    const res = await fetch('/api/ai/queue');
    if (!res.ok) return;
    const data = await res.json();
    const tasks = data.tasks || [];

    if (countBadge) countBadge.textContent = `${tasks.length}件`;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div style="font-size:12px; color:var(--text-muted); padding:10px; text-align:center;">
          待機中のタスクはありません。「Antigravity に指示を投入」を押すとここに予約されます。
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.slice(0, 5).map(t => {
      const isDone = t.status === 'completed';
      const statusBadge = isDone
        ? `<span class="badge" style="background:var(--accent-emerald-soft);color:var(--accent-emerald);font-size:10px;">完了</span>`
        : `<span class="badge" style="background:var(--accent-gold-soft);color:var(--accent-gold);font-size:10px;">待機中 (Antigravity)</span>`;

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg-card-hover); border-radius:8px; border:1px solid var(--border-color); font-size:12px;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div style="display:flex; align-items:center; gap:6px;">
              ${statusBadge}
              <strong style="color:var(--text-primary);">${escapeHtml(t.unit)}</strong>
              <span style="color:var(--text-muted); font-size:11px;">(${t.taskType})</span>
            </div>
            <div style="color:var(--text-muted); font-size:10px;">
              ${new Date(t.createdAt).toLocaleString()} | ID: ${t.id}
            </div>
          </div>
          <div style="font-size:11px; color:var(--accent-gold);">
            ${isDone ? '✅ 保存済' : '⚡ 待機中'}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.warn('Failed to fetch Antigravity queue:', err);
  }

  // Close preview buttons
  document.querySelectorAll('.close-preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const preview = e.target.closest('.ai-result-preview');
      if (preview) preview.style.display = 'none';
    });
  });
}

function populateAIUnitSelector() {
  const select = document.getElementById('aiGlobalUnitSelect');
  if (!select) return;
  select.innerHTML = '';

  state.data.curations.forEach(c => {
    const opt = document.createElement('option');
    opt.value = `${c.category.toUpperCase()}: ${c.unit}`;
    opt.textContent = `[${c.category.toUpperCase()}] ${c.unit} (${c.teacher})`;
    select.appendChild(opt);
  });
}

/* -------------------------------------------------------------
   TAB 7: Community & Request Queue
   ------------------------------------------------------------- */
function initCommunityQueue() {
  renderQueue();

  document.getElementById('addRequestBtn').addEventListener('click', () => {
    const topic = prompt('リクエストされた単元・相談内容を入力してください:');
    if (!topic) return;
    const teacher = prompt('希望チャンネル（例: ゴロー先生）:') || '指定なし';

    state.data.requests.unshift({
      id: 'r_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      status: 'pending',
      topic,
      preferredTeacher: teacher,
      note: '手動受付'
    });
    state.saveState();
    renderQueue();
  });
}

function renderQueue() {
  const tbody = document.getElementById('requestQueueBody');
  tbody.innerHTML = '';

  state.data.requests.forEach(req => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(req.date)}</td>
      <td>
        <span class="status-badge ${req.status === 'done' ? 'status-done' : 'status-pending'}">
          ${req.status === 'done' ? '反映完了' : '対応待ち'}
        </span>
      </td>
      <td>
        <strong>${escapeHtml(req.topic)}</strong>
        <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(req.note || '')}</div>
      </td>
      <td>${escapeHtml(req.preferredTeacher)}</td>
      <td>
        <button class="btn btn-subtle btn-xs toggle-req-btn" data-id="${req.id}">
          ${req.status === 'done' ? '保留に戻す' : '完了にする'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.toggle-req-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const target = state.data.requests.find(r => r.id === id);
      if (target) {
        target.status = target.status === 'done' ? 'pending' : 'done';
        state.saveState();
        renderQueue();
      }
    });
  });
}

/* -------------------------------------------------------------
   TAB 8: Infrastructure & Data Sync
   ------------------------------------------------------------- */
function initInfrastructure() {
  renderAppJsCodeOutput();

  document.getElementById('copyJsCodeBtn').addEventListener('click', (e) => {
    const code = document.getElementById('exportJsCodeBlock').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const orig = e.target.textContent;
      e.target.textContent = 'コピー完了！ projects/pt_student_portal/app.js に貼り付け可能 ✓';
      setTimeout(() => e.target.textContent = orig, 3000);
    });
  });

  document.getElementById('downloadJsonBtn').addEventListener('click', downloadStateJson);

  // Top header export/import
  document.getElementById('exportAllBtn').addEventListener('click', downloadStateJson);

  const fileInput = document.getElementById('importFileInput');
  document.getElementById('importDataBtn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const ok = state.importJson(event.target.result);
      if (ok) {
        alert('データを正常に復元・更新しました！');
        location.reload();
      } else {
        alert('データの復元に失敗しました。正しいJSONファイルかご確認ください。');
      }
    };
    reader.readAsText(file);
  });
}

function renderAppJsCodeOutput() {
  const codeBlock = document.getElementById('exportJsCodeBlock');
  if (!codeBlock) return;

  // Group curations by category
  const grouped = {
    anatomy: [],
    physiology: [],
    kinesiology: []
  };

  state.data.curations.forEach(c => {
    const cat = c.category in grouped ? c.category : 'anatomy';
    grouped[cat].push({
      id: c.id,
      unit: c.unit,
      title: c.title,
      channel: c.teacher,
      thumbnail: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=600&q=80',
      url: c.url,
      memo: c.summary,
      duration: c.duration,
      tag: (c.tags && c.tags[0]) || '重要'
    });
  });

  const codeString = `// projects/pt_student_portal/app.js 向け同期データ
const SYNCHRONIZED_CURATION_VIDEOS = ${JSON.stringify(grouped, null, 2)};
`;

  codeBlock.textContent = codeString;
}

function downloadStateJson() {
  const jsonStr = state.exportJson();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pt-student-portal-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
