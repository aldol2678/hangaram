# HG-01 마포나루 블록아웃 · 검증 상태

- 작성: 2026-10-23
- 범위: 공개 1792 나루 1청크(게임 로컬 X[-32,32], Z[32,96]); 기존 3청크와 2026·갈대 물가는 보존
- 물가: 청크 내부 모래톱·얕은 물 Z84~96, 바깥 연속 수면 Z>=96. 실제 역사 하안선·GIS 복원 아님.
- 배·짐·인물: 대체 primitive/상호작용 자리표시만. 항해·퀘스트 로직 미구현.
- 정적 계약: 공개 형식 검사, 경계/경로 0.5m BFS, 도달성, 수면 분리 테스트를 test/hg01-naru.test.mjs에 추가.
- 검증: 공개 코드 및 신규 계약 테스트 GitHub 반영·readback 확인. 격리된 로컬 순수 계약 테스트 6/6 PASS(구현 로직); 새로 반영한 저장소 전체 테스트와 비공개 클론 실호출은 미실행.
- 공개 CI: Draft PR 정책에 따라 verify SKIPPED. SKIPPED는 PASS가 아니다.
- 비공개 WorldForge PR #10은 별도 CI 78/78 PASS 기록이 있지만, 새로 수정한 공개 bridge 명령의 종단 간 PASS 증거는 아니다.
- 남은 작업: 비공개 KOREA 엔진 연결, 시장 왕복·청크 실패 복구, QA 반입, 실제 플레이 검증.


## HG-01 브리지 검사 확장 (2026-10-23)

- 대상: `scripts/check-private-bridge.mjs`, `game/src/engine/hg01-bridge-contract.js`, `test/hg01-bridge-contract.test.mjs`.
- 기존 3청크 원본 ID·URI·좌표·저장 상태 검증 유지.
- 네 번째 `hg-naru` 청크와 예약 청크 충돌, 월드 경계 Z94.5 검사.
- 공개 `naru.blockout.json` ↔ 비공개 `vendor/hangaram/naru.blockout.json` 원본 바이트, Git Blob SHA, 소스 커밋 계보 검사.
- PR #9의 원본 `cb4d077`은 변경하지 않으며, 비공개 PR #10은 그 후속 커밋인지 검증.
- 이전 M0 `qa/m0/private-bridge-report.json`은 덮어쓰지 않고 신규 결과를 `qa/hg-01/private-bridge-report.json`에 기록.
- `--baseline-only`는 기존 PR #9 3청크 호환성 검사 전용. 이 옵션으로 HG-01 통합 완료를 주장하지 않는다.

```sh
# 로컬 두 저장소 체크아웃(Node.js 22+, 전제: 관련 Git history 있음)
npm test
WORLDFORGE_KOREA_DIR=../aldol-worldforge/examples/worldforge-korea npm run check:bridge -- --require --write
```

상대 경로는 실제 로컬 디렉터리 구조에 맞게 조정해야 한다. `--require`로 연결 실패를 SKIPPED가 아닌 실패로 취급한다.

### 확인 범위

- GitHub 파일 반영/readback: 확인.
- 격리 순수 계약 테스트(의도적 URI 변경·예약 셀 점유·원본 변조): 6/6 PASS.
- 리포지토리 전체 `npm test` 및 위 비공개 실호출: 미실행·검증 미완료.
- 브라우저 실제 이동, 모바일 실기기, main 병합, QA/운영 배포: 미실행.


## 2026-10-23 실제 검증 · 브리지 통합과 3D 도보 플레이 (Claude Code 원격 세션)

이 절은 로컬에서 두 저장소를 실제로 체크아웃해 실행한 결과다. 위 절의 "미실행" 기록은 이전 시점 기록으로 남긴다.

| 게이트 | 판정 | 대상 |
| --- | --- | --- |
| BRIDGE | **PASS** | 공개 이 브랜치 ↔ 비공개 `aldol-worldforge` PR #10 head `5d215b3` |
| BUILD | **PASS** | 공개 `npm run verify` 72/72 · 비공개 게임 80/80, 런타임 5/5, 빌드·무결성 |
| PLAYABLE | **PASS (에뮬레이션 기준)** | 비공개 KOREA 런타임의 시장↔마포나루 도보 왕복·청크 재시도·기존 기능 회귀. 실기기 미검증 |

### BRIDGE

