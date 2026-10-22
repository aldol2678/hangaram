// 미리보기 초점 이동과 궤도 카메라 계산 (순수 함수).
// 충돌·지형·점프가 없는 검수용 시점 이동이다. 게임의 캐릭터 이동(locomotion)이 아니다.

export const PREVIEW_SPEED = Object.freeze({ walk: 10, run: 28 });
export const ORBIT_LIMITS = Object.freeze({ minPitch: 12, maxPitch: 85, minDistance: 12, maxDistance: 320 });

const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

/** yaw(라디안) 기준 화면 앞·오른쪽 방향. yaw 0 = 북쪽(-z)을 바라봄. */
export function cameraAxes(yaw) {
  return {
    forward: [-Math.sin(yaw), -Math.cos(yaw)],
    right: [Math.cos(yaw), -Math.sin(yaw)],
  };
}

/**
 * @param {[number, number]} position 초점 (x, z)
 * @param {{move: {x: number, forward: number}, run: boolean}} frame 입력 의도
 * @param {{yaw: number, dt: number, bounds: {min: number[], max: number[]}}} context
 */
export function stepFocus(position, frame, { yaw, dt, bounds }) {
  const { forward, right } = cameraAxes(yaw);
  const speed = frame.run ? PREVIEW_SPEED.run : PREVIEW_SPEED.walk;
  const dx = (right[0] * frame.move.x + forward[0] * frame.move.forward) * speed * dt;
  const dz = (right[1] * frame.move.x + forward[1] * frame.move.forward) * speed * dt;
  return [clamp(position[0] + dx, bounds.min[0], bounds.max[0]), clamp(position[1] + dz, bounds.min[1], bounds.max[1])];
}

/** 궤도 카메라 위치. pitch는 도 단위, 0 = 수평, 90 = 바로 위. */
export function orbitCameraPosition(focus, { yaw, pitch, distance }) {
  const p = (clamp(pitch, ORBIT_LIMITS.minPitch, ORBIT_LIMITS.maxPitch) * Math.PI) / 180;
  const flat = Math.cos(p) * distance;
  return [focus[0] + Math.sin(yaw) * flat, Math.sin(p) * distance, focus[1] + Math.cos(yaw) * flat];
}
