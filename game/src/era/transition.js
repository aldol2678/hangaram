// Default remains disabled; HG-02 adapters opt into the verified mapo.naru location.
// 여기 있는 것은 (1) 전환 전 사전 점검 규칙과 (2) 전환 도중 중단된 저장의 복구 규칙뿐이다.
//
// 단계: stable → preflight → committing → stable
//   - preflight는 순수 함수이며 저장을 바꾸지 않는다.
//   - committing 동안에만 save.era.transition에 체크포인트가 기록된다.
//   - 저장을 읽을 때 transition이 남아 있으면 커밋이 끝나지 않은 것으로 보고 체크포인트로 되돌린다.

export const ERA_TRANSITION_ENABLED = false;

export const TRANSITION_BLOCKERS = Object.freeze({
  E_TRANSITION_NOT_IMPLEMENTED: '시대 전환은 아직 구현되지 않았어.',
  E_POSITION_UNAVAILABLE: '검증된 나루 안에서만 전환할 수 있어.',
  E_TARGET_BLOCKED: '다른 시대의 같은 위치가 막혀 있어. 이동한 뒤 다시 시도해 줘.',
  E_SAME_ERA: '이미 이 시대에 있어.',
  E_UNKNOWN_ERA: '알 수 없는 시대야.',
  E_UNKNOWN_PLACE: '알 수 없는 장소야.',
  E_SOURCE_PLACE_UNAVAILABLE: '지금 시대에서 이 장소의 내용이 없어.',
  E_TARGET_PLACE_UNAVAILABLE: '도착할 시대에 이 장소의 내용이 아직 없어.',
  E_PLAYER_BUSY: '진행 중인 작업을 먼저 끝내거나 취소해 줘.',
  E_TRANSITION_IN_PROGRESS: '다른 전환이 끝나지 않았어.',
});

/**
 * 시대 전환 사전 점검. 막는 이유를 모두 모아 돌려준다.
 * @param {ReturnType<import('./registry.js').createEraRegistry>} registry
 * @param {{save: object, toEra: string, placeId: string, busy?: boolean}} request
 */
export function preflightTransition(registry, { save, toEra, placeId, busy = false, capability = false }) {
  const blockers = [];
  const fromEra = save?.era?.current;
  if (!ERA_TRANSITION_ENABLED && !(capability && placeId === 'mapo.naru')) blockers.push('E_TRANSITION_NOT_IMPLEMENTED');
  const [x, z] = save?.player?.position ?? [];
  if (capability && placeId === 'mapo.naru' && !(Number.isFinite(x) && Number.isFinite(z) && x >= -31.68 && x <= 31.68 && z >= 32.32 && z <= 95.68)) blockers.push('E_POSITION_UNAVAILABLE');
  if (save?.era?.transition) blockers.push('E_TRANSITION_IN_PROGRESS');
  if (busy) blockers.push('E_PLAYER_BUSY');
  const known = new Set(registry.eras);
  if (!known.has(fromEra) || !known.has(toEra)) blockers.push('E_UNKNOWN_ERA');
  else if (fromEra === toEra) blockers.push('E_SAME_ERA');
  if (!registry.place(placeId)) blockers.push('E_UNKNOWN_PLACE');
  else if (known.has(fromEra) && known.has(toEra)) {
    if (!registry.placeInEra(placeId, fromEra).hasContent) blockers.push('E_SOURCE_PLACE_UNAVAILABLE');
    if (!registry.placeInEra(placeId, toEra).hasContent) blockers.push('E_TARGET_PLACE_UNAVAILABLE');
  }
  return {
    ok: blockers.length === 0,
    blockers,
    messages: blockers.map((code) => TRANSITION_BLOCKERS[code]),
    plan: blockers.length ? null : { fromEra, toEra, placeId, spawn: registry.placeInEra(placeId, toEra).spawn },
  };
}

/**
 * 읽은 저장에 끝나지 않은 전환이 있으면 체크포인트로 되돌린다. 입력은 바꾸지 않는다.
 * @returns {{save: object, recovered: boolean}}
 */
export function recoverInterruptedTransition(save) {
  const transition = save?.era?.transition;
  if (!transition) return { save, recovered: false };
  const next = structuredClone(save);
  const checkpoint = transition.checkpoint ?? {};
  next.era.current = typeof checkpoint.era === 'string' ? checkpoint.era : transition.from ?? next.era.current;
  if (Array.isArray(checkpoint.position)) next.player.position = [...checkpoint.position];
  next.era.transition = null;
  next.era.lastRecovery = { from: transition.from ?? null, to: transition.to ?? null, placeId: transition.placeId ?? null };
  return { save: next, recovered: true };
}
