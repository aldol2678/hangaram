# 한가람 (HANGARAM)

**한가람: 강이 기억하는 서울**
*HANGARAM: The River Remembers Seoul*

한강을 따라 신석기부터 현대 서울까지 이어지는 시간여행 생활 오픈월드 게임.
'한가람'은 한강의 순우리말 유래(한 = 크다, 가람 = 강)에서 온 이름이다.

## HG-02 통합 후보 (2026-10-23)

1792/2026 마포나루 시대팩, 체크포인트 기반 전환, 격리 저장 계약을 추가했다. 실제 이동·충돌·시대 전환은 비공개 KOREA 런타임의 HG-02 하위 브랜치에서 실행한다. 이 공개 저장소의 미리보기는 계속 데이터 검수용이다. 두 PR 모두 Draft이며 운영·기존 QA 배포는 변경하지 않는다.

- [구현](HG02_IMPLEMENTATION_REPORT.md) · [QA 결과와 미검증 범위](HG02_QA_REPORT.md) · [브리지](HG02_BRIDGE_REPORT.md) · [보존](HG02_PRESERVATION_REPORT.md)
- 2026 내용은 64×64m `mapo.naru`의 22개 도식 primitive로 제한한다. 나머지 현대 청크는 예약 상태다.
- 후보 저장 슬롯: `hangaram.hg02.candidate.save.v1`. 기존 두 저장 키는 읽거나 쓰지 않는다.

## M0 당시 상태 (2026-10-22 기록)

- 기획·맵 설계 단계, M0 개발 기반 구축 중(Draft). 정본 설계는 Notion 《한가람 · 한강 월드맵 개발 설계 v0.1》이다.
- 개발 기반은 기존 WorldForge / KOREA 프로토타입(비공개 저장소 `aldol-worldforge` Draft PR #9)을 승계한다. 이 저장소는 한가람 전용 공개 저장소이며, 비공개 코드를 복사해 넣은 것이 아니다.
- 현재 라이브 QA 라벨은 Alpha 0.5 QA (https://korea-hanyang-alpha02-qa.vercel.app/) 이고, 등록부에서 검증된 배포는 Alpha 0.4 @ `f322abea`다. 자세한 기준선은 [docs/baseline](docs/baseline/map-sprint-01-baseline-2026-10-22.md) 참조.
- 1차 제작 범위: 18세기 조선 후기 마포나루 영감 생활권. 64×64m 청크 기준 기존 3개(숲길·주거 골목·시장) + 신규 남쪽 2개(마포나루·갈대 물가).

## 시대 구상

같은 장소를 시대별로 대조하는 월드 팩 구조를 지향한다.

| 우선도 | 지역 | 시대·방향 |
| --- | --- | --- |
| 1 | 마포·서강 (마포나루) | 조선 생활시장·주택·나루 물류 |
| 2 | 양화진·망원 | 강변 어업·선박·운송 |
| 3 | 암사·광나루 | 신석기 움집·토기·낚시·수렵채집 |
| 4 | 풍납·몽촌 | 한성백제 성곽·주거·공방 |
| 5 | 여의도·밤섬 | 1960~80년대 한강·도시 변화 |

위 지역은 후속 후보이며 현재 구현된 구역이 아니다.

## M0 Foundation (당시 개발 기반 기록)

공개 저장소만으로 실행되는 기반이다. 기존 WorldForge / KOREA 프로토타입(비공개, UNLICENSED)의 코드·에셋은 옮기지 않고, 데이터 계약으로 재사용한다. 근거: [ADR-0001](docs/decisions/ADR-0001-public-private-boundary.md)

| 구현됨 | 아직 아님 |
| --- | --- |
| 공통 좌표(64m 청크)·장소 ID, 1792/2026 시대팩 인터페이스 | 마포나루·갈대 물가 블록아웃 (HG-01~) |
| 기존 3청크 재사용 경로(KOREA 카탈로그 변환, 비공개 대조 PASS) | 공개 저장소 안의 게임 런타임(이동·충돌·스트리밍·의뢰) |
| 저장 v1·마이그레이션·KOREA 저장 비파괴 가져오기 | 실제 시대 전환, 2026 마포 내용 |
| 모바일 우선 입력(멀티터치·터치 배치) | Android/iOS 실기기 검증 |
| PlayCanvas 블록아웃 미리보기 (검수용, 게임 아님) | 운영 배포 |

```sh
npm ci            # Node >= 22
npm run verify    # 테스트 + 공개 경계 검사 + 빌드 + 배포물 검사
npm run preview   # dist/ 를 http://127.0.0.1:4173/ 에서 보기
npm run qa:browser                                   # 선택: Chromium 소프트웨어 WebGL2 4개 해상도
WORLDFORGE_KOREA_DIR=<비공개 체크아웃>/examples/worldforge-korea npm run check:bridge  # 선택: 비공개 계약 대조
```

- 구조와 재사용 의존성: [docs/architecture/m0-foundation.md](docs/architecture/m0-foundation.md)
- 시대팩 인터페이스: [docs/specs/era-pack.md](docs/specs/era-pack.md) · 저장 규칙: [docs/specs/save-format.md](docs/specs/save-format.md)
- 실행 기록: [qa/m0/REPORT.md](qa/m0/REPORT.md) · 다음 작업: [HG-01 마포나루 블록아웃](docs/plans/HG-01-mapo-naru-blockout.md)

## 저장소 구조

- `docs/` — 설계 요약, 기준선, 아키텍처·결정·사양·계획 문서
- `game/` — 시대팩 데이터(`worldpacks/`), 공통 모듈(`src/`), 블록아웃 미리보기
- `scripts/` — 빌드·검사·QA 스크립트
- `test/` — 단위 테스트 (node:test)
- `assets/` — 공개 허용 에셋 목록 (현재 0개, 제작 에셋 18종은 별도 보관 중)
- `qa/` — QA 보고서와 빌드 검증 기록

## 경계

- 맵 배치와 좌표는 게임용 창작/도식 좌표이며 역사적 실측 복원이 아니다. 역사 GIS 정합(GCP/RMSE)은 별도 연구 트랙에서 보류(HOLD) 중이다.
- 라이선스는 아직 정해지지 않았다. 결정 전까지 이 저장소의 콘텐츠를 외부에서 재사용하지 말 것.
