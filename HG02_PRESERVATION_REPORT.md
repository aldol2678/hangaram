# HG-02 preservation · 2026-10-23

## Scope and baseline

Public parent `edfe44feb7c388cff5ad3f40a6a3af2dfc1d6ff6`, private parent `5d215b325e22480f23f0a6aaaf555524d596e280`. Earlier baselines: public M0 `f7abea27c069e4c9bbca394f8edc9ab1063a4723`, private PR #9 `cb4d077702de8b767204f18b0ab1f25eb3b70163`. GitHub metadata and open PRs were read before development. No overlapping new HG-02 PR was present. Fresh checkouts were clean; no AGENTS.md was present.

New child branches: `feat/hg02-era-playable-20261023` and `feat/hg02-era-runtime-20261023`. Existing PRs and main are never pushed, rebased, reset, merged or deployed. Local PR #9 comparison uses a detached worktree and isolated browser storage.

## Preserved data

- 1792 naru JSON remains byte-identical to the public parent: 45 primitives. Its original private vendor copy is unchanged.
- All HG-01/M0 evidence directories remain unchanged. HG-02 writes only `qa/hg-02` (public) and `examples/worldforge-korea/qa/hg02` (private). Existing browser tests run via a separate runner that redirects outputs; original scenario files remain intact.
- Original KOREA economy, quest, collision, locomotion, camera and input modules are unchanged. Main selects the candidate slot and era-specific adapter. Original fonts, GLBs, license manifests, package locks, workflows and deployment configuration are unchanged.
- Browser tests create fresh synthetic storage in isolated contexts. Protected-key sentinels verify that the actual HG-02 app does not read or overwrite user slots. The regression runner maps its synthetic legacy fixtures to the candidate envelope; this is test-only and is explicitly distinct from the app's protected-key test.
- No new external asset or license decision. No private file was copied to public. Public boundary scanning remains required.

## Reproduction / evidence

```sh
git diff edfe44feb7c388cff5ad3f40a6a3af2dfc1d6ff6 -- game/worldpacks/joseon-1792 qa/hg-01 qa/m0
git -C ../aldol-worldforge diff 5d215b325e22480f23f0a6aaaf555524d596e280 -- examples/worldforge-korea/assets examples/worldforge-korea/ui examples/worldforge-korea/qa/hg01
npm run check:boundary
```

These are read-only checks in the same Linux/Node environment described in HG02_QA_REPORT.md. Final preservation checks and remote readback are recorded in `qa/hg-02/preservation.json`. No physical device was connected. Permissions, DNS, authentication, production/QA services and domains were not changed. Local tests precede GitHub pushes; commits carry `[skip ci]` and PRs remain Draft to avoid unnecessary Actions usage.
