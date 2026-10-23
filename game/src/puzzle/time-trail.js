// HG-03 / temporal route v1. Pure shared gameplay contract; no renderer or storage dependency.
// This small authored corridor is schematic, NOT a historic or geographic reconstruction.
export const TRAIL_ID = 'hg03.mapo-naru.time-trail.v1';
export const TRAIL_START = Object.freeze([26, 55]);
export const TRAIL_STEPS = Object.freeze([
  Object.freeze({ id: 'past-entry', era: 'joseon-1792', position: [26, 55], radius: 2, text: '1792년 나루 동쪽 통로 입구에 서기' }),
  Object.freeze({ id: 'modern-middle', era: 'modern-2026', position: [26, 68], radius: 2, text: '2026년에서 과거의 막힌 구간 통과하기' }),
  Object.freeze({ id: 'past-exit', era: 'joseon-1792', position: [26, 83], radius: 2, text: '1792년으로 돌아와 현대의 막힌 구간 통과하기' }),
]);
export const TRAIL_BARRIERS = Object.freeze([
  Object.freeze({ id: 'west-rail', era: 'both', position: [23, 0.65, 70], size: [1, 1.3, 36] }),
  Object.freeze({ id: 'east-rail', era: 'both', position: [30, 0.65, 70], size: [1, 1.3, 36] }),
  // Close the far end: the surrounding world is walkable, so side rails alone
  // let players go around both gates and enter the exit checkpoint from behind.
  Object.freeze({ id: 'end-rail', era: 'both', position: [26.5, 0.65, 88], size: [8, 1.3, 1] }),
  Object.freeze({ id: 'past-gate', era: 'joseon-1792', position: [26.5, 0.65, 62], size: [6, 1.3, 1] }),
  Object.freeze({ id: 'modern-gate', era: 'modern-2026', position: [26.5, 0.65, 76], size: [6, 1.3, 1] }),
]);
export const TRAIL_COMPLETE = TRAIL_STEPS.length;
export function trailBlocked(era, x, z, radius = 0.32) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return true;
  return TRAIL_BARRIERS.some(b => (b.era === 'both' || b.era === era) &&
    Math.abs(x - b.position[0]) < b.size[0] / 2 + radius &&
    Math.abs(z - b.position[2]) < b.size[2] / 2 + radius);
}
export function normalizeTrailProgress(value) {
  return Number.isInteger(value) && value >= 0 && value <= TRAIL_COMPLETE ? value : 0;
}
// Progress is monotonic; merely visiting a checkpoint in the wrong era changes nothing.
// No reward, external state, or inventory mutation is performed here.
export function advanceTrail(value, era, position) {
  const progress = normalizeTrailProgress(value);
  const step = TRAIL_STEPS[progress];
  if (!step || !Array.isArray(position) || position.length !== 2 || !position.every(Number.isFinite) || era !== step.era) return progress;
  return Math.hypot(position[0] - step.position[0], position[1] - step.position[1]) <= step.radius ? progress + 1 : progress;
}
export function trailInstruction(value) {
  const progress = normalizeTrailProgress(value);
  return progress === TRAIL_COMPLETE ? '시간의 나루 첫 길찾기 완료! 두 시대를 오가며 통로를 열었어.' :
    `시간축 길찾기 ${progress}/${TRAIL_COMPLETE} · ${TRAIL_STEPS[progress].text}`;
}
