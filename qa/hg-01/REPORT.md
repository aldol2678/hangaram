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
