const fs = require('fs');
const path = require('path');
const { runStage1 } = require('./evaluator_stage1');
const { runStage2 } = require('./evaluator_stage2');
const { runStage3 } = require('./evaluator_stage3');
const { runStage4 } = require('./evaluator_stage4');

function runAll() {
  const s1 = runStage1();
  const s2 = runStage2();
  const s3 = runStage3();
  const s4 = runStage4();

  const totalScore = s1.score + s2.score + s3.score + s4.score;
  const maxScore = s1.maxScore + s2.maxScore + s3.maxScore + s4.maxScore;
  const allPass = s1.pass && s2.pass && s3.pass && s4.pass;

  const result = {
    executedAt: new Date().toISOString(),
    totalScore,
    maxScore,
    allPass,
    stages: [s1, s2, s3, s4],
    summary: {
      stage1: { name: s1.name, score: s1.score, pass: s1.pass },
      stage2: { name: s2.name, score: s2.score, pass: s2.pass },
      stage3: { name: s3.name, score: s3.score, pass: s3.pass },
      stage4: { name: s4.name, score: s4.score, pass: s4.pass }
    }
  };

  const outputPath = path.join(__dirname, 'eval_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`[Harness Complete] Total: ${totalScore}/${maxScore} - All Pass: ${allPass}`);
  return result;
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };
