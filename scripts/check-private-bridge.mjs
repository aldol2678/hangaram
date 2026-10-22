// 비공개 WorldForge KOREA 체크아웃과의 계약 대조 (선택 실행).
// WORLDFORGE_KOREA_DIR=<aldol-worldforge>/examples/worldforge-korea 를 지정했을 때만 그 소스를 읽기 전용으로 import해
// 한가람 시대팩의 기존 3청크·저장 키·진행 ID가 실제 KOREA 구현과 같은지 확인한다.
// 비공개 코드는 이 저장소에 복사하지 않는다. 미지정 시 SKIPPED(미검증)로 끝난다. --require 를 주면 미지정은 실패다.
// --write 를 주면 비교 결과(코드가 아닌 ID·좌표 대조표)만 qa/m0/private-bridge-report.json 에 쓴다.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { boundsOverlap, boundsOfCellKey } from '../game/src/core/world-grid.js';
import { toWorldForgeChunkCatalog } from '../game/src/engine/worldforge-catalog.js';
import { INVENTORY_KEYS, LEGACY_KOREA_KEY, PROGRESS_KEYS } from '../game/src/save/format.js';
import { migrateSave } from '../game/src/save/migrations.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const dir = process.env.WORLDFORGE_KOREA_DIR;
if (!dir) {
  const message = 'private bridge check SKIPPED (not verified): WORLDFORGE_KOREA_DIR is not set';
  if (args.has('--require')) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
  process.exit(0);
}

const load = (file) => import(pathToFileURL(path.join(path.resolve(dir), 'src', file)).href);
const checks = [];
const check = (name, pass, detail = {}) => checks.push({ name, result: pass ? 'PASS' : 'FAIL', ...detail });

let commit = null;
try {
  commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
} catch {}

const pack = JSON.parse(await readFile(path.join(root, 'game/worldpacks/joseon-1792/pack.json'), 'utf8'));
// 모듈이 없거나 깨진 커밋도 예외로 끝나지 않고 FAIL 항목으로 보고한다.
async function tryLoad(file) {
  try {
    const module = await load(file);
    check(`load ${file}`, true);
    return module;
  } catch (error) {
    check(`load ${file}`, false, { error: error.code ?? String(error) });
    return null;
  }
}
const catalogModule = await tryLoad('chunk-catalog.js');
const economy = await tryLoad('economy.js');
const errands = await tryLoad('errands.js');
const life = await tryLoad('life-quests.js');
const sameIds = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

check('source commit matches pack legacy commit', commit === pack.legacyIds.commit, { expected: pack.legacyIds.commit, actual: commit });

if (catalogModule) {
  const ours = toWorldForgeChunkCatalog(pack, { statuses: ['legacy-reference'] });
  const theirs = catalogModule.CHUNKS.map(({ id, min, max, uri }) => ({ id, min, max, uri }));
  const key = (c) => JSON.stringify([c.id, c.min, c.max, c.uri]);
  check('legacy chunk catalog (id/min/max/uri) identical', JSON.stringify(ours.map(key).sort()) === JSON.stringify(theirs.map(key).sort()), { hangaram: ours.map(({ id, min, max, uri }) => ({ id, min, max, uri })), korea: theirs });
  const overlaps = pack.chunks
    .filter((c) => c.status !== 'legacy-reference')
    .flatMap((chunk) => catalogModule.CHUNKS.filter((c) => boundsOverlap(boundsOfCellKey(chunk.cell), { min: c.min, max: c.max })).map((c) => `${chunk.id}->${c.id}`));
  check('planned/reserved slots do not overlap KOREA chunks', overlaps.length === 0, { overlaps });
  check('harvest ids identical', sameIds(pack.legacyIds.harvest, catalogModule.HARVESTS.map((h) => h.id)), { korea: catalogModule.HARVESTS.map((h) => h.id) });
}
if (economy) {
  check('legacy save key identical', economy.STORAGE_KEY === LEGACY_KOREA_KEY, { hangaram: LEGACY_KOREA_KEY, korea: economy.STORAGE_KEY });
  const numericDefaults = Object.entries(economy.DEFAULT_STATE).filter(([, v]) => typeof v === 'number').map(([k]) => k).sort();
  check('legacy numeric fields covered', JSON.stringify([...INVENTORY_KEYS, 'sales'].sort()) === JSON.stringify(numericDefaults), { hangaram: [...INVENTORY_KEYS, 'sales'].sort(), korea: numericDefaults });
}
if (errands) check('errand ids identical', sameIds(pack.legacyIds.errands, errands.ERRANDS.map((q) => q.id)), { korea: errands.ERRANDS.map((q) => q.id) });
if (life) check('life quest ids identical', sameIds(pack.legacyIds.life, life.LIFE_QUESTS.map((q) => q.id)), { korea: life.LIFE_QUESTS.map((q) => q.id) });

// 왕복: KOREA 정규화 저장 → 한가람 v1 → 보존된 원문을 다시 KOREA 정규화. 결과가 같아야 한다.
if (economy) {
  const now = Date.UTC(2026, 9, 22, 12);
  const sample = economy.normalizeState({
    coins: 41, wood: 3, cloth: 1, water: 2, rice: 1, meals: 1, dishes: 0, pouches: 1, sales: 5, position: [2.5, -70],
    errands: { meal: 'done', dishes: 'active', north: 'done' },
    life: { firewood: { phase: 'done', progress: 1 }, cook: { phase: 'active', progress: 1 } },
    harvest: { 'grove.wood.1': now + 30000 },
  }, now);
  const migrated = migrateSave(structuredClone(sample), { now });
  const roundTrip = migrated.ok ? economy.normalizeState(migrated.save.legacy.koreaAlpha.raw, now) : null;
  check('save round trip through hangaram v1 preserves KOREA state', migrated.ok && JSON.stringify(roundTrip) === JSON.stringify(sample));
  check('migrated progress keeps KOREA ids verbatim', migrated.ok && PROGRESS_KEYS.every((k) => JSON.stringify(migrated.save.progress[k] ?? {}) === JSON.stringify(sample[k] ?? {})));
  check('migrated position equals KOREA position', migrated.ok && JSON.stringify(migrated.save.player.position) === JSON.stringify(sample.position));
}

const info = {
  koreaWorldBounds: catalogModule?.WORLD_BOUNDS ?? null,
  note: 'KOREA WORLD_BOUNDS.maxZ가 30.5이므로 마포나루(Z 32~96)를 실제 런타임에 올리려면 HG-01에서 WORLD_BOUNDS·충돌·경계 이동 차단을 함께 확장해야 한다.',
};
const failed = checks.filter((c) => c.result === 'FAIL');
const report = { check: 'hangaram-private-bridge', koreaDir: 'WORLDFORGE_KOREA_DIR (local, not published)', koreaCommit: commit, result: failed.length ? 'FAIL' : 'PASS', checks, info };
if (args.has('--write')) await writeFile(path.join(root, 'qa/m0/private-bridge-report.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const c of checks) console.log(`${c.result}  ${c.name}`);
console.log(`private bridge check ${report.result} · ${checks.length - failed.length}/${checks.length} · KOREA ${commit ?? 'unknown commit'}`);
process.exit(failed.length ? 1 : 0);
