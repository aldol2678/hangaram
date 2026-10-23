import { createNewSave, validateSaveV1 } from './format.js';
import { recoverInterruptedTransition } from '../era/transition.js';
export const CANDIDATE_SAVE_KEY = 'hangaram.hg02.candidate.save.v1';
// Deliberately never probes hangaram.save or the KOREA legacy key.
export function loadCandidate(storage, { now = Date.now() } = {}) {
  try {
    const text = storage.getItem(CANDIDATE_SAVE_KEY);
    if (text === null) return { save: createNewSave({ now }), readOnly: false, recovered: false };
    const save = JSON.parse(text);
    if (!validateSaveV1(save).ok || !['joseon-1792', 'modern-2026'].includes(save.era.current)) throw Error('E_CANDIDATE_INVALID');
    const result = recoverInterruptedTransition(save);
    if (!validateSaveV1(result.save).ok || !Array.isArray(result.save.player.position) || !['joseon-1792','modern-2026'].includes(result.save.era.current)) throw Error('E_CANDIDATE_INVALID');
    return { ...result, readOnly: false };
  } catch (error) { return { save: null, readOnly: true, error: String(error) }; }
}
export function persistCandidate(storage, save) {
  if (!validateSaveV1(save).ok) throw Error('E_CANDIDATE_INVALID');
  storage.setItem(CANDIDATE_SAVE_KEY, JSON.stringify(save));
}
