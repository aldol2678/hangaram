# ADR-0001 · 공개 한가람 저장소와 비공개 WorldForge의 경계

- 상태: 채택 (M0, 2026-10-22)
- 범위: `aldol2678/hangaram`(공개) ↔ `aldol2678/aldol-worldforge`(비공개)

## 배경

M0 작업 지시는 WorldForge의 PlayCanvas 렌더러·청크 스트리밍·이동·충돌·상호작용·저장을 우선 재사용하고 별도 엔진을 중복 개발하지 말 것, 그리고 공개 가능 여부가 확인되지 않은 비공개 코드·제3자 에셋을 공개 저장소로 옮기지 말 것을 함께 요구한다.

2026-10-22에 두 저장소를 직접 확인한 결과는 다음과 같다.

| 항목 | 확인 결과 | 근거 |
| --- | --- | --- |
| `hangaram` 공개 여부 | **public**, 라이선스 미정 | GitHub 저장소 메타데이터 |
| `aldol-worldforge` 공개 여부 | **private** | GitHub 저장소 메타데이터 |
| WorldForge 엔진 라이선스 | `UNLICENSED`, "NOT CLEARED FOR PUBLIC OPEN SOURCE" | `docs/RELEASE_READINESS.md`, `docs/provenance.md` (main `7d77c1a`) |
| 엔진 소스 소유권(AI 보조 기여 포함) | UNKNOWN | 같은 문서의 공개 차단 항목 |
| 제품명 "WorldForge" | 상표 충돌 미해결 | 같은 문서 |
| KOREA 예제(PR #9) 라이선스 | `UNLICENSED` | `examples/worldforge-korea/package.json` @ `cb4d077` |
| KOREA GLB 40종·전용 글꼴 | 제3자 생성 도구 산출물·자체 글꼴, 공개 재배포 권리 미확인 | PR #9 본문 출처 기록, `ui/fonts/provenance.json` |
| 2026-10-22 납품 에셋 18종 | Drive 보관, 공개 여부 미결정 | `assets/README.md` |

## 결정

1. **비공개 코드·에셋을 이관하지 않는다.** `packages/worldforge-*`, `examples/worldforge-korea/**`의 소스·GLB·글꼴·UI 아이콘은 이 저장소에 복사하지 않는다. 공개 차단 항목이 해소되고 소유자가 명시적으로 승인하기 전까지 유지한다.
2. **재사용은 데이터 계약으로 한다.** 한가람은 공통 좌표·장소 ID·시대팩·저장 형식·입력 의도·엔진 호스트 계약을 소유한다. WorldForge KOREA 런타임은 이 계약을 소비하는 호스트이며, 기존 3청크(`grove`/`lane`/`market`)는 `legacy-reference` 상태로 셀·ID·출처 커밋만 기록한다.
3. **엔진을 다시 만들지 않는다.** 청크 스트리밍·이동·충돌·상호작용·게임 저장 UI는 이 저장소에 구현하지 않는다. 공개 저장소에는 블록아웃을 검수하는 뷰어(`game/src/preview/`)만 두며, 공개 npm 패키지 `playcanvas@2.22.4`(MIT, WorldForge와 같은 버전)를 직접 쓴다.
4. **대조는 로컬에서만 한다.** `scripts/check-private-bridge.mjs`는 `WORLDFORGE_KOREA_DIR`가 지정된 로컬 체크아웃을 읽기 전용으로 import해 계약 일치를 확인한다. 비교 결과(ID·좌표 대조표)만 기록하고 코드는 기록하지 않는다. 공개 CI에서는 SKIPPED(미검증)로 표시한다.
5. **경계를 자동 검사한다.** `scripts/check-boundary.mjs`가 에셋 바이너리(허용 목록 제외), 비공개 패키지 import, 비밀값 형태 문자열, 패키지 공개 설정(`private: true`, `UNLICENSED`), 의존성 허용 목록·라이선스를 검사한다. `scripts/check-dist.mjs`가 배포물의 같은 조건을 검사한다.

## 결과

- 공개 저장소만으로 테스트·빌드·블록아웃 미리보기가 돈다. 기존 3청크의 실제 3D 내용은 공개 미리보기에 나오지 않고 "기존 KOREA 청크 · 비공개 런타임 필요"로 표시된다.
- HG-01 이후 신규 청크는 공개 블록아웃(primitive)으로 작성되고, 실제 게임 연결은 비공개 저장소의 별도 브랜치에서 한다 (`docs/plans/HG-01-mapo-naru-blockout.md`).

## 해제 조건 (이관 재검토)

다음이 모두 충족되면 WorldForge 일부를 공개 패키지로 이관하는 ADR을 새로 쓴다.

- [ ] 엔진 소스 소유권·재라이선스 권한 확인 (RELEASE_READINESS "Engine source ownership")
- [ ] 엔진 공개 라이선스 결정 (MIT 또는 Apache-2.0) 및 소유자 승인
- [ ] 제품명 충돌 해소 또는 개명
- [ ] 이관 대상 에셋별 출처·권리 근거 확보 후 `assets/PUBLIC_ASSET_ALLOWLIST.json` 등록
- [ ] 한가람 저장소 라이선스 결정
