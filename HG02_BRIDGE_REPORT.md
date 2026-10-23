# HG-02 bridge report · 2026-10-23

Environment: isolated Linux, Node v24.19.0 / npm 11.9.0. Both actual Git checkouts were used, not a mocked catalog.

| Check | Result |
| --- | --- |
| Existing HG-01 four-chunk bridge | PASS 23/23 |
| Existing negative controls | PASS 15/15 intentionally mismatched cases detected |
| HG-02 source/data/runtime bridge | PASS 23/23 |

Public inspected commit: `903fc4bc95023fdf2b58743adf89a0d9aeeaa2c0`. Private inspected commit: `353ec376fcbee3528823006958233d0d63260c70`. Vendored public source commit: `4b7f53f68807923560f9571a8ffbb8928c482e3c`.

The HG-01 bridge validates original catalog IDs, coordinates, URI, source ancestry, vendor JSON bytes/blob SHA, expanded world bounds, legacy key and quest/progress identifiers. Its negative controls use temporary detached worktrees and mutate only those temporary copies.

The HG-02 bridge compares all 18 public-owned vendored files against their live public checkout bytes, recorded Git Blob SHA, and the source-commit blob. It also checks source repository/ancestry, exact modern entity IDs/transforms, the single 64m modern chunk, collision and reserved-area rejection. `qa/hg-02/hg02-bridge-report.json` lists every file and SHA. `examples/worldforge-korea/vendor/hangaram/hg02/provenance.json` contains the private handoff inventory. The existing 1792 vendor provenance is unchanged.

```sh
WORLDFORGE_KOREA_DIR=/workspace/aldol-worldforge/examples/worldforge-korea \
 HG_BRIDGE_REPORT=qa/hg-02/private-bridge-report.json npm run check:bridge -- --require --write
WORLDFORGE_KOREA_DIR=/workspace/aldol-worldforge/examples/worldforge-korea \
 HG_BRIDGE_NEGATIVE_REPORT=qa/hg-02/bridge-negative-report.json npm run check:bridge:negative -- --write
WORLDFORGE_KOREA_DIR=/workspace/aldol-worldforge/examples/worldforge-korea node scripts/check-hg02-bridge.mjs
```

Output overrides prevent overwriting M0/HG-01 evidence. See `qa/hg-02/logs/bridge.txt`, `bridge-negative.txt`, `hg02-bridge.txt` and their JSON reports. Earlier local runs were also PASS against an uncommitted implementation atop private parent `5d215b3`; the recorded final bridge was rerun after the private implementation commit.

Boundary: only public-authored files move into private. No private implementation, font, GLB or private-rendered screenshot moves into public. The bridge verifies contracts and source identity; browser playback and physical-device behavior are evaluated separately in HG02_QA_REPORT.md. Public and private Draft PRs depend on their respective HG-01 parents; neither is independently merge-ready against main.

Private implementation contract hashes (without private contents) are in `qa/hg-02/private-contract-blobs.json`.
