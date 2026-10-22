import test from 'node:test';
import assert from 'node:assert/strict';
import { KEY_BINDINGS, createIntentBuffer, keyboardVector, stickVector } from '../game/src/input/intents.js';
import { createPointerRouter } from '../game/src/input/pointer-router.js';
import { MIN_JUMP, MIN_TOUCH, computeTouchLayout, hitTestLayout, validateTouchLayout } from '../game/src/input/touch-layout.js';

test('스틱 벡터: 데드존, 크기 제한, 화면 위 = forward', () => {
  assert.deepEqual(stickVector(3, 3, 60), { x: 0, forward: 0, magnitude: 0 });
  const up = stickVector(0, -80, 60);
  assert.equal(up.magnitude, 1);
  assert.equal(up.x, 0);
  assert.equal(up.forward, 1);
  const half = stickVector(34.5, 0, 60);
  assert.ok(Math.abs(half.magnitude - 0.5) < 1e-9);
  assert.equal(half.forward, 0);
  assert.deepEqual(stickVector(Number.NaN, 0, 60), { x: 0, forward: 0, magnitude: 0 });
});

test('스틱 8방향 고정은 KOREA 스틱처럼 45° 단위로 맞춘다', () => {
  const v = stickVector(50, -20, 60, { snap8: true });
  assert.equal(v.forward, 0);
  assert.ok(v.x > 0);
  const diag = stickVector(40, -38, 60, { snap8: true });
  assert.ok(Math.abs(diag.x - diag.forward) < 1e-6);
});

test('키보드 배치는 기존 KOREA 조작과 같다', () => {
  assert.equal(KEY_BINDINGS.KeyW, 'up');
  assert.equal(KEY_BINDINGS.ShiftLeft, 'run');
  assert.equal(KEY_BINDINGS.Space, 'jump');
  assert.equal(KEY_BINDINGS.KeyE, 'interact');
  assert.equal(KEY_BINDINGS.KeyM, 'map');
  const diag = keyboardVector(new Set(['up', 'right']));
  assert.ok(Math.abs(Math.hypot(diag.x, diag.forward) - 1) < 1e-12);
  assert.equal(keyboardVector(new Set(['up', 'down'])).magnitude, 0);
});

test('의도 버퍼: 엣지 입력은 한 번만 소비, 반복 키는 무시, 달리기는 토글', () => {
  const intents = createIntentBuffer();
  intents.key('Space', true);
  intents.key('Space', true, { repeat: true });
  intents.key('KeyE', true);
  intents.key('ShiftLeft', true);
  intents.key('KeyW', true);
  const first = intents.consume();
  assert.equal(first.jump, true);
  assert.equal(first.interact, true);
  assert.equal(first.run, true);
  assert.equal(first.move.forward, 1);
  const second = intents.consume();
  assert.equal(second.jump, false);
  assert.equal(second.interact, false);
  assert.equal(second.run, true);
  assert.equal(second.move.forward, 1, '누르고 있는 이동은 유지');
  intents.key('KeyW', false);
  assert.equal(intents.consume().move.magnitude, 0);
  assert.equal(intents.key('KeyQ', true), false);
});

test('의도 버퍼: 스틱이 키보드보다 우선하고 releaseAll은 달리기 토글을 유지한다', () => {
  const intents = createIntentBuffer();
  intents.key('KeyD', true);
  intents.setStick({ x: 0, forward: -0.5, magnitude: 0.5 });
  assert.deepEqual(intents.consume().move, { x: 0, forward: -0.5, magnitude: 0.5 });
  intents.press('run');
  intents.press('jump');
  intents.releaseAll();
  const frame = intents.consume();
  assert.equal(frame.move.magnitude, 0);
  assert.equal(frame.jump, false);
  assert.equal(frame.run, true);
});

const layout = computeTouchLayout({ width: 390, height: 844 });
const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

