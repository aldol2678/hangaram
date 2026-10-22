# 저장 형식과 마이그레이션 규칙 v1

구현: `game/src/save/format.js`, `migrations.js`, `legacy-korea.js`, `storage.js` · 테스트: `test/save.test.mjs`, `test/transition.test.mjs`

## 키

| 키 | 소유 | 한가람의 동작 |
| --- | --- | --- |
| `hangaram.save` | 한가람 | 읽기·쓰기. 버전이 올라가도 키는 바꾸지 않는다 |
| `hangaram.save.backup.v<N>` | 한가람 | 버전 N 원문을 마이그레이션 후 첫 저장 직전에 한 번만 기록 |
| `korea.alpha01.market.save.v1` | WorldForge KOREA (PR #9) | **읽기만**. 쓰지도 지우지도 않는다 |

`storage.js`는 `getItem`/`setItem`만 쓰며 `removeItem`을 호출하지 않는다 (테스트로 확인).

## v1 구조

```js
{
  format: 'hangaram.save', version: 1, createdAt: '<ISO>',
  era: { current: 'joseon-1792', transition: null /* 커밋 중에만 객체 */ },
  player: { position: [x, z] | null },          // 공통 좌표. null이면 기본 시작 위치 [0, 8]
  inventory: { coins, wood, cloth, water, rice, meals, dishes, pouches }, // 0 이상 정수
  stats: { sales },
  progress: { errands: {}, life: {}, harvest: {} }, // 기존 KOREA ID를 키로 그대로 보존
  legacy: { koreaAlpha?: { storageKey, importedAt, raw } } // 레거시 원문 그대로
}
```

## 규칙

1. **앞으로만.** 버전 판별 `detectVersion`: 형식 필드가 없는 KOREA 저장 = 0, `hangaram.save` = 그 버전, 그 외 = 알 수 없음. 현재보다 높은 버전은 `E_SAVE_FROM_FUTURE`로 읽기 전용 처리하고 덮어쓰지 않는다.
2. **입력 불변.** 모든 단계는 복제본에 적용한다.
3. **삭제 금지.** 알 수 없는 최상위 필드는 보존한다. 레거시 원문은 `legacy.koreaAlpha.raw`에 그대로 남긴다. 형식에 맞지 않는 값은 0/null로 두되 `reports[].adjusted`에 기록한다.
4. **단계 등록.** `MIGRATIONS`에 `{id, from, to, apply}`로 추가한다. `from`은 0부터 빈틈없이 이어지고 마지막 `to`는 `CURRENT_SAVE_VERSION`과 같아야 한다 (테스트로 강제). 단계마다 고정물 테스트를 둔다.
5. **검증 후 복구.** 마지막에 `validateSaveV1`로 구조를 검사하고, 끝나지 않은 시대 전환은 체크포인트로 되돌린다.
6. **손상·미래 저장은 읽기 전용.** `loadSave`가 `readOnly: true`를 돌려주면 `persistSave`는 쓰지 않는다. 사용자 확인 없는 초기화는 하지 않는다.
7. **백업 먼저.** 마이그레이션된 저장을 처음 쓸 때 이전 원문을 `hangaram.save.backup.v<N>`에 기록한다. 이미 있으면 덮어쓰지 않는다.

## 등록된 마이그레이션

| ID | 버전 | 내용 |
| --- | --- | --- |
| `m0001-wrap-korea-alpha` | 0 → 1 | KOREA Alpha 저장을 v1 봉투로 감싼다. 재화 8종·판매 수·위치를 옮기고, `errands`/`life`/`harvest`를 ID 그대로 복사하고, 원문을 보존한다. 시대는 `joseon-1792`. |

## 기존 게임 저장과의 관계

- KOREA 런타임(비공개)은 계속 자기 키를 쓴다. 한가람은 그 저장을 같은 출처(origin)에서 실행될 때만 가져올 수 있다. 다른 배포 주소에서는 localStorage가 분리되므로 가져오기 대상이 없다.
- 왕복 보존 확인: KOREA `normalizeState` 결과 → 한가람 v1 → 보존 원문을 다시 `normalizeState` → 원래와 동일 (`npm run check:bridge`, PR #9 @ `cb4d077`에서 PASS).
- 낚시·운송 등 신규 진행 상태는 v2 마이그레이션으로 추가한다 (`progress`에 새 키, 기본값 명시, 고정물 테스트).
