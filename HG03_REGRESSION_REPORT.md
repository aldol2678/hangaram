# HG-03 회귀 보고서 · 2026-10-23

판정 **PARTIAL**. 공개 Node 86개 테스트, HG01/HG02 bridge 각각 23개, negative 15개, 공개 브라우저 4화면 PASS. 기존 시대팩·블록아웃·저장 형식·퀘스트 ID는 변경하지 않았다.

비공개 실행 결과는 [Draft #12](https://github.com/aldol2678/aldol-worldforge/pull/12)의 별도 보고서에 보존한다. HG01 지도 4화면·시장↔나루 보행, HG02 2회 왕복·충돌·저장·로드/쓰기/크래시 복구가 PASS다. 기존 Alpha05 퀘스트 실터치 검사는 소프트웨어 브라우저의 버튼 안정화 대기에서 중단되어 NOT_VERIFIED다. 별도 DOM 클릭 기능 결과(PASS)는 실제 터치 PASS로 계산하지 않는다.

공개 미리보기의 오래된 현대 시대 기대값과 favicon 404를 수정한 뒤 4화면 QA를 재실행했다. [수정 전 JSON](qa/hg03/public-preview-baseline/browser-report.json), [최종 JSON](qa/hg03/public-preview/browser-report.json), [로그](qa/hg03/logs).

검증 코드 커밋 `24c7ba2aac130ad90fe22e58d55a03a2381cddf5`. 패킷 미제공·Android 실기기 미접근·운영 배포 금지와 세부 명령은 [QA 보고서](HG03_QA_REPORT.md)에 기록했다. 공개 저장소에는 비공개 코드·에셋·스크린샷을 반입하지 않았다.
