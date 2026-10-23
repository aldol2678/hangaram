// 브리지 음성 대조 (로컬 전용): 실제 비공개 체크아웃에서 임시 git worktree를 만들어 한 가지씩 변조한 뒤
// check-private-bridge.mjs가 지정한 항목을 FAIL로 잡는지 확인한다. 원본 체크아웃 작업 트리는 바꾸지 않는다.
// WORLDFORGE_KOREA_DIR=<aldol-worldforge>/examples/worldforge-korea node scripts/check-bridge-negative.mjs [--write]
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const koreaDir = process.env.WORLDFORGE_KOREA_DIR;
if (!koreaDir) {
  console.error('bridge negative check NOT RUN: WORLDFORGE_KOREA_DIR is not set');
  process.exit(1);
}
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const repo = git(koreaDir, 'rev-parse', '--show-toplevel');
const exampleRel = path.relative(repo, path.resolve(koreaDir));
const head = git(repo, 'rev-parse', 'HEAD');
const BASELINE = 'cb4d077702de8b767204f18b0ab1f25eb3b70163';
const ALPHA04 = 'f322abea24c388c57ceca06bcf8152fa36cd59fa';

const edit = (file, from, to) => (dir) => {
  const target = path.join(dir, file);
  const text = readFileSync(target, 'utf8');
  if (!text.includes(from)) throw new Error(`mutation anchor missing in ${file}: ${from}`);
  writeFileSync(target, text.replace(from, to));
};
const jsonEdit = (file, mutate) => (dir) => {
  const target = path.join(dir, file);
  const value = JSON.parse(readFileSync(target, 'utf8'));
  mutate(value);
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};

const CASES = [
  { id: 'control-unmodified', commit: head, mutate: null, expect: [] },
  { id: 'wrong-naru-uri', commit: head, mutate: edit('src/chunk-catalog.js', "uri:'chunks/hg-naru.json'", "uri:'chunks/hg-naru-wrong.json'"), expect: ['HG-01 blockout catalog exact'] },
  { id: 'moved-naru-bounds', commit: head, mutate: edit('src/chunk-catalog.js', 'min:[-32,32],max:[32,96]', 'min:[-32,30],max:[32,96]'), expect: ['HG-01 blockout catalog exact'] },
  { id: 'legacy-market-uri-changed', commit: head, mutate: edit('src/chunk-catalog.js', "uri:'chunks/market.json'", "uri:'chunks/market-v2.json'"), expect: ['legacy chunk catalog unchanged'] },
  { id: 'reserved-cell-occupied', commit: head, mutate: edit('src/chunk-catalog.js', "uri:'chunks/hg-naru.json'}", "uri:'chunks/hg-naru.json'},\n {id:'hg-reed',name:'x',min:[32,32],max:[96,96],uri:'chunks/hg-reed.json'}"), expect: ['planned and reserved slots remain unoccupied', 'HG-01 blockout catalog exact'] },
  { id: 'tampered-vendor-blockout', commit: head, mutate: jsonEdit('vendor/hangaram/naru.blockout.json', (doc) => { doc.primitives[0].position[0] += 0.5; }), expect: ['public and private HG-01 JSON bytes identical'] },
  { id: 'forged-blob-sha', commit: head, mutate: jsonEdit('vendor/hangaram/SOURCE.json', (src) => { src.githubBlobSha = '0'.repeat(40); }), expect: ['vendor Git blob SHA matches public data'] },
  { id: 'unknown-source-commit', commit: head, mutate: jsonEdit('vendor/hangaram/SOURCE.json', (src) => { src.sourceCommit = 'f'.repeat(40); }), expect: ['vendor source commit in public history'] },
  { id: 'wrong-source-repository', commit: head, mutate: jsonEdit('vendor/hangaram/SOURCE.json', (src) => { src.sourceRepository = 'someone/else'; }), expect: ['source repository and path match approved public blockout'] },
  { id: 'world-bounds-not-extended', commit: head, mutate: edit('src/chunk-catalog.js', 'maxZ:94.5', 'maxZ:30.5'), expect: ['WorldForge southern bounds support HG-01'] },
  { id: 'save-key-changed', commit: head, mutate: edit('src/economy.js', "'korea.alpha01.market.save.v1'", "'korea.alpha02.market.save.v1'"), expect: ['legacy save key identical'] },
  { id: 'errand-id-renamed', commit: head, mutate: edit('src/errands.js', "{id:'north',", "{id:'north-lane',"), expect: ['errand ids identical'] },
  { id: 'wrong-commit-pr9-without-hg01', commit: BASELINE, mutate: null, expect: ['HG-01 blockout catalog exact', 'HG-01 vendor source available and parseable'] },
  { id: 'wrong-commit-alpha04-not-descendant', commit: ALPHA04, mutate: null, expect: ['source descends from pinned KOREA baseline', 'load life-quests.js'] },
  // 공개 쪽 원본 변조: 한가람 임시 worktree의 블록아웃만 바꾸고 실제 비공개 체크아웃과 대조한다.
  { id: 'tampered-public-blockout', side: 'public', mutate: jsonEdit('game/worldpacks/joseon-1792/chunks/naru.blockout.json', (doc) => { doc.primitives[0].color = '#000000'; }), expect: ['public and private HG-01 JSON bytes identical', 'vendor Git blob SHA matches public data'] },
];

