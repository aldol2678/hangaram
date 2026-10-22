# HG-01 · 마포나루 3D 블록아웃 — 수정 파일과 테스트 계획

- 선행: M0 Foundation (이 브랜치)
- 대상 셀: `joseon-1792:naru`, 셀 `0:1`, X[-32,32] Z[32,96], 장소 `mapo.naru`
- 완료 정의: 공개 블록아웃이 검증·미리보기에 나타나고, 비공개 KOREA 런타임에서 시장↔마포나루 왕복이 회귀 없이 된다. 선착장·정박선·화물은 primitive 대체물이며 아트·낚시·운송 의뢰는 포함하지 않는다.

## 0. 착수 전 결정 필요 (알돌)

1. **강가 선 위치**: 지형 수면은 지금 Z 96부터다(설계 요약: 수면은 육지 청크 밖 장식 영역). 선착장을 청크 안에 두려면 청크 내부에 얕은 물·모래톱 primitive를 두고(예: Z 84~96), 지형 수면은 Z 96 이후로 유지하는 안을 권장한다.
2. **비공개 런타임 변경 승인**: 2트랙(아래 B)은 비공개 저장소에 새 브랜치·Draft PR을 만든다. PR #9 브랜치는 건드리지 않는다.
3. **Actions 사용**: 비공개 저장소 Actions 예산 리셋(2026-11-01) 전에는 로컬 검증만 하고 CI는 수동 1회로 제한한다.

## A. 공개 저장소 `aldol2678/hangaram`

| 파일 | 변경 |
| --- | --- |
| `game/worldpacks/joseon-1792/chunks/naru.blockout.json` | **신규.** 바닥(64×64), 시장에서 이어지는 큰길(폭 6m, x=0, Z 32→84), 완만한 경사 표현 단(높이 차 0.3m 이하 3단), 모래톱·얕은 물(Z 84~96, `collision: none`), 선착장 본체·말뚝, 정박선 2척(정적 상자), 화물 더미 3곳, 짐꾼 자리 1곳·물류 의뢰 자리 1곳(`placeholder: true`). 목표 primitive 120개 이하 |
| `game/worldpacks/joseon-1792/pack.json` | `naru`: `status` `planned`→`blockout`, `blockout: "chunks/naru.blockout.json"`, `blockoutTarget` 제거 |
| `game/src/era/blockout.js` | 경계 연결 검사 함수 추가: 인접 청크 경계 위 경로 끝점·폭 일치(시장 큰길 x=0, 폭 6m), 경계 2m 띠 안 `solid` 금지 |
| `test/hg01-naru.test.mjs` | **신규.** 아래 테스트 A1~A6 |
| `test/era-pack.test.mjs`, `test/registry.test.mjs`, `test/engine.test.mjs` | 상태 기대값 갱신 (blockout 1, planned 1, 공개 호스트 적재 가능 1) |
| `scripts/qa-browser.mjs` | 마포나루 초점 이동 후 primitive 렌더 수·화면 캡처 추가 |
| `scripts/check-private-bridge.mjs` | KOREA 카탈로그에 `hg-naru`가 있으면 `toWorldForgeChunkCatalog` 결과와 좌표·URI 일치 검사, 벤더 사본 SHA-256 대조 |
| `docs/specs/era-pack.md`, `qa/hg-01/REPORT.md` | 현재 데이터 갱신, 실행 결과 기록 |

### 테스트 A

- A1 블록아웃 검증 통과 (ID 접두사 `hg.j1792.naru.`, 경계, 예산, 자리표시)
- A2 시장 경계 연결: Z=32 위 경로 끝점 x=0, 폭 6m. 경계 2m 띠에 `solid` 없음
- A3 보행 가능 경로: 0.5m 격자 BFS로 입구(0, 32.5)에서 선착장 끝·화물 자리·짐꾼 자리까지 도달 (solid 외곽 + 플레이어 반경 0.32m, KOREA 충돌 여유와 같음)
- A4 모든 자리표시 상호작용이 보행 경로에서 반경 안
- A5 수면 primitive는 `collision: none`, 지형 수면(Z≥96)과 겹치지 않음
- A6 브라우저 QA: 4개 해상도에서 마포나루 primitive 표시, 오류 0, 넘침 없음, 조작 겹침 없음

## B. 비공개 저장소 `aldol2678/aldol-worldforge` (새 브랜치, PR #9 head `cb4d077`에서 분기)

| 파일 | 변경 |
| --- | --- |
| `examples/worldforge-korea/vendor/hangaram/naru.blockout.json` | **신규.** 공개 블록아웃 사본 + 출처 커밋·SHA-256 (`vendor/hangaram/SOURCE.json`) |
| `examples/worldforge-korea/src/hangaram-blockout.js` | **신규.** 블록아웃 → WorldForge 엔티티(`core.prop` + `core.primitive`)와 충돌 블록 `[x, z, w, d]` 변환 |
| `examples/worldforge-korea/src/chunk-catalog.js` | `CHUNKS`에 `{id:'hg-naru', name:'마포나루', min:[-32,32], max:[32,96], uri:'chunks/hg-naru.json'}` 추가, `WORLD_BOUNDS.maxZ` 30.5→94.5 |
| `examples/worldforge-korea/src/chunk-content.js` | `CHUNK_DOCUMENTS['hg-naru']` 추가, `world.backdrop` 남쪽 확장, 시장 남쪽 큰길 끝 연결 |
| `examples/worldforge-korea/src/collision.js` | 마포나루 `solid` 블록 포함 |
| `examples/worldforge-korea/src/main.js` | 상태 표시 `n/3` → `n/${CHUNKS.length}` |
| `examples/worldforge-korea/test/chunks.test.mjs` | 4청크 문서·자산·스트리밍(시장 남쪽 22m 이내 사전 로드, 38m 밖 해제)·경계 차단·저장 위치 유효 범위 |
| `examples/worldforge-korea/test/browser-chunks.cjs` | 시장↔마포나루 왕복 2회, `hg-naru` 다운로드 실패→재시도, 장면 노드 수 복원 |

저장 형식 변경 없음: 새 진행 상태가 없으므로 `korea.alpha01.market.save.v1` 키·필드 유지. 마포나루 안의 위치만 새로 유효해진다.

### 테스트 B

- B1 기존 게임 테스트 73개 + 런타임 5개 PASS 유지 (M0 기준선과 같은 수, 신규 테스트는 별도 집계)
- B2 신규 청크 테스트 PASS, 빌드·`check:dist` PASS, app.js 크기·SHA-256 기록
- B3 로컬 Chromium 소프트웨어 WebGL2: 시장→마포나루→시장 2회, 기존 숲길 왕복, 의뢰·저장 복원, 오류 0
- B4 모바일 에뮬레이션 320/390/844: 스틱+달리기 동시 터치로 경계 통과
- B5 `npm run check:bridge` (한가람 쪽) PASS: 카탈로그 좌표·URI·벤더 해시 일치
- 미검증으로 남길 것: Android/iOS 실기기, 15분 연속 스트리밍, 메모리

## 하지 않는 것

갈대 물가 청크, 낚시·운송 의뢰, 짐꾼 NPC 동작, 한지 지도 지역 추가, 선박 아트, 2026 내용, 시대 전환, main 병합, 운영·QA 배포 갱신.
