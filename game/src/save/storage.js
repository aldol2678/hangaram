// 브라우저 저장소 어댑터. getItem/setItem만 사용하며 removeItem은 쓰지 않는다.
// - 한가람 저장이 있으면 그것을 읽고 필요하면 마이그레이션한다.
// - 없고 KOREA 레거시 저장이 같은 출처(origin)에 있으면 가져온다. 레거시 키는 읽기만 한다.
// - 손상·미래 버전 저장은 readOnly로 돌려주어 호출자가 덮어쓰지 않게 한다.

import { CURRENT_SAVE_VERSION, LEGACY_KOREA_KEY, SAVE_KEY, backupKeyFor, createNewSave } from './format.js';
import { migrateSave } from './migrations.js';

function read(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function parse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/**
 * @param {{getItem(key: string): string|null}} storage
 * @returns {{status: 'new'|'loaded'|'migrated'|'imported-legacy'|'corrupt'|'read-only', save: object|null,
 *   readOnly: boolean, backup: {key: string, value: string}|null, detail: object}}
 */
export function loadSave(storage, { now }) {
  const text = read(storage, SAVE_KEY);
  if (text !== null) {
    const parsed = parse(text);
    if (!parsed.ok) return { status: 'corrupt', save: null, readOnly: true, backup: null, detail: { error: 'E_SAVE_JSON' } };
    const result = migrateSave(parsed.value, { now });
    if (!result.ok) return { status: 'read-only', save: null, readOnly: true, backup: null, detail: result };
    const migrated = result.applied.length > 0;
    const backupKey = backupKeyFor(result.fromVersion);
    const backup = migrated && read(storage, backupKey) === null ? { key: backupKey, value: text } : null;
    return { status: migrated ? 'migrated' : 'loaded', save: result.save, readOnly: false, backup, detail: result };
  }
  const legacyText = read(storage, LEGACY_KOREA_KEY);
  if (legacyText !== null) {
    const parsed = parse(legacyText);
    const result = parsed.ok ? migrateSave(parsed.value, { now }) : null;
    // 레거시가 손상돼도 레거시는 건드리지 않고 새 저장으로 시작한다. 원문은 그대로 남는다.
    if (result?.ok) return { status: 'imported-legacy', save: result.save, readOnly: false, backup: null, detail: result };
    return { status: 'new', save: createNewSave({ now }), readOnly: false, backup: null, detail: { legacyUnreadable: true } };
  }
  return { status: 'new', save: createNewSave({ now }), readOnly: false, backup: null, detail: {} };
}

/**
 * 한가람 키에만 쓴다. 이전 버전 원문 백업이 필요하면 먼저 기록한다.
 * @param {{getItem(key: string): string|null, setItem(key: string, value: string): void}} storage
 */
export function persistSave(storage, loaded, save = loaded.save) {
  if (loaded.readOnly || !save) return { ok: false, error: 'E_SAVE_READ_ONLY' };
  if (save.version !== CURRENT_SAVE_VERSION) return { ok: false, error: 'E_SAVE_VERSION' };
  try {
    if (loaded.backup && read(storage, loaded.backup.key) === null) storage.setItem(loaded.backup.key, loaded.backup.value);
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return { ok: true };
  } catch {
    return { ok: false, error: 'E_STORAGE_UNAVAILABLE' };
  }
}
