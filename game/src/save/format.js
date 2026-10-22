// 한가람 저장 형식 v1 (format: 'hangaram.save').
// 저장 키는 버전이 올라가도 바꾸지 않는다. 버전은 문서 안의 version 필드로만 구분한다.

export const SAVE_FORMAT = 'hangaram.save';
export const CURRENT_SAVE_VERSION = 1;
export const SAVE_KEY = 'hangaram.save';
/** 이전 버전 원문 백업 키. 마이그레이션 후 처음 덮어쓰기 전에 한 번만 기록한다. */
export const backupKeyFor = (version) => `hangaram.save.backup.v${version}`;
/** 기존 WorldForge KOREA 프로토타입의 저장 키 (PR #9 @ cb4d077). 한가람은 읽기만 하고 쓰거나 지우지 않는다. */
export const LEGACY_KOREA_KEY = 'korea.alpha01.market.save.v1';

export const DEFAULT_ERA = 'joseon-1792';
/** 기존 KOREA 기본 시작 위치와 같은 시장 큰길 지점. */
export const DEFAULT_POSITION = Object.freeze([0, 8]);
export const INVENTORY_KEYS = Object.freeze(['coins', 'wood', 'cloth', 'water', 'rice', 'meals', 'dishes', 'pouches']);
export const PROGRESS_KEYS = Object.freeze(['errands', 'life', 'harvest']);

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCount = (v) => Number.isSafeInteger(v) && v >= 0;
const isPosition = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

export function createNewSave({ now }) {
  return {
    format: SAVE_FORMAT,
    version: CURRENT_SAVE_VERSION,
    createdAt: new Date(now).toISOString(),
    era: { current: DEFAULT_ERA, transition: null },
    player: { position: [...DEFAULT_POSITION] },
    inventory: Object.fromEntries(INVENTORY_KEYS.map((key) => [key, 0])),
    stats: { sales: 0 },
    progress: { errands: {}, life: {}, harvest: {} },
    legacy: {},
  };
}

/** v1 구조 검증. 알 수 없는 최상위 필드는 오류가 아니며 그대로 보존한다. */
export function validateSaveV1(save) {
  const errors = [];
  if (!isObject(save)) return { ok: false, errors: ['E_SAVE_NOT_OBJECT'] };
  if (save.format !== SAVE_FORMAT) errors.push('format');
  if (save.version !== 1) errors.push('version');
  if (!isObject(save.era) || typeof save.era.current !== 'string') errors.push('era.current');
  else if (save.era.transition !== null && !isObject(save.era.transition)) errors.push('era.transition');
  if (!isObject(save.player) || !(save.player.position === null || isPosition(save.player.position))) errors.push('player.position');
  if (!isObject(save.inventory)) errors.push('inventory');
  else for (const key of INVENTORY_KEYS) if (!isCount(save.inventory[key])) errors.push(`inventory.${key}`);
  if (!isObject(save.stats) || !isCount(save.stats.sales)) errors.push('stats.sales');
  if (!isObject(save.progress)) errors.push('progress');
  else for (const key of PROGRESS_KEYS) if (!isObject(save.progress[key])) errors.push(`progress.${key}`);
  if (!isObject(save.legacy)) errors.push('legacy');
  return { ok: errors.length === 0, errors };
}
