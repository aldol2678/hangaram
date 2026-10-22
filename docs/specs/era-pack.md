# 시대팩(era pack) 인터페이스 v1

구현: `game/src/era/era-pack.js`, `game/src/era/registry.js`, `game/src/era/blockout.js`, `game/src/era/transition.js`
데이터: `game/worldpacks/`

## 공통과 시대별의 분리

| 구분 | 무엇 | 어디 |
| --- | --- | --- |
| 공통 | 좌표계 `hangaram.local/v1` (m, +x 동, +z 남, 원점 = 중심 시장 청크 중심, 64m 청크) | `game/src/core/world-grid.js` |
| 공통 | 장소 ID와 기준점(anchor), 장소↔셀 대응 | `game/worldpacks/places.json` |
| 시대별 | 지형(`terrain`: 지면 높이, 수면) | 각 `pack.json`의 `terrain` |
| 시대별 | 청크 내용·상태, 엔티티 ID 접두사 | 각 `pack.json`의 `chunks`, `entityPrefix` |
| 시대별 | 기존 저장이 참조하는 ID 목록 | `joseon-1792/pack.json`의 `legacyIds` |

규칙:

- 같은 장소 ID는 모든 시대에서 같은 셀이다. 시대가 바뀌어도 바뀌는 것은 그 셀의 내용과 지형뿐이다 (검증: `era-pack.test.mjs` "공통 좌표 규칙").
- 지형은 팩마다 독립 객체이며 공유하지 않는다. `terrain`이 없으면 팩 검증이 실패한다.
- 한 번 공개한 장소 ID·엔티티 ID는 개명하지 않는다. 저장과 의뢰 진행이 참조한다.
- 좌표는 게임용 도식 좌표다. GIS·역사 실측 정합은 별도 연구 트랙(HOLD)이다.

## 청크 상태

| 상태 | 의미 | 필요한 필드 | 공개 미리보기 표시 |
| --- | --- | --- | --- |
| `legacy-reference` | 내용이 비공개 WorldForge KOREA에 있음 | `legacy {source, chunkId, uri, commit(40자)}` | 바닥 판 + "기존 KOREA 청크 · 비공개 런타임 필요" |
| `blockout` | 공개 블록아웃 문서가 있음 | `blockout: chunks/<id>.blockout.json` | primitive 렌더 |
| `planned` | 셀·작업 번호만 정해짐 | `plannedIn`, 선택 `blockoutTarget` | 반투명 판 + 점선 + "계획됨 · 미구현" |
| `reserved` | 공간 예약만 | — | 외곽선 + "예약 · 미설계" |

검증기가 막는 것: 계획·예약 청크에 블록아웃 연결, `legacy-reference`에 공개 블록아웃 연결, 예약 팩(`status: reserved`)에 예약 외 청크나 지형 기하, 수면과 육지 청크의 겹침, 셀·장소·청크 ID 중복.

## 현재 데이터 (M0)

- `joseon-1792` (in-development): 기존 3청크 `legacy-reference`(KOREA PR #9 @ `cb4d077`), `naru`(마포나루, HG-01)·`reed-shore`(갈대 물가) `planned`, 나머지 7셀 `reserved`. 지형은 한강 수면 1개(Z 96~224, 장식 영역, `draft-schematic`).
- `modern-2026` (reserved): 핵심 5개 장소 셀만 `reserved`, 지형 기하 없음.
- 서·동쪽 열 7셀의 장소 배정은 설계 요약의 나열 순서(북→남)를 따른 가배정이다. 정본(Notion 설계 v0.1)과 대조 후 확정한다.

## 블록아웃 문서 v1

```json
{
  "format": "hangaram.blockout", "version": 1, "era": "joseon-1792", "chunk": "naru",
  "primitives": [{ "id": "hg.j1792.naru.ground", "shape": "box", "position": [0, -0.2, 64], "size": [64, 0.4, 64], "yaw": 0, "color": "#c2b38c", "collision": "walkable" }],
  "paths": [{ "id": "hg.j1792.naru.path.main", "points": [[0, 32], [0, 82]], "width": 6 }],
  "interactions": [{ "id": "hg.j1792.naru.spot.cargo", "kind": "cargo-pile", "position": [8, 76], "radius": 2.4, "placeholder": true }]
}
```

- 모든 ID는 `<entityPrefix>.<chunkId>.`로 시작한다 (`hg.j1792.naru.`). 기존 KOREA ID(`lane.house.0` 등)와 충돌하지 않는다.
- primitive는 `box`/`cylinder`, 크기는 m, `yaw`는 도. 회전 시 외접 반경 기준으로 청크 경계 안이어야 한다.
- `collision`: `solid`/`walkable`/`none` — 데이터 표기일 뿐 충돌 판정은 호스트(WorldForge)가 한다.
- 상호작용은 게임 기능이 생기기 전까지 `placeholder: true`가 필수다.
- 청크당 primitive 400개 이하 (KOREA 최대 청크 342개 기준 모바일 예산).

## WorldForge 카탈로그 변환 (기존 3청크 재사용 경로)

`toWorldForgeChunkCatalog(pack)`는 KOREA `chunk-catalog.js`의 `CHUNKS` 항목 모양 `{id, name, min, max, uri}`을 만든다. 기존 청크는 KOREA ID·URI를 그대로, 신규 블록아웃 청크는 `hg-<id>`·`chunks/hg-<id>.json`을 쓴다. 실제 KOREA 값과의 일치는 `npm run check:bridge`(로컬, 비공개 체크아웃 필요)로 확인한다.

## 시대 전환 (M0: 미구현)

`ERA_TRANSITION_ENABLED = false`. 구현된 것은 규칙뿐이다.

- 사전 점검 `preflightTransition`: 미구현, 진행 중 전환, 작업 중, 같은/모르는 시대, 모르는 장소, 출발·도착 시대에 그 장소 내용이 없음 — 이유를 모두 모아 돌려준다. 저장을 바꾸지 않는다.
- 복구 `recoverInterruptedTransition`: 저장의 `era.transition`이 남아 있으면(커밋 중 중단) 체크포인트 시대·위치로 되돌린다. 저장을 읽을 때마다 마이그레이션 파이프라인 끝에서 실행된다.
- 5D 존재 전환, 실제 시대 이동 연출·적재는 범위 밖이다.