const results = [];
const scratch = mkdtempSync(path.join(tmpdir(), 'hg01-bridge-neg-'));
try {
  for (const item of CASES) {
    const publicSide = item.side === 'public';
    const owner = publicSide ? root : repo;
    const worktree = path.join(scratch, item.id);
    git(owner, 'worktree', 'add', '--detach', '--quiet', worktree, publicSide ? 'HEAD' : item.commit);
    try {
      const dir = publicSide ? path.resolve(koreaDir) : path.join(worktree, exampleRel);
      item.mutate?.(publicSide ? worktree : dir);
      const bridgeRoot = publicSide ? worktree : root;
      const run = spawnSync(process.execPath, [path.join(bridgeRoot, 'scripts/check-private-bridge.mjs'), '--require'], {
        cwd: bridgeRoot, encoding: 'utf8', env: { ...process.env, WORLDFORGE_KOREA_DIR: dir },
      });
      const failed = [...run.stdout.matchAll(/^FAIL {2}(.+)$/gm)].map((m) => m[1]);
      const missing = item.expect.filter((name) => !failed.includes(name));
      const expectExit = item.expect.length ? 1 : 0;
      const pass = run.status === expectExit && missing.length === 0 && (item.expect.length > 0 || failed.length === 0);
      results.push({ case: item.id, side: publicSide ? 'public' : 'private', commit: publicSide ? git(root, 'rev-parse', 'HEAD').slice(0, 12) : item.commit.slice(0, 12), exit: run.status, expectedFailures: item.expect, observedFailures: failed, result: pass ? 'PASS' : 'FAIL' });
    } finally {
      git(owner, 'worktree', 'remove', '--force', worktree);
    }
  }
} finally {
  git(repo, 'worktree', 'prune');
  git(root, 'worktree', 'prune');
  rmSync(scratch, { recursive: true, force: true });
}

const bad = results.filter((r) => r.result !== 'PASS');
const report = { check: 'hangaram-private-bridge-negative', koreaHead: head, result: bad.length ? 'FAIL' : 'PASS', cases: results };
if (process.argv.includes('--write')) writeFileSync(path.join(root, 'qa/hg-01/bridge-negative-report.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const r of results) console.log(`${r.result}  ${r.case}  exit=${r.exit}  failed=[${r.observedFailures.join('; ')}]`);
console.log(`bridge negative check ${report.result} · ${results.length - bad.length}/${results.length} cases behaved as expected · KOREA ${head}`);
process.exit(bad.length ? 1 : 0);
