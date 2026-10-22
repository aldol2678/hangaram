# M0 Foundation · 실행 기록

- 실행일: 2026-10-22 (UTC 22:30~23:10), Claude Code 원격 세션 (Linux, Node 22.22.0, npm 10.9.4)
- 대상: `aldol2678/hangaram` M0 브랜치 · 비교 기준: `aldol2678/aldol-worldforge` Draft PR #9 head `cb4d077702de8b767204f18b0ab1f25eb3b70163`
- 등급: **PASS**(직접 실행 통과) / **FAIL** / **SKIPPED·미검증**(실행하지 않았거나 실행할 수 없음)

## 1. 한가람 (이 저장소)

| 명령 | 결과 | 핵심 출력 |
| --- | --- | --- |
| `npm ci` (node_modules·dist 삭제 후) | PASS | added 5 packages (playcanvas 2.22.4, esbuild 0.25.12) |
| `npm audit --audit-level=high` | PASS | found 0 vulnerabilities |
| `npm test` | PASS | tests 58 · pass 58 · fail 0 |
| `npm run check:boundary` | PASS | 63 files scanned · allowlisted assets 0 |
| `npm run build` | PASS | 8 files · app.js 1,992,334 bytes · SHA-256 `07f7a6f35d2dcb268e335bb25449984c3340e274f1b63fe21a1fa22940d4be00` |
| 같은 입력으로 재빌드 | PASS | app.js SHA-256 동일 (결정적 빌드) |
| `npm run check:dist` | PASS | manifest 8개 크기·SHA-256 일치, PlayCanvas MIT 전문, 에셋 바이너리 0, 비공개 경로 흔적 0 |
| `npm run check:bridge` (환경변수 없음, CI와 같은 조건) | SKIPPED·미검증 | `private bridge check SKIPPED (not verified)` · 종료 0. `--require`를 주면 종료 1 |
| `npm run qa:browser` | PASS | 아래 3절 |

단위 테스트 구성 (58): 공통 좌표·장소 ID 6, 시대팩·블록아웃 검증 10, 레지스트리·재사용 경로 6, 시대 전환 규칙 5, 저장·마이그레이션·저장소 12, 입력·멀티터치·터치 배치 14, 엔진 호스트·세션·미리보기 초점 5.

## 2. 비공개 WorldForge KOREA와의 대조 (로컬 전용)

`WORLDFORGE_KOREA_DIR=<aldol-worldforge>/examples/worldforge-korea npm run check:bridge -- --write`

