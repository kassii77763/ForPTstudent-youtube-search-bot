const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3800;
const PUBLIC_DIR = __dirname;
const ENV_PATH = path.join(PUBLIC_DIR, '.env');

// Prevent unexpected network errors from crashing the server
process.on('uncaughtException', (err) => {
  console.warn('[Server Guard] Caught background exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[Server Guard] Caught background rejection:', reason);
});

// Helper to load .env without external dependencies
function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

// Helper to call a single Gemini model
function callGeminiSingleModel(apiKey, modelName, promptText) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    const safeResolve = (v) => { if (!isSettled) { isSettled = true; resolve(v); } };
    const safeReject = (e) => { if (!isSettled) { isSettled = true; reject(e); } };

    const postData = JSON.stringify({
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            return safeReject({
              statusCode: res.statusCode || 400,
              message: parsed.error.message || `Error on model ${modelName}`
            });
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            safeResolve({ text, modelUsed: modelName });
          } else {
            safeReject({ statusCode: 500, message: 'Empty response content from model' });
          }
        } catch (e) {
          safeReject({ statusCode: 500, message: e.message });
        }
      });
      res.on('error', (e) => safeReject({ statusCode: 500, message: e.message }));
    });

    req.setTimeout(15000, () => {
      try { req.destroy(); } catch (_) {}
      safeReject({ statusCode: 504, message: `Timeout after 15s on ${modelName}` });
    });

    req.on('error', (err) => {
      safeReject({ statusCode: 504, message: err.message });
    });

    req.write(postData);
    req.end();
  });
}