test('멀티터치: 스틱을 누른 채 두 번째 손가락의 점프·달리기가 pointerdown 즉시 동작한다', () => {
  const intents = createIntentBuffer();
  const stickEvents = [];
  const router = createPointerRouter({ hitTest: (x, y) => hitTestLayout(layout, x, y), stickCenter: () => layout.stick, intents, onStick: (v) => stickEvents.push(v) });
  assert.equal(router.down({ pointerId: 1, x: layout.stick.cx, y: layout.stick.cy - layout.stick.r }), 'stick');
  const jump = center(layout.buttons.jump);
  assert.equal(router.down({ pointerId: 2, ...jump }), 'jump');
  const run = center(layout.buttons.run);
  assert.equal(router.down({ pointerId: 3, ...run }), 'run');
  assert.equal(router.activePointers, 3);
  const frame = intents.consume();
  assert.equal(frame.jump, true);
  assert.equal(frame.run, true);
  assert.ok(frame.move.forward > 0.8, '스틱 유지 중 이동');
  router.up({ pointerId: 2 });
  assert.ok(intents.consume().move.forward > 0.8, '일부 손가락만 떼도 스틱 유지');
  router.up({ pointerId: 1 });
  assert.equal(intents.consume().move.magnitude, 0);
  assert.equal(stickEvents.at(-1).magnitude, 0);
});

test('멀티터치: 두 번째 포인터는 스틱을 빼앗지 않고, cancelAll은 모두 해제한다', () => {
  const intents = createIntentBuffer();
  const router = createPointerRouter({ hitTest: (x, y) => hitTestLayout(layout, x, y), stickCenter: () => layout.stick, intents });
  router.down({ pointerId: 1, x: layout.stick.cx + layout.stick.r, y: layout.stick.cy });
  assert.equal(router.down({ pointerId: 9, x: layout.stick.cx, y: layout.stick.cy - layout.stick.r }), null);
  router.move({ pointerId: 9, x: layout.stick.cx, y: layout.stick.cy - layout.stick.r });
  assert.ok(intents.consume().move.x > 0.8, '처음 잡은 손가락 방향 유지');
  router.cancelAll();
  assert.equal(router.activePointers, 0);
  assert.equal(intents.consume().move.magnitude, 0);
  assert.equal(router.down({ pointerId: 5, x: 195, y: 300 }), null, '조작 밖은 카메라 등에 넘긴다');
});

for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
  { width: 390, height: 844, safe: { top: 47, bottom: 34 } },
  { width: 844, height: 390, safe: { left: 47, right: 47, bottom: 21 } },
]) {
  test(`터치 배치 ${viewport.width}x${viewport.height}${viewport.safe ? ' safe-area' : ''}: 44px 이상, 겹침 없음, safe-area 안`, () => {
    const result = computeTouchLayout(viewport);
    assert.deepEqual(validateTouchLayout(result), []);
    assert.equal(result.orientation, viewport.width >= viewport.height ? 'landscape' : 'portrait');
    assert.ok(result.buttons.jump.w >= MIN_JUMP);
    for (const r of Object.values(result.buttons)) assert.ok(r.w >= MIN_TOUCH && r.h >= MIN_TOUCH);
    assert.equal(hitTestLayout(result, result.stick.cx, result.stick.cy), 'stick');
    for (const [name, r] of Object.entries(result.buttons)) assert.equal(hitTestLayout(result, r.x + r.w / 2, r.y + r.h / 2), name);
  });
}

test('터치 배치 검증은 실제 위반을 잡아낸다', () => {
  const broken = structuredClone(computeTouchLayout({ width: 390, height: 844 }));
  broken.buttons.run = { ...broken.buttons.jump };
  broken.buttons.map.w = 30;
  const issues = validateTouchLayout(broken);
  assert.ok(issues.some((i) => /run overlaps jump|jump overlaps run/.test(i)));
  assert.ok(issues.some((i) => /map: smaller than 44px/.test(i)));
});
