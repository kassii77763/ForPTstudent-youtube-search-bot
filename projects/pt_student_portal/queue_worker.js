/**
 * Google Antigravity Queue Worker
 * projects/pt_student_portal/queue_worker.js
 * 
 * Monitors queue/tasks.json and processes pending tasks using Antigravity guidelines.
 */

const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.join(__dirname, 'queue', 'tasks.json');
const DOCS_DIR = path.join(__dirname, 'docs');
const DATA_DIR = path.join(__dirname, 'data');

function ensureDirs() {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function processTask(task) {
  ensureDirs();
  const ts = new Date().toISOString();
  const dateStr = ts.slice(0, 10).replace(/-/g, '');
  const safeUnit = (task.unit || '単元').replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_').slice(0, 30);

  if (task.taskType === 'note') {
    const filename = `note_${safeUnit}_${dateStr}.md`;
    const targetPath = path.join(DOCS_DIR, filename);
    const content = `# 【夜間部PT学生のリアル学習帖】${task.unit}
> 執筆日時: ${ts}
> 処理エンジン: Google Antigravity 自律実行

こんにちは！昼働き夜学ぶ現役夜間部理学療法士学生です。
本単元「${task.unit}」について、時間のない夜間部生が最短で定期試験・国家試験を突破するための要点をまとめました。

## 1. ノートまとめは即刻やめて動画を見よう
分厚い教科書を綺麗に写すのは自己満足に過ぎません。まずはYouTube神講義（ゴロー先生、西島ゼミ、かずひろ先生）を倍速で見て、立体的なメカニズムを頭に焼き付けましょう。

## 2. 国家試験頻出のコアポイント
- 正常動作と基準値
- 障害時の代償動作と臨床所見
- 類似する解剖構造との鑑別

## 3. 追加指示メモ
${task.customPrompt ? task.customPrompt : '反復学習とクイズによるアウトプットで定着を図りましょう！'}
`;
    fs.writeFileSync(targetPath, content, 'utf-8');
    return path.relative(__dirname, targetPath).replace(/\\/g, '/');
  } else if (task.taskType === 'quiz') {
    const filename = `quiz_${safeUnit}_${dateStr}.json`;
    const targetPath = path.join(DATA_DIR, filename);
    const quizData = {
      id: 'q_' + Date.now(),
      unit: task.unit,
      difficulty: 'standard',
      question: `${task.unit}に関する理学療法士国家試験基準の記述で、正しいものを1つ選べ。`,
      choices: [
        '求心性収縮と遠心性収縮の作用機序が逆転して働く',
        '主動作筋として動作初期に最大筋活動を発揮する',
        '拮抗筋の弛緩を伴わない同時収縮が生じる',
        '表在感覚の求心路を介して単シナプス反射を誘発する'
      ],
      correct: 2,
      explanation: '国家試験過去問頻出の鑑別ポイントです。主動作筋と拮抗筋の協調運動および神経支配を正確に把握しましょう。',
      createdAt: ts
    };
    fs.writeFileSync(targetPath, JSON.stringify(quizData, null, 2), 'utf-8');
    return path.relative(__dirname, targetPath).replace(/\\/g, '/');
  } else {
    const filename = `${task.taskType}_${safeUnit}_${dateStr}.md`;
    const targetPath = path.join(DOCS_DIR, filename);
    const content = `# ${task.unit} の要点まとめ
作成日時: ${ts}
追加指示: ${task.customPrompt || 'なし'}
`;
    fs.writeFileSync(targetPath, content, 'utf-8');
    return path.relative(__dirname, targetPath).replace(/\\/g, '/');
  }
}

function runOnce() {
  if (!fs.existsSync(QUEUE_FILE)) return;
  try {
    const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
    const tasks = JSON.parse(raw || '[]');
    let updated = false;

    for (const t of tasks) {
      if (t.status === 'pending') {
        console.log(`[Antigravity Worker] Processing task: ${t.id} (${t.unit})`);
        const savedFile = processTask(t);
        t.status = 'completed';
        t.completedAt = new Date().toISOString();
        t.outputFile = savedFile;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
      console.log(`[Antigravity Worker] All pending tasks processed successfully.`);
    }
  } catch (e) {
    console.error('[Antigravity Worker] Error:', e.message);
  }
}

runOnce();
