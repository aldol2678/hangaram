// 기존 KOREA 프로토타입 저장(버전 0)을 한가람 v1 형식으로 감싼다.
// 원칙: 원문은 legacy.koreaAlpha.raw에 손대지 않고 보존한다. 의뢰·채집 진행은 기존 ID 그대로 옮긴다.
// KOREA 쪽 정규화 규칙(상한, 기본값)을 다시 구현하지 않는다. 형식 검사에 맞지 않는 값은 0/null로 두되
// 무엇을 바꿨는지 report에 남기고, 원문은 그대로 남아 있으므로 정보가 사라지지 않는다.

import { CURRENT_SAVE_VERSION, DEFAULT_ERA, INVENTORY_KEYS, LEGACY_KOREA_KEY, PROGRESS_KEYS, SAVE_FORMAT } from './format.js';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const KNOWN_KEYS = new Set([...INVENTORY_KEYS, ...PROGRESS_KEYS, 'sales', 'position']);

/** 형식 필드가 없고 KOREA 저장의 대표 필드를 가진 객체만 레거시로 본다. */
export function looksLikeKoreaAlphaSave(raw) {
  return isObject(raw) && raw.format === undefined && ['coins', 'position', 'errands', 'wood'].some((key) => key in raw);
}

export function wrapKoreaAlphaSave(raw, { now }) {
  const report = { adjusted: [], unknownFields: [] };
  const count = (key) => {
    const value = raw[key];
    if (Number.isSafeInteger(value) && value >= 0) return value;
    if (value !== undefined) report.adjusted.push(key);
    return 0;
  };
  const position = Array.isArray(raw.position) && raw.position.length === 2 && raw.position.every(Number.isFinite) ? [...raw.position] : null;
  if (raw.position !== undefined && !position) report.adjusted.push('position');
  const progress = {};
  for (const key of PROGRESS_KEYS) {
    if (isObject(raw[key])) progress[key] = structuredClone(raw[key]);
    else {
      if (raw[key] !== undefined) report.adjusted.push(key);
      progress[key] = {};
    }
  }
  for (const key of Object.keys(raw)) if (!KNOWN_KEYS.has(key)) report.unknownFields.push(key);
  const save = {
    format: SAVE_FORMAT,
    version: CURRENT_SAVE_VERSION,
    createdAt: new Date(now).toISOString(),
    era: { current: DEFAULT_ERA, transition: null },
    // null이면 불러올 때 기본 시작 위치를 쓴다. KOREA 런타임은 자체 저장 키를 계속 쓴다.
    player: { position },
    inventory: Object.fromEntries(INVENTORY_KEYS.map((key) => [key, count(key)])),
    stats: { sales: count('sales') },
    progress,
    legacy: { koreaAlpha: { storageKey: LEGACY_KOREA_KEY, importedAt: new Date(now).toISOString(), raw: structuredClone(raw) } },
  };
  return { save, report };
}
