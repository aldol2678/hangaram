// 엔진 무관 입력 의도(intent) 모델. 키보드·터치 스틱·버튼을 한 프레임 단위 의도로 합친다.
// 이동은 연속값(x = 오른쪽, forward = 화면 위쪽), 점프·상호작용·지도·취소는 한 번만 소비되는 엣지 입력,
// 달리기는 토글 상태다. 카메라 기준 방향 변환은 엔진 호스트가 한다.

export const ACTIONS = Object.freeze(['jump', 'interact', 'map', 'cancel']);

/** 기존 KOREA 조작과 같은 키 배치 (WASD/화살표, Shift 달리기 토글, Space 점프, E 상호작용, M 지도). */
export const KEY_BINDINGS = Object.freeze({
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run', Space: 'jump', KeyE: 'interact', KeyM: 'map', Escape: 'cancel',
});

const ZERO = Object.freeze({ x: 0, forward: 0, magnitude: 0 });

/**
 * 화면 좌표 변위(dx 오른쪽, dy 아래쪽)를 이동 벡터로 바꾼다.
 * @param {{deadZone?: number, snap8?: boolean}} [options] snap8: 45° 단위 고정 (KOREA 8방향 스틱 동작)
 */
export function stickVector(dx, dy, radius, { deadZone = 9, snap8 = false } = {}) {
  if (![dx, dy, radius].every(Number.isFinite) || radius <= deadZone) return ZERO;
  const length = Math.hypot(dx, dy);
  if (length <= deadZone) return ZERO;
  const magnitude = Math.min(1, (length - deadZone) / (radius - deadZone));
  let angle = Math.atan2(-dy, dx);
  if (snap8) angle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  // 부동소수 오차로 0이 아닌 미세값이 생기지 않게 반올림한다.
  const round = (v) => Math.round(v * 1e6) / 1e6 + 0;
  return { x: round(Math.cos(angle) * magnitude), forward: round(Math.sin(angle) * magnitude), magnitude };
}

export function keyboardVector(held) {
  const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
  const forward = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0);
  const length = Math.hypot(x, forward);
  return length ? { x: x / length, forward: forward / length, magnitude: 1 } : ZERO;
}

export function createIntentBuffer() {
  const held = new Set();
  const pending = new Set();
  let stick = ZERO;
  let run = false;
  return {
    /** @returns {boolean} 키가 바인딩돼 있으면 true (호출자가 preventDefault 판단) */
    key(code, down, { repeat = false } = {}) {
      const binding = KEY_BINDINGS[code];
      if (!binding) return false;
      if (['up', 'down', 'left', 'right'].includes(binding)) {
        if (down) held.add(binding);
        else held.delete(binding);
      } else if (down && !repeat) {
        if (binding === 'run') run = !run;
        else pending.add(binding);
      }
      return true;
    },
    setStick(vector) {
      stick = vector && vector.magnitude > 0 ? { x: vector.x, forward: vector.forward, magnitude: vector.magnitude } : ZERO;
    },
    press(action) {
      if (action === 'run') run = !run;
      else if (ACTIONS.includes(action)) pending.add(action);
    },
    get running() {
      return run;
    },
    /** 창 포커스 이탈·탭 숨김 시 눌린 상태를 모두 해제한다. 달리기 토글은 유지한다. */
    releaseAll() {
      held.clear();
      pending.clear();
      stick = ZERO;
    },
    /** 한 프레임 의도를 꺼낸다. 엣지 입력은 여기서 한 번만 소비된다. */
    consume() {
      const move = stick.magnitude > 0 ? stick : keyboardVector(held);
      const frame = { move: { ...move }, run };
      for (const action of ACTIONS) frame[action] = pending.has(action);
      pending.clear();
      return frame;
    },
  };
}
