// 시대팩 레지스트리: 공통 장소와 여러 시대팩을 묶고, 장소를 시대별로 해석한다.
// 데이터 출처(fs·fetch)와 무관하도록 JSON 읽기 함수를 주입받는다.

import { boundsOfCellKey } from '../core/world-grid.js';
import { STATUS_LABELS, validateEraPack, validatePlaces } from './era-pack.js';

/** 청크 상태 → 내용 출처와 적재 가능 여부. 기존 3청크의 재사용 경로가 여기서 정해진다. */
export const CHUNK_SOURCES = Object.freeze({
  'legacy-reference': { source: 'worldforge-korea', capability: 'worldforge-korea' },
  blockout: { source: 'hangaram-blockout', capability: null },
  planned: { source: 'none', capability: null },
  reserved: { source: 'none', capability: null },
});

/**
 * worldpacks/index.json 기준으로 장소·시대팩·블록아웃을 읽어 검증한다.
 * @param {(path: string) => Promise<any>} readJson worldpacks 루트 기준 상대 경로를 읽는 함수
 */
export async function loadWorldpacks(readJson) {
  const index = await readJson('index.json');
  if (index?.format !== 'hangaram.worldpack-index' || index.version !== 1) throw new Error('E_WORLDPACK_INDEX');
  const places = await readJson(index.places);
  const packs = [];
  for (const path of index.packs) {
    const pack = await readJson(path);
    const base = path.slice(0, path.lastIndexOf('/') + 1);
    const blockouts = new Map();
    for (const chunk of pack.chunks ?? []) {
      if (chunk.status === 'blockout' && typeof chunk.blockout === 'string') blockouts.set(chunk.id, await readJson(base + chunk.blockout));
    }
    packs.push({ pack, blockouts });
  }
  return createEraRegistry({ places, packs, defaultEra: index.defaultEra });
}

export function createEraRegistry({ places, packs, defaultEra }) {
  const placeCheck = validatePlaces(places);
  if (!placeCheck.ok) throw new AggregateError(placeCheck.errors.map((e) => new Error(e)), 'E_PLACES_INVALID');
  const eras = new Map();
  for (const { pack, blockouts = new Map() } of packs) {
    const check = validateEraPack(pack, { places, blockouts });
    if (!check.ok) throw new AggregateError(check.errors.map((e) => new Error(e)), `E_ERA_PACK_INVALID: ${pack?.id}`);
    if (eras.has(pack.id)) throw new Error(`E_DUPLICATE_ERA: ${pack.id}`);
    eras.set(pack.id, { pack, blockouts });
  }
  if (!eras.has(defaultEra)) throw new Error(`E_DEFAULT_ERA: ${defaultEra}`);
  const placeById = new Map(places.places.map((p) => [p.id, p]));
  const eraIds = [...eras.values()].sort((a, b) => a.pack.year - b.pack.year).map((e) => e.pack.id);

  const entry = (eraId) => {
    const era = eras.get(eraId);
    if (!era) throw new Error(`E_UNKNOWN_ERA: ${eraId}`);
    return era;
  };

  /**
   * 시대의 청크 서술자 목록. 엔진 호스트는 capabilities에 따라 적재 가능한 것만 띄운다.
   * @param {string} eraId
   * @param {Iterable<string>} [capabilities] 호스트가 가진 내용 출처 (예: 'worldforge-korea')
   */
  function chunkDescriptors(eraId, capabilities = []) {
    const { pack, blockouts } = entry(eraId);
    const caps = new Set(capabilities);
    return pack.chunks.map((chunk) => {
      const route = CHUNK_SOURCES[chunk.status];
      const hasContent = chunk.status === 'legacy-reference' || chunk.status === 'blockout';
      const loadable = hasContent && (route.capability === null || caps.has(route.capability));
      let reason = null;
      if (!hasContent) reason = chunk.status === 'planned' ? `미구현 (${chunk.plannedIn})` : '미설계';
      else if (!loadable) reason = `${route.capability} 런타임 필요`;
      return {
        qualifiedId: `${pack.id}:${chunk.id}`,
        eraId: pack.id,
        chunkId: chunk.id,
        name: chunk.name,
        cell: chunk.cell,
        bounds: boundsOfCellKey(chunk.cell),
        places: [...chunk.places],
        status: chunk.status,
        statusLabel: STATUS_LABELS[chunk.status],
        plannedIn: chunk.plannedIn ?? null,
        source: route.source,
        loadable,
        reason,
        legacy: chunk.legacy ? { ...chunk.legacy } : null,
        blockout: chunk.status === 'blockout' ? blockouts.get(chunk.id) : null,
      };
    });
  }

  /** 장소를 특정 시대에서 해석한다. 공통 좌표의 기준점은 시대와 무관하게 같다. */
  function placeInEra(placeId, eraId) {
    const place = placeById.get(placeId);
    if (!place) return null;
    const { pack } = entry(eraId);
    const chunk = pack.chunks.find((c) => c.places.includes(placeId)) ?? null;
    return {
      place,
      eraId,
      chunk,
      // 시대 전환 착지 후보가 되려면 그 시대에 실제 내용이 있어야 한다.
      hasContent: Boolean(chunk && (chunk.status === 'legacy-reference' || chunk.status === 'blockout')),
      spawn: [...place.anchor],
    };
  }

  return {
    eras: eraIds,
    defaultEra,
    pack: (eraId) => entry(eraId).pack,
    place: (placeId) => placeById.get(placeId) ?? null,
    places: () => [...placeById.values()],
    placeAtCell: (cell) => places.places.find((p) => p.cell === cell) ?? null,
    chunkDescriptors,
    placeInEra,
  };
}
