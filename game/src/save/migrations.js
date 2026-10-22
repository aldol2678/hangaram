// 저장 마이그레이션 규칙 (docs/specs/save-format.md 참조)
// 1. 앞으로만 간다. 미래 버전 저장은 읽기 전용으로 다루고 덮어쓰지 않는다.
// 2. 입력을 바꾸지 않는다. 항상 복제본에 적용한다.
// 3. 알 수 없는 필드는 지우지 않는다.
// 4. 단계마다 고정 ID를 갖고, 적용 기록을 결과로 돌려준다. 단계마다 테스트 고정물을 둔다.
// 5. 마지막에 v1 구조를 검증하고, 끝나지 않은 시대 전환은 체크포인트로 되돌린다.

import { recoverInterruptedTransition } from '../era/transition.js';
import { CURRENT_SAVE_VERSION, SAVE_FORMAT, validateSaveV1 } from './format.js';
import { looksLikeKoreaAlphaSave, wrapKoreaAlphaSave } from './legacy-korea.js';

export const MIGRATIONS = Object.freeze([
  {
    id: 'm0001-wrap-korea-alpha',
    from: 0,
    to: 1,
    apply: (raw, ctx) => {
      const { save, report } = wrapKoreaAlphaSave(raw, ctx);
      return { save, report };
    },
  },
]);

/** 0 = KOREA 레거시, n = 한가람 v n, null = 알 수 없는 형식. */
export function detectVersion(raw) {
  if (raw?.format === SAVE_FORMAT) return Number.isSafeInteger(raw.version) && raw.version > 0 ? raw.version : null;
  return looksLikeKoreaAlphaSave(raw) ? 0 : null;
}

/**
 * @param {unknown} raw JSON.parse 결과
 * @param {{now: number}} ctx
 * @returns {{ok: true, save: object, fromVersion: number, applied: string[], reports: object[], recovered: boolean}
 *   | {ok: false, error: string, readOnly: boolean, fromVersion: number|null}}
 */
export function migrateSave(raw, ctx) {
  const fromVersion = detectVersion(raw);
  if (fromVersion === null) return { ok: false, error: 'E_SAVE_UNKNOWN_FORMAT', readOnly: true, fromVersion };
  if (fromVersion > CURRENT_SAVE_VERSION) return { ok: false, error: 'E_SAVE_FROM_FUTURE', readOnly: true, fromVersion };
  let save = structuredClone(raw);
  const applied = [];
  const reports = [];
  for (let version = fromVersion; version < CURRENT_SAVE_VERSION; version++) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) return { ok: false, error: `E_SAVE_NO_MIGRATION_FROM_${version}`, readOnly: true, fromVersion };
    const result = step.apply(save, ctx);
    save = result.save;
    applied.push(step.id);
    reports.push({ id: step.id, ...result.report });
  }
  const check = validateSaveV1(save);
  if (!check.ok) return { ok: false, error: `E_SAVE_INVALID:${check.errors.join(',')}`, readOnly: true, fromVersion };
  const recovery = recoverInterruptedTransition(save);
  return { ok: true, save: recovery.save, fromVersion, applied, reports, recovered: recovery.recovered };
}