- `WORLDFORGE_KOREA_DIR=<비공개 체크아웃>/examples/worldforge-korea npm run check:bridge -- --require --write` → **23/23 PASS** (`private-bridge-report.json`, `logs/check-bridge-require-write.txt`). SKIPPED가 아니라 실제 import 결과다.
  - 기존 3청크 ID·좌표·URI 동일, `hg-naru` X[-32,32] Z[32,96] `chunks/hg-naru.json` 동일, 계획·예약 셀 미점유, 기존 ID 재사용 없음
  - 공개 `naru.blockout.json` ↔ 비공개 vendor 사본 바이트 동일, Git blob SHA `ab028d25…` 일치, 원본 커밋 `479a721b`가 공개 이력에 있음, 비공개가 KOREA 기준 `cb4d077`의 후손
  - 저장 키 `korea.alpha01.market.save.v1`, 재화 9필드, 의뢰 ID 4·연결 의뢰 3·채집 4 동일, 저장 왕복 보존
- `npm run check:bridge:negative -- --write` → **15/15 기대대로 FAIL 검출** (`bridge-negative-report.json`). 비공개·공개 각각 임시 git worktree에 변조를 하나씩 넣고 실제 브리지를 돌렸다: 잘못된 나루 URI, 옮긴 나루 경계, 바뀐 기존 시장 URI, 예약 셀 점유, 변조된 비공개 원본, 변조된 공개 원본, 위조 blob SHA, 모르는 원본 커밋, 다른 저장소, 남쪽 경계 미확장, 저장 키 변경, 의뢰 ID 변경, PR #9 커밋(HG-01 없음), Alpha 0.4 커밋(기준 후손 아님). 변조 없는 대조군은 PASS. 작업 체크아웃은 바꾸지 않았다.

### BUILD

- 공개: 깨끗한 `npm ci` 후 `npm run verify` — **처음 실행(1ffbe69)에서 69/71 FAIL**. HG-01이 나루를 `blockout`으로 바꾼 뒤 갱신되지 않은 M0 테스트 2개(레지스트리 중복 검사, 시대 전환 출발지 검사)였다. `6971222`에서 수정 후 72/72, 경계·빌드·배포물 검사 PASS (`logs/verify-at-1ffbe69-before-fix.txt`, `logs/verify-final.txt`).
- `node --test test/hg01-bridge-contract.test.mjs` 7/7 PASS.
- 비공개 결과는 PR #10 `qa/hg01/logs/build-gate.txt`.

### PLAYABLE (비공개 KOREA 런타임, 결과 원본은 PR #10 `qa/hg01/`)

- 환경: Chromium 141 headless + SwiftShader 소프트웨어 WebGL2, 모바일은 기기 에뮬레이션과 CDP 실제 터치 이벤트. 이전 세션의 `ERR_BLOCKED_BY_ADMINISTRATOR`는 이 환경에서 재현되지 않았다.
- 320×740 · 390×844 · 844×390(터치 스틱) · 1280×800(키보드)에서 각각 시장↔마포나루 왕복 2회를 **걸어서** 수행, 전부 PASS. 저장 위치로 순간이동한 구간 없음(시작 위치만 저장으로 지정).
- 22m 사전 로드(z≈12.4~13.7), 38m 해제(선착장 끝에서 시장 해제, z=−10에서 나루 해제), 화물·선착장 기둥·정박선 충돌과 z<90 물가 정지, 왕복 후 장면 노드 1,193 / 렌더 581 동일, 나루 안 저장 복원, 모바일 두 번째 손가락 달리기·점프 중 경계 통과.
- `hg-naru.json` 강제 실패 1회 → 경계 z=31.98에서 정지, 재시도 후 복구.
- 기존 기능 회귀: 지도·시작 시 청크 복구 PASS. 골목 배달·숲 채집·연결 의뢰 스크립트는 이 환경에서 PR #9 빌드에서도 같은 탭 시간 초과가 나서, 같은 버튼 DOM click 대체로 두 빌드 모두 PASS(손가락 적중 판정은 미검증).
- 결함 1건 수정(비공개 `f74e1c3`): 나루 안에서 한지 지도가 현재 지역을 시장으로 표시하고 위치 표시가 지도 밖으로 나가던 문제.

### 공개 미리보기

`QA_OUT=qa/hg-01/preview npm run qa:browser` — 4개 해상도 PASS, 1792 팩 12셀 중 나루 블록아웃 1개가 적재·표시됨 (`preview/`).

### 미검증

Android/iOS 실기기, 15분 이상 연속 스트리밍과 힙·GPU 메모리, 실제 손가락 탭 적중(기존 의뢰 버튼), GitHub Actions 재실행, 배포. 한지 지도의 나루 지역 추가·운송/낚시 의뢰·NPC는 범위 밖.
