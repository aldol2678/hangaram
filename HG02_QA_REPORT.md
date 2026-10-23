# HG-02 QA report · 2026-10-23

## Scope, environment and commits

Isolated Linux 6.18.55 workspace, Node v24.19.0, npm 11.9.0, Chromium 154.0.8037.57 headless, SwiftShader WebGL2. Four CSS viewports, device scale factor 1. HTTP servers bind only to 127.0.0.1. No deployment, no shared browser profile, no real user saves.

Public runtime/contracts: `4b7f53f68807923560f9571a8ffbb8928c482e3c` (also recorded in the bridge report and private vendor provenance). Public tested code HEAD: `903fc4bc95023fdf2b58743adf89a0d9aeeaa2c0`. Private initial implementation/soak: `5fd6f6978e74ef4afa378eb9592d78d2defdd938`; final runtime UI correction: `353ec376fcbee3528823006958233d0d63260c70`. Subsequent commits contain test-harness/evidence/report changes. Parents are public HG-01 `edfe44feb7c388cff5ad3f40a6a3af2dfc1d6ff6`, private HG-01 `5d215b325e22480f23f0a6aaaf555524d596e280`; PR #9 comparison uses detached `cb4d077702de8b767204f18b0ab1f25eb3b70163`.

## Gate A / B — contracts and failure recovery

