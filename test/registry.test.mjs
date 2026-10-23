import test from 'node:test';
import assert from 'node:assert/strict';
import { createEraRegistry } from '../game/src/era/registry.js';
import { toWorldForgeChunkCatalog } from '../game/src/engine/worldforge-catalog.js';
import { loadRegistry, readWorldpackJson } from './helpers/worldpacks.mjs';

const registry = await loadRegistry();

test('레지스트리는 연도순 시대 목록과 기본 시대를 갖는다', () => {
  assert.deepEqual(registry.eras, ['joseon-1792', 'modern-2026']);
  assert.equal(registry.defaultEra, 'joseon-1792');
  assert.equal(registry.places().length, 12);
});

test('청크 서술자: 기존 3청크는 worldforge-korea 런타임이 있을 때만 적재 가능', () => {
  const publicHost = registry.chunkDescriptors('joseon-1792', []);
  const privateHost = registry.chunkDescriptors('joseon-1792', ['worldforge-korea']);
  const legacy = (list) => list.filter((d) => d.status === 'legacy-reference');
  assert.equal(legacy(publicHost).length, 3);
  assert.ok(legacy(publicHost).every((d) => d.source === 'worldforge-korea' && !d.loadable && /런타임 필요/.test(d.reason)));
  assert.ok(legacy(privateHost).every((d) => d.loadable && d.reason === null));
  const naru = publicHost.find((d) => d.chunkId === 'naru');
  assert.equal(naru.loadable, true);
  assert.equal(naru.source, 'hangaram-blockout');
  assert.equal(naru.reason, null);
  assert.equal(naru.statusLabel, '블록아웃 (공개)');
  assert.deepEqual(naru.bounds, { min: [-32, 32], max: [32, 96] });
  assert.equal(naru.qualifiedId, 'joseon-1792:naru');
});

test('장소 해석: 같은 장소 ID가 시대마다 같은 기준점을 쓰고, 내용 유무는 시대별로 다르다', () => {
  const j = registry.placeInEra('mapo.market', 'joseon-1792');
  const m = registry.placeInEra('mapo.market', 'modern-2026');
  assert.deepEqual(j.spawn, m.spawn);
  assert.equal(j.hasContent, true);
  assert.equal(m.hasContent, false);
  assert.equal(registry.placeInEra('mapo.naru', 'joseon-1792').hasContent, true, '마포나루 블록아웃 존재');
  assert.equal(registry.placeInEra('mapo.nowhere', 'joseon-1792'), null);
  assert.throws(() => registry.placeInEra('mapo.market', 'goryeo-1100'), /E_UNKNOWN_ERA/);
});

test('기존 3청크 재사용 경로: KOREA 카탈로그 형식으로 변환한 결과가 PR #9 기록 좌표와 같다', () => {
  // KOREA chunk-catalog.js (PR #9 @ cb4d077)의 CHUNKS 값. 실제 소스 대조는 npm run check:bridge가 한다.
  const expected = [
    { id: 'grove', min: [-32, -160], max: [32, -96], uri: 'chunks/grove.json' },
    { id: 'lane', min: [-32, -96], max: [32, -32], uri: 'chunks/lane.json' },
    { id: 'market', min: [-32, -32], max: [32, 32], uri: 'chunks/market.json' },
  ];
  const catalog = toWorldForgeChunkCatalog(registry.pack('joseon-1792'), { statuses: ['legacy-reference'] }).map(({ id, min, max, uri }) => ({ id, min, max, uri }));
  assert.deepEqual(catalog, expected);
});

test('신규 청크가 블록아웃이 되면 KOREA ID와 겹치지 않는 hg- 접두 ID로 변환된다', async () => {
  const pack = structuredClone(await readWorldpackJson('joseon-1792/pack.json'));
  const naru = pack.chunks.find((c) => c.id === 'naru');
  Object.assign(naru, { status: 'blockout', blockout: 'chunks/naru.blockout.json' });
  delete naru.blockoutTarget;
  delete naru.plannedIn;
  const entry = toWorldForgeChunkCatalog(pack).find((c) => c.id === 'hg-naru');
  assert.deepEqual(entry, { id: 'hg-naru', name: '마포나루', min: [-32, 32], max: [32, 96], uri: 'chunks/hg-naru.json' });
});

test('잘못된 팩은 레지스트리 생성 단계에서 막힌다', async () => {
  const places = await readWorldpackJson('places.json');
  const pack = structuredClone(await readWorldpackJson('joseon-1792/pack.json'));
  pack.chunks[0].status = 'done';
  assert.throws(() => createEraRegistry({ places, packs: [{ pack }], defaultEra: 'joseon-1792' }), /E_ERA_PACK_INVALID/);
  // HG-01부터 1792 팩은 마포나루 블록아웃 문서가 있어야 유효하다. 문서를 함께 넘겨 중복·기본 시대 검사만 본다.
  const good = { pack: await readWorldpackJson('joseon-1792/pack.json'), blockouts: new Map([['naru', await readWorldpackJson('joseon-1792/chunks/naru.blockout.json')]]) };
  assert.doesNotThrow(() => createEraRegistry({ places, packs: [good], defaultEra: 'joseon-1792' }));
  assert.throws(() => createEraRegistry({ places, packs: [good, good], defaultEra: 'joseon-1792' }), /E_DUPLICATE_ERA/);
  assert.throws(() => createEraRegistry({ places, packs: [good], defaultEra: 'modern-2026' }), /E_DEFAULT_ERA/);
});
