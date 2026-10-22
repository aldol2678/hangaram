# 한가람 Map Sprint 01 · 기준선 확인 v1.0

- 확인일: 2026-10-22 (KST)
- 대상 체크리스트: 노션 《한가람 · 한강 월드맵 개발 설계 v0.1》 §7 Map Sprint 01 첫 항목
  > "기존 Alpha 0.5 PR #9, 청크 좌표 및 모바일 성능 기준선 확인"
- 상태: 확인 완료. PR #9 페이지 직접 열람은 3개 경로 모두 404로 BLOCKED이며, 그 사실과 우회 근거(등록부 원본·라이브 QA 라벨)를 분리해 기록했다. 등급 표기: OBSERVED(직접 확인) / REGISTRY(등록부 원본 직접 열람) / DOCUMENTED(설계 문서 기재, 코드 직접 검증 아님) / UNKNOWN / BLOCKED

## 0. 한 줄 결론

기준선으로 삼을 실체는 **aldol-worldforge(비공개) Draft PR #9가 가리키는 KOREA QA 배포**이며, 등록부에서 검증 완료된 배포는 Alpha 0.4 @ `f322abea`이고, 2026-10-22 밤 라이브 QA 사이트 제목은 **Alpha 0.5 QA**로 확인됐다. 즉 0.5는 "서빙 중인 라벨"까지는 OBSERVED, 0.5의 소스 커밋·배포 ID는 아직 UNKNOWN이다. 청크 기준선은 64×64m 3개(숲길·주거 골목·시장)이며, 모바일 실기기·장시간 성능 기준선은 **존재하지 않는다(UNVERIFIED)** — 있는 것은 소프트웨어 WebGL2/모바일 에뮬레이션 QA 기록뿐이다.

## 1. PR #9 — 무엇이 확인됐고 무엇이 막혔나

### REGISTRY (원본 직접 열람, 2026-10-22)
출처: GitHub `aldol2678/aldol-mcp-forge` 브랜치 `feat/game-ops-mcp-v04-20261021`, `packages/game-ops/games.json` (Blob SHA `75cf386cec1c9d13dd676dc814c68834a5f2b828`), `korea-hanyang` 항목. 노션 등록부 조회본(2026-10-22)도 같은 내용.

- 저장소: `aldol2678/aldol-worldforge` — **private** (Alpha 0.2 결과 문서에서 명시)
- Source PR: https://github.com/aldol2678/aldol-worldforge/pull/9 — **Open / unmerged** (등록부 evidence 기재)
- 등록부 검증 완료 개발 후보: **Alpha 0.4**, scope = QA deployment
  - 배포 소스 커밋: `f322abea24c388c57ceca06bcf8152fa36cd59fa`
  - PR head observed (등록부 감사 시점): `373a8ebc854761a164f6dbfadfc882bf2ed29fa0`
    - 주의: 등록부 review_note — "PR HEAD는 배포된 f322abea의 증거/문서 후계자다. HEAD를 서빙 빌드로 대체하지 말 것."
  - 배포 ID: `dpl_CPmiggqshYYfAe3NzJU6wycYygmc`
  - 서빙 번들: app.js 2,296,283 bytes, SHA-256 `d9ff0f8566b790eaa8cbe9bb627731d1d9d079d4295146c61a44b7bb2ce0640a`
  - 내용 요약(등록부): 64×64m 구역 3개, 주민 배달, 숲 채집, 확장된 저장 데이터
- 운영(Production) 기준: **Alpha 0.1** — PR #9는 Alpha 0.1 운영을 변경하지 않았다고 기재. 현재 운영 URL/빌드는 독립 확인 안 됨. Alpha 0.4/0.5 QA를 운영으로 승격 금지.
- 정체성: `한가람`/`한양월드`는 대화상 별칭이며 소스 개명이 아니다. 현재 프로토타입 소스 제목은 여전히 KOREA/한양. (identity_review: UNVERIFIED)

