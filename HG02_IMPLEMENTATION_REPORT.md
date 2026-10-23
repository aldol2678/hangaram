# HG-02 implementation · 2026-10-23

Public parent: [HG-01 PR #2](https://github.com/aldol2678/hangaram/pull/2), `edfe44feb7c388cff5ad3f40a6a3af2dfc1d6ff6` (M0 PR #1 `f7abea27c069e4c9bbca394f8edc9ab1063a4723`). Private parent: [HG-01 PR #10](https://github.com/aldol2678/aldol-worldforge/pull/10), `5d215b325e22480f23f0a6aaaf555524d596e280` (KOREA PR #9 `cb4d077702de8b767204f18b0ab1f25eb3b70163`). All four heads matched the requested baselines at checkout. Open PRs were read before branching; the two worktrees were initially clean. Work uses new child branches, not the parents or main.

## Delivered architecture

- Public `modern-2026/pack.json`: only `mapo.naru`, cell `0:1`, becomes `blockout`; the four other modern chunks stay `reserved`. 22 original primitives include a ground plane, promenade, cross path, pavilion, digital kiosk, benches, lamps and planters. Bounds X[-32,32], Z[32,96], `hangaram.local/v1`, +X east/+Z south. This is a schematic development environment, **not a surveyed reconstruction of Mapo**.
- Public registry and v1 save contract reused. `preflightTransition` remains disabled by default. An explicit adapter capability opts in only to `mapo.naru`, with finite coordinates inside its walkable bounds. No anchor-based teleport is performed.
- `createEraTransition`: reject busy/duplicate/unavailable/blocked requests → durable source checkpoint → prepare hidden target scene → activate → persist stable target state → dispose source. Checkpoint, load, activation or final-save failure restores the retained source. If rollback persistence also fails, the durable pending checkpoint remains recoverable. Presentation is outside this transaction.
- Private PlayCanvas adapter reuses existing movement, camera, chunk stream, manifest validation and renderer. Staged entities are hidden until activation; source entities remain available for rollback without another network fetch. Era-specific collision functions are selected with the authoritative era. Only the modern naru chunk can stream in 2026; its boundary blocks travel into reserved cells.
- Mobile era button uses a touch `pointerdown` handler independent of the stick pointer. It displays the authoritative current era and pending/unavailable state. A 260ms opacity animation cannot change game state. Landscape placement is below the identity panel, so it does not cover inventory. The modern guide describes exploration; the existing 1792 map is explicitly disabled in modern space and restored on returning to 1792. Failure/recovery text uses system fonts; the original Hanji font files are unchanged.
- `hangaram.hg02.candidate.save.v1` is the sole integration slot. The game never reads or writes `hangaram.save` or `korea.alpha01.market.save.v1`. The candidate document still uses `format: hangaram.save`, version 1; inventory/progress IDs and unknown envelope data survive capture. No schema migration or legacy-key deletion is needed. Corrupt/future candidate saves stop startup without overwriting them. Blocked saved positions fail explicitly instead of teleporting.

## Ownership and dependencies

Public owns era data, registry/transition/save contracts and tests. Private owns rendering, collision integration, input and gameplay. The private vendor directory records the public source commit and per-file Git Blob SHA in `provenance.json`. Public-to-private copying only. No WorldForge source, model, font, screenshot or other private asset was copied into this public repository.

## Reproduction and environment

Linux isolated workspace, Node v24.19.0, npm 11.9.0, Chromium 154 headless with SwiftShader; loopback-only HTTP servers. No external deployment. Public code commit `b68d111fedf50179b871ee666d5b3a6aa52f972e`; initial private implementation commit `5fd6f6978e74ef4afa378eb9592d78d2defdd938`. Final runtime code commit: `353ec376fcbee3528823006958233d0d63260c70`; final public preview/docs code: `903fc4bc95023fdf2b58743adf89a0d9aeeaa2c0`. Later evidence/test-harness commits do not change runtime behavior. Outcomes are listed in HG02_QA_REPORT.md.

```sh
npm ci
npm run verify
WORLDFORGE_KOREA_DIR=../aldol-worldforge/examples/worldforge-korea \
  HG_BRIDGE_REPORT=qa/hg-02/private-bridge-report.json npm run check:bridge -- --require --write
WORLDFORGE_KOREA_DIR=../aldol-worldforge/examples/worldforge-korea \
  HG_BRIDGE_NEGATIVE_REPORT=qa/hg-02/bridge-negative-report.json npm run check:bridge:negative -- --write
WORLDFORGE_KOREA_DIR=../aldol-worldforge/examples/worldforge-korea node scripts/check-hg02-bridge.mjs
```

Initial local result: public 82/82 tests plus boundary/build/dist PASS; private 84/84 tests and runtime-core 5/5 PASS. See QA and bridge reports for browser results, subsequent tests, failures and remaining limits. Android physical-device verification remains NOT_VERIFIED. NPC AI, traffic, new economy/quests, additional modern chunks, production service changes and main merges are outside this change.
