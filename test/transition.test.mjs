import test from 'node:test';
import assert from 'node:assert/strict';
import { ERA_TRANSITION_ENABLED, preflightTransition, recoverInterruptedTransition } from '../game/src/era/transition.js';
import { createNewSave } from '../game/src/save/format.js';
import { migrateSave } from '../game/src/save/migrations.js';
import { loadRegistry } from './helpers/worldpacks.mjs';

const registry = await loadRegistry();
const now = Date.UTC(2026, 9, 22);

test('M0에서 시대 전환은 비활성이며 사전 점검이 항상 막는다', () => {
  assert.equal(ERA_TRANSITION_ENABLED, false);
  const result = preflightTransition(registry, { save: createNewSave({ now }), toEra: 'modern-2026', placeId: 'mapo.market' });
  assert.equal(result.ok, false);
  assert.equal(result.plan, null);
  assert.ok(result.blockers.includes('E_TRANSITION_NOT_IMPLEMENTED'));
  // 2026 시장 자리는 예약 상태라 도착지 내용도 없다.
  assert.ok(result.blockers.includes('E_TARGET_PLACE_UNAVAILABLE'));
  assert.equal(result.messages.length, result.blockers.length);
});

test('사전 점검은 이유를 모두 모은다: 같은 시대, 모르는 장소, 작업 중, 진행 중 전환', () => {
  const save = createNewSave({ now });
  save.era.transition = { from: 'joseon-1792', to: 'modern-2026', checkpoint: { era: 'joseon-1792', position: [0, 8] } };
  const result = preflightTransition(registry, { save, toEra: 'joseon-1792', placeId: 'mapo.nowhere', busy: true });
  for (const code of ['E_TRANSITION_IN_PROGRESS', 'E_PLAYER_BUSY', 'E_SAME_ERA', 'E_UNKNOWN_PLACE']) assert.ok(result.blockers.includes(code), code);
  const unknown = preflightTransition(registry, { save: createNewSave({ now }), toEra: 'goryeo-1100', placeId: 'mapo.market' });
  assert.ok(unknown.blockers.includes('E_UNKNOWN_ERA'));
});

test('출발 시대에 내용이 없는 장소에서는 전환할 수 없다 (갈대 물가는 아직 계획 단계)', () => {
  const result = preflightTransition(registry, { save: createNewSave({ now }), toEra: 'modern-2026', placeId: 'mapo.reed-shore' });
  assert.ok(result.blockers.includes('E_SOURCE_PLACE_UNAVAILABLE'));
});

test('HG-02 나루 내용은 있지만 어댑터 capability 없이는 계속 비활성이다', () => {
  const result = preflightTransition(registry, { save: createNewSave({ now }), toEra: 'modern-2026', placeId: 'mapo.naru' });
  assert.equal(result.blockers.includes('E_SOURCE_PLACE_UNAVAILABLE'), false);
  assert.equal(result.blockers.includes('E_TARGET_PLACE_UNAVAILABLE'), false);
  assert.ok(result.blockers.includes('E_TRANSITION_NOT_IMPLEMENTED'));
});

test('중단된 전환은 체크포인트로 되돌리고 입력을 바꾸지 않는다', () => {
  const save = createNewSave({ now });
  save.era.current = 'modern-2026';
  save.player.position = [5, 5];
  save.era.transition = { from: 'joseon-1792', to: 'modern-2026', placeId: 'mapo.market', checkpoint: { era: 'joseon-1792', position: [1, 9] } };
  const frozen = structuredClone(save);
  const { save: recovered, recovered: flag } = recoverInterruptedTransition(save);
  assert.equal(flag, true);
  assert.deepEqual(save, frozen);
  assert.equal(recovered.era.current, 'joseon-1792');
  assert.deepEqual(recovered.player.position, [1, 9]);
  assert.equal(recovered.era.transition, null);
  assert.deepEqual(recovered.era.lastRecovery, { from: 'joseon-1792', to: 'modern-2026', placeId: 'mapo.market' });
  assert.equal(recoverInterruptedTransition(recovered).recovered, false);
});

test('저장을 읽을 때 마이그레이션 파이프라인이 중단된 전환을 복구한다', () => {
  const save = createNewSave({ now });
  save.era.current = 'modern-2026';
  save.era.transition = { from: 'joseon-1792', to: 'modern-2026', checkpoint: { era: 'joseon-1792', position: [0, 8] } };
  const result = migrateSave(save, { now });
  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(result.save.era.current, 'joseon-1792');
});
