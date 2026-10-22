import test from 'node:test';
import assert from 'node:assert/strict';
import { HOST_METHODS, assertEngineHost, createNullHost } from '../game/src/engine/host.js';
import { openEraSession } from '../game/src/engine/session.js';
import { cameraAxes, orbitCameraPosition, stepFocus } from '../game/src/preview/focus.js';
import { loadRegistry } from './helpers/worldpacks.mjs';

const registry = await loadRegistry();

test('엔진 호스트 계약은 필수 메서드와 capabilities를 강제한다', () => {
  assert.deepEqual([...HOST_METHODS], ['setTerrain', 'mountChunk', 'unmountChunk', 'setFocus', 'frame', 'snapshot', 'dispose']);
  assert.throws(() => assertEngineHost({ mountChunk() {} }), /missing setTerrain, unmountChunk, setFocus, frame, snapshot, dispose, capabilities/);
  assert.doesNotThrow(() => createNullHost());
});

test('공개 호스트 세션: 12청크 서술자를 올리되 적재 가능한 내용은 0개 (M0 정직성)', async () => {
  const host = createNullHost();
  const session = await openEraSession({ registry, host, eraId: 'joseon-1792' });
  assert.deepEqual(session.summary, { total: 12, loadable: 0, byStatus: { 'legacy-reference': 3, planned: 2, reserved: 7 } });
  const snap = host.snapshot();
  assert.equal(snap.mounted.length, 12);
  assert.equal(snap.terrain.status, 'draft-schematic');
  await session.close();
  await session.close();
  assert.equal(host.snapshot().mounted.length, 0);
});

test('worldforge-korea 능력이 있는 호스트에서는 기존 3청크가 적재 가능해진다', async () => {
  const host = createNullHost({ capabilities: ['worldforge-korea'] });
  const session = await openEraSession({ registry, host, eraId: 'joseon-1792' });
  assert.equal(session.summary.loadable, 3);
  assert.deepEqual(session.descriptors.filter((d) => d.loadable).map((d) => d.chunkId).sort(), ['grove', 'lane', 'market']);
});

test('2026 세션은 예약 셀 5개, 지형도 예약 상태', async () => {
  const host = createNullHost({ capabilities: ['worldforge-korea'] });
  const session = await openEraSession({ registry, host, eraId: 'modern-2026' });
  assert.deepEqual(session.summary, { total: 5, loadable: 0, byStatus: { reserved: 5 } });
  assert.equal(host.snapshot().terrain.status, 'reserved');
});

test('미리보기 초점: 카메라 기준 이동, 북쪽=-z, 범위 제한', () => {
  const bounds = { min: [-96, -160], max: [96, 160] };
  const north = stepFocus([0, 0], { move: { x: 0, forward: 1 }, run: false }, { yaw: 0, dt: 1, bounds });
  assert.ok(north[1] < 0 && Math.abs(north[0]) < 1e-9);
  const east = stepFocus([0, 0], { move: { x: 1, forward: 0 }, run: false }, { yaw: 0, dt: 1, bounds });
  assert.ok(east[0] > 0 && Math.abs(east[1]) < 1e-9);
  const fast = stepFocus([0, 0], { move: { x: 0, forward: 1 }, run: true }, { yaw: 0, dt: 1, bounds });
  assert.ok(fast[1] < north[1]);
  assert.deepEqual(stepFocus([95, 0], { move: { x: 1, forward: 0 }, run: true }, { yaw: 0, dt: 1, bounds }), [96, 0]);
  const { forward, right } = cameraAxes(Math.PI / 2);
  assert.ok(Math.abs(forward[0] + 1) < 1e-9 && Math.abs(right[1] + 1) < 1e-9);
  const cam = orbitCameraPosition([0, 0], { yaw: 0, pitch: 90, distance: 10 });
  assert.ok(cam[1] > 9 && cam[2] > 0, 'pitch 상한 85°로 제한');
});
