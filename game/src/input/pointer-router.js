// 멀티터치 포인터 라우터. 포인터마다 담당 컨트롤을 정하고 서로 독립적으로 처리한다.
// KOREA Alpha QA에서 확인된 규칙을 반영한다:
//  - 스틱을 누른 채 두 번째 손가락의 click은 발생하지 않을 수 있으므로 버튼은 pointerdown에서 즉시 실행한다.
//  - 스틱은 처음 잡은 포인터 하나만 소유한다. 다른 포인터는 스틱을 빼앗지 않는다.
//  - 취소·창 이탈 시 모든 포인터를 해제한다.

import { stickVector } from './intents.js';

/**
 * @param {{
 *   hitTest(x: number, y: number): string|null,  // 'stick' | 'jump' | 'run' | 'interact' | 'map' | null
 *   stickCenter(): {cx: number, cy: number, r: number},
 *   intents: ReturnType<import('./intents.js').createIntentBuffer>,
 *   snap8?: boolean,
 *   onStick?(vector: object): void,
 * }} options
 */
export function createPointerRouter({ hitTest, stickCenter, intents, snap8 = false, onStick = () => {} }) {
  const owners = new Map();
  let stickPointer = null;
  const updateStick = (x, y) => {
    const { cx, cy, r } = stickCenter();
    const vector = stickVector(x - cx, y - cy, r, { snap8 });
    intents.setStick(vector);
    onStick(vector);
  };
  const releaseStick = () => {
    stickPointer = null;
    intents.setStick(null);
    onStick({ x: 0, forward: 0, magnitude: 0 });
  };
  return {
    /** @returns {string|null} 이 포인터가 맡은 컨트롤. null이면 카메라 등 다른 처리에 넘긴다. */
    down({ pointerId, x, y }) {
      if (owners.has(pointerId)) return owners.get(pointerId);
      const control = hitTest(x, y);
      if (!control) return null;
      if (control === 'stick') {
        if (stickPointer !== null) return null;
        stickPointer = pointerId;
        updateStick(x, y);
      } else {
        intents.press(control);
      }
      owners.set(pointerId, control);
      return control;
    },
    move({ pointerId, x, y }) {
      if (pointerId === stickPointer) updateStick(x, y);
      return owners.get(pointerId) ?? null;
    },
    up({ pointerId }) {
      if (pointerId === stickPointer) releaseStick();
      const control = owners.get(pointerId) ?? null;
      owners.delete(pointerId);
      return control;
    },
    cancelAll() {
      owners.clear();
      if (stickPointer !== null) releaseStick();
      intents.releaseAll();
    },
    get activePointers() {
      return owners.size;
    },
  };
}
