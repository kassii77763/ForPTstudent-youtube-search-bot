/**
 * GAS Mini-Tool Product Harness（コード採点器）
 * ------------------------------------------------------------
 * 100本のミニツールを「同じ品質」で出すための機械判定。
 * ルールの出典は PRODUCT_STANDARD.md / FEEDBACK_LOG.md（カシマさんのFB）。
 *
 * 使い方:
 *   node harness/gas_minitool/evaluator_gas_minitool.js <ツールのフォルダ>
 *   例) node harness/gas_minitool/evaluator_gas_minitool.js gas_project/unreplied_emails
 *
 * 1つでも FAIL があれば exit code 1（= カシマさんに見せてはいけない状態）。
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadTool(dir) {
  const files = fs.readdirSync(dir).filter(f => /\.(js|gs)$/.test(f));
  const sources = files.map(f => ({ name: f, code: fs.readFileSync(path.join(dir, f), 'utf8') }));
  const manifestPath = path.join(dir, 'appsscript.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
  return { dir, files, sources, all: sources.map(s => s.code).join('\n'), manifest };
}

// onOpen 内の createMenu ... addToUi() ブロックを抜き出す
function extractMenuBlock(code) {
  const m = code.match(/function\s+onOpen\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  return m ? m[1] : '';
}

const RULES = [
  {
    id: 'R01', name: '配布形態：コンテナバインドで完結（GASエディタを開かせない）',
    check: t => {
      const bad = [];
      if (/SpreadsheetApp\.create\s*\(/.test(t.all)) bad.push('SpreadsheetApp.create() を使っている（別ファイルを作る＝スタンドアロン前提）');
      if (/SpreadsheetApp\.openById\s*\(/.test(t.all)) bad.push('openById() を使っている');
      if (!/getActiveSpreadsheet\s*\(/.test(t.all)) bad.push('getActiveSpreadsheet() が無い');
      if (!/function\s+onOpen\s*\(/.test(t.all)) bad.push('onOpen() メニューが無い');
      return bad;
    }
  },
  {
    id: 'R02', name: 'メニューは利用者の目的に直結する操作だけ（開発用・意味不明な項目を出さない）',
    check: t => {
      const menu = extractMenuBlock(t.all);
      const banned = ['サンプル', 'sample', 'demo', 'デモ', '初期化', 'reset', 'test', 'テスト', 'debug', '記事'];
      const hits = banned.filter(w => menu.toLowerCase().includes(w.toLowerCase()));
      const items = (menu.match(/addItem\(/g) || []).length;
      const bad = hits.map(w => `メニューに「${w}」が含まれる`);
      if (items > 5) bad.push(`メニュー項目が ${items} 個（上限5）`);
      return bad;
    }
  },
  {
    id: 'R03', name: '利用者が変えたい値（期間・時刻・間隔）はシートのセルで変えられる（コード直書き禁止）',
    check: t => {
      const bad = [];
      if (/\.atHour\(\s*\d+\s*\)/.test(t.all)) bad.push('atHour(数字) が直書き → 実行時刻を利用者が選べない');
      if (/\.everyDays\(\s*\d+\s*\)/.test(t.all)) bad.push('everyDays(数字) が直書き → 実行間隔を利用者が選べない');
      if (/\.everyHours\(\s*\d+\s*\)/.test(t.all)) bad.push('everyHours(数字) が直書き');
      if (/newer_than:\d+d/.test(t.all)) bad.push('検索期間がクエリに直書き');
      if (/ScriptApp\.newTrigger/.test(t.all) && !/getRange\([^)]*\)\.getValue\(\)/.test(t.all)) bad.push('トリガーがあるのに設定セルを読んでいない');
      return bad;
    }
  },
  {
    id: 'R04', name: '設定セルには入力規則（不正値をシート側で防ぐ）',
    check: t => (/getRange\([^)]*\)\.getValue\(\)/.test(t.all) && !/setDataValidation\(/.test(t.all)) ? ['設定セルがあるのに setDataValidation が無い'] : []
  },
  {
    id: 'R05', name: 'UI基準：ダッシュボード＋グリッド線OFF＋ヘッダー色＋見出し固定',
    check: t => {
      const bad = [];
      if (!/ダッシュボード/.test(t.all)) bad.push('「ダッシュボード」シートが無い');
      if (!/setHiddenGridlines\(\s*true\s*\)/.test(t.all)) bad.push('グリッド線を消していない（素の表計算に見える）');
      if (!/setFrozenRows\(/.test(t.all)) bad.push('一覧の見出し行を固定していない');
      if (!/setBackground\(/.test(t.all)) bad.push('配色していない');
      return bad;
    }
  },
  {
    id: 'R06', name: '存在しないAPIを使わない（過去に実行時エラーを出したもの）',
    check: t => {
      const knownBad = { 'setGridlines(': 'setHiddenGridlines', 'setHideGridlines(': 'setHiddenGridlines' };
      return Object.keys(knownBad).filter(k => t.all.includes(k)).map(k => `${k} は存在しない → ${knownBad[k]} を使う`);
    }
  },
  {
    id: 'R07', name: 'マニフェストの権限が、使っている機能をすべてカバーしている',
    check: t => {
      if (!t.manifest) return ['appsscript.json がフォルダに無い（ローカルを正本にする）'];
      const s = (t.manifest.oauthScopes || []).join(' ');
      const need = [
        [/GmailApp\./, /auth\/gmail\.|mail\.google\.com/, 'Gmail'],
        [/Session\.getActiveUser/, /userinfo\.email/, 'userinfo.email'],
        [/ScriptApp\.(newTrigger|getProjectTriggers)/, /script\.scriptapp/, 'script.scriptapp'],
        [/getUi\(\)/, /script\.container\.ui/, 'script.container.ui'],
        [/SpreadsheetApp\./, /spreadsheets/, 'spreadsheets']
      ];
      return need.filter(([use, scope]) => use.test(t.all) && !scope.test(s)).map(([, , n]) => `権限 ${n} が無い`);
    }
  },
  {
    id: 'R08', name: '0件のときも「何が起きたか」が画面で分かる',
    check: t => /length\s*===\s*0/.test(t.all) && /(ありません|見つかりませんでした)/.test(t.all) ? [] : ['0件時のメッセージが無い（実行しても何も起きないように見える）']
  },
  {
    id: 'R09', name: '製品ファイルに開発専用コード（デモ生成・サンプル出力）を混ぜない',
    check: t => {
      const bad = [];
      t.sources.forEach(s => {
        const fns = [...s.code.matchAll(/function\s+([A-Za-z0-9_]+)/g)].map(m => m[1]);
        fns.filter(f => /sample|demo|test|debug|article/i.test(f)).forEach(f => bad.push(`${s.name}: ${f}()`));
      });
      return bad;
    }
  },
  {
    id: 'R10', name: '構文エラーが無い',
    check: t => {
      const bad = [];
      t.sources.forEach(s => {
        try { execSync(`node --check "${path.join(t.dir, s.name)}"`, { stdio: 'pipe' }); }
        catch (e) { bad.push(`${s.name}: ${String(e.stderr || e.message).split('\n')[0]}`); }
      });
      return bad;
    }
  },
  {
    id: 'R11', name: '利用者向けの操作完了フィードバック（toast / alert）がある',
    check: t => /\.toast\(|\.alert\(/.test(t.all) ? [] : ['操作後に何も表示されない']
  },
  {
    id: 'R12', name: '安全停止：アンインストール／トリガー全解除関数（uninstall）の標準装備',
    check: t => {
      const bad = [];
      const hasUninstallFn = /function\s+(uninstall|stopAutoExecution|clearTriggers|resetTool|uninstallTool)/i.test(t.all);
      if (!hasUninstallFn) bad.push('停止・トリガー全解除用関数（uninstallTool / stopAutoExecution等）が無い');
      if (hasUninstallFn && !/deleteTrigger|ScriptApp\.getProjectTriggers/.test(t.all)) bad.push('トリガー削除ロジック（ScriptApp.deleteTrigger）がアンインストール関数内に見当たらない');
      return bad;
    }
  },
  {
    id: 'R13', name: '納品メディア完全性：GIF（15MB以下）とアイキャッチ/サムネイル画像の存在',
    check: t => {
      const bad = [];
      const videosDir = path.join(t.dir, 'videos');
      const hasGif = fs.existsSync(videosDir) && fs.readdirSync(videosDir).some(f => f.endsWith('.gif'));
      const hasThumbnail = fs.existsSync(path.join(t.dir, 'thumbnail.jpg')) ||
                           fs.existsSync(path.join(t.dir, 'images', 'eyecatch.png'));
      if (!hasGif) bad.push('videos/ フォルダにX投稿用GIFファイル（.gif）が存在しない');
      if (!hasThumbnail) bad.push('サムネイル画像（thumbnail.jpg または images/eyecatch.png）が存在しない');
      if (hasGif) {
        const gifFile = fs.readdirSync(videosDir).find(f => f.endsWith('.gif'));
        const gifStat = fs.statSync(path.join(videosDir, gifFile));
        const sizeMB = gifStat.size / (1024 * 1024);
        if (sizeMB > 15) bad.push(`GIF容量が ${sizeMB.toFixed(2)}MB でXの制限（15MB）を超過`);
      }
      return bad;
    }
  },
  {
    id: 'R14', name: '3大チャネル完全回遊ループ：note・Notion・Xの相互誘導リンクが存在する',
    check: t => {
      const bad = [];
      const articlePath = path.join(t.dir, 'article.md');
      const xPostPath = path.join(t.dir, 'x_post.md');
      if (!fs.existsSync(articlePath)) {
        bad.push('note原稿（article.md）が存在しない');
      } else {
        const art = fs.readFileSync(articlePath, 'utf8');
        if (!/notion|ポートフォリオ|事例/i.test(art)) bad.push('article.md にNotion事例集・ポートフォリオへの誘導リンクが無い');
      }
      if (!fs.existsSync(xPostPath)) {
        bad.push('X投稿原稿（x_post.md）が存在しない');
      } else {
        const xp = fs.readFileSync(xPostPath, 'utf8');
        if (!/note\.com|note/i.test(xp)) bad.push('x_post.md にnote解説記事への誘導が無い');
      }
      return bad;
    }
  },
  {
    id: 'R15', name: 'アーキテクチャ境界ガード：1ツール1フォルダ完全カプセル化（外部漏出の禁止）',
    check: t => {
      const bad = [];
      // ツールフォルダ外（ルート直下等）へのファイル漏出を check_architecture_guard で確認
      try {
        const guardPath = path.resolve(__dirname, '../global_rules/check_architecture_guard.js');
        if (fs.existsSync(guardPath)) {
          const { checkArchitecture } = require(guardPath);
          if (!checkArchitecture()) bad.push('ルートディレクトリに未許可のファイル/フォルダが存在します');
        }
      } catch (e) {
        bad.push(`アーキテクチャガードの実行に失敗: ${e.message}`);
      }
      return bad;
    }
  },
  {
    id: 'R16', name: 'メタハーネス進化ログ：logs/trace.md（失敗・解決・恒久教訓）の完全記録',
    check: t => {
      const bad = [];
      const tracePath = path.join(t.dir, 'logs', 'trace.md');
      if (!fs.existsSync(tracePath)) {
        bad.push('logs/trace.md が存在しない（自律進化用ログの記録が義務化されています）');
      } else {
        const content = fs.readFileSync(tracePath, 'utf8');
        if (!/## 恒久教訓|Meta-Harness Lesson/i.test(content)) {
          bad.push('logs/trace.md に「## 恒久教訓」セクションが無い');
        }
        if (!/失敗:.*解決:.*教訓:/s.test(content) && !/1\.\s*失敗:.*2\.\s*解決:.*3\.\s*教訓:/s.test(content)) {
          bad.push('logs/trace.md に「失敗」「解決」「教訓」の3大要素が明確に構造化されていません');
        }
      }
      return bad;
    }
  }
];

function run(dir) {
  const t = loadTool(dir);
  const results = RULES.map(r => {
    const problems = r.check(t);
    return { id: r.id, name: r.name, pass: problems.length === 0, problems };
  });
  const passed = results.filter(r => r.pass).length;
  return { tool: dir, passed, total: results.length, allPass: passed === results.length, results };
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node evaluator_gas_minitool.js <tool-dir>'); process.exit(2); }
  const r = run(path.resolve(dir));
  console.log(`\n=== GAS Mini-Tool Harness: ${path.basename(r.tool)} ===`);
  r.results.forEach(x => {
    console.log(`${x.pass ? 'PASS' : 'FAIL'}  ${x.id} ${x.name}`);
    x.problems.forEach(p => console.log(`        - ${p}`));
  });
  console.log(`\nResult: ${r.passed}/${r.total} ${r.allPass ? '→ 提出OK' : '→ 提出NG（修正してから見せる）'}`);
  process.exit(r.allPass ? 0 : 1);
}

module.exports = { run, RULES };