- Public `npm ci` then `npm run verify`: **82/82 PASS**, boundary/build/dist PASS. Original public parent had 72 tests. The 1792 document remains byte-identical with 45 primitives; modern naru has 22 unique primitives, valid bounds, clear connected paths and separate collision. Other modern chunks remain reserved.
- Private dependency installs: `npm ci --prefix packages/worldforge-schema --no-fund`, `npm ci --prefix examples/worldforge-cat --no-fund`. `npm test --prefix examples/worldforge-korea`: **84/84 PASS** (HG-01 parent: 80; PR #9 rerun: 73/73). `npm test --prefix packages/worldforge-runtime-core`: **5/5 PASS**.
- `npm run build --prefix examples/worldforge-korea` and `npm run check:dist --prefix examples/worldforge-korea`: **PASS**. Dist requires both naru chunks and rejects QA probe names. QA instrumentation is built into a temporary copy only. PR #9 build and dist check also PASS.
- Actual-checkout bridge **23/23**, negative controls **15/15**, HG-02 source/data bridge **23/23 PASS**. Commands, exact source/blob SHA and logs are in HG02_BRIDGE_REPORT.md.
- Public transaction tests cover two full round trips, unchanged coordinates/progress, obstruction without teleport/write, checkpoint/commit/load/activation failure rollback, duplicate requests, busy work, missing target/place and invalid coordinates, interrupted checkpoint recovery, isolated keys, corrupt candidate read-only handling and refresh.
- Browser fault injection: **8/8 scenario groups PASS**: target JSON abort; retry; quota failure on checkpoint; quota failure on final commit; repeated real touch while pending; normal refresh during held target load; renderer crash with durable pending checkpoint; recovery followed by a successful transition even when the animation API throws. The latter confirms UI/era/save remain consistent despite presentation failure. Normal refresh may cancel and roll back before unload; a renderer crash separately proves unfinished-checkpoint recovery.

## Gate C — actual playable input

| Viewport | Input | Final checks |
| --- | --- | --- |
| 320×740 | CDP touch stick; second finger era button | PASS 22/22 |
| 390×844 | CDP touch stick; second finger era button | PASS 22/22 |
| 844×390 | CDP touch stick; second finger era button | PASS 22/22 |
| 1280×800 | held keyboard movement; button click | PASS 21/21 |

Each walks from market [0,8] into 1792 naru, completes at least two 1792→2026→1792 round trips, walks in modern space, tests modern bench collision, refuses a historical cargo obstruction without teleporting, restores modern era/position after reload, jumps, operates camera controls and walks back to market. Only initial spawn is seeded. Movement success never comes from assigning runtime position.

**16 recorded transition coordinate comparisons; maximum observed XZ difference 0.0926133m (≤0.1m).** Y remains grounded through transitions; airborne transitions are rejected. Scene nodes/render components return to their original counts after round trips; page errors are zero. Separate four-viewport controls tests add **12/12 PASS** for actual 1792 cargo collision, modern rendered camera displacement and walking into the reserved-market boundary. Final layout replay passes **4/4 viewports** with zero overlap between the era button and identity, inventory, camera, pad, action and map controls, zero horizontal overflow and ≥44px era touch target. On mobile it repeats actual second-finger era switching while the stick remains held.

The landscape screenshot review found an initial era-button/inventory overlap. Final runtime `353ec376` moves the button below identity and adds a truthful modern exploration guide. The original 1792 map remains available in 1792; modern map content is not implemented, and its button is explicitly disabled in 2026. Final layout/input replay verifies restoration on returning to 1792.

Private evidence: `qa/hg02/playable-report.json` combines final successful runs (the failed earlier PC sampling attempt is retained separately), `controls/report.json`, `layout/report.json`, `faults/browser-report.json`, screenshots and logs. Only the sanitized `qa/hg-02/browser-summary.json` is public; no private-rendered images are copied here.

## Gate D — existing regression

| Scenario | Final result |
| --- | --- |
| Preserved HG-01 naru scenario, 1280×800 | PASS: two full market↔naru walking laps, cargo/post/boat collision, water edge, 22m prefetch/38m unload, scene restoration, saved naru reload |
| HG-01 naru forced JSON failure/retry, 390×844 | PASS: blocked at boundary, explicit retry, walking resumes, inventory preserved |
| Existing world map, all four viewports | PASS, no page/HTTP errors or horizontal overflow |
| HG-01 naru map (market/naru/dock) | PASS 3/3 |
| Existing lane/grove traversal, harvest cooldown, two round trips, multitouch, retry | PASS with explicit interaction-button DOM substitution |
| Cold grove chunk + firewood model failure recovery | PASS with explicit harvest-button DOM substitution |
| Existing Alpha05 linked quests/economy/cooking/map/save + walking | PASS with explicit interaction-button DOM substitution, on both PR #9 and HG-02 |

No new regression was observed in this coverage. The long naru scenario was rerun on desktop; mobile market↔naru walking and the new era interactions were verified by the four-viewport HG-02 suite. Legacy quest-button finger hit-testing remains NOT_VERIFIED (the same original tap instability reproduces on the parent). All seven final regression report groups pass; raw source paths are recorded in the public browser summary and private regression folder.

The original browser scenario files are preserved. `test/run-hg02-regression.cjs` redirects outputs to the HG-02 folder and maps synthetic fixture storage to the candidate envelope. This adapter does not change application storage behavior. Paths ending `-dom-fallback` explicitly substitute DOM click only for unstable `data-target` interaction buttons; those results establish game logic, **not successful finger taps**. Original taps were retried on both PR #9 and HG-02 and timed out due to re-rendered/detached buttons, matching the HG-01 record. The 4D button/stick tests above use real emulated input and do not use this substitution.

## Gate E — 15 minute observation

**PASS for observed lifecycle stability: 916.57 seconds, 51 round trips / 102 transitions, zero page errors.** Scene nodes 1,193→1,193; render components 581→581; materials 236→236; cached assets 312→312; total JS event listeners 89→89 across every sample. JS heap samples span 21,435,348–49,202,344 bytes (no forced GC); DOM node counts vary with collection. This bounded observation is not proof of all possible memory leaks or physical GPU behavior.

Software rendering was slow under concurrent QA: sampled median frame time 183.2–633.4ms, p95 400–1399.9ms. These measurements are recorded, **not a device-FPS performance pass**. Soak ran against `5fd6f697`; the later runtime diff changes only UI placement/copy/map-button availability, and final four-viewport input/layout tests cover that diff.

`ANDROID_PHYSICAL_QA: NOT_VERIFIED`. No physical Android device or adb was available. iOS physical QA and physical GPU memory/FPS are also NOT_VERIFIED.

## Reproduce browser checks

From the private repository after the dependency installs/build above:

```sh
node examples/worldforge-korea/scripts/build-art-qa.mjs /tmp/hg02-browser era-engine-probe.js
python3 -m http.server 4210 --bind 127.0.0.1 --directory /tmp/hg02-browser
# Separate terminal; this environment used the already-installed Playwright package:
NODE_PATH=/opt/codex/cua_node/lib/node_modules node examples/worldforge-korea/test/browser-hg02.cjs
NODE_PATH=/opt/codex/cua_node/lib/node_modules node examples/worldforge-korea/test/browser-hg02-controls.cjs
NODE_PATH=/opt/codex/cua_node/lib/node_modules node examples/worldforge-korea/test/browser-hg02-layout.cjs
NODE_PATH=/opt/codex/cua_node/lib/node_modules node examples/worldforge-korea/test/browser-hg02-soak.cjs
NODE_PATH=/opt/codex/cua_node/lib/node_modules QA_URL=http://127.0.0.1:4210 \
 HG01_VIEWPORTS=1280x800 node examples/worldforge-korea/test/run-hg02-regression.cjs browser-hg01-naru.cjs
NODE_PATH=/opt/codex/cua_node/lib/node_modules QA_URL=http://127.0.0.1:4210 \
 HG02_DOM_FALLBACK=1 node examples/worldforge-korea/test/run-hg02-regression.cjs browser-alpha05.cjs
```

`HG02_VIEWPORTS` selects viewport names; `HG02_OUT` keeps rerun outputs separate; `HG02_SKIP_FAILURES=1` selects walking-only runs. The actual split execution used 390, remaining 320/844/1280, then corrected final desktop; `playable-report.json` records each source. Failure-only run: `HG02_VIEWPORTS=none HG02_OUT=<separate faults directory>`. Soak duration defaults to 900000ms and reports actual elapsed time. Regression baseline uses `HG02_BASELINE=1`, an isolated PR #9 bundle on 127.0.0.1:4211 and no candidate adapter.

## Failed attempts and verification limits

Initial private unit run was 79 PASS / 1 FAIL out of 80 due to glyph coverage; the first public test-edit run was 62 PASS / 1 failing file due to a test syntax edit. Both were corrected before the final 84/84 and 82/82 runs. Initial unit glyph coverage failed because new UI strings were assigned to the old subset-font scan; the new system/full-font surfaces are now explicitly separated, and all existing font bytes remain unchanged. Initial QA probe assumptions about the player node name and async renderer availability were corrected in test-only instrumentation. Slow software rendering exposed a short stall detector and wall-clock movement budgets: the preserved-scenario runner uses 6s stagnation and up to 300s walking budgets; speed, physics, game state and success coordinates are unchanged. Final desktop coordinate measurement waits for stationary rendered frames after key release, avoiding residual braking between samples. A quota fault injector was scoped to transition writes so autosave cannot consume the injected failure. These early failures and interrupted runs are not counted as PASS.

Overall verdict: **HG-02 PLAYABLE VERIFIED — browser emulation**. Draft only; no merge or external deployment. Final PR heads include evidence/documentation after the tested code commits above.

Build artifact byte counts and SHA-256 are recorded in `qa/hg-02/artifacts.json`. The final runtime app bundle is 2,392,598 bytes, SHA-256 `b7a43ebf287765ef93ab0561f689223410b1069984b60c599bffeea1148bdfd1`.