### OBSERVED (라이브, 2026-10-22 22시경 KST)
- QA 고정 주소 https://korea-hanyang-alpha02-qa.vercel.app/ 제목: **"KOREA · 한양에서의 하루 | Alpha 0.5 QA"**, 부제 "1790년대 한양 시장 · 생활 시뮬레이션 (고증 전 상상 복원)"
- 함의: 등록부 감사(Alpha 0.4 제목 확인) 이후 배포가 0.5 라벨로 전진했다. 설계 문서 v0.1이 "Alpha 0.5 QA PR #9"를 기준으로 삼은 표기와 라이브 라벨이 일치한다.
- UNKNOWN: Alpha 0.5 서빙 빌드의 커밋 해시, 배포 ID, 번들 해시. 등록부에 0.5 항목은 없다.

### BLOCKED (직접 열람 경로 — 3개 경로 모두 확인, 2026-10-22)
- GitHub 커넥터(Muse GitHub App): `aldol-worldforge` 조회 시 404 (PR 목록·파일·ref 모두).
- 공개 fetch: 404.
- 라이브 브라우저로 PR #9 주소를 직접 열람: GitHub 404 화면("Page not found"). PR 제목·상태·브랜치는 표시되지 않았고, 로그인 요구나 별도 사유 문구도 없었다. 비공개 저장소에 권한 없는 접근 시 GitHub가 404를 반환하는 동작과 일치한다.
- 판정: PR #9의 **현재** 상태(open/draft 포함)·최신 head·변경 파일 목록(`src/chunk-catalog.js` 등)은 직접 검증 BLOCKED. 등록부가 감사 시점에 기록한 "Open/unmerged"를 현재 상태로 단정하지 않는다.
- 해제 조건: Muse GitHub App 설치 대상에 `aldol-worldforge`를 선택하거나, 로컬 클론 경로를 확보하는 것. 둘 다 알돌 측 선택이 필요하다.

### 계보 (DOCUMENTED, Drive 결과 문서 직접 열람)
- PR #5: Alpha 0.1 (미병합)
- PR #8: Alpha 0.2 Draft OPEN — head `feature/korea-alpha-02-glb-world`, 배포 커밋 `c2883e5e...`, GLB 렌더러 파일럿. CI 3종 SUCCESS, 브라우저에서 WebGL2·GLB 1개 표시 확인. Android 실기기·프레임타임·장시간은 미검증. (문서: "KOREA Alpha 0.2 · GLB 렌더러·한양 v0.3 공간 데이터 적용 결과 [DRAFT PR #8]", 2026-10-21)
- PR #9: Alpha 0.4 QA 배포(f322abea)를 거쳐 현재 라이브 라벨 Alpha 0.5 QA.

## 2. 청크 좌표 기준선

### DOCUMENTED (설계 문서 v0.1 §3·§4·§6 직접 열람) — 코드 직접 검증 아님
- 청크 단위: **64 × 64m**. 전체 구상 3열 × 4행 = 12청크. 좌표는 게임용 도식 로컬 좌표(X, Z), GIS 경위도 아님.
- 기존 3청크 (중앙열 X [-32, 32]):

| 청크 | 행 / Z 범위 | 내용 (기존 구현 재활용) |
| --- | --- | --- |
| 숲길 | 북쪽, Z [-160, -96] | 소나무·암석·풀, 장작 채집 지점 4개, 재수집 대기시간·저장 복원 |
| 주거 골목 | 중북, Z [-96, -32] | 가옥·우물·담장, 배달 NPC, 시장↔숲길 중앙길 |
| 중심 시장 | 중남, Z [-32, 32] | 한옥·노점·목공 작업대·부엌, 거래·주민 의뢰. 기존 배치·상호작용 ID·저장 데이터 유지 원칙 |

- 신규 2청크 (Sprint 01 대상, 아직 구현 아님):

| 청크 | 위치 | 계획 |
| --- | --- | --- |
| 마포나루 | 중앙 남쪽, X [-32,32], Z [32, 96] | 선착장·정박선(정적)·화물 더미·짐꾼 NPC·물류 의뢰 1개 |
| 갈대 물가 | 동쪽 남쪽, X [32, 96], Z [32, 96] | 얕은 물 경계·모래·갈대, 낚시 상호작용 1개. 수영·자유항해·유체 물리 제외 |

- 나머지 7청크(서쪽 야산·장인 공방·물류 창고·강변 짐터, 동쪽 밭·쉼터·주막 거리)는 공간 예약만. 구현 완료로 취급 금지.
- 남쪽 한강 수면은 육지 청크 수에 넣지 않는 별도 연속 수면/장식 영역.

