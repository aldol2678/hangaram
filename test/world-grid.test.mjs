import test from 'node:test';
import assert from 'node:assert/strict';
import { AXIS, CHUNK_SIZE, boundsOfCellKey, boundsOverlap, cellBounds, cellKey, cellOf, cellsAdjacent, containsPoint, parseCellKey, unionBounds } from '../game/src/core/world-grid.js';
import { isPlaceId } from '../game/src/core/place-id.js';

test('공통 좌표계: 64m 청크, +x 동쪽 +z 남쪽, 실측 아님', () => {
  assert.equal(CHUNK_SIZE, 64);
  assert.deepEqual({ ...AXIS }, { x: 'east', z: 'south', unit: 'metre', georeferenced: false });
});

test('기존 3청크와 신규 2청크 셀 경계가 설계 좌표와 같다', () => {
  // docs/design-summary.md: 숲길 Z[-160,-96], 골목 Z[-96,-32], 시장 Z[-32,32] (X[-32,32]),
  // 마포나루 X[-32,32] Z[32,96], 갈대 물가 X[32,96] Z[32,96]
  assert.deepEqual(cellBounds(0, -2), { min: [-32, -160], max: [32, -96] });
  assert.deepEqual(cellBounds(0, -1), { min: [-32, -96], max: [32, -32] });
  assert.deepEqual(cellBounds(0, 0), { min: [-32, -32], max: [32, 32] });
  assert.deepEqual(cellBounds(0, 1), { min: [-32, 32], max: [32, 96] });
  assert.deepEqual(cellBounds(1, 1), { min: [32, 32], max: [96, 96] });
});

test('cellOf는 반열림 구간으로 경계를 동쪽·남쪽 셀에 배정한다', () => {
  assert.deepEqual(cellOf(0, 0), { col: 0, row: 0 });
  assert.deepEqual(cellOf(0, 32), { col: 0, row: 1 });
  assert.deepEqual(cellOf(31.999, 31.999), { col: 0, row: 0 });
  assert.deepEqual(cellOf(-32, -32), { col: 0, row: 0 });
  assert.deepEqual(cellOf(-32.001, -96.001), { col: -1, row: -2 });
  assert.equal(cellOf(Number.NaN, 0), null);
});

test('셀 키 파싱은 정규 표기만 허용한다', () => {
  assert.deepEqual(parseCellKey('0:-2'), { col: 0, row: -2 });
  assert.equal(parseCellKey('-0:1'), null);
  assert.equal(parseCellKey('0,1'), null);
  assert.equal(parseCellKey(undefined), null);
  assert.equal(cellKey(-1, 1), '-1:1');
  assert.deepEqual(boundsOfCellKey('1:1'), cellBounds(1, 1));
});

test('인접 청크는 겹치지 않고, 경계 위 점은 양쪽에 포함된다', () => {
  const market = cellBounds(0, 0);
  const naru = cellBounds(0, 1);
  assert.equal(boundsOverlap(market, naru), false);
  assert.equal(containsPoint(market, [0, 32]), true);
  assert.equal(containsPoint(naru, [0, 32]), true);
  assert.equal(cellsAdjacent('0:0', '0:1'), true);
  assert.equal(cellsAdjacent('0:0', '1:1'), false);
  assert.deepEqual(unionBounds([cellBounds(-1, -2), cellBounds(1, 1)]), { min: [-96, -160], max: [96, 96] });
});

test('장소 ID 문법', () => {
  for (const ok of ['mapo.naru', 'mapo.reed-shore', 'mapo.naru.dock']) assert.equal(isPlaceId(ok), true, ok);
  for (const bad of ['naru', 'Mapo.naru', 'mapo..naru', 'mapo.naru.', 'mapo.1naru', '', null]) assert.equal(isPlaceId(bad), false, String(bad));
});
