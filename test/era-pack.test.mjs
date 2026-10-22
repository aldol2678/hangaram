import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEraPack, validatePlaces } from '../game/src/era/era-pack.js';
import { MAX_PRIMITIVES_PER_CHUNK, validateBlockout } from '../game/src/era/blockout.js';
import { readWorldpackJson } from './helpers/worldpacks.mjs';

const places = await readWorldpackJson('places.json');
const joseon = await readWorldpackJson('joseon-1792/pack.json');
const modern = await readWorldpackJson('modern-2026/pack.json');
const naruBlockout = await readWorldpackJson('joseon-1792/chunks/naru.blockout.json');
const blockouts = new Map([['naru', naruBlockout]]);
const clone = (v) => structuredClone(v);

test('저장소의 실제 장소·시대팩이 검증을 통과한다', () => {
  assert.deepEqual(validatePlaces(places), { ok: true, errors: [] });
  assert.deepEqual(validateEraPack(joseon, { places, blockouts }), { ok: true, errors: [] });
  assert.deepEqual(validateEraPack(modern, { places, blockouts: new Map() }), { ok: true, errors: [] });
});

test('1792 팩: 기존 3, 마포나루 블록아웃 1, 갈대 물가 계획 1, 예약 7', () => {
  const by = (s) => joseon.chunks.filter((c) => c.status === s).map((c) => c.id).sort();
  assert.deepEqual(by('legacy-reference'), ['grove','lane','market']);
  assert.deepEqual(by('blockout'), ['naru']);
  assert.deepEqual(by('planned'), ['reed-shore']);
  assert.equal(by('reserved').length,7);
  assert.equal(joseon.chunks.length,12);
  assert.equal(joseon.chunks.find((c) => c.id === 'naru').blockout,'chunks/naru.blockout.json');
});

test('2026 팩은 예약 상태이며 내용·지형 기하가 없다', () => {
  assert.equal(modern.status, 'reserved');
  assert.ok(modern.chunks.every((c) => c.status === 'reserved'));
  assert.deepEqual(modern.terrain.water, []);
  const bad = clone(modern);
  bad.chunks[0].status = 'planned';
  bad.chunks[0].plannedIn = 'x';
  assert.match(validateEraPack(bad, { places }).errors.join('\n'), /reserved pack may only contain reserved chunks/);
  const water = clone(modern);
  water.terrain.water.push({ id: 'hg.m2026.terrain.x', min: [0, 200], max: [10, 210], surfaceY: 0 });
  assert.match(validateEraPack(water, { places }).errors.join('\n'), /reserved pack must not ship terrain/);
});

test('시대별 지형은 팩마다 독립 객체다', () => {
  assert.notEqual(joseon.terrain, modern.terrain);
  assert.notDeepEqual(joseon.terrain, modern.terrain);
  const shared = clone(joseon);
  delete shared.terrain;
  assert.match(validateEraPack(shared, { places }).errors.join('\n'), /terrain required/);
});

test('공통 좌표 규칙: 같은 장소는 모든 시대에서 같은 셀', () => {
  const cellOfPlace = new Map(places.places.map((p) => [p.id, p.cell]));
  for (const pack of [joseon, modern]) {
    for (const chunk of pack.chunks) for (const placeId of chunk.places) assert.equal(chunk.cell, cellOfPlace.get(placeId), `${pack.id}/${chunk.id}`);
  }
  const moved = clone(modern);
  moved.chunks.find((c) => c.id === 'naru').cell = '0:2';
  assert.match(validateEraPack(moved, { places }).errors.join('\n'), /belongs to cell 0:1/);
});

test('구현 상태를 부풀리는 데이터는 거부한다', () => {
  const legacyBlockout = clone(joseon);
  legacyBlockout.chunks[0].blockout = 'chunks/grove.json';
  assert.match(validateEraPack(legacyBlockout, { places }).errors.join('\n'), /must not ship a public blockout/);
  const plannedWithContent = clone(joseon);
  plannedWithContent.chunks.find((c) => c.id === 'reed-shore').blockout = 'chunks/reed-shore.blockout.json';
  assert.match(validateEraPack(plannedWithContent, { places }).errors.join('\n'), /must not ship a blockout/);
  const missingDoc = clone(joseon);
  Object.assign(missingDoc.chunks.find((c) => c.id === 'naru'), { status: 'blockout', blockout: 'chunks/naru.blockout.json' });
  delete missingDoc.chunks.find((c) => c.id === 'naru').blockoutTarget;
  assert.match(validateEraPack(missingDoc, { places, blockouts: new Map() }).errors.join('\n'), /blockout document missing/);
});

test('legacy-reference는 출처 커밋을 고정해야 한다', () => {
  const pack = clone(joseon);
  pack.chunks[0].legacy.commit = 'main';
  assert.match(validateEraPack(pack, { places }).errors.join('\n'), /legacy-reference needs legacy/);
});

test('청크·셀·장소 중복과 수면-육지 겹침을 거부한다', () => {
  const dupe = clone(joseon);
  dupe.chunks[1].cell = dupe.chunks[0].cell;
  assert.match(validateEraPack(dupe, { places }).errors.join('\n'), /used twice/);
  const flood = clone(joseon);
  flood.terrain.water[0].min = [-96, 80];
  assert.match(validateEraPack(flood, { places }).errors.join('\n'), /overlaps land chunk naru/);
});

const naruChunk = joseon.chunks.find((c) => c.id === 'naru');
const fixture = await readWorldpackJson('../../test/fixtures/naru.blockout.sample.json');

test('블록아웃 고정물(HG-01 형식 견본)이 검증을 통과한다', () => {
  assert.deepEqual(validateBlockout(fixture, { pack: joseon, chunk: naruChunk }), { ok: true, errors: [] });
});

test('블록아웃: ID 접두사, 청크 경계, 자리표시 상호작용, 예산을 강제한다', () => {
  const foreign = clone(fixture);
  foreign.primitives[0].id = 'lane.house.0';
  assert.match(validateBlockout(foreign, { pack: joseon, chunk: naruChunk }).errors.join('\n'), /must start with hg\.j1792\.naru\./);
  const outside = clone(fixture);
  outside.primitives[0].position = [0, 0, 20];
  assert.match(validateBlockout(outside, { pack: joseon, chunk: naruChunk }).errors.join('\n'), /footprint leaves chunk/);
  const fake = clone(fixture);
  delete fake.interactions[0].placeholder;
  assert.match(validateBlockout(fake, { pack: joseon, chunk: naruChunk }).errors.join('\n'), /placeholder: true/);
  const heavy = clone(fixture);
  heavy.primitives = Array.from({ length: MAX_PRIMITIVES_PER_CHUNK + 1 }, (_, i) => ({ ...fixture.primitives[0], id: `hg.j1792.naru.p.${i}` }));
  assert.match(validateBlockout(heavy, { pack: joseon, chunk: naruChunk }).errors.join('\n'), /exceed budget/);
  const dupe = clone(fixture);
  dupe.primitives[1].id = dupe.primitives[0].id;
  assert.match(validateBlockout(dupe, { pack: joseon, chunk: naruChunk }).errors.join('\n'), /duplicate id/);
});
