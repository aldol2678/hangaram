# HG-03 실행 QA 보고서 · 2026-10-23

**최종 인수 판정: PARTIAL.** 공개 로컬 검증과 실제 런타임 브라우저 검증을 수행했지만 첨부 패킷 지시서·실기기·기존 퀘스트 실터치 게이트가 남아 있다.

시작 시 #4는 open/Draft, HEAD `4fbc58499daf4984bddc14dde1a2bd7048b31cd8`, 사용자 기준과 일치하고 mergeable=true였다. 작업 브랜치는 `feat/hg03-temporal-route-20261023`. 검증 코드 커밋 `24c7ba2aac130ad90fe22e58d55a03a2381cddf5`; 증거 커밋을 포함한 최종 HEAD 및 CI는 PR 본문/최종 전달에 기록한다.

## 변경 및 실행 결과

- 외부로 돌아 차단벽 뒤에 진입하는 결함을 실제 브라우저 키보드 입력으로 재현했다. 양 시대 공통 끝 펜스를 추가하고 BFS가 주변 공간과 정확한 목표 좌표를 검사하게 고쳤다. 고정된 각 시대 우회는 불가능하고 두 전환 경로는 유지된다.
- 오래된 공개 브라우저 QA의 2026 reserved-only 기대를 현대 나루 1개와 예약 셀 4개로 수정했다. 빈 favicon을 지정해 404 요청을 없앴다.
- Node **22.23.4**: `npm ci`, `npm run verify` PASS (**86 tests**, boundary, build, dist integrity).
- `check-private-bridge --require` **23/23**, `check-hg02-bridge` **23/23**, `check:bridge:negative` **15/15 PASS**. source→vendor는 공개→비공개 방향만 사용.
- Chromium **154.0.8037.57**, SwiftShader 공개 미리보기 320×740/390×844/844×390/1280×800 **4/4 PASS**: [JSON](qa/hg03/public-preview/browser-report.json), [스크린샷](qa/hg03/public-preview/screens).
- 동반 비공개 런타임에서 4화면 전체 퍼즐, 저장 실패 후 재저장·새로고침, 시대 객체 및 충돌을 실제 입력으로 확인했다. 최종 입력 수정 후 4화면 키보드/터치/멀티터치 검사와 데스크톱 전체 경로를 재검증했다. 상세 증거는 [비공개 Draft #12](https://github.com/aldol2678/aldol-worldforge/pull/12)의 HG03 보고서에만 둔다.

공개 저장소의 미리보기는 게임 런타임이 아니다. 공개 미리보기 PASS를 비공개 퍼즐 완주의 근거로 대신하지 않았다. 비공개 코드·이미지·에셋을 이 저장소에 복사하지 않았다.

## 재현 명령

```sh
node --version # v22.23.4
npm ci
npm run verify
WORLDFORGE_KOREA_DIR=<private-checkout>/examples/worldforge-korea node scripts/check-private-bridge.mjs --require
WORLDFORGE_KOREA_DIR=<private-checkout>/examples/worldforge-korea node scripts/check-hg02-bridge.mjs
WORLDFORGE_KOREA_DIR=<private-checkout>/examples/worldforge-korea npm run check:bridge:negative
PLAYWRIGHT_NODE_PATH=<qa-tools>/node_modules CHROMIUM_PATH=/usr/bin/chromium QA_OUT=qa/hg03/public-preview npm run qa:browser
```

원래 HG02 bridge 보고서 경로에 쓰이는 결과는 HG03 경로로 보존하고 원래 파일을 복원했다. [로그](qa/hg03/logs), [회귀 보고서](HG03_REGRESSION_REPORT.md).

## 미검증 및 경계

- **QA 패킷 / CODEX_EXECUTION.md — BLOCKED:** 요청에 언급된 HG03_CODEX_QA_PACKET_20261023.zip이 대화 파일 참조와 작업 환경에 제공되지 않았다. 재첨부를 요청했으며, 패킷을 읽었다고 보고하지 않는다. 사용자가 본문에 명시한 독립 실행 작업을 수행했다.
- **Android 실기기 — NOT_VERIFIED:** 연결된 실기기 없음. Chromium 154 + SwiftShader + CDP 터치는 실제 브라우저 입력이지만 물리 Android 검증이 아니다.
- **기존 퀘스트 버튼의 실터치 완주 — NOT_VERIFIED:** 보존된 Alpha05 브라우저 시나리오는 소프트웨어 렌더링 환경에서 버튼이 안정화되지 않아 Playwright tap 대기 제한에 도달했다. 별도 DOM 클릭 대체 실행은 기능 로직 검사로만 분류한다.
- **실기기 성능·장시간 안정성 — NOT_VERIFIED:** FPS/발열/메모리 장시간 실기기 보증을 하지 않는다.
- **운영 배포·병합 — 수행하지 않음:** 사용자 금지 경계에 따라 Draft 유지.

따라서 전체 인수 판정은 **PARTIAL**이다. 수행된 브라우저·Node 검사의 개별 PASS와 미검증 게이트를 구분한다.

main·HG-01·HG-02 브랜치, 기존 저장·퀘스트·에셋·라이선스, 운영 서비스는 수정하지 않았다. Draft 유지, 병합·배포·DNS·인증·권한 변경 없음. 최종 push를 모아 수행하고 수동 CI 반복 실행은 하지 않았다.
