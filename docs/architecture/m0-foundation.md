# 한가람 M0 Foundation · 구조와 재사용 의존성

기준일 2026-10-22. 결정 근거: [ADR-0001](../decisions/ADR-0001-public-private-boundary.md)

## 한눈에

```
                공개: aldol2678/hangaram                         비공개: aldol2678/aldol-worldforge
 ┌──────────────────────────────────────────────┐        ┌─────────────────────────────────────────┐
 │ game/worldpacks/  places · 1792 · 2026 팩     │        │ examples/worldforge-korea (PR #9 cb4d077)│
 │ game/src/core     공통 좌표 · 장소 ID          │  데이터 │  chunk-catalog · chunk-content · economy │
 │ game/src/era      시대팩 검증 · 레지스트리 ·    │  계약   │  locomotion · collision · input · UI     │
 │                   블록아웃 · 전환 안전 규칙     │ ─────▶ │ packages/worldforge-runtime-core         │
 │ game/src/save     저장 v1 · 마이그레이션 ·      │        │  (chunk-stream, runtime)                 │
 │                   KOREA 저장 가져오기           │        │ packages/worldforge-renderer-playcanvas  │
 │ game/src/input    입력 의도 · 멀티터치 · 배치   │        │ packages/worldforge-schema               │
 │ game/src/engine   엔진 호스트 계약 · 세션 ·     │        └─────────────────────────────────────────┘
 │                   KOREA 카탈로그 변환           │                   ▲
 │ game/src/preview  블록아웃 뷰어 (playcanvas npm)│     scripts/check-private-bridge.mjs
 └──────────────────────────────────────────────┘     (로컬 읽기 전용 대조, 코드 복사 없음)
```

## 모듈과 책임

| 경로 | 책임 | 상태 |
| --- | --- | --- |
| `game/src/core/world-grid.js` | `hangaram.local/v1` 좌표, 64m 셀, 경계·인접·겹침 | 구현·테스트 |
| `game/src/core/place-id.js` | 시대 무관 장소 ID 문법 | 구현·테스트 |
| `game/src/era/era-pack.js` | 장소·시대팩 검증, 청크 상태 4종 | 구현·테스트 |
| `game/src/era/blockout.js` | 블록아웃 문서 v1 검증 (ID 접두사·경계·예산·자리표시) | 구현·테스트, 실제 블록아웃은 HG-01 |
| `game/src/era/registry.js` | worldpacks 적재, 청크 서술자(출처·적재 가능 여부), 장소의 시대별 해석 | 구현·테스트 |
| `game/src/era/transition.js` | 시대 전환 사전 점검·중단 복구 규칙 | 규칙만 구현, **전환 자체는 미구현** |
| `game/src/save/*` | 저장 v1, 마이그레이션 체인, KOREA 저장 가져오기, 비파괴 저장소 어댑터 | 구현·테스트 |
| `game/src/input/intents.js` | 키보드·스틱·버튼 → 프레임 의도 (KOREA 키 배치 유지) | 구현·테스트 |
| `game/src/input/pointer-router.js` | 포인터별 독립 처리, pointerdown 즉시 실행, 스틱 소유권 | 구현·테스트·브라우저 확인 |
| `game/src/input/touch-layout.js` | 화면·safe-area → 조작 배치 (44px/점프 72px, 비겹침) | 구현·테스트·브라우저 확인 |
| `game/src/engine/host.js` | 엔진 호스트 계약, 헤드리스 NullHost | 구현·테스트 |
| `game/src/engine/session.js` | 시대 하나를 호스트에 올림 (12셀 전체, 스트리밍 없음) | 구현·테스트 |
| `game/src/engine/worldforge-catalog.js` | 시대팩 → KOREA `CHUNKS` 모양 변환 | 구현·테스트·비공개 대조 PASS |
| `game/src/preview/*` | 공개 블록아웃 뷰어 (검수용 초점 이동, 궤도 카메라) | 구현·브라우저 확인. **게임 런타임 아님** |

## 재사용 의존성

| 기능 | 재사용 대상 | 한가람 쪽 연결 | 공개 저장소에서 동작? |
| --- | --- | --- | --- |
| PlayCanvas 렌더링 | WorldForge renderer (비공개) | 엔진 호스트 계약. 미리보기는 npm `playcanvas@2.22.4` 직접 사용 | 미리보기만 |
| 청크 스트리밍 (22m 사전 로드 / 38m 유지) | `worldforge-runtime-core/chunk-stream` | `chunkDescriptors` → `toWorldForgeChunkCatalog` | 아니오 |
| 이동·충돌·점프 | KOREA `locomotion`/`collision` | 블록아웃 `collision` 표기, 입력 의도 프레임 | 아니오 |
| 상호작용·의뢰·경제 | KOREA `economy`/`errands`/`life-quests` | 저장 `progress`에 ID 그대로 보존, `legacyIds` 고정 | 아니오 |
| 저장 | KOREA `korea.alpha01.market.save.v1` | 읽기 전용 가져오기 + 한가람 v1 | 형식만 |
| 모바일 조작 | KOREA 8방향 스틱·멀티터치 수정 | `snap8` 옵션, 같은 키 배치, 같은 pointerdown 원칙 | 예 (미리보기) |
| 한지 지도·UI·글꼴 | KOREA `world-map`, Hanji 글꼴 | 없음 (권리 미확인, 이관 금지) | 아니오 |

## 작업 위치 (첫 3D 맵 개발)

- 마포나루 블록아웃 데이터: `game/worldpacks/joseon-1792/chunks/naru.blockout.json` (HG-01에서 생성, 현재 없음)
- 팩 상태 전환: `game/worldpacks/joseon-1792/pack.json`의 `naru`를 `planned` → `blockout`
- 형식 견본: `test/fixtures/naru.blockout.sample.json` (테스트 전용, 게임·미리보기 미적재)
- 미리보기 확인: `npm run build && npm run preview` → 마포나루 셀
- 실제 게임 연결: 비공개 저장소 별도 브랜치 (HG-01 계획서 참조)

## 명령

| 명령 | 내용 | CI |
| --- | --- | --- |
| `npm ci` | 고정 의존성 설치 (playcanvas 2.22.4, esbuild 0.25.12) | 예 |
| `npm test` | 단위 테스트 (node:test) | 예 |
| `npm run check:boundary` | 공개 경계 검사 | 예 |
| `npm run build` / `npm run check:dist` | 미리보기 빌드·무결성 | 예 |
| `npm run verify` | 위 4개 묶음 | 예 |
| `npm run check:bridge` | 비공개 KOREA 대조 (`WORLDFORGE_KOREA_DIR` 필요, 없으면 SKIPPED) | SKIPPED로 표시 |
| `npm run qa:browser` | Chromium 소프트웨어 WebGL2 4개 해상도 QA (전역 Playwright) | 아니오 |
| `npm run preview` | dist 로컬 정적 서버 (127.0.0.1:4173) | 아니오 |

CI(`.github/workflows/verify.yml`)는 Draft PR에서는 job을 건너뛰고(실행 시간 0), Ready for review·수동 실행 때만 1회 돈다.

## 범위 밖 (M0에서 구현하지 않음)

2026년 도시 내용, 실제 시대 전환, 5D 존재 전환, 신규 NPC AI, 낚시·운송 의뢰, 한지 지도 이관, 운영 배포.