// Dynamically discover all active models from Google AI Studio
function fetchAvailableModels(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models?key=${apiKey}`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed && Array.isArray(parsed.models)) {
            // Filter models that support generateContent
            const models = parsed.models
              .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => m.name.replace(/^models\//, ''));
            return resolve(models);
          }
        } catch (_) {}
        resolve([]);
      });
    });

    req.setTimeout(5000, () => req.destroy());
    req.on('error', () => resolve([]));
    req.end();
  });
}

// Multi-Model Cascading Fallback Engine (Gemini 3.8 Flash -> 2.5 -> 2.0 -> 1.5 -> Dynamic -> Local)
async function requestGeminiWithFallbackCascade(apiKey, userPreferredModel, promptText) {
  const cascadeLog = [];

  // 1. Build initial candidate chain
  const candidateChain = [];
  if (userPreferredModel && userPreferredModel.trim()) {
    candidateChain.push(userPreferredModel.trim());
  }
  const defaultChain = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-2.5-pro'
  ];
  for (const m of defaultChain) {
    if (!candidateChain.includes(m)) {
      candidateChain.push(m);
    }
  }

  // 2. Sequential fallback execution across static candidates
  for (const model of candidateChain) {
    try {
      const res = await callGeminiSingleModel(apiKey, model, promptText);
      cascadeLog.push({ model, status: 'success' });
      return {
        text: res.text,
        modelUsed: res.modelUsed,
        cascadeLog
      };
    } catch (err) {
      console.warn(`[AI Fallback] Model '${model}' failed (Status: ${err.statusCode}, Message: ${err.message}). Trying next fallback...`);
      cascadeLog.push({ model, status: 'failed', code: err.statusCode, error: err.message });
      if (err.statusCode === 429) {
        console.warn(`[AI Rate Limit] Quota limit reached on '${model}'. Continuing cascade to fallback models...`);
      }
    }
  }

  // 3. Dynamic Model Discovery Fallback
  try {
    const liveModels = await fetchAvailableModels(apiKey);
    const flashLive = liveModels.filter(m => m.includes('flash') && !candidateChain.includes(m));
    for (const m of flashLive) {
      try {
        const res = await callGeminiSingleModel(apiKey, m, promptText);
        cascadeLog.push({ model: m, status: 'success (dynamic discovery)' });
        return {
          text: res.text,
          modelUsed: m,
          cascadeLog
        };
      } catch (err) {
        cascadeLog.push({ model: m, status: 'failed', error: err.message });
      }
    }
  } catch (_) {}

  // 4. If all online models exhausted, throw error to trigger local safe-mode template
  const allErrors = cascadeLog.map(l => `${l.model}: ${l.error || 'failed'}`).join('; ');
  throw new Error(`All online Gemini models failed: ${allErrors}`);
}

// Generate fallback structured content when API key is not yet set
function generateFallbackContent(taskType, unit, customPrompt) {
  const ts = new Date().toISOString();
  if (taskType === 'note') {
    return `# 【夜間部PT学生の泥臭い勉強記録】${unit} で詰みかけた僕が教科書を閉じて神動画に切り替えた話

> 執筆日時: ${ts}
> 対象単元: ${unit}

こんにちは！昼は働き夜はPT専門学校に通う夜間部学生です。

授業後の疲れた頭で、分厚い教科書の文字をひたすらノートに書き写して「勉強した気」になっていませんか？
僕も入学したばかりの頃は、綺麗に色ペンを使ってノートをまとめていました。しかし、定期試験の結果は散々。

なぜなら、国家試験や臨床で問われるのは「用語の暗記」ではなく、「メカニズムの立体的な連動」だからです。

## 1. ノートまとめを即刻やめるべき理由
- 書くことに9割のエネルギーを使い、脳の理解メモリがゼロになる
- 静止した図では、活動電位のイオンの流出入や関節の滑り・転がりがイメージできない
- 時間のない夜間部生にとって「まとめる作業」は最大の時間浪費

## 2. YouTube神講義動画で一発逆転
この単元で僕を救ってくれたのは、ゴロー先生・かずひろ先生・西島ゼミの動画講義でした。
アニメーションで血液や電気信号の流れを見れば、教科書3時間分の内容がわずか12分で頭に焼き付きます。

## 3. 本気で覚えるべきコアポイント
1. 正常な状態の基準値と機序
2. 異常が生じた場合の代償動作と病態
3. 国家試験で過去10回中何回狙われているかの頻出度

ノートまとめは今日で卒業して、動画とクイズで高速周回しましょう！
`;
  } else if (taskType === 'sns_carousel') {
    return `【Instagram / TikTok カルーセルスライド 5枚構成台本】
単元: ${unit}
作成日時: ${ts}

[スライド 1: 表紙・超強烈フック]
「教科書10ページ読むよりこの動画1本。
現役夜間部PT学生が本気で救われた『${unit}』の神動画まとめ」
（※背景: 暗めの洗練された解剖図＋ゴールドの強調フォント）

[スライド 2: なぜみんなここで挫折するのか？]
「分厚い教科書の文章をノートに写しても、立体の動きやイオンの動きは想像できません。
試験に出るのは『名前』ではなく『メカニズムの前後関係』です。」

[スライド 3: 救世主の神講義]
「YouTubeの神解説動画を倍速で3回見ろ！
手描きイラストとアニメーションで、難解なメカニズムが一撃で脳裏に焼き付きます。」

[スライド 4: 最低限これだけ覚える暗記チェック]
① 正常な基準値と動作の順序
② 異常時に起きる代償と臨床症状
③ 鑑別が必要な類似疾患・組織

[スライド 5: 保存＆CTA（行動喚起）]
「夜間部PT学生が作った学習ポータル＆LINE検索Botで、
3,851本のYouTube講義から最短で神動画を探せます。
プロフリンクまたはLINE『@pt_search_bot』で今すぐ検索！」
`;
  } else if (taskType === 'quiz') {
    const u = (unit || '').toLowerCase();
    let qData = null;

    if (u.includes('歩行') || u.includes('立脚') || u.includes('遊脚') || u.includes('運動学') || u.includes('gait') || u.includes('バイオメカ')) {
      qData = {
        unit: unit,
        difficulty: 'standard',
        question: '歩行周期の初期接地（IC）から荷重応答期（LR）における筋活動および力学的特徴について、正しいものを1つ選べ。',
        choices: [
          '前脛骨筋は求心性収縮により足関節の急速な底屈を制動する',
          '大殿筋は遠心性収縮により股関節の過度な屈曲モーメントを制動する',
          '下腿三頭筋は初期接地（IC）の瞬間に最大放電を示す',
          '床反力ベクトルは膝関節中心の後方を通るため外力として伸展モーメントが働く'
        ],
        correct: 2,
        explanation: '初期接地（IC）から荷重応答期（LR）にかけて、大殿筋やハムストリングスは遠心性収縮により体幹の前方への屈曲（崩れ）を強力に制動します。前脛骨筋は「遠心性収縮（求心性ではない）」により足底の叩きつけを制動します。',
        createdAt: ts
      };
    } else if (u.includes('筋') || u.includes('起始') || u.includes('停止') || u.includes('四頭筋') || u.includes('ハムストリング') || u.includes('muscle')) {
      qData = {
        unit: unit,
        difficulty: 'standard',
        question: '骨格筋の起始・停止および支配神経・作用に関する記述で、正しいものを1つ選べ。',
        choices: [
          '大腿直筋は下前腸骨棘（AIIS）から起始する二関節筋であり、股関節屈曲と膝関節伸展に作用する',
          '外側広筋は大腿神経ではなく坐骨神経の支配を受ける',
          '大腿二頭筋短頭は坐骨結節から起始する二関節筋である',
          '半腱様筋および半膜様筋は膝関節屈曲位において下腿を外旋させる'
        ],
        correct: 1,
        explanation: '大腿直筋は寛骨の下前腸骨棘（AIIS）から起始する二関節筋で、股関節屈曲と膝関節伸展の両方に作用します。外側広筋は大腿神経支配です。大腿二頭筋短頭は大腿骨粗線から起始する単関節筋です。半腱・半膜様筋は下腿を「内旋」させます。',
        createdAt: ts
      };
    } else if (u.includes('神経') || u.includes('脳') || u.includes('反射') || u.includes('伝導路') || u.includes('nerve')) {
      qData = {
        unit: unit,
        difficulty: 'standard',
        question: '中枢・末梢神経系および伝導路・反射に関する記述で、正しいものを1つ選べ。',
        choices: [
          '深部腱反射は多シナプス反射であり、求心路はIb群線維である',
          '外側皮質脊髄路（錐体路）の約80〜90%の線維は延髄の錐体交差で対側へ交叉する',
          '迷走神経は純粋な感覚神経であり、副交感神経線維は含まない',
          '膝蓋腱反射の脊髄反射中枢はS1〜S2レベルである'
        ],
        correct: 2,
        explanation: '外側皮質脊髄路は延髄の錐体で約80〜90%が対側へ交叉して脊髄側索を下行します。深部腱反射は単シナプス反射（Ia群求心性線維）です。迷走神経は運動・感覚・副交感の混合神経です。膝蓋腱反射の反射中枢はL2〜L4（S1〜S2はアキレス腱反射）です。',
        createdAt: ts
      };
    } else if (u.includes('循環') || u.includes('心') || u.includes('呼吸') || u.includes('cardio') || u.includes('血液')) {
      qData = {
        unit: unit,
        difficulty: 'standard',
        question: '呼吸生理および循環動態に関する記述で、正しいものを1つ選べ。',
        choices: [
          '安静吸気時には横隔膜が弛緩し、胸腔内圧は陽圧となる',
          'ヘモグロビン酸素解離曲線は、血液のpH低下（アシドーシス）や体温上昇により右方へシフトする',
          '心筋細胞の活動電位においてプラトー相（第2相）を形成するのは急速なNa+流入である',
          '肺活量とは最大呼気位から吸い込める最大空気量に残気量を加えたものである'
        ],
        correct: 2,
        explanation: '血液のpH低下（アシドーシス）、PaCO2上昇、体温上昇、2,3-DPG増加により、ヘモグロビン酸素解離曲線は右方シフト（ボーア効果）し、末梢組織への酸素受け渡しが促進されます。',
        createdAt: ts
      };
    } else {
      qData = {
        unit: unit,
        difficulty: 'standard',
        question: `${unit}に関する記述で、正しいものを1つ選べ。`,
        choices: [
          '静止時において細胞内は細胞外に比べて高電位（正電位）に維持されている',
          '脱分極相において電位依存性Na+チャネルが開口しNa+が細胞内へ急速に流入する',
          '再分極相ではCl-チャネルの急速な開口により陰電荷が流出する',
          '絶対不応期においてはどのような強い刺激を与えても活動電位は発生し得る'
        ],
        correct: 2,
        explanation: '脱分極相では閾値を超えると電位依存性Na+チャネルが急速に開き、Na+が細胞内へ流入することで膜電位が正へ転じます（オーバーシュート）。再分極相ではK+チャネルが開きK+が流出します。',
        createdAt: ts
      };
    }

    return JSON.stringify(qData, null, 2);
  } else {
    return `# ${unit} の超平易な日常比喩分解

対象メカニズム: ${unit}
作成日時: ${ts}

## 1. たとえ話: 「朝の通勤ラッシュと駅の自動改札」
専門用語で考えると頭が痛くなりますが、これは「駅の改札機」と全く同じです。
- 切符（刺激）が入ると、扉（チャネル）が一瞬だけ勢いよく開く
- 人（ナトリウムイオン）がドッと一気にホーム（細胞内）へ雪崩れ込む
- これが「脱分極（興奮）」の瞬間です。
`;
  }
}

const QUEUE_PATH = path.join(PUBLIC_DIR, 'queue', 'tasks.json');

function readQueue() {
  try {
    if (fs.existsSync(QUEUE_PATH)) {
      return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8') || '[]');
    }
  } catch (_) {}
  return [];
}

function writeQueue(tasks) {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // API Route: GET /api/ai/queue (List queued tasks)
  if (req.method === 'GET' && reqPath === '/api/ai/queue') {
    const queue = readQueue();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'success', count: queue.length, tasks: queue }));
    return;
  }

  // API Route: POST /api/ai/queue (Enqueue new task for Antigravity)
  if (req.method === 'POST' && reqPath === '/api/ai/queue') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const queue = readQueue();
        const taskId = 'task_' + Date.now();
        const newTask = {
          id: taskId,
          taskType: payload.taskType || 'note',
          unit: payload.unit || '解剖生理学 重要単元',
          customPrompt: payload.customPrompt || '',
          targetAudience: '夜間部PT学生',
          createdAt: new Date().toISOString(),
          status: 'pending',
          dispatchedTo: 'Google Antigravity'
        };
        queue.unshift(newTask);
        writeQueue(queue);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'success', taskId, task: newTask, message: 'Antigravity タスクキューに登録されました' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // API Route: POST /api/ai/generate
  if (req.method === 'POST' && reqPath === '/api/ai/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const taskType = payload.taskType || 'note';
        const unit = payload.unit || '解剖生理学 重要単元';
        const customPrompt = payload.customPrompt || '';

        const env = loadEnv();
        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

        let content = '';
        let isSimulated = false;
        let modelUsed = 'none';
        let cascadeLog = [];

        if (apiKey && apiKey.trim() !== '') {
          // Construct targeted prompt for Gemini
          let fullPrompt = '';
          if (taskType === 'note') {
            fullPrompt = `あなたは理学療法士養成校に通う夜間部PT学生です。単元「${unit}」について、昼働き夜学ぶ現役夜間部学生の語り口調でnoteエッセイ記事を執筆してください。教科書の丸写しを禁止し、「なぜノートまとめをやめてYouTube神動画を見るべきなのか」「試験で狙われるポイント」「学習仲間への応援」を盛り込んでください。\n追加指示: ${customPrompt}`;
          } else if (taskType === 'sns_carousel') {
            fullPrompt = `単元「${unit}」の要点を、Instagram/TikTokカルーセルスライド5枚の台本にしてください。1枚目: 衝撃的なフック、2〜4枚目: 結論＋暗記のツボ（文字数各80字以内）、5枚目: LINE Bot検索への誘導。\n追加指示: ${customPrompt}`;
          } else if (taskType === 'quiz') {
            fullPrompt = `単元「${unit}」について、理学療法士国家試験の基準に則った4択クイズを1問作成し、以下のJSONフォーマットのみで出力してください。
{
  "unit": "${unit}",
  "difficulty": "standard",
  "question": "問題文",
  "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "correct": 2,
  "explanation": "解説文"
}\n追加指示: ${customPrompt}`;
          } else {
            fullPrompt = `単元「${unit}」の生化学・生理学的メカニズムを、中学生でも情景が浮かぶ日常のたとえ話（駅の改札、郵便配達、水道の蛇口等）に置き換えて3ステップで説明してください。\n追加指示: ${customPrompt}`;
          }

          try {
            const preferredModel = env.GEMINI_MODEL || 'gemini-3.8-flash';
            const aiRes = await requestGeminiWithFallbackCascade(apiKey, preferredModel, fullPrompt);
            content = aiRes.text;
            modelUsed = aiRes.modelUsed;
            cascadeLog = aiRes.cascadeLog;
          } catch (err) {
            console.warn('[AI Cascade Exhausted] Falling back to local safe-mode template:', err.message);
            content = generateFallbackContent(taskType, unit, customPrompt);
            isSimulated = true;
            modelUsed = 'local-safe-template';
          }
        } else {
          // No API key yet - generate rich template and inform user
          content = generateFallbackContent(taskType, unit, customPrompt);
          isSimulated = true;
          modelUsed = 'local-safe-template';
        }

        // Save generated file to disk
        const safeUnit = unit.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_').slice(0, 30);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let filename = '';
        let targetDir = path.join(PUBLIC_DIR, 'docs');

        if (taskType === 'quiz') {
          targetDir = path.join(PUBLIC_DIR, 'data');
          filename = `quiz_${safeUnit}_${dateStr}.json`;
        } else {
          filename = `${taskType}_${safeUnit}_${dateStr}.md`;
        }

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const fullFilePath = path.join(targetDir, filename);
        fs.writeFileSync(fullFilePath, content, 'utf-8');

        const relPath = path.relative(PUBLIC_DIR, fullFilePath).replace(/\\/g, '/');

        let noticeMsg = '';
        if (isSimulated) {
          noticeMsg = 'projects/pt_student_portal/.env に GEMINI_API_KEY を設定すると、Gemini 3.8 Flash（または後続フォールバックモデル）でライブ生成されます。';
        } else {
          noticeMsg = `稼働モデル: ${modelUsed} (カスケードフォールバック保護下で生成完了)`;
        }

        const responseJson = JSON.stringify({
          status: 'success',
          taskType,
          unit,
          content,
          savedFile: relPath,
          modelUsed,
          isSimulated,
          cascadeLog,
          notice: noticeMsg
        });

        if (!res.headersSent) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(responseJson);
        }
      } catch (err) {
        console.error('[API Error in /api/ai/generate]:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'error', message: err.message }));
        }
      }
    });
    return;
  }

  // Static File Routing
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  } else if (reqPath === '/admin' || reqPath === '/dashboard' || reqPath === '/admin/' || reqPath === '/dashboard/') {
    reqPath = '/admin-backend/dashboard.html';
  } else if (reqPath === '/dashboard.css') {
    reqPath = '/admin-backend/dashboard.css';
  } else if (reqPath === '/dashboard.js') {
    reqPath = '/admin-backend/dashboard.js';
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`PT Student Portal running at http://localhost:${PORT}/`);
  console.log(`Dashboard available at http://localhost:${PORT}/admin`);
  console.log(`AI Endpoint ready at http://localhost:${PORT}/api/ai/generate`);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]:', reason);
});