| 대상 커밋 | 결과 | 비고 |
| --- | --- | --- |
| `cb4d077` (PR #9 head) | **PASS 15/15** | 결과표: [private-bridge-report.json](private-bridge-report.json) |
| `f322abe` (Alpha 0.4, 음성 대조) | FAIL 12/14, 종료 1 (의도한 실패) | `life-quests.js` 없음, 커밋 불일치를 검출. 검사가 실제 불일치를 잡는지 확인용 |

PASS 항목: 모듈 4개 적재, 출처 커밋 일치, 기존 3청크 `id/min/max/uri` 동일, 계획·예약 셀이 KOREA 청크와 겹치지 않음, 채집 ID 4개·주민 부탁 ID 4개·연결 의뢰 ID 3개 동일, 저장 키 `korea.alpha01.market.save.v1` 동일, 재화 필드 9개 동일, **KOREA 저장 → 한가람 v1 → 보존 원문 재정규화 왕복 동일**, 진행 ID·위치 보존.

참고 정보(실패 아님): KOREA `WORLD_BOUNDS.maxZ = 30.5` — 마포나루(Z 32~96)를 실제 런타임에 올리려면 HG-01에서 경계·충돌을 함께 확장해야 한다.

비공개 코드는 이 저장소에 복사하지 않았다. 대조 스크립트는 로컬 체크아웃을 읽기 전용으로 import했고, 기록한 것은 ID·좌표 대조표뿐이다.

## 3. 브라우저 QA (에뮬레이션)

`npm run qa:browser` — 결과: [browser-report.json](browser-report.json), 화면: `screens/*.png`

- 환경: Chromium 141.0.7390.37 headless, SwiftShader 소프트웨어 WebGL2, Playwright 1.56.1(전역 설치, 프로젝트 의존성 아님), 로컬 정적 서버
- 4개 화면 모두 PASS, 렌더러 `webgl2`, 페이지 오류 0, HTTP 오류 0, 가로·세로 넘침 없음

| 화면 | 입력 검사 | 결과 |
| --- | --- | --- |
| 320×740 터치 | CDP 실제 동시 터치: 스틱 유지 중 달리기 탭·점프 탭. 활성 포인터 1→2→1→2→1→0, 초점 29.1m 이동, 달리기 ON, 점프 안내 표시 | PASS |
| 390×844 터치 | 같은 시퀀스, 30.2m 이동 | PASS |
| 844×390 터치 | 같은 시퀀스, 29.3m 이동, 안내 토스트가 HUD·조작과 겹치지 않음 | PASS |
| 1280×800 데스크톱 | W 0.7초 → 북쪽 6.3m 이동, M → 전체 보기, Space → 안내 | PASS |

공통 확인: 조작 5종 44px 이상(점프 72px 이상)·서로·HUD와 비겹침, 정보 패널을 펼쳐도 조작과 비겹침, 1792 팩 12셀(기존 KOREA 3 · 계획 2 · 예약 7, 적재 가능 0), 2026 팩 예약 5셀(적재 가능 0).

QA 중 발견해 고친 것:
1. 위치 표시 문구 중복 ("…런타임 필요 (…런타임 필요)") → 상태 라벨 + 작업 번호만 표시
2. 320px에서 "시대팩 보기" 라벨이 한 글자씩 세로로 깨지고 HUD가 화면 절반을 차지 → 보조 정보를 접이식으로 분리, 선택 상자 전체 폭
3. 844×390에서 안내 토스트가 HUD와 겹침 → 낮은 가로 화면에서는 하단 가운데(스틱과 오른손 조작 사이)로 이동, QA에 토스트 겹침 검사 추가
4. QA 스크립트의 CDP 터치 시퀀스가 스틱을 중간에 떼고 있었음(`touchEnd`는 떼는 접점만 넘겨야 함) → 스틱 유지가 실제로 보장되는 시퀀스로 수정하고 포인터 수 시퀀스를 검사

이 결과는 데스크톱 Chromium의 모바일 에뮬레이션이다. **Android/iOS 실기기, 실제 GPU 프레임타임, 장시간 메모리는 미검증**이다.

## 4. 기존 기능 회귀 기준선 (비공개 저장소, 변경 없음)

M0는 비공개 저장소에 커밋하지 않았다. 기존 게임이 그대로인지 확인하려고 PR #9 head를 로컬에서 다시 실행했다.

| 항목 @ `cb4d077` | 결과 |
| --- | --- |
| KOREA 게임 테스트 | PASS 73/73 |
| 공통 런타임 테스트 | PASS 5/5 |
| 빌드 · `check:dist` | PASS · "KOREA build integrity PASS" |
| app.js | 2,329,742 bytes · SHA-256 `3cff1cb218805611c66fef0ec41d3c0766f70d483ae77bda784ee42dee63ed59` (PR 본문 기록과 같음) |
| 라이브 QA 대조 (읽기 전용 GET) | https://korea-hanyang-alpha02-qa.vercel.app/ build-manifest 81/81 항목 일치, 내려받은 app.js 바이트 동일 |
| 비공개 저장소 작업 트리 | 추적 파일 변경 없음 (`git status` 깨끗함), 임시 worktree 제거 |

저장 데이터·entity ID·의뢰 진행·모바일 조작·QA 기록은 비공개 저장소에서 바뀐 것이 없다. 한가람 쪽 저장 어댑터는 KOREA 저장 키를 읽기만 한다 (테스트로 확인).

## 5. CI

- `.github/workflows/verify.yml`: 1개 job, Draft PR에서는 건너뜀(실행 시간 0), Ready for review·수동 실행에서만 실행, 8분 제한, 동시 실행 취소, Actions SHA 고정.
- 이번 작업에서 GitHub Actions를 실행하지 않았다 (Draft PR). **CI 결과는 미검증**이다.

## 6. 미검증 · 범위 밖

- 미검증: Android/iOS 실기기, 실기기 성능·15분 스트리밍, GitHub Actions 실행, 배포 주소에서의 미리보기(배포하지 않음)
- 범위 밖(구현하지 않음): 마포나루·갈대 물가 블록아웃 내용, 공개 저장소 안의 게임 런타임, 실제 시대 전환·5D 전환, 2026 도시, 신규 NPC AI, 낚시·운송 의뢰