### 기술 계약 초안 (DOCUMENTED, 설계 문서 §6)
- 청크 정의 파일: `src/chunk-catalog.js`, 개별 청크 개체: `src/chunk-content.js` (PR #9 기준이라는 기재만 확인, 파일 내용 직접 열람은 BLOCKED)
- 스트리밍: 현재 1차원 중앙 청크 스트리밍 → 2D 인접 방식으로 확대 예정. 기존 원칙 수치: 경계 약 **22m 전 사전 로드**, 이탈 **38m까지 유지**, 미로드 경계 통과 차단, 실패 시 재시도. 설계 문서는 이 수치를 "무검증 상태로 확대 월드에 강제하지 않고 실측 후 조정"으로 명시 — 즉 기준선이라기보다 출발 가설.
- 모든 entity ID 전역 고유, 경로·충돌·상호작용·월드 bounds 동시 수정.
- 저장: 기존 localStorage 키/경제/완료 퀘스트 유지. 신규 낚시·운송 상태는 명시적 마이그레이션 필요.
- GLB 캐시 재사용 유지, 실제 모바일 메모리 사용량은 별도 측정 필요.

### REGISTRY 교차확인
- 등록부의 Alpha 0.4 요약 "64x64m districts x3, resident delivery, forest gathering, expanded save data"가 위 3청크 구성과 일치한다.
- QA 아티팩트: `qa/chunks/browser-report.json @ f322abea` 존재가 등록부에 기록됨 (파일 내용 직접 열람은 BLOCKED).

## 3. 모바일 성능 기준선 — 실측과 목표를 분리한다

### 있는 것 (REGISTRY, 감사 시 재실행하지 않은 기록 인용)
- 소프트웨어 WebGL2 / 모바일 에뮬레이션 브라우저 QA (`browser-report.json @ f322abea`): 기존 3구역 **왕복 2회, 채집, 재시도, 오류 없음**.
- Alpha 0.2 시점 데스크톱 브라우저 QA: WebGL2 실행, GLB 1개 표시, 모바일 UI 존재 확인.

### 없는 것 (UNVERIFIED — 기준선 부재로 명시)
- Android/iOS **실기기** 조작·프레임타임: 미검증 (등록부·PR #8 문서 공통)
- 장시간 플레이 메모리/성능: 미검증
- 설계 문서 §6의 "15분 연속 스트리밍 안정성"은 **목표**이며 측정된 기준선이 아니다.
- Alpha 0.5 빌드에 대한 브라우저 QA 보고서가 등록부에 없다. 0.5 기준 QA 아티팩트 존재 여부 UNKNOWN.

### 따라서 Sprint 01의 성능 기준선은 이렇게 잠근다
1. 기능 기준선 (재현 가능): 에뮬레이션 QA의 왕복 2회·채집·재시도·무오류를 0.5 빌드에서 재실행해 보고서로 남기는 것이 첫 실측.
2. 실기기 기준선: 아직 없음. 첫 Android 실기기 측정(기기명·세로/가로·조이스틱+달리기/점프 동시 터치·15분 스트리밍)이 곧 기준선 v1이 된다. 측정 전에는 어떤 FPS/메모리 수치도 기준선으로 인용하지 않는다.

## 4. Sprint 01 다음 항목으로 넘기는 것
- [ ] PR #9 최신 head·변경 파일을 직접 읽을 경로 확보 (GitHub App에 aldol-worldforge 선택, 또는 로컬 클론 위치 확인) — 확보되면 `chunk-catalog.js`/`chunk-content.js` 실물로 §2를 코드 검증 등급으로 승격. 2026-10-22 기준 커넥터·공개 fetch·라이브 브라우저 3개 경로 모두 404로 BLOCKED 확인 완료
- [ ] Alpha 0.5 QA 빌드 식별자(커밋/배포 ID/번들 해시) 확보 후 등록부와의 차이 기록
- [ ] 에뮬레이션 QA 재실행으로 0.5 기능 기준선 보고서 작성 → Drive `04_QA·빌드`에 보관
- [ ] 그 다음에야 남쪽 2청크 블록아웃 착수 (설계 문서 §7 순서 유지)

## 5. CI 기준선 리스크 (로컬 기록 직접 확인)
- 로컬 triage 기록 `worldforge-qa-failures-triage-2026-10-21.md`: 2026-10-21 ARAM WORLD Alpha 0.1 Integration QA 실행 실패 알림 다수 확인. GitHub Actions 포함 3,000분 소진(리셋 2026-11-01)과의 인과관계는 UNKNOWN으로 분리돼 있다.
- 로컬 워크스페이스에는 aldol-worldforge 체크아웃이 없다 (2026-10-22 직접 탐색). 코드 기준선은 로컬에서 검증할 수 없고, 저장소 접근 경로 확보가 선행 조건이다.
- 함의: PR #9의 CI를 지금 재실행해 기준선을 만드는 계획은 Actions 예산 결정·리셋과 엮여 있다. CI 재실행 없이 가능한 기준선(배포 라벨·등록부·QA 아티팩트 기록)부터 잠그는 것이 현재 순서다.

## 출처
- 노션: 한가람 · 한강 월드맵 개발 설계 v0.1 [WORKING DESIGN] (2026-10-22)
- 노션: ALDOL Game Ops · 전체 게임 등록부 (2026-10-22) — GitHub games.json 조회본
- GitHub 원본 직접 열람: aldol-mcp-forge `packages/game-ops/games.json` Blob SHA 75cf386c…
- Drive 직접 열람: KOREA Alpha 0.2 · GLB 렌더러·한양 v0.3 공간 데이터 적용 결과 [DRAFT PR #8] (2026-10-21)
- 라이브 직접 확인: https://korea-hanyang-alpha02-qa.vercel.app/ 제목 (2026-10-22 밤 KST)
- BLOCKED 기록: GitHub 커넥터의 aldol-worldforge 404 (비공개 저장소, 앱 미선택 추정), 공개 fetch 404, 라이브 브라우저 직접 열람도 GitHub 404 (2026-10-22 22:00 KST)

## 6. M0 추가 확인 (2026-10-22 22:30~23:00 UTC, M0 Foundation 작업 중)

위 1~5절은 작성 당시 기록으로 그대로 둔다. 이후 저장소 직접 접근 경로가 생겨 다음을 확인했다. 등급은 이 절에서 갱신한다.

- OBSERVED · PR #9 직접 열람: `aldol2678/aldol-worldforge#9` "KOREA Alpha 0.5 QA: Joseon life map, linked quests and forest paths", **Draft / Open / 미병합**, head `feature/korea-alpha-03-market-art` @ `cb4d077702de8b767204f18b0ab1f25eb3b70163`, base `feature/korea-alpha-02-glb-world` @ `c2883e5e`, 커밋 25개, 변경 파일 286개.
- OBSERVED · 로컬 재실행 @ `cb4d077`: KOREA 게임 테스트 73/73, 공통 런타임 5/5, 빌드, `check:dist` PASS. app.js 2,329,742 bytes, SHA-256 `3cff1cb218805611c66fef0ec41d3c0766f70d483ae77bda784ee42dee63ed59` — PR 본문 기록과 같다.
- OBSERVED · 라이브 QA 대조: https://korea-hanyang-alpha02-qa.vercel.app/ 의 `build-manifest.json` 81개 항목이 위 로컬 빌드 manifest와 전부 일치하고, 실제 내려받은 app.js가 로컬 빌드와 바이트 단위로 같다. 따라서 §1의 "Alpha 0.5 서빙 빌드 커밋 UNKNOWN"은 **`cb4d077` 빌드와 동일한 산출물**로 갱신한다. 배포 ID(`dpl_FyBmnJaReL5zkzqGuEjNpCwshXen`)는 PR 본문 기재이며 Vercel에서 직접 조회하지 않았다 (DOCUMENTED).
- OBSERVED · 청크 좌표 코드 검증: `src/chunk-catalog.js` @ `cb4d077`의 `CHUNKS`가 §2 표와 같다 (grove Z[-160,-96], lane Z[-96,-32], market Z[-32,32], 모두 X[-32,32]). `WORLD_BOUNDS` = X[-30.5,30.5] Z[-158.5,30.5]. 저장 키 `korea.alpha01.market.save.v1`. 대조 결과: `qa/m0/private-bridge-report.json`.
- 변화 없음: Android/iOS 실기기·장시간 성능 기준선은 여전히 없다 (UNVERIFIED).
