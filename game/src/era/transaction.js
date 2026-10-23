import { preflightTransition } from './transition.js';

/** Adapter owns rendering and collision; persistence precedes activation and commit.
 * prepare must clean partial allocations if it rejects. rollback must restore the
 * retained source scene without fetching. finalize only releases the old scene.
 */
export function createEraTransition({ registry, getSave, setSave, persist, isSafe, prepare }) {
  let pending = false;
  return {
    get pending() { return pending; },
    async transition({ toEra, placeId, busy = false }) {
      if (pending) return { ok: false, error: 'E_TRANSITION_IN_PROGRESS' };
      const before = structuredClone(getSave());
      const check = preflightTransition(registry, { save: before, toEra, placeId, busy, capability: true });
      if (!check.ok) return { ok: false, error: check.blockers[0], blockers: check.blockers };
      if (!isSafe(toEra, before.player.position)) return { ok: false, error: 'E_TARGET_BLOCKED' };
      pending = true;
      let stage, committed = false;
      try {
        const checkpoint = { era: before.era.current, position: [...before.player.position] };
        const working = structuredClone(before);
        working.era.transition = { from: checkpoint.era, to: toEra, placeId, checkpoint };
        await persist(working); // A failed checkpoint prevents any scene mutation.
        setSave(working);
        stage = await prepare(toEra, before.player.position);
        await stage.activate();
        const next = structuredClone(working);
        next.era.current = toEra;
        next.era.previous = checkpoint;
        next.era.transition = null;
        await persist(next); // A failed commit still rolls back the retained source.
        setSave(next);
        committed = true;
        await stage.finalize();
        return { ok: true };
      } catch (error) {
        if (committed) return { ok: true, cleanupError: String(error) };
        let rollbackError = null;
        try { await stage?.rollback(); } catch (e) { rollbackError = String(e); }
        setSave(before);
        let recoveryPersisted = true;
        try { await persist(before); } catch { recoveryPersisted = false; }
        // If storage remains unavailable the durable pending checkpoint is recovered on reload.
        return { ok: false, error: String(error), rolledBack: !rollbackError, rollbackError, recoveryPersisted };
      } finally { pending = false; }
    },
  };
}
