# game

한가람 게임 데이터와 공통 모듈. 구조·책임은 [docs/architecture/m0-foundation.md](../docs/architecture/m0-foundation.md) 참조.

- `worldpacks/` — 공통 장소(`places.json`)와 시대팩(`joseon-1792/`, `modern-2026/`). 블록아웃은 각 팩의 `chunks/`에 둔다 (HG-01부터).
- `src/core` 공통 좌표·장소 ID · `src/era` 시대팩·블록아웃·전환 규칙 · `src/save` 저장·마이그레이션 · `src/input` 모바일 우선 입력 · `src/engine` 엔진 호스트 계약 · `src/preview` 블록아웃 미리보기
- `index.html`, `preview.css` — 미리보기 셸 (시스템 글꼴만 사용)

게임 런타임(이동·충돌·청크 스트리밍·의뢰·한지 UI)은 비공개 WorldForge / KOREA에 있으며 이 폴더로 옮기지 않았다. 이관 조건은 [ADR-0001](../docs/decisions/ADR-0001-public-private-boundary.md)에 있다.
