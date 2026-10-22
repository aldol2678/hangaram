// 장소 ID: 시대와 무관한 안정 식별자 ('<권역>.<장소>', 소문자 kebab, 2~4단).
// 같은 장소 ID는 모든 시대팩에서 같은 셀(공통 좌표)을 가리키고,
// 시대별로 달라지는 것은 지형·청크 내용·출입 가능 여부뿐이다.
// 한 번 공개한 장소 ID는 개명하지 않는다. 저장 데이터와 의뢰 진행이 이 ID를 참조한다.

export const PLACE_ID_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){1,3}$/;

export const isPlaceId = (id) => typeof id === 'string' && PLACE_ID_PATTERN.test(id);

export function assertPlaceId(id) {
  if (!isPlaceId(id)) throw new TypeError(`E_PLACE_ID: ${JSON.stringify(id)}`);
  return id;
}
