import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SAVE_VERSION, LEGACY_KOREA_KEY, SAVE_KEY, backupKeyFor, createNewSave, validateSaveV1 } from '../game/src/save/format.js';
import { MIGRATIONS, detectVersion, migrateSave } from '../game/src/save/migrations.js';
import { loadSave, persistSave } from '../game/src/save/storage.js';

const now = Date.UTC(2026, 9, 22, 13);

// PR #9 KOREA normalizeState가 만드는 모양의 저장 (값은 테스트용).
const koreaSave = () => ({
  coins: 27, wood: 2, cloth: 1, water: 3, rice: 0, meals: 1, dishes: 0, pouches: 1, sales: 4,
  life: { firewood: { phase: 'done', progress: 1 }, cook: { phase: 'done', progress: 1 }, delivery: { phase: 'active', progress: 0 } },
  harvest: { 'grove.wood.0': now + 45000 },
  errands: { meal: 'done', dishes: 'new', pouch: 'active', north: 'done' },
  position: [3.25, -101.5],
});

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  const calls = [];
  return {
    data,
    calls,
    getItem: (k) => (calls.push(['get', k]), data.has(k) ? data.get(k) : null),
    setItem: (k, v) => (calls.push(['set', k]), data.set(k, String(v))),
    removeItem: (k) => (calls.push(['remove', k]), data.delete(k)),
  };
}

test('새 저장은 v1 구조를 통과하고 기본 시대·위치를 쓴다', () => {
  const save = createNewSave({ now });
  assert.deepEqual(validateSaveV1(save), { ok: true, errors: [] });
  assert.equal(save.version, CURRENT_SAVE_VERSION);
  assert.equal(save.era.current, 'joseon-1792');
  assert.deepEqual(save.player.position, [0, 8]);
});

test('버전 판별: KOREA 레거시=0, 한가람=v, 그 외=null', () => {
  assert.equal(detectVersion(koreaSave()), 0);
  assert.equal(detectVersion(createNewSave({ now })), 1);
  assert.equal(detectVersion({ format: 'hangaram.save', version: 0 }), null);
  assert.equal(detectVersion({ hello: 'world' }), null);
  assert.equal(detectVersion(null), null);
  assert.equal(detectVersion([1, 2]), null);
});

test('마이그레이션 단계는 고유 ID와 연속 버전을 갖는다', () => {
  const ids = MIGRATIONS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  MIGRATIONS.forEach((m, i) => {
    assert.equal(m.from, i);
    assert.equal(m.to, i + 1);
  });
  assert.equal(MIGRATIONS.at(-1).to, CURRENT_SAVE_VERSION);
});

test('m0001: KOREA 저장을 감싸며 원문·진행 ID·재화를 그대로 보존한다', () => {
  const raw = koreaSave();
  const frozen = structuredClone(raw);
  const result = migrateSave(raw, { now });
  assert.equal(result.ok, true);
  assert.deepEqual(result.applied, ['m0001-wrap-korea-alpha']);
  assert.deepEqual(raw, frozen, '입력을 바꾸지 않는다');
  const { save } = result;
  assert.deepEqual(validateSaveV1(save), { ok: true, errors: [] });
  assert.deepEqual(save.legacy.koreaAlpha.raw, frozen);
  assert.equal(save.legacy.koreaAlpha.storageKey, LEGACY_KOREA_KEY);
  assert.deepEqual(save.progress.errands, frozen.errands);
  assert.deepEqual(save.progress.life, frozen.life);
  assert.deepEqual(save.progress.harvest, frozen.harvest);
  assert.deepEqual(save.inventory, { coins: 27, wood: 2, cloth: 1, water: 3, rice: 0, meals: 1, dishes: 0, pouches: 1 });
  assert.equal(save.stats.sales, 4);
  assert.deepEqual(save.player.position, [3.25, -101.5]);
  assert.equal(save.era.current, 'joseon-1792');
  assert.deepEqual(result.reports[0].adjusted, []);
});

test('m0001: 형식이 틀린 값은 0/null로 두고 보고하며, 원문은 남는다', () => {
  const raw = { ...koreaSave(), coins: -5, wood: 1.5, position: 'market', errands: 'oops', extra: { keep: true } };
  const result = migrateSave(raw, { now });
  assert.equal(result.ok, true);
  assert.equal(result.save.inventory.coins, 0);
  assert.equal(result.save.inventory.wood, 0);
  assert.equal(result.save.player.position, null);
  assert.deepEqual(result.save.progress.errands, {});
  assert.deepEqual(result.reports[0].adjusted.sort(), ['coins', 'errands', 'position', 'wood']);
  assert.deepEqual(result.reports[0].unknownFields, ['extra']);
  assert.deepEqual(result.save.legacy.koreaAlpha.raw.extra, { keep: true });
  assert.equal(result.save.legacy.koreaAlpha.raw.coins, -5);
});

test('v1 저장의 알 수 없는 최상위 필드는 지우지 않는다', () => {
  const save = { ...createNewSave({ now }), futureFeature: { a: 1 } };
  const result = migrateSave(save, { now });
  assert.equal(result.ok, true);
  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.save.futureFeature, { a: 1 });
});

test('미래 버전·알 수 없는 형식·구조 오류는 읽기 전용으로 거부한다', () => {
  assert.deepEqual(migrateSave({ ...createNewSave({ now }), version: 99 }, { now }), { ok: false, error: 'E_SAVE_FROM_FUTURE', readOnly: true, fromVersion: 99 });
  assert.equal(migrateSave({ random: true }, { now }).error, 'E_SAVE_UNKNOWN_FORMAT');
  const broken = createNewSave({ now });
  broken.inventory.coins = -1;
  const result = migrateSave(broken, { now });
  assert.equal(result.ok, false);
  assert.equal(result.readOnly, true);
  assert.match(result.error, /inventory\.coins/);
});

test('저장소: KOREA 레거시 키는 읽기만 하고 절대 쓰거나 지우지 않는다', () => {
  const legacyText = JSON.stringify(koreaSave());
  const storage = memoryStorage({ [LEGACY_KOREA_KEY]: legacyText });
  const loaded = loadSave(storage, { now });
  assert.equal(loaded.status, 'imported-legacy');
  assert.equal(loaded.readOnly, false);
  assert.deepEqual(persistSave(storage, loaded), { ok: true });
  assert.equal(storage.data.get(LEGACY_KOREA_KEY), legacyText, '레거시 원문 그대로');
  assert.ok(storage.calls.every(([op, key]) => op === 'get' || key !== LEGACY_KOREA_KEY));
  assert.ok(!storage.calls.some(([op]) => op === 'remove'));
  const reloaded = loadSave(storage, { now: now + 1000 });
  assert.equal(reloaded.status, 'loaded', '두 번째부터는 한가람 저장을 읽는다');
  assert.deepEqual(reloaded.save.progress.errands, koreaSave().errands);
});

test('저장소: 손상·미래 버전 저장은 덮어쓰지 않는다', () => {
  const corrupt = memoryStorage({ [SAVE_KEY]: '{not json' });
  const a = loadSave(corrupt, { now });
  assert.equal(a.status, 'corrupt');
  assert.deepEqual(persistSave(corrupt, a, createNewSave({ now })), { ok: false, error: 'E_SAVE_READ_ONLY' });
  assert.equal(corrupt.data.get(SAVE_KEY), '{not json');
  const futureText = JSON.stringify({ ...createNewSave({ now }), version: 7 });
  const future = memoryStorage({ [SAVE_KEY]: futureText });
  const b = loadSave(future, { now });
  assert.equal(b.status, 'read-only');
  assert.equal(persistSave(future, b, createNewSave({ now })).ok, false);
  assert.equal(future.data.get(SAVE_KEY), futureText);
});

test('저장소: 한가람 키에 레거시 형식이 들어 있으면 원문을 백업한 뒤 한 번만 마이그레이션 기록한다', () => {
  const oldText = JSON.stringify(koreaSave());
  const storage = memoryStorage({ [SAVE_KEY]: oldText });
  const loaded = loadSave(storage, { now });
  assert.equal(loaded.status, 'migrated');
  assert.equal(loaded.backup.key, backupKeyFor(0));
  assert.deepEqual(persistSave(storage, loaded), { ok: true });
  assert.equal(storage.data.get(backupKeyFor(0)), oldText);
  storage.data.set(backupKeyFor(0), 'first-backup-wins');
  persistSave(storage, loaded);
  assert.equal(storage.data.get(backupKeyFor(0)), 'first-backup-wins', '백업은 처음 한 번만 기록');
});

test('저장소: 손상된 레거시는 무시하고 새 저장으로 시작하되 레거시를 남긴다', () => {
  const storage = memoryStorage({ [LEGACY_KOREA_KEY]: 'broken' });
  const loaded = loadSave(storage, { now });
  assert.equal(loaded.status, 'new');
  assert.equal(loaded.detail.legacyUnreadable, true);
  persistSave(storage, loaded);
  assert.equal(storage.data.get(LEGACY_KOREA_KEY), 'broken');
});

test('저장소 접근 예외(사생활 모드 등)에서도 실패를 돌려줄 뿐 던지지 않는다', () => {
  const hostile = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  const loaded = loadSave(hostile, { now });
  assert.equal(loaded.status, 'new');
  assert.deepEqual(persistSave(hostile, loaded), { ok: false, error: 'E_STORAGE_UNAVAILABLE' });
});
